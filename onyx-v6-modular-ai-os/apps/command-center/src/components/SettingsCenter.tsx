import { useEffect, useState, type CSSProperties } from "react";
import { VoiceManager, loadVoicePreferences, saveVoicePreferences, type AssistantVoice, type VoicePreferences } from "@onyx/voice-runtime";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

type Extra = Record<"pushToTalk" | "autoListen" | "wakeWords" | "localWhenAvailable" | "clearTemporaryAudio" | "liveTranscript" | "largeCaptions" | "highContrast", boolean>;
const storageKey = (assistant: AssistantVoice) => `onyx.voice.extra.${assistant}`;
const defaults: Extra = { pushToTalk: true, autoListen: false, wakeWords: true, localWhenAvailable: true, clearTemporaryAudio: true, liveTranscript: true, largeCaptions: false, highContrast: false };
const box: CSSProperties = { background: "rgba(3,12,25,.99)", color: "#ecfbff", border: "1px solid #2698ac", borderRadius: 20, overflow: "auto", padding: 18 };
const button: CSSProperties = { border: "1px solid #2698ac", borderRadius: 999, padding: "8px 13px", background: "#071c33", color: "white", fontWeight: 800, cursor: "pointer" };

export function SettingsCenter({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [assistant, setAssistant] = useState<AssistantVoice>("nova");
  const [prefs, setPrefs] = useState<VoicePreferences>(() => loadVoicePreferences("nova"));
  const [extra, setExtra] = useState<Extra>(() => loadExtra("nova"));
  const [status, setStatus] = useState("Ready");
  const [autoStatus, setAutoStatus] = useState("Push-to-talk mode is active.");
  const manager = useState(() => new VoiceManager())[0];

  useEffect(() => {
    if (embedded) return;
    const openSettings = () => setOpen(true);
    window.addEventListener("onyx:open-settings", openSettings);
    return () => window.removeEventListener("onyx:open-settings", openSettings);
  }, [embedded]);
  useEffect(() => {
    const statusListener = (event: Event) => setAutoStatus((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener("onyx:voice-supervisor-status", statusListener);
    return () => window.removeEventListener("onyx:voice-supervisor-status", statusListener);
  }, []);

  const choose = (nextAssistant: AssistantVoice) => {
    setAssistant(nextAssistant);
    setPrefs(loadVoicePreferences(nextAssistant));
    setExtra(loadExtra(nextAssistant));
  };
  const changeExtra = (key: keyof Extra, value: boolean) => {
    const next = { ...extra, [key]: value };
    if (key === "autoListen" && value) next.pushToTalk = false;
    if (key === "pushToTalk" && value) next.autoListen = false;
    setExtra(next);
    localStorage.setItem(storageKey(assistant), JSON.stringify(next));
    if (key === "autoListen" || key === "pushToTalk" || key === "wakeWords") {
      window.dispatchEvent(new CustomEvent("onyx:voice-supervisor-setting", { detail: { assistant, enabled: next.autoListen, wakeEnabled: next.wakeWords } }));
    }
  };
  const body = (
    <section style={embedded ? box : { ...box, position: "fixed", inset: "72px 16px 76px", zIndex: 12010 }} aria-label="Settings">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><small>REAL CONTROLS</small><h2>Voice, Privacy and Accessibility Settings</h2></div>
        {!embedded && <button style={button} onClick={() => setOpen(false)}>Close</button>}
      </header>
      <div style={{ display: "flex", gap: 8 }}>
        {(["nova", "onyx"] as AssistantVoice[]).map((value) => <button key={value} style={{ ...button, background: assistant === value ? "#0b7089" : "#071c33" }} onClick={() => choose(value)}>{value.toUpperCase()}</button>)}
      </div>
      <VoiceSettingsPanel assistant={assistant} value={prefs} onChange={(value) => { setPrefs(value); saveVoicePreferences(assistant, value); }} onTest={() => { void manager.speak(`This is ${assistant.toUpperCase()}. Voice settings test successful.`, prefs).then((result) => setStatus(result.message ?? `${result.engine} voice ready.`)); }} status={status} />
      <p style={{ margin: "12px 16px", color: "#9ed9e7" }}>{autoStatus}</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, margin: 16 }}>
        {(Object.keys(extra) as (keyof Extra)[]).map((key) => <label key={key} style={{ padding: 12, border: "1px solid rgba(148,197,218,.25)", borderRadius: 12 }}><input type="checkbox" checked={extra[key]} onChange={(event) => changeExtra(key, event.target.checked)} /> {label(key)}</label>)}
      </section>
    </section>
  );
  return embedded ? body : <>{open && body}</>;
}

function loadExtra(assistant: AssistantVoice): Extra {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey(assistant)) ?? "{}") }; } catch { return defaults; }
}
function label(key: keyof Extra): string {
  return ({ pushToTalk: "Push to talk", autoListen: "Auto listen", wakeWords: "Wake words: Nova / Hey Nova / Onyx / Hey Onyx", localWhenAvailable: "Process locally when available", clearTemporaryAudio: "Clear temporary audio after response", liveTranscript: "Live transcript", largeCaptions: "Larger captions", highContrast: "High contrast voice indicators" })[key];
}
