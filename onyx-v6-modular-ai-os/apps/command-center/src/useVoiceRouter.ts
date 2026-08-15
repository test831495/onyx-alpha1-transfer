import { useEffect, useRef, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";

const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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
  const commandRef = useRef(onCommand);
  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);

  const stopListening = () => {
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
    recognition.onresult = event => {
      const heard = event.results[event.resultIndex]?.[0]?.transcript?.trim() ?? "";
      if (!heard) { setDiagnostic("NO SPEECH DETECTED"); return; }
      setDiagnostic("PROCESSING");
      const parsed = parseVoice(heard);
      commandRef.current(parsed.command || heard, parsed.mode);
      setDiagnostic(`${parsed.mode ? `MATCHED ${parsed.mode.toUpperCase()} · ` : ""}HEARD “${heard}”`);
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
