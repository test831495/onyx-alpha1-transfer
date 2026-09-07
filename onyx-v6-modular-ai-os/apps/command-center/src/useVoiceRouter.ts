import { useEffect, useRef, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";

// Bounded apostrophe variants (ASCII + smart-quote forms), matching conversationIntentGrammar's
// normalization, so contractions collapse (e.g. "tomorrow's" -> "tomorrows") instead of splitting
// into a stray token (e.g. "tomorrow s") that the shared conversational grammar cannot match.
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

  /**
   * Schedule a new diagnostic reset timeout, clearing any existing one.
   * @param onTimeout Callback to invoke when timeout fires
   * @param delayMs Delay in milliseconds before invoking callback
   */
  schedule(onTimeout: () => void, delayMs: number): void {
    this.clear();
    this.timeoutHandle = globalThis.setTimeout(() => {
      this.timeoutHandle = null;
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
  const timerRef = useRef(new DiagnosticResetTimer());
  const commandRef = useRef(onCommand);
  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);

  const stopListening = () => {
    timerRef.current.clear();
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    setStatus("idle");
  };

  const startListening = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setDiagnostic("VOICE UNAVAILABLE · USE TYPED COMMANDS");
      setStatus("error");
      return;
    }
    stopListening();
    setDiagnostic("REQUESTING MICROPHONE");
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    const finalRecognitionGuard = new FinalRecognitionGuard();
    recognition.onresult = event => {
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
      timerRef.current.schedule(() => {
        setDiagnostic(supported ? "MIC READY" : "VOICE UNAVAILABLE · USE TYPED COMMANDS");
        setStatus("idle");
      }, 1500);
    };
    recognition.onerror = event => {
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "MICROPHONE BLOCKED"
        : event.error === "no-speech" ? "NO SPEECH DETECTED" : `VOICE ERROR · ${event.error}`;
      setDiagnostic(message);
      setStatus("error");
    };
    recognition.onend = () => {
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
    }
  };

  useEffect(() => {
    const visibility = () => { if (document.hidden) stopListening(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); stopListening(); };
  }, []);

  return { status, diagnostic, supported, startListening, stopListening };
}
