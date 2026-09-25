import { useEffect, useRef, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";
import { VoiceSessionArbiter, type VoiceSessionAbortReason, type VoiceSessionMode } from "./voiceSessionArbiter";

// Same bounded apostrophe variants (ASCII + smart-quote forms) conversationIntentGrammar strips,
// so contractions collapse (e.g. "tomorrow's" -> "tomorrows") instead of splitting into a stray
// token (e.g. "tomorrow s") that the shared conversational grammar's regexes cannot match.
const APOSTROPHE_PATTERN = /[\u0027\u2018\u2019\u201B]/g;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(APOSTROPHE_PATTERN, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Pure timer state machine for managing diagnostic-reset timeout.
 * Testable without React/DOM dependencies.
 */
export class DiagnosticResetTimer {
  private timeoutHandle: number | NodeJS.Timeout | null = null;
  private generation = 0;

  /**
   * Schedule a new diagnostic reset timeout, clearing any existing one.
   * @param onTimeout Callback to invoke when timeout fires
   * @param delayMs Delay in milliseconds before invoking callback
   */
  schedule(onTimeout: () => void, delayMs: number): void {
    this.scheduleForGeneration(this.generation, onTimeout, delayMs);
  }

  scheduleForGeneration(generation: number, onTimeout: () => void, delayMs: number): void {
    this.clear();
    this.timeoutHandle = globalThis.setTimeout(() => {
      this.timeoutHandle = null;
      if (generation !== this.generation) return;
      onTimeout();
    }, delayMs);
  }

  /**
   * Clear any pending timeout.
   */
  clear(): void {
    if (this.timeoutHandle !== null) {
      globalThis.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  invalidate(): number {
    this.clear();
    this.generation += 1;
    return this.generation;
  }

  currentGeneration(): number {
    return this.generation;
  }

  /**
   * Check if a timeout is currently pending.
   */
  isPending(): boolean {
    return this.timeoutHandle !== null;
  }

  /**
   * Get the current timeout handle (for testing).
   */
  getHandle(): number | NodeJS.Timeout | null {
    return this.timeoutHandle;
  }
}

export class FinalRecognitionGuard {
  private processed = false;

  shouldProcess(isFinal: boolean, hasTranscript: boolean): boolean {
    if (!isFinal || !hasTranscript || this.processed) return false;
    this.processed = true;
    return true;
  }
}

export function resolveSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof globalThis === "undefined") return null;
  const root = globalThis as typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return root.SpeechRecognition ?? root.webkitSpeechRecognition ?? null;
}

export type SpeechRecognitionCapability =
  | "SUPPORTED"
  | "UNSUPPORTED"
  | "BLOCKED_BY_PERMISSION"
  | "BLOCKED_BY_BROWSER_POLICY"
  | "START_FAILED"
  | "ACTIVE";

export function getSpeechRecognitionCapability(): SpeechRecognitionCapability {
  const constructor = resolveSpeechRecognitionConstructor();
  if (!constructor) return "UNSUPPORTED";
  return "SUPPORTED";
}

export function mapRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Enable microphone access in browser settings.";
    case "audio-capture":
      return "No microphone input is available.";
    case "no-speech":
      return "I did not catch that. Tap the microphone and try again.";
    case "network":
      return "Voice recognition is temporarily unavailable. You can type your request.";
    case "aborted":
      return "";
    case "language-not-supported":
      return "Voice recognition is not supported in the current language.";
    case "bad-grammar":
      return "I did not catch that. Tap the microphone and try again.";
    default:
      return "Voice input is temporarily unavailable. Try again.";
  }
}

export function extractFinalTranscript(eventLike: {
  results?: ArrayLikeLikeResults | null;
  resultIndex?: number;
} | null): string {
  const results = eventLike?.results;
  if (!results || typeof (results as ArrayLikeLikeResults)?.length !== "number") return "";

  const startIndex = Math.max(0, typeof eventLike.resultIndex === "number" ? eventLike.resultIndex : 0);
  const total = Number((results as ArrayLikeLikeResults).length ?? 0);
  const segments: string[] = [];

  for (let index = startIndex; index < total; index += 1) {
    const result = (results as ArrayLike<any>)[index];
    if (!result || typeof result[0] === "undefined") continue;
    const transcript = typeof result[0]?.transcript === "string" ? result[0].transcript : "";
    if (!transcript.trim()) continue;
    segments.push(transcript.trim());
  }

  return segments.join(" ").replace(/\s+/g, " ").trim();
}

type ArrayLikeLikeResults = ArrayLike<
  ArrayLike<{ transcript?: string }> & { isFinal?: boolean; length?: number }
>;

export function parseVoice(text: string): { mode: AssistantMode | null; command: string } {
  const value = normalize(text);
  const match = [...value.matchAll(/(?:^|\s)(?:hey\s+)?(nova|nover|onyx|onix|onics)(?:\s|$)/g)].at(-1);
  if (!match) return { mode: null, command: value };
  const raw = match[1] ?? "";
  const mode: AssistantMode = /nova|nover/.test(raw) ? "nova" : "onyx";
  return { mode, command: value.slice((match.index ?? 0) + match[0].length).trim() };
}

export interface VoiceRouterLifecycle {
  onRecognitionStart?: (mode: Extract<VoiceSessionMode, "PUSH_TO_TALK" | "ORBITAL_LISTEN" | "FOLLOW_UP_LISTENING">) => void;
  onRecognitionEnd?: (mode: Extract<VoiceSessionMode, "PUSH_TO_TALK" | "ORBITAL_LISTEN" | "FOLLOW_UP_LISTENING">) => void;
}

export function useVoiceRouter(onCommand: (command: string, mode: AssistantMode | null) => void, lifecycle: VoiceRouterLifecycle = {}) {
  const supported = Boolean(resolveSpeechRecognitionConstructor());
  const [status, setStatus] = useState<CoreState>("idle");
  const [diagnostic, setDiagnostic] = useState(supported ? "MIC READY" : "VOICE UNAVAILABLE · USE TYPED COMMANDS");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionSequence = useRef(0);
  const arbiterRef = useRef(new VoiceSessionArbiter());
  const timerRef = useRef(new DiagnosticResetTimer());
  const commandRef = useRef(onCommand);
  const watchdogsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finalTranscriptRef = useRef<string | null>(null);

  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);

  const clearWatchdogs = () => {
    for (const timeoutId of watchdogsRef.current) {
      globalThis.clearTimeout(timeoutId);
    }
    watchdogsRef.current = [];
  };

  const scheduleWatchdog = (callback: () => void, delayMs: number) => {
    const handle = globalThis.setTimeout(() => {
      watchdogsRef.current = watchdogsRef.current.filter((value) => value !== handle);
      callback();
    }, delayMs);
    watchdogsRef.current.push(handle);
    return handle;
  };

  const stopListening = (reason: VoiceSessionAbortReason = "USER_CANCEL") => {
    clearWatchdogs();
    timerRef.current.invalidate();
    const snapshot = arbiterRef.current.snapshot();
    if (!recognitionRef.current && snapshot.terminal && !snapshot.pendingStart) {
      setStatus("idle");
      return;
    }
    const generation = arbiterRef.current.cancel(reason);
    arbiterRef.current.expectAbort(generation, reason);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    } else {
      arbiterRef.current.markRecognitionEnded(generation);
    }
    recognitionRef.current = null;
    finalTranscriptRef.current = null;
    setStatus("idle");
  };

  const startListening = (sessionMode: Extract<VoiceSessionMode, "PUSH_TO_TALK" | "ORBITAL_LISTEN" | "FOLLOW_UP_LISTENING"> = "PUSH_TO_TALK"): boolean => {
    timerRef.current.invalidate();
    clearWatchdogs();

    const Ctor = resolveSpeechRecognitionConstructor();
    if (!Ctor) {
      setDiagnostic("Voice input is not supported in this browser. Type your request instead.");
      setStatus("idle");
      return false;
    }

    const decision = arbiterRef.current.requestStart(sessionMode, "active");
    if (!decision.shouldStartRecognition) return true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new Ctor();
    const generation = decision.generation;
    const recognitionInstanceId = `recognition-${++recognitionSequence.current}`;
    finalTranscriptRef.current = null;
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    const finalRecognitionGuard = new FinalRecognitionGuard();
    const startTimeout = scheduleWatchdog(() => {
      const snapshot = arbiterRef.current.snapshot();
      if (snapshot.generation !== generation || !snapshot.pendingStart) return;
      try { recognition.abort(); } catch {}
      arbiterRef.current.markRecognitionEnded(generation);
      recognitionRef.current = null;
      setDiagnostic("Voice input did not start in time. Tap the microphone and try again.");
      setStatus("idle");
    }, 3000);

    recognition.onstart = () => {
      clearTimeout(startTimeout);
      if (arbiterRef.current.markRecognitionStarted(generation, recognitionInstanceId)) {
        setStatus("listening");
        setDiagnostic("LISTENING");
        lifecycle.onRecognitionStart?.(sessionMode);
      }
      scheduleWatchdog(() => {
        const snapshot = arbiterRef.current.snapshot();
        if (snapshot.generation !== generation) return;
        if (!finalTranscriptRef.current) {
          try { recognition.stop(); } catch {}
          setDiagnostic("I did not catch that. Tap the microphone and try again.");
          setStatus("idle");
        }
      }, 8000);
    };

    recognition.onresult = event => {
      const snapshot = arbiterRef.current.snapshot();
      if (generation !== snapshot.generation) return;
      const resultIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
      const interimCandidate = event.results[resultIndex]?.[0]?.transcript?.trim() ?? "";
      if (interimCandidate && !event.results[resultIndex]?.isFinal) {
        setDiagnostic(`LISTENING · ${interimCandidate}`);
      }

      const heard = extractFinalTranscript({ results: event.results, resultIndex });
      if (!heard) return;
      const finalCandidate = heard.trim();
      if (!finalCandidate) return;
      if (finalTranscriptRef.current === finalCandidate) return;
      const finalDecision = finalRecognitionGuard.shouldProcess(true, true);
      if (!finalDecision) return;
      finalTranscriptRef.current = finalCandidate;
      setStatus("thinking");
      setDiagnostic("PROCESSING");
      const parsed = parseVoice(finalCandidate);
      commandRef.current(parsed.command || finalCandidate, parsed.mode);
      const liveDiagnostic = `${parsed.mode ? `MATCHED ${parsed.mode.toUpperCase()} · ` : ""}HEARD “${finalCandidate}”`;
      setDiagnostic(liveDiagnostic);
      timerRef.current.schedule(() => {
        const owner = arbiterRef.current.snapshot();
        if (owner.generation !== generation || !owner.terminal || owner.mode !== "IDLE") return;
        setDiagnostic(supported ? "MIC READY" : "VOICE UNAVAILABLE · USE TYPED COMMANDS");
        setStatus("idle");
      }, 1500);
    };

    recognition.onerror = event => {
      clearWatchdogs();
      timerRef.current.invalidate();
      const classification = arbiterRef.current.classifyRecognitionError(generation, event.error);
      if (classification.expected) {
        if (generation === arbiterRef.current.snapshot().generation) {
          setStatus("idle");
          setDiagnostic("MIC READY");
        }
        return;
      }

      const message = mapRecognitionErrorMessage(event.error);

      if (!message) {
        setStatus("idle");
        setDiagnostic("MIC READY");
        return;
      }
      setDiagnostic(message);
      setStatus("idle");
    };

    recognition.onend = () => {
      clearWatchdogs();
      if (generation !== arbiterRef.current.snapshot().generation) return;
      arbiterRef.current.markRecognitionEnded(generation);
      recognitionRef.current = null;
      lifecycle.onRecognitionEnd?.(sessionMode);
      if (!finalTranscriptRef.current) {
        setDiagnostic("I did not catch that. Tap the microphone and try again.");
      }
      setStatus("idle");
    };

    try {
      setDiagnostic("REQUESTING MICROPHONE");
      recognition.start();
    } catch {
      setDiagnostic("Voice input is not supported in this browser. Type your request instead.");
      setStatus("idle");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const visibility = () => { if (document.hidden) stopListening("SESSION_CLOSE"); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); stopListening("UNMOUNT"); };
  }, []);

  return { status, diagnostic, supported, startListening, stopListening };
}
