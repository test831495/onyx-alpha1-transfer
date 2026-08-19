import "./voiceSessionCoordinator";
import "./voiceRecognitionSupervisor";
import "./settingsCenterBootstrap";
import "./automationDashboardBootstrap";
import { getAssistantProfile, styleAssistantResponse } from "@onyx/identity-runtime";
import "./providerHealthBootstrap";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantMode, CoreState, Intent } from "@onyx/contracts";
import { createIntelligenceRuntime } from "@onyx/intelligence-runtime";
import type { CalendarSummary } from "@onyx/calendar-intelligence";
import {
  VoiceManager,
  loadVoicePreferences,
  saveVoicePreferences,
  type VoicePreferences,
} from "@onyx/voice-runtime";
import { loadCalendar, composeCalendarSpeech } from "./calendarController";
import { CalendarIntelligencePanel } from "./components/CalendarIntelligencePanel";
import { VoiceSettingsPanel } from "./components/VoiceSettingsPanel";
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import { WorkspacePanel } from "./components/WorkspacePanel";
import {
  connectMicrosoft,
  disconnectMicrosoft,
  disconnectedWorkspaceSnapshot,
  loadWorkspaceSnapshot,
} from "./workspaceController";
import { NovaDashboard } from "./components/NovaDashboard";
import { OnyxDashboard } from "./components/OnyxDashboard";
import { HeroCore } from "./components/HeroCore";
import { GlassCommandBar } from "./components/GlassCommandBar";
import { useVoiceRouter } from "./useVoiceRouter";

const states: CoreState[] = [
  "wake-armed",
  "listening",
  "thinking",
  "executing",
  "speaking",
  "error",
];

type Panel =
  | "home"
  | "messages"
  | "settings"
  | "files"
  | "calendar"
  | "weather"
  | "system-health"
  | "tasks"
  | "smart-home"
  | "business"
  | "finance"
  | "news"
  | "social"
  | "email"
  | "automation"
  | "workspace"
  | null;

const names: Record<string, string> = {
  home: "Home",
  messages: "Messages",
  settings: "Settings",
  files: "Files",
  calendar: "Calendar",
  weather: "Weather",
  "system-health": "System Health",
  tasks: "Tasks",
  "smart-home": "Smart Home",
  business: "Business Overview",
  finance: "Finance Tracker",
  news: "News",
  social: "Social Monitor",
  email: "Email",
  automation: "Automation",
  workspace: "Workspace",
};

const unavailableApps = [
  "youtube",
  "google chrome",
  "chrome",
  "browser",
  "spotify",
  "netflix",
  "instagram",
];

const runtime = createIntelligenceRuntime();

function resolveLegacyPanel(raw: string): Panel {
  const command = raw.toLowerCase().trim();

  if (
    !command ||
    /^(call|switch|change|open window|switch window|change window)(\s+to)?$/.test(
      command,
    )
  ) {
    return null;
  }

  if (command.includes("file")) return "files";
  if (command.includes("calendar")) return "calendar";
  if (command.includes("weather")) return "weather";
  if (command.includes("health") || command.includes("system")) {
    return "system-health";
  }
  if (command.includes("task")) return "tasks";
  if (command.includes("message")) return "messages";
  if (command.includes("setting")) return "settings";
  if (
    command.includes("light") ||
    command.includes("music") ||
    command.includes("smarthome")
  ) {
    return "smart-home";
  }
  if (command.includes("finance")) return "finance";
  if (command.includes("news")) return "news";
  if (command.includes("automation") || command === "auto") {
    return "automation";
  }
  if (command.includes("email")) return "email";
  if (command.includes("executive") || command.includes("business")) {
    return "business";
  }
  if (command === "home" || command.includes("greeting")) return "home";

  return null;
}

function unavailableApp(raw: string): string | null {
  const value = raw.toLowerCase();
  const match = unavailableApps.find((app) => value.includes(app));

  if (!match) return null;
  if (match === "google chrome" || match === "chrome") {
    return "Google Chrome";
  }

  return match.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function modulePanel(intent: Intent): Panel {
  if (intent.kind !== "module.open") return null;
  return intent.target;
}

function normalizeCommand(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCalendarCommand(normalized: string): boolean {
  return /next meeting|today.?s meetings|show today meetings|tomorrow.?s (calendar|schedule)|summarize my day|how busy am i|free time|calendar status/.test(
    normalized,
  );
}

export function App() {
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const [mode, setMode] = useState<AssistantMode>("nova");
  const identityProfile = getAssistantProfile(mode);
  const [requested, setRequested] = useState<AssistantMode>("nova");
  const [phase, setPhase] = useState<"idle" | "covered" | "revealing">(
    "idle",
  );
  const [state, setState] = useState<CoreState>("wake-armed");
  const [caption, setCaption] = useState("NOVA is ready.");
  const [quality, setQuality] = useState<"full" | "balanced" | "low">(
    "balanced",
  );
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [calendarSummary, setCalendarSummary] = useState<CalendarSummary>();
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarMinimized, setCalendarMinimized] = useState(false);
  const [voicePreferences, setVoicePreferences] = useState<VoicePreferences>(
    () => loadVoicePreferences("nova"),
  );
  const [voiceStatus, setVoiceStatus] = useState("System voice ready.");
  const voiceManager = useRef(new VoiceManager());
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(() =>
    disconnectedWorkspaceSnapshot(),
  );
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const modeRef = useRef(mode);
  const timers = useRef<number[]>([]);
  const commandSequence = useRef(0);
  const commandController = useRef<AbortController | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    setCaption(getAssistantProfile(mode).greeting);
  }, [mode]);

  useEffect(() => {
    setVoicePreferences(loadVoicePreferences(mode));
  }, [mode]);

  const refreshWorkspace = useCallback(async () => {
    setWorkspaceBusy(true);

    try {
      setWorkspace(await loadWorkspaceSnapshot());
    } finally {
      setWorkspaceBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  useEffect(
    () => () => {
      clearTimers();
      commandController.current?.abort();
      voiceManager.current.stop();
    },
    [],
  );

  const reset = useCallback(
    (assistant: AssistantMode = modeRef.current) => {
      setState("wake-armed");
      setCaption(`${assistant.toUpperCase()} is ready.`);
    },
    [],
  );

  const activate = useCallback(
    (next: AssistantMode) => {
      voiceManager.current.stop();
      setRequested(next);

      if (next === modeRef.current) {
        reset(next);
        return;
      }

      clearTimers();
      setPhase("covered");
      setMode(next);
      modeRef.current = next;
      setActivePanel(null);
      reset(next);

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPhase("revealing");
          timers.current.push(
            window.setTimeout(() => setPhase("idle"), 150),
          );
        }),
      );
    },
    [reset],
  );

  const selectPanel = useCallback(
    (panel: Panel) => {
      if (!panel) return;

      setActivePanel(panel);
      setState("executing");
      setCaption(`${names[panel]} selected.`);

      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          document.getElementById(`panel-${panel}`)?.scrollIntoView({
            behavior: touch ? "auto" : "smooth",
            block: "center",
          });
        }),
      );
    },
    [touch],
  );

  const showError = useCallback(
    (message: string) => {
      setActivePanel(null);
      setState("error");
      setCaption(message);
      timers.current.push(window.setTimeout(() => reset(), 4200));
    },
    [reset],
  );

  const rejectLegacyCommand = useCallback(
    (raw: string) => {
      const app = unavailableApp(raw);
      showError(
        app
          ? `${app} is not available in Phase 0.`
          : `Unsupported Phase 0 command: ${raw}`,
      );
    },
    [showError],
  );

  const dispatchLegacy = useCallback(
    (raw: string, targetMode: AssistantMode | null = null) => {
      const clean = raw.trim();
      const panel = resolveLegacyPanel(clean);

      if (targetMode && targetMode !== modeRef.current) {
        activate(targetMode);

        if (panel) {
          timers.current.push(
            window.setTimeout(() => selectPanel(panel), 240),
          );
        } else if (clean && unavailableApp(clean)) {
          timers.current.push(
            window.setTimeout(() => rejectLegacyCommand(clean), 240),
          );
        }
        return;
      }

      if (panel) {
        selectPanel(panel);
        return;
      }
      if (!clean && targetMode) {
        reset(targetMode);
        return;
      }
      if (!clean) {
        reset();
        return;
      }

      rejectLegacyCommand(clean);
    },
    [activate, rejectLegacyCommand, reset, selectPanel],
  );

  const dispatch = useCallback(
    async (raw: string, targetMode: AssistantMode | null = null) => {
      const clean = raw.trim();
      const normalized = normalizeCommand(clean);

      if (isCalendarCommand(normalized)) {
        const offset = normalized.includes("tomorrow") ? 1 : 0;

        commandController.current?.abort();
        voiceManager.current.stop();
        setActivePanel("calendar");
        setCalendarMinimized(false);
        setCalendarBusy(true);
        setState("thinking");
        setCaption(
          offset === 1
            ? "Loading tomorrow's calendar."
            : "Loading today's calendar.",
        );

        try {
          const summary = await loadCalendar(offset);
          setCalendarSummary(summary);

          const spoken = styleAssistantResponse(
            modeRef.current,
            composeCalendarSpeech(summary, voicePreferences.detail),
            "calendar",
          );

          setCaption(spoken);
          setState("speaking");

          const voiceResult = await voiceManager.current.speak(
            spoken,
            voicePreferences,
          );

          setVoiceStatus(
            voiceResult.message ?? `${voiceResult.engine} voice ready.`,
          );
        } catch (error) {
          showError(
            error instanceof Error
              ? error.message
              : "Calendar request failed.",
          );
        } finally {
          setCalendarBusy(false);
        }

        return;
      }

      const profileCommand = [
        "who am i",
        "who i am",
        "show my profile",
        "my profile",
        "show account",
        "my account",
        "current account",
        "current user",
        "logged in user",
      ].includes(normalized);

      if (
        /^(open )?workspace( status)?$/.test(normalized) ||
        normalized === "connect workspace" ||
        normalized === "connect microsoft" ||
        profileCommand ||
        normalized === "disconnect workspace" ||
        normalized === "disconnect microsoft"
      ) {
        setActivePanel("workspace");

        if (normalized.startsWith("connect")) {
          setWorkspaceBusy(true);
          try {
            await connectMicrosoft();
          } catch (error) {
            showError(
              error instanceof Error
                ? error.message
                : "Microsoft sign-in could not start.",
            );
            setWorkspaceBusy(false);
          }
          return;
        }

        if (normalized.startsWith("disconnect")) {
          setWorkspaceBusy(true);
          try {
            await disconnectMicrosoft();
          } catch (error) {
            showError(
              error instanceof Error
                ? error.message
                : "Microsoft sign-out could not start.",
            );
            setWorkspaceBusy(false);
          }
          return;
        }

        await refreshWorkspace();
        setState("speaking");
        setCaption(
          profileCommand
            ? "Workspace profile status refreshed."
            : "Workspace status refreshed.",
        );
        return;
      }

      if (/onedrive|sharepoint|unread mail/.test(normalized)) {
        setActivePanel("workspace");
        setState("speaking");

        const capability = /onedrive|sharepoint/.test(normalized)
          ? "Cloud document search arrives in Alpha 3.1.3."
          : "Mail intelligence arrives in Alpha 3.1.2.";

        setCaption(`COMING SOON · ${capability}`);
        timers.current.push(window.setTimeout(() => reset(), 5200));
        return;
      }

      const useLegacy =
        window.localStorage.getItem("onyx.phase1.runtime") === "legacy";

      if (useLegacy) {
        dispatchLegacy(clean, targetMode);
        return;
      }

      if (!clean && !targetMode) {
        reset();
        return;
      }

      commandController.current?.abort();
      const controller = new AbortController();
      commandController.current = controller;
      const sequence = ++commandSequence.current;

      setState("thinking");
      setCaption(`${(targetMode ?? modeRef.current).toUpperCase()} · processing`);

      try {
        const outcome = await runtime.processInput(
          {
            text: clean,
            source: "typed",
            requestedAssistant: targetMode ?? undefined,
          },
          controller.signal,
        );

        if (
          sequence !== commandSequence.current ||
          controller.signal.aborted
        ) {
          return;
        }

        const intent = outcome.intent;

        if (intent.kind === "assistant.switch") {
          activate(intent.assistant);
          return;
        }

        const desiredAssistant =
          "assistant" in intent ? intent.assistant : undefined;
        const panel = modulePanel(intent);

        if (desiredAssistant && desiredAssistant !== modeRef.current) {
          activate(desiredAssistant);
          if (panel) {
            timers.current.push(
              window.setTimeout(() => selectPanel(panel), 240),
            );
          }
        } else if (panel) {
          selectPanel(panel);
        }

        if (intent.kind === "settings.open") {
          selectPanel("settings");
          return;
        }

        if (intent.kind === "document.search") {
          setActivePanel(null);
          setState("speaking");
          setCaption(
            `Document search prepared for “${intent.query}”. Local index arrives in Alpha 3.1.`,
          );
          timers.current.push(window.setTimeout(() => reset(), 5200));
          return;
        }

        if (
          outcome.result.status === "unsupported" ||
          outcome.result.status === "rejected" ||
          outcome.result.status === "failed"
        ) {
          showError(outcome.result.message);
          return;
        }

        if (!panel) {
          setState("speaking");
          setCaption(outcome.result.message);
          timers.current.push(window.setTimeout(() => reset(), 3200));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        showError(
          error instanceof Error ? error.message : "Phase 1 runtime failed.",
        );
      }
    },
    [
      activate,
      dispatchLegacy,
      refreshWorkspace,
      reset,
      selectPanel,
      showError,
      voicePreferences,
    ],
  );

  const voice = useVoiceRouter(dispatch);

  const cycle = () => {
    const next =
      states[(states.indexOf(state) + 1) % states.length] ?? "wake-armed";
    setState(next);
    setCaption(
      next === "wake-armed"
        ? `${mode.toUpperCase()} is ready.`
        : `${mode.toUpperCase()} · ${next.replace("-", " ")}`,
    );
  };

  const closeModule = () => {
    voiceManager.current.stop();
    setActivePanel(null);
    reset();
  };

  const nav =
    mode === "nova"
      ? ["Home", "Messages", "Tasks", "News", "Workspace"]
      : [
          "Home",
          "Executive",
          "Finance",
          "News",
          "Workspace",
          "Calendar",
        ];

  const activityVisible = state !== "wake-armed" && state !== "idle";

  return (
    <main
      className={`functional-app phase0-footer-guard mode-${mode} quality-${quality} transition-${phase}`}
    >
      <header className="functional-header glass-surface">
        <div className="functional-brand">
          <strong>{identityProfile.name}</strong>
          <span>● Online · {identityProfile.role}</span>
          <small>
            PHASE 1 CALENDAR INTELLIGENCE + MULTI-ENGINE VOICE · v6
            alpha.3.1.1a
          </small>
        </div>
        <div className="assistant-switch">
          <button
            className={requested === "nova" ? "active" : ""}
            onClick={() => activate("nova")}
          >
            NOVA
          </button>
          <button
            className={requested === "onyx" ? "active" : ""}
            onClick={() => activate("onyx")}
          >
            ONYX
          </button>
          <button onClick={cycle}>STATE DEMO</button>
        </div>
        <div className="stability-controls">
          <label>
            QUALITY{" "}
            <select
              value={quality}
              onChange={(event) =>
                setQuality(event.target.value as "full" | "balanced" | "low")
              }
            >
              <option value="full">Full</option>
              <option value="balanced">Balanced</option>
              <option value="low">Low Power</option>
            </select>
          </label>
          <span>{voice.diagnostic}</span>
        </div>
      </header>

      <div className="mode-transition-veil" />

      <div className="module-slot">
        {activePanel && (
          <aside className="module-drawer glass-surface">
            <div>
              <small>{mode.toUpperCase()} MODULE</small>
              <b>{names[activePanel]}</b>
            </div>
            <span>SELECTED</span>
            <button onClick={closeModule}>×</button>
          </aside>
        )}
      </div>

      <div className="phase0-scroll">
        {activePanel === "calendar" && (
          <>
            <section className="glass-surface" style={{margin:"1rem",padding:".75rem 1rem",borderRadius:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem"}}>
              <strong>Calendar Intelligence</strong>
              <div style={{display:"flex",gap:".5rem"}}><button onClick={() => setCalendarMinimized((value) => !value)}>{calendarMinimized ? "Expand" : "Minimize"}</button><button onClick={closeModule}>Close</button></div>
            </section>
            {!calendarMinimized && <CalendarIntelligencePanel
              summary={calendarSummary}
              busy={calendarBusy}
              onRefresh={() => void dispatch("Show today meetings")}
              onSpeak={() => {
                if (!calendarSummary) return;
                void voiceManager.current
                  .speak(
                    composeCalendarSpeech(
                      calendarSummary,
                      voicePreferences.detail,
                    ),
                    voicePreferences,
                  )
                  .then((result) =>
                    setVoiceStatus(
                      result.message ?? `${result.engine} voice ready.`,
                    ),
                  );
              }}
            />}
          </>
        )}

        {activePanel === "settings" && (
          <>
            <section className="glass-surface" style={{margin:"1rem",padding:"1rem",borderRadius:"1.25rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem"}}>
                <div><small>ASSISTANT IDENTITY</small><h2 style={{margin:".2rem 0"}}>{identityProfile.name} · {identityProfile.role}</h2></div>
                <button onClick={closeModule}>Close Settings</button>
              </div>
              <p>{identityProfile.description}</p>
              <p><b>Tone:</b> {identityProfile.tone} · <b>Verbosity:</b> {identityProfile.verbosity} · <b>Execution:</b> {identityProfile.executionBias}</p>
            </section>
            <VoiceSettingsPanel
              assistant={mode}
              value={voicePreferences}
              onChange={(value) => { setVoicePreferences(value); saveVoicePreferences(mode, value); }}
              onTest={() => { void voiceManager.current.speak("This is " + identityProfile.name + ". Voice profile test successful.", voicePreferences).then((result) => setVoiceStatus(result.message ?? result.engine + " voice ready.")); }}
              status={voiceStatus}
            />
          </>
        )}

        {activePanel === "workspace" && (
          <WorkspacePanel
            snapshot={workspace}
            busy={workspaceBusy}
            onConnect={() => void connectMicrosoft()}
            onDisconnect={() => void disconnectMicrosoft()}
            onRefresh={() => void refreshWorkspace()}
          />
        )}

        <section className="functional-scene">
          {mode === "nova" ? (
            <NovaDashboard
              activePanel={activePanel === "workspace" ? null : activePanel}
            />
          ) : (
            <OnyxDashboard
              activePanel={activePanel === "workspace" ? null : activePanel}
            />
          )}
          <HeroCore
            mode={mode}
            state={state}
            onSwitch={() => activate(mode === "nova" ? "onyx" : "nova")}
            onAction={(action) =>
              action === "Listen" ? voice.startListening() : void dispatch(action)
            }
            lowPower={quality === "low"}
          />
        </section>
      </div>

      <div className="bottom-stack">
        {activityVisible && (
          <div className="activity-strip glass-surface">
            <b>{state.replace("-", " ").toUpperCase()}</b>
            <span>{caption}</span>
            <small>{voice.diagnostic}</small>
          </div>
        )}
        <footer className="functional-footer">
          <nav className="glass-surface">
            {nav.map((item) => (
              <button key={item} onClick={() => void dispatch(item)}>
                {item}
              </button>
            ))}
            {(["Automation", "Settings", "Health"] as const).map((item) => (
              <button
                key={`utility-${item}`}
                data-onyx-global-utility={item.toLowerCase()}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent(
                      item === "Automation"
                        ? "onyx:open-automation"
                        : item === "Settings"
                          ? "onyx:open-settings"
                          : "onyx:open-provider-health",
                    ),
                  )
                }
              >
                {item}
              </button>
            ))}
          </nav>
          <GlassCommandBar
            mode={mode}
            state={state}
            onMic={() => {
              setState("listening");
              setCaption(`${mode.toUpperCase()} · listening`);
              voice.startListening();
            }}
            onCommand={(command) => void dispatch(command)}
          />
        </footer>
      </div>
    </main>
  );
}
