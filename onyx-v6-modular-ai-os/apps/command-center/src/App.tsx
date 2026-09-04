import "./voiceSessionCoordinator";
import "./voiceRecognitionSupervisor";
import { getAssistantProfile, styleAssistantResponse } from "@onyx/identity-runtime";
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
import { NewsPanel } from "./components/NewsPanel";
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
import { AppWindowShell } from "./components/AppWindowShell";
import { AppCardShell, type AppCardPosition } from "./components/AppCardShell";
import { ProviderHealthDashboard } from "./components/ProviderHealthDashboard";
import { useVoiceRouter } from "./useVoiceRouter";
import { AutomationDashboard } from "./components/AutomationDashboard";
import { OverflowIndicator } from "./components/OverflowIndicator";
import { MinimizedAppTray } from "./components/MinimizedAppTray";
import { DetailShell } from "./components/DetailShell";
import { getAppDetail } from "./appDetailRegistry";
import {
  HOME_MINIMAL,
  allocateCardSlots,
  allocateVisibleAndOverflow,
  getActiveWorkspace,
  getVisibleAppIds,
  resolveShellIntent,
  shellReducer,
  shellStateFactory,
  type ShellAppId,
  type ShellIntent,
} from "./shellState";
import { DetailDataContext } from "./appDetailRegistry";
import {
  loadCharacterSelection,
  persistCharacterSelection,
  subscribeToCharacterSelection,
} from "./characterPersistence";

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

function isCalendarCommand(normalized: string): boolean {
  return /next meeting|today.?s meetings|show today meetings|tomorrow.?s (calendar|schedule)|summarize my day|how busy am i|free time|calendar status/.test(
    normalized,
  );
}

function normalizeCommand(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function App() {
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const [mode, setMode] = useState<AssistantMode>(() => loadCharacterSelection());
  const identityProfile = getAssistantProfile(mode);
  const [requested, setRequested] = useState<AssistantMode>(() => loadCharacterSelection());
  const [phase, setPhase] = useState<"idle" | "covered" | "revealing">(
    "idle",
  );
  const [state, setState] = useState<CoreState>("wake-armed");
  const [caption, setCaption] = useState("NOVA is ready.");
  const [quality, setQuality] = useState<"full" | "balanced" | "low">(
    "balanced",
  );
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [shell, setShell] = useState(shellStateFactory());
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

  // Shell routing must be defined early for use in selectPanel
  const dispatchShell = useCallback((intent: ShellIntent) => {
    setShell((current) => shellReducer(current, intent));
  }, []);

  const openShellApp = useCallback(
    (appId: ShellAppId) => {
      if (appId === "home") {
        dispatchShell({ type: "RETURN_HOME" });
        setActivePanel(null);
        return;
      }
      dispatchShell({ type: "OPEN_APP", appId });
    },
    [dispatchShell],
  );

  const handleShellIntent = useCallback(
    (intent: ShellIntent) => {
      if (intent.type === "SET_PRESENCE_MODE") {
        dispatchShell(intent);
        return;
      }
      if (intent.type === "RETURN_HOME") {
        dispatchShell(intent);
        setActivePanel(null);
        return;
      }
      if (intent.type === "CLOSE_ALL_APPS") {
        dispatchShell(intent);
        setActivePanel(null);
        return;
      }
      if (intent.type === "OPEN_DETAILS") {
        dispatchShell(intent);
        return;
      }
      if (intent.type === "OPEN_APP") {
        openShellApp(intent.appId);
        return;
      }
      if (intent.type === "CLOSE_APP") {
        dispatchShell(intent);
        return;
      }
      if (intent.type === "MINIMIZE_APP") {
        dispatchShell(intent);
        return;
      }
      if (intent.type === "FOCUS_APP") {
        dispatchShell(intent);
        return;
      }
    },
    [dispatchShell, openShellApp],
  );

  const activate = useCallback(
    (next: AssistantMode) => {
      persistCharacterSelection(next);
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
      // Sync shell state currentCharacter with mode
      setShell((current) => ({
        ...current,
        currentCharacter: next,
      }));
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

  useEffect(() => {
    return subscribeToCharacterSelection((next) => {
      if (next === modeRef.current) return;
      voiceManager.current.stop();
      clearTimers();
      setRequested(next);
      setMode(next);
      modeRef.current = next;
      setShell((current) => ({
        ...current,
        currentCharacter: next,
      }));
      setActivePanel(null);
      reset(next);
    });
  }, [reset]);

  const selectPanel = useCallback(
    (panel: Panel) => {
      if (!panel) return;

      const appMap: Record<string, ShellAppId | null> = {
        home: "home",
        messages: "messages",
        settings: "settings",
        files: null,
        calendar: "calendar",
        weather: null,
        "system-health": "health",
        tasks: "tasks",
        "smart-home": null,
        business: null,
        finance: null,
        news: "news",
        social: null,
        email: null,
        automation: "automation",
        workspace: "workspace",
      };

      const appId = appMap[panel];
      if (appId) {
        openShellApp(appId);
      }

      setState("executing");
      setCaption(`${names[panel]} selected.`);
    },
    [openShellApp],
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

      const boundedIntent = resolveShellIntent(clean);
      if (boundedIntent) {
        handleShellIntent(boundedIntent);
        setState("executing");
        setCaption(clean);
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
      handleShellIntent,
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


  const renderShellAppContent = (appId: ShellAppId) => {
    const detailSpec = getAppDetail(appId);
    const canOpenDetails = detailSpec?.supportsDetails ?? false;

    switch (appId) {
      case "automation":
        return (
          <>
            <div className="app-card-summary">
              <strong>Automation status</strong>
              <span>Workflow state: idle • Approvals: pending • Validation: not started • Recovery: nominal • Evidence: waiting.</span>
            </div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "automation" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "workspace":
        return (
          <>
            <div className="app-card-summary">
              <strong>Workspace</strong>
              <span>{workspaceBusy ? "Refreshing provider state…" : workspace.activeProvider ? `Connected: ${workspace.activeProvider}` : "Connected providers: 0 • Microsoft: disconnected • Google: disconnected • Yahoo: disconnected."}</span>
            </div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "workspace" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "settings":
        return (
          <>
            <div className="app-card-summary">
              <strong>{mode.toUpperCase()} profile</strong>
              <span>Voice and assistant preferences are ready.</span>
            </div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "settings" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "calendar":
        return (
          <>
            <div className="app-card-summary">
              <strong>Calendar</strong>
              <span>{calendarSummary ? `${calendarSummary.rangeLabel ?? "Today"} • ${calendarSummary.events?.length ?? 0} events` : "No meetings loaded."}</span>
            </div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "calendar" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "messages":
        return (
          <>
            <div className="app-card-summary"><strong>Messages</strong><span>Recent conversations are ready.</span></div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "messages" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "tasks":
        return (
          <>
            <div className="app-card-summary"><strong>Tasks</strong><span>2 pending items in focus.</span></div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "tasks" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "news":
        return (
          <>
            <div className="app-card-summary"><strong>News</strong><span>Connected status is idle.</span></div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "news" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "health":
        return (
          <>
            <div className="app-card-summary"><strong>System health</strong><span>All monitored services remain stable.</span></div>
            {canOpenDetails && (
              <button type="button" className="app-card-action" onClick={() => dispatchShell({ type: "OPEN_DETAILS", appId: "health" })}>
                Open Details
              </button>
            )}
          </>
        );
      case "provider-health":
        return <ProviderHealthDashboard />;
      default:
        return <div className="app-card-summary"><strong>Home</strong><span>Character view active.</span></div>;
    }
  };

  const activityVisible = state !== "wake-armed" && state !== "idle";
  const activeWorkspace = getActiveWorkspace(shell);
  const visibleAppIds = getVisibleAppIds(shell);
  const overflowLayout = allocateVisibleAndOverflow(
    activeWorkspace.openAppIds,
    activeWorkspace.minimizedAppIds,
    0,
  );
  const overflowNavigation = overflowLayout.overflowCount > 0 ? (
    <div className="overflow-navigation-region">
      <OverflowIndicator
        overflowCount={overflowLayout.overflowCount}
        currentPage={overflowLayout.currentPage}
        totalPages={overflowLayout.totalPages}
        onPrevious={() => {
          dispatchShell({ type: "SET_OVERFLOW_PAGE", page: Math.max(0, overflowLayout.currentPage - 1) });
        }}
        onNext={() => {
          dispatchShell({ type: "SET_OVERFLOW_PAGE", page: Math.min(overflowLayout.totalPages - 1, overflowLayout.currentPage + 1) });
        }}
      />
    </div>
  ) : null;

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
            <span className="quality-control">
              <span>Quality</span>
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
            </span>
          </label>
          <span>{voice.diagnostic}</span>
        </div>
      </header>

      <div className="mode-transition-veil" />

      <div className="phase0-scroll">
        {(() => {
          if (!activeWorkspace.openAppIds.length && shell.homeState === HOME_MINIMAL) {
            return (
              <section className="functional-scene">
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
            );
          }

          const visibleCardIds: ShellAppId[] = visibleAppIds.slice(0, 6);
          const cardLookup = allocateCardSlots(visibleCardIds, activeWorkspace.selectedAppId ?? null);

          return (
            <section className="functional-scene functional-scene--cards" aria-label="Application cards overview">
              <HeroCore
                mode={mode}
                state={state}
                onSwitch={() => activate(mode === "nova" ? "onyx" : "nova")}
                onAction={(action) =>
                  action === "Listen" ? voice.startListening() : void dispatch(action)
                }
                lowPower={quality === "low"}
              />
              <div className="app-card-list" role="list" aria-label="Open applications">
                {visibleCardIds.map((appId: ShellAppId) => {
                  const position = cardLookup.get(appId) ?? "RIGHT_MIDDLE";
                  const presentation = activeWorkspace.cardPresentationByAppId.get(appId) ?? {
                    x: position.startsWith("LEFT") ? 2 : 70,
                    y: position.includes("TOP") ? 3 : position.includes("MIDDLE") ? 34 : 65,
                    zIndex: appId === activeWorkspace.selectedAppId ? 6 : 1,
                    selected: appId === activeWorkspace.selectedAppId,
                    hasManualPosition: false,
                  };
                  const title = appId === "provider-health" ? "Provider Health" : appId.charAt(0).toUpperCase() + appId.slice(1);
                  const selected = activeWorkspace.selectedAppId === appId;
                  return (
                    <AppCardShell
                      key={appId}
                      appId={appId}
                      title={title}
                      position={position}
                      selected={selected}
                      x={presentation.x}
                      y={presentation.y}
                      zIndex={presentation.zIndex}
                      hasManualPosition={presentation.hasManualPosition}
                      icon={appId === "workspace" ? "▣" : appId === "automation" ? "◎" : appId === "settings" ? "⚙" : appId === "health" ? "♥" : appId === "messages" ? "✉" : appId === "calendar" ? "◫" : appId === "news" ? "◍" : appId === "tasks" ? "✓" : "◈"}
                      onSelect={() => dispatchShell({ type: "FOCUS_APP", appId })}
                      onMove={(x, y) => dispatchShell({ type: "SET_CARD_POSITION_PREVIEW", appId, x, y })}
                      onMoveEnd={(x, y) => dispatchShell({ type: "SET_CARD_POSITION", appId, x, y })}
                      onMinimize={() => {
                        dispatchShell({ type: "MINIMIZE_APP", appId });
                      }}
                      onClose={() => {
                        dispatchShell({ type: "CLOSE_APP", appId });
                      }}
                    >
                      {renderShellAppContent(appId)}
                    </AppCardShell>
                  );
                })}
              </div>

              {activeWorkspace.detailAppId && (() => {
                const detailAppId = activeWorkspace.detailAppId;
                const detailSpec = getAppDetail(detailAppId);
                if (!detailSpec) return null;
                const DetailComponent = detailSpec.detailComponent;
                return (
                  <DetailDataContext.Provider value={{
                    workspaceSnapshot: workspace,
                    workspaceBusy,
                    onWorkspaceConnect: () => void connectMicrosoft(),
                    onWorkspaceDisconnect: () => void disconnectMicrosoft(),
                    onWorkspaceRefresh: refreshWorkspace,
                    calendarSummary,
                    calendarBusy,
                    onCalendarRefresh: () => void loadCalendar(0),
                    onCalendarSpeak: () => {
                      if (calendarSummary) {
                        void voiceManager.current.speak(
                          composeCalendarSpeech(calendarSummary, voicePreferences.detail),
                          voicePreferences,
                        );
                      }
                    },
                  }}>
                    <DetailShell
                      appId={detailAppId}
                      appTitle={detailSpec.label}
                      state="ready"
                      onClose={() => dispatchShell({ type: "CLOSE_DETAILS" })}
                      onBack={() => dispatchShell({ type: "CLOSE_DETAILS" })}
                      onMinimize={() => dispatchShell({ type: "MINIMIZE_APP", appId: detailAppId })}
                    >
                      <DetailComponent appId={detailAppId} />
                    </DetailShell>
                  </DetailDataContext.Provider>
                );
              })()}
            </section>
          );
        })()}
      </div>

      <div className="bottom-stack">
        {activityVisible && (
          <div className="activity-strip glass-surface">
            <b>{state.replace("-", " ").toUpperCase()}</b>
            <span>{caption}</span>
            <small>{voice.diagnostic}</small>
          </div>
        )}
        {overflowNavigation}
        {getActiveWorkspace(shell).minimizedAppIds.length > 0 && (
          <div className="minimized-app-dock-region">
            <MinimizedAppTray
              minimizedAppIds={getActiveWorkspace(shell).minimizedAppIds}
              onRestore={(appId) => {
                dispatchShell({ type: "RESTORE_APP", appId });
              }}
              onClose={(appId) => {
                dispatchShell({ type: "CLOSE_APP", appId });
              }}
            />
          </div>
        )}
        <footer className="functional-footer">
          <nav className="glass-surface">
            <button
              onClick={() => {
                const activeWorkspace = getActiveWorkspace(shell);
                if (activeWorkspace.openAppIds.length > 0) {
                  dispatchShell({ type: "CLOSE_ALL_APPS" });
                } else {
                  dispatchShell({ type: "RETURN_HOME" });
                }
              }}
            >
              Home
            </button>
            <button onClick={() => openShellApp("messages")}>Messages</button>
            <button onClick={() => openShellApp("tasks")}>Tasks</button>
            <button onClick={() => openShellApp("news")}>News</button>
            <button onClick={() => openShellApp("workspace")}>Workspace</button>
            {mode === "onyx" && (
              <button onClick={() => openShellApp("calendar")}>Calendar</button>
            )}
            <button onClick={() => openShellApp("automation")}>Automation</button>
            <button onClick={() => openShellApp("settings")}>Settings</button>
            <button onClick={() => openShellApp("health")}>Health</button>
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
