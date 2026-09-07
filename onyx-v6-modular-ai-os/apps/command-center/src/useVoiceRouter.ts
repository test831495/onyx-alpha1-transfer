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

export function parseVoice(text: string): { mode: AssistantMode | null; command: string } {
  const value = normalize(text);
  const match = [...value.matchAll(/(?:^|\s)(?:hey\s+)?(nova|nover|onyx|onix|onics)(?:\s|$)/g)].at(-1);
  if (!match) return { mode: null, command: value };
  const raw = match[1] ?? "";
  const mode: AssistantMode = /nova|nover/.test(raw) ? "nova" : "onyx";
  return { mode, command: value.slice((match.index ?? 0) + match[0].length).trim() };
}

export function useVoiceRouter(onCommand: (command: string, mode: AssistantMode | null) => void) {
  const supported = Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
  const [status, setStatus] = useState<CoreState>("idle");
  const [diagnostic, setDiagnostic] = useState(supported ? "MIC READY" : "VOICE UNAVAILABLE · USE TYPED COMMANDS");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionSequence = useRef(0);
  const arbiterRef = useRef(new VoiceSessionArbiter());
  const timerRef = useRef(new DiagnosticResetTimer());
  const commandRef = useRef(onCommand);
  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);

  const stopListening = (reason: VoiceSessionAbortReason = "USER_CANCEL") => {
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
    setStatus("idle");
  };

  const startListening = (sessionMode: Extract<VoiceSessionMode, "PUSH_TO_TALK" | "ORBITAL_LISTEN" | "FOLLOW_UP_LISTENING"> = "PUSH_TO_TALK"): boolean => {
    timerRef.current.invalidate();
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setDiagnostic("VOICE UNAVAILABLE · USE TYPED COMMANDS");
      setStatus("error");
      return false;
    }
    const decision = arbiterRef.current.requestStart(sessionMode, "active");
    if (!decision.shouldStartRecognition) return true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setDiagnostic("REQUESTING MICROPHONE");
    const recognition = new Ctor();
    const generation = decision.generation;
    const recognitionInstanceId = `recognition-${++recognitionSequence.current}`;
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    const finalRecognitionGuard = new FinalRecognitionGuard();
    recognition.onstart = () => {
      timerRef.current.invalidate();
      arbiterRef.current.markRecognitionStarted(generation, recognitionInstanceId);
    };
    recognition.onresult = event => {
      timerRef.current.invalidate();
      if (generation !== arbiterRef.current.snapshot().generation) return;
      const result = event.results[event.resultIndex];
      const heard = event.results[event.resultIndex]?.[0]?.transcript?.trim() ?? "";
      if (result?.isFinal && !heard) {
        setDiagnostic("NO SPEECH DETECTED");
        return;
      }
      if (!finalRecognitionGuard.shouldProcess(Boolean(result?.isFinal), Boolean(heard))) {
        return;
      }
      setStatus("thinking");
      setDiagnostic("PROCESSING");
      const parsed = parseVoice(heard);
      commandRef.current(parsed.command || heard, parsed.mode);
      const liveDiagnostic = `${parsed.mode ? `MATCHED ${parsed.mode.toUpperCase()} · ` : ""}HEARD “${heard}”`;
      setDiagnostic(liveDiagnostic);
      const resetTimerGeneration = timerRef.current.currentGeneration();
      timerRef.current.scheduleForGeneration(resetTimerGeneration, () => {
        const owner = arbiterRef.current.snapshot();
        if (owner.generation !== generation || !owner.terminal || owner.mode !== "IDLE") return;
        setDiagnostic(supported ? "MIC READY" : "VOICE UNAVAILABLE · USE TYPED COMMANDS");
        setStatus("idle");
      }, 1500);
    };
    recognition.onerror = event => {
      timerRef.current.invalidate();
      const classification = arbiterRef.current.classifyRecognitionError(generation, event.error);
      if (classification.expected) {
        if (generation === arbiterRef.current.snapshot().generation) setStatus("idle");
        return;
      }
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "MICROPHONE BLOCKED"
        : event.error === "no-speech" ? "NO SPEECH DETECTED" : `VOICE ERROR · ${classification.userMessage ?? event.error}`;
      setDiagnostic(message);
      setStatus("error");
    };
    recognition.onend = () => {
      if (generation !== arbiterRef.current.snapshot().generation) return;
      arbiterRef.current.markRecognitionEnded(generation);
      recognitionRef.current = null;
      setStatus(current => current === "error" ? current : "idle");
    };
    try {
      setStatus("listening");
      setDiagnostic("LISTENING");
      recognition.start();
    } catch {
      setDiagnostic("VOICE COULD NOT START");
      setStatus("error");
      return false;
    }
    return true;
  };

  useEffect(() => {
    const visibility = () => { if (document.hidden) stopListening("SESSION_CLOSE"); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); stopListening("UNMOUNT"); };
  }, []);

  return { status, diagnostic, supported, startListening, stopListening };
}
