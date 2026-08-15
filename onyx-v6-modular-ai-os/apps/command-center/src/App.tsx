import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";
import { NovaDashboard } from "./components/NovaDashboard";
import { OnyxDashboard } from "./components/OnyxDashboard";
import { HeroCore } from "./components/HeroCore";
import { GlassCommandBar } from "./components/GlassCommandBar";
import { useVoiceRouter } from "./useVoiceRouter";

const states: CoreState[] = ["wake-armed", "listening", "thinking", "executing", "speaking", "error"];
type Panel = "home" | "messages" | "settings" | "files" | "calendar" | "weather" | "system-health" | "tasks" | "smart-home" | "business" | "finance" | "news" | "social" | "email" | "automation" | null;

const names: Record<string, string> = {
  home: "Home", messages: "Messages", settings: "Settings", files: "Files",
  calendar: "Calendar", weather: "Weather", "system-health": "System Health",
  tasks: "Tasks", "smart-home": "Smart Home", business: "Business Overview",
  finance: "Finance Tracker", news: "News", social: "Social Monitor",
  email: "Email", automation: "Automation",
};

const unavailableApps = ["youtube", "google chrome", "chrome", "browser", "spotify", "netflix", "instagram"];

function resolveIntent(raw: string): Panel {
  const c = raw.toLowerCase().trim();
  if (!c || /^(call|switch|change|open window|switch window|change window)(\s+to)?$/.test(c)) return null;
  if (c.includes("file")) return "files";
  if (c.includes("calendar")) return "calendar";
  if (c.includes("weather")) return "weather";
  if (c.includes("health") || c.includes("system")) return "system-health";
  if (c.includes("task")) return "tasks";
  if (c.includes("message")) return "messages";
  if (c.includes("setting")) return "settings";
  if (c.includes("light") || c.includes("music") || c.includes("smart home")) return "smart-home";
  if (c.includes("finance")) return "finance";
  if (c.includes("news")) return "news";
  if (c.includes("automation") || c === "auto") return "automation";
  if (c.includes("email")) return "email";
  if (c.includes("executive") || c.includes("business")) return "business";
  if (c === "home" || c.includes("greeting")) return "home";
  return null;
}

function unavailableApp(raw: string): string | null {
  const value = raw.toLowerCase();
  const match = unavailableApps.find(app => value.includes(app));
  if (!match) return null;
  if (match === "google chrome" || match === "chrome") return "Google Chrome";
  return match.replace(/\b\w/g, letter => letter.toUpperCase());
}

export function App() {
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const [mode, setMode] = useState<AssistantMode>("nova");
  const [requested, setRequested] = useState<AssistantMode>("nova");
  const [phase, setPhase] = useState<"idle" | "covered" | "revealing">("idle");
  const [state, setState] = useState<CoreState>("wake-armed");
  const [caption, setCaption] = useState("NOVA is ready.");
  const [quality, setQuality] = useState<"full" | "balanced" | "low">("balanced");
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const modeRef = useRef(mode);
  const timers = useRef<number[]>([]);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  const reset = useCallback((assistant: AssistantMode = modeRef.current) => {
    setState("wake-armed");
    setCaption(`${assistant.toUpperCase()} is ready.`);
  }, []);

  const activate = useCallback((next: AssistantMode) => {
    setRequested(next);
    if (next === modeRef.current) { reset(next); return; }
    clearTimers();
    setPhase("covered");
    setMode(next);
    modeRef.current = next;
    setActivePanel(null);
    reset(next);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setPhase("revealing");
      timers.current.push(window.setTimeout(() => setPhase("idle"), 150));
    }));
  }, [reset]);

  const selectPanel = useCallback((panel: Panel) => {
    if (!panel) return;
    setActivePanel(panel);
    setState("executing");
    setCaption(`${names[panel]} selected.`);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`panel-${panel}`)?.scrollIntoView({ behavior: touch ? "auto" : "smooth", block: "center" });
    }));
  }, [touch]);

  const rejectCommand = useCallback((raw: string) => {
    const app = unavailableApp(raw);
    setActivePanel(null);
    setState("error");
    setCaption(app ? `${app} is not available in Phase 0.` : `Unsupported Phase 0 command: ${raw}`);
    timers.current.push(window.setTimeout(() => reset(), 4200));
  }, [reset]);

  const dispatch = useCallback((raw: string, targetMode: AssistantMode | null = null) => {
    const clean = raw.trim();
    const panel = resolveIntent(clean);

    if (targetMode && targetMode !== modeRef.current) {
      activate(targetMode);
      if (panel) timers.current.push(window.setTimeout(() => selectPanel(panel), 240));
      else if (clean && unavailableApp(clean)) timers.current.push(window.setTimeout(() => rejectCommand(clean), 240));
      return;
    }

    if (panel) { selectPanel(panel); return; }
    if (!clean && targetMode) { reset(targetMode); return; }
    if (!clean) { reset(); return; }
    rejectCommand(clean);
  }, [activate, rejectCommand, reset, selectPanel]);

  const voice = useVoiceRouter(dispatch);
  const cycle = () => {
    const next = states[(states.indexOf(state) + 1) % states.length] ?? "wake-armed";
    setState(next);
    setCaption(next === "wake-armed" ? `${mode.toUpperCase()} is ready.` : `${mode.toUpperCase()} · ${next.replace("-", " ")}`);
  };
  const closeModule = () => { setActivePanel(null); reset(); };
  const nav = mode === "nova"
    ? ["Home", "Messages", "Tasks", "Music", "News", "Settings"]
    : ["Home", "Executive", "Finance", "News", "Email", "Calendar", "Automation"];
  const activityVisible = state !== "wake-armed" && state !== "idle";

  return <main className={`functional-app phase0-footer-guard mode-${mode} quality-${quality} transition-${phase}`}>
    <header className="functional-header glass-surface">
      <div className="functional-brand"><strong>{mode.toUpperCase()}</strong><span>● Online</span><small>PHASE 0 FOOTER & COMMAND GUARD · v6 alpha.2.5.11</small></div>
      <div className="assistant-switch"><button className={requested === "nova" ? "active" : ""} onClick={() => activate("nova")}>NOVA</button><button className={requested === "onyx" ? "active" : ""} onClick={() => activate("onyx")}>ONYX</button><button onClick={cycle}>STATE DEMO</button></div>
      <div className="stability-controls"><label>QUALITY <select value={quality} onChange={event => setQuality(event.target.value as "full" | "balanced" | "low")}><option value="full">Full</option><option value="balanced">Balanced</option><option value="low">Low Power</option></select></label><span>{voice.diagnostic}</span></div>
    </header>
    <div className="mode-transition-veil" />
    <div className="module-slot">{activePanel && <aside className="module-drawer glass-surface"><div><small>{mode.toUpperCase()} MODULE</small><b>{names[activePanel]}</b></div><span>SELECTED</span><button onClick={closeModule}>×</button></aside>}</div>
    <div className="phase0-scroll"><section className="functional-scene">{mode === "nova" ? <NovaDashboard activePanel={activePanel} /> : <OnyxDashboard activePanel={activePanel} />}<HeroCore mode={mode} state={state} onSwitch={() => activate(mode === "nova" ? "onyx" : "nova")} onAction={action => action === "Listen" ? voice.startListening() : dispatch(action)} lowPower={quality === "low"} /></section></div>
    <div className="bottom-stack">
      {activityVisible && <div className="activity-strip glass-surface"><b>{state.replace("-", " ").toUpperCase()}</b><span>{caption}</span><small>{voice.diagnostic}</small></div>}
      <footer className="functional-footer"><nav className="glass-surface">{nav.map(item => <button key={item} onClick={() => dispatch(item)}>{item}</button>)}</nav><GlassCommandBar mode={mode} state={state} onMic={() => { setState("listening"); setCaption(`${mode.toUpperCase()} · listening`); voice.startListening(); }} onCommand={command => dispatch(command)} /></footer>
    </div>
  </main>;
}
