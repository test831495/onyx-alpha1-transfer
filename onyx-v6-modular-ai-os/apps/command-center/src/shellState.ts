export const HOME_MINIMAL = "HOME_MINIMAL" as const;
export const SHELL_PRESENCE_MODES = [
  "ONYX_ONLY",
  "NOVA_ONLY",
  "ONYX_AND_NOVA",
] as const;
export type ShellPresenceMode = (typeof SHELL_PRESENCE_MODES)[number];
export type ShellLauncherMode = "HIDDEN" | "FLOATING" | "ORBIT_READY";
export type ShellAppId =
  | "home"
  | "messages"
  | "tasks"
  | "news"
  | "workspace"
  | "calendar"
  | "automation"
  | "settings"
  | "health"
  | "provider-health";

export type AppCardPosition =
  | "LEFT_TOP"
  | "LEFT_MIDDLE"
  | "LEFT_BOTTOM"
  | "RIGHT_TOP"
  | "RIGHT_MIDDLE"
  | "RIGHT_BOTTOM";

export type ShellIntent =
  | { type: "OPEN_APP"; appId: ShellAppId }
  | { type: "CLOSE_APP"; appId: ShellAppId }
  | { type: "MINIMIZE_APP"; appId: ShellAppId }
  | { type: "RESTORE_APP"; appId: ShellAppId }
  | { type: "FOCUS_APP"; appId: ShellAppId }
  | { type: "OPEN_DETAILS"; appId: ShellAppId }
  | { type: "CLOSE_DETAILS" }
  | { type: "CLOSE_ALL_APPS" }
  | { type: "SHOW_APP_LAUNCHER" }
  | { type: "HIDE_APP_LAUNCHER" }
  | { type: "RETURN_HOME" }
  | { type: "SET_OVERFLOW_PAGE"; page: number }
  | { type: "SET_CARD_POSITION"; appId: ShellAppId; x: number; y: number }
  | { type: "SET_CARD_POSITION_PREVIEW"; appId: ShellAppId; x: number; y: number }
  | { type: "SET_PRESENCE_MODE"; mode: ShellPresenceMode };

export type CardPresentation = {
  x: number;
  y: number;
  zIndex: number;
  selected: boolean;
  hasManualPosition: boolean;
};

const AUTOMATIC_CARD_COORDINATES: Record<AppCardPosition, { x: number; y: number }> = {
  LEFT_TOP: { x: 1.7, y: 3.2 },
  LEFT_MIDDLE: { x: 1.7, y: 35.1 },
  LEFT_BOTTOM: { x: 1.7, y: 67 },
  RIGHT_TOP: { x: 77.12, y: 3.2 },
  RIGHT_MIDDLE: { x: 77.12, y: 35.1 },
  RIGHT_BOTTOM: { x: 77.12, y: 67 },
};

const LEGACY_AUTOMATIC_X = new Set([2, 70]);

function automaticCardPositionForIndex(index: number): AppCardPosition {
  const positionOrder: AppCardPosition[] = [
    "LEFT_TOP",
    "LEFT_MIDDLE",
    "LEFT_BOTTOM",
    "RIGHT_TOP",
    "RIGHT_MIDDLE",
    "RIGHT_BOTTOM",
  ];
  return positionOrder[index] ?? "RIGHT_MIDDLE";
}

function automaticCardCoordinatesForIndex(index: number): { x: number; y: number } {
  return AUTOMATIC_CARD_COORDINATES[automaticCardPositionForIndex(index)];
}

function isLegacyAutomaticCardPosition(presentation: CardPresentation): boolean {
  return !presentation.hasManualPosition && LEGACY_AUTOMATIC_X.has(presentation.x);
}

export function migrateAutomaticCardPresentations(workspace: CharacterWorkspaceState): CharacterWorkspaceState {
  let changed = false;
  const cardPresentationByAppId = new Map(workspace.cardPresentationByAppId);
  workspace.openAppIds.forEach((appId, index) => {
    const presentation = cardPresentationByAppId.get(appId);
    if (!presentation || !isLegacyAutomaticCardPosition(presentation)) return;
    cardPresentationByAppId.set(appId, {
      ...presentation,
      ...automaticCardCoordinatesForIndex(index),
    });
    changed = true;
  });
  return changed ? { ...workspace, cardPresentationByAppId } : workspace;
}

export function clampCardX(x: number): number {
  if (x < 26 || x > 68) return Math.max(0, Math.min(72, x));
  return x < 47 ? 26 : 68;
}

export function clampCardPosition(x: number, y: number): { x: number; y: number } {
  const boundedX = Math.max(0, Math.min(72, x));
  const boundedY = Math.max(0, Math.min(72, y));
  if (boundedY < 42 || boundedX < 38 || boundedX > 62) {
    return { x: boundedX, y: boundedY };
  }
  return { x: boundedX < 50 ? 26 : 68, y: boundedY };
}

export type PresentationWorkspace = {
  openAppIds: ShellAppId[];
  minimizedAppIds: ShellAppId[];
  selectedAppId: ShellAppId | null;
  detailAppId: ShellAppId | null;
  focusOrder: ShellAppId[];
};

/** Character-scoped workspace state with complete isolation */
export type CharacterWorkspaceState = {
  openAppIds: ShellAppId[];
  minimizedAppIds: ShellAppId[];
  visibleSlotAssignments: Map<ShellAppId, AppCardPosition>;
  cardPresentationByAppId: Map<ShellAppId, CardPresentation>;
  overflowAppIds: ShellAppId[];
  selectedAppId: ShellAppId | null;
  detailAppId: ShellAppId | null;
  detailReturnSnapshot: CharacterWorkspaceState | null;
  overflowPage: number;
};

/** Workspace state separated per character (NOVA and ONYX) */
export type WorkspaceStateByCharacter = {
  nova: CharacterWorkspaceState;
  onyx: CharacterWorkspaceState;
};

export type ShellState = {
  homeState: typeof HOME_MINIMAL;
  presenceMode: ShellPresenceMode;
  launcherMode: ShellLauncherMode;
  currentCharacter: "nova" | "onyx";
  workspaceByCharacter: WorkspaceStateByCharacter;
  technicalDetailsVisible: boolean;
  reducedMotion: boolean;
  presentationWorkspaces: Record<ShellPresenceMode, PresentationWorkspace>;
};

export function emptyPresentationWorkspace(): PresentationWorkspace {
  return {
    openAppIds: [],
    minimizedAppIds: [],
    selectedAppId: null,
    detailAppId: null,
    focusOrder: [],
  };
}

function emptyCharacterWorkspaceState(): CharacterWorkspaceState {
  return {
    openAppIds: [],
    minimizedAppIds: [],
    visibleSlotAssignments: new Map(),
    cardPresentationByAppId: new Map(),
    overflowAppIds: [],
    selectedAppId: null,
    detailAppId: null,
    detailReturnSnapshot: null,
    overflowPage: 0,
  };
}

function snapshotWorkspace(state: ShellState): PresentationWorkspace {
  const active = state.presentationWorkspaces[state.presenceMode] ?? emptyPresentationWorkspace();
  return {
    ...active,
    openAppIds: state.workspaceByCharacter[state.currentCharacter].openAppIds,
    minimizedAppIds: state.workspaceByCharacter[state.currentCharacter].minimizedAppIds,
    selectedAppId: state.workspaceByCharacter[state.currentCharacter].selectedAppId,
    detailAppId: state.workspaceByCharacter[state.currentCharacter].detailAppId,
    focusOrder: active.focusOrder,
  };
}

/**
 * Calculate visible slots and overflow for up to 6 visible slots.
 * Excludes minimized and Home apps from pagination.
 * Returns visible app IDs (limited to 6) and overflow IDs with proper pagination.
 */
export function allocateVisibleAndOverflow(
  allOpenAppIds: readonly ShellAppId[],
  minimizedAppIds: readonly ShellAppId[],
  overflowPage: number = 0,
): {
  visibleAppIds: ShellAppId[];
  overflowAppIds: ShellAppId[];
  overflowCount: number;
  currentPage: number;
  totalPages: number;
} {
  const nonMinimizedApps = allOpenAppIds.filter((id) => !minimizedAppIds.includes(id));
  const MAX_VISIBLE = 6;

  if (nonMinimizedApps.length <= MAX_VISIBLE) {
    return {
      visibleAppIds: [...nonMinimizedApps],
      overflowAppIds: [],
      overflowCount: 0,
      currentPage: 0,
      totalPages: 1,
    };
  }

  const eligibleCount = nonMinimizedApps.length;
  const totalPages = Math.ceil(eligibleCount / MAX_VISIBLE);
  const clampedPage = Math.max(0, Math.min(overflowPage, totalPages - 1));
  
  const visibleAppIds = nonMinimizedApps.slice(0, MAX_VISIBLE);
  const overflowAppIds = nonMinimizedApps.slice(MAX_VISIBLE);

  return {
    visibleAppIds,
    overflowAppIds,
    overflowCount: overflowAppIds.length,
    currentPage: clampedPage,
    totalPages,
  };
}

export function shellStateFactory(): ShellState {
  const workspaceMap = {
    ONYX_ONLY: emptyPresentationWorkspace(),
    NOVA_ONLY: emptyPresentationWorkspace(),
    ONYX_AND_NOVA: emptyPresentationWorkspace(),
  } satisfies Record<ShellPresenceMode, PresentationWorkspace>;

  return {
    homeState: HOME_MINIMAL,
    presenceMode: "ONYX_ONLY",
    launcherMode: "FLOATING",
    currentCharacter: "nova",
    workspaceByCharacter: {
      nova: emptyCharacterWorkspaceState(),
      onyx: emptyCharacterWorkspaceState(),
    },
    technicalDetailsVisible: false,
    reducedMotion: false,
    presentationWorkspaces: workspaceMap,
  };
}

/**
 * Allocate card positions for visible (non-minimized, non-overflow) app IDs.
 * Always assigns exactly one position per app, supporting up to 6 slots.
 * Follows deterministic slot order: L1, L2, L3, R1, R2, R3
 */
export function allocateCardSlots(
  visibleAppIds: readonly ShellAppId[],
  preferredSelectedAppId?: ShellAppId | null,
): Map<ShellAppId, AppCardPosition> {
  const ordered = [...visibleAppIds];
  const slots = new Map<ShellAppId, AppCardPosition>();
  const positionOrder: AppCardPosition[] = [
    "LEFT_TOP",
    "LEFT_MIDDLE",
    "LEFT_BOTTOM",
    "RIGHT_TOP",
    "RIGHT_MIDDLE",
    "RIGHT_BOTTOM",
  ];

  // Assign positions in deterministic order
  ordered.forEach((appId, index) => {
    slots.set(appId, positionOrder[index] ?? "RIGHT_MIDDLE");
  });

  return slots;
}

/**
 * Get the current active character's workspace state
 */
export function getActiveWorkspace(state: ShellState): CharacterWorkspaceState {
  return migrateAutomaticCardPresentations(state.workspaceByCharacter[state.currentCharacter]);
}

/**
 * Get visible (non-minimized) app IDs for current character
 */
export function getVisibleAppIds(state: ShellState): ShellAppId[] {
  const active = getActiveWorkspace(state);
  return active.openAppIds.filter((id) => !active.minimizedAppIds.includes(id));
}

/**
 * Apply a workspace state to the active character
 */
function applyCharacterWorkspace(
  state: ShellState,
  next: CharacterWorkspaceState,
): ShellState {
  const updated = {
    ...state,
    workspaceByCharacter: {
      ...state.workspaceByCharacter,
      [state.currentCharacter]: next,
    },
  };
  return updated;
}

/**
 * Create a deep copy of workspace state for return snapshot
 */
function copyWorkspaceState(ws: CharacterWorkspaceState): CharacterWorkspaceState {
  return {
    ...ws,
    visibleSlotAssignments: new Map(ws.visibleSlotAssignments),
    cardPresentationByAppId: new Map(ws.cardPresentationByAppId),
    overflowAppIds: [...ws.overflowAppIds],
    openAppIds: [...ws.openAppIds],
    minimizedAppIds: [...ws.minimizedAppIds],
    detailReturnSnapshot: ws.detailReturnSnapshot ? copyWorkspaceState(ws.detailReturnSnapshot) : null,
  };
}

export function shellReducer(state: ShellState, intent: ShellIntent): ShellState {
  const active = migrateAutomaticCardPresentations(state.workspaceByCharacter[state.currentCharacter]);

  switch (intent.type) {
    case "OPEN_APP": {
      const appId = intent.appId;
      if (appId === "home") {
        // Home is special - close all apps instead
        return applyCharacterWorkspace(state, emptyCharacterWorkspaceState());
      }

      const isAlreadyOpen = active.openAppIds.includes(appId);
      if (isAlreadyOpen) {
        // App is already open - restore if minimized, otherwise just focus
        const isMinimized = active.minimizedAppIds.includes(appId);
        if (isMinimized) {
          const next: CharacterWorkspaceState = {
            ...active,
            minimizedAppIds: active.minimizedAppIds.filter((id) => id !== appId),
            selectedAppId: appId,
            detailAppId: null,
          };
          return applyCharacterWorkspace(state, next);
        } else {
          // Already open and visible - just select it
          const next: CharacterWorkspaceState = {
            ...active,
            selectedAppId: appId,
            detailAppId: null,
          };
          return applyCharacterWorkspace(state, next);
        }
      }

      // New app - add to open list and select
      const next: CharacterWorkspaceState = {
        ...active,
        openAppIds: [...active.openAppIds, appId],
        minimizedAppIds: active.minimizedAppIds.filter((id) => id !== appId),
        selectedAppId: appId,
        detailAppId: null,
        cardPresentationByAppId: new Map(active.cardPresentationByAppId).set(appId, {
          ...automaticCardCoordinatesForIndex(active.openAppIds.length),
          zIndex: 6,
          selected: true,
          hasManualPosition: false,
        }),
      };
      return applyCharacterWorkspace(state, next);
    }

    case "CLOSE_APP": {
      const appId = intent.appId;
      const next: CharacterWorkspaceState = {
        ...active,
        openAppIds: active.openAppIds.filter((id) => id !== appId),
        minimizedAppIds: active.minimizedAppIds.filter((id) => id !== appId),
        selectedAppId: active.selectedAppId === appId ? null : active.selectedAppId,
        detailAppId: active.detailAppId === appId ? null : active.detailAppId,
      };
      return applyCharacterWorkspace(state, next);
    }

    case "MINIMIZE_APP": {
      const appId = intent.appId;
      if (!active.openAppIds.includes(appId)) return state;
      const next: CharacterWorkspaceState = {
        ...active,
        minimizedAppIds: active.minimizedAppIds.includes(appId)
          ? active.minimizedAppIds
          : [...active.minimizedAppIds, appId],
        selectedAppId: active.selectedAppId === appId ? null : active.selectedAppId,
        detailAppId: active.detailAppId === appId ? null : active.detailAppId,
      };
      return applyCharacterWorkspace(state, next);
    }

    case "RESTORE_APP": {
      const appId = intent.appId;
      if (!active.openAppIds.includes(appId) || !active.minimizedAppIds.includes(appId)) {
        return state;
      }
      const next: CharacterWorkspaceState = {
        ...active,
        minimizedAppIds: active.minimizedAppIds.filter((id) => id !== appId),
        selectedAppId: appId,
      };
      return applyCharacterWorkspace(state, next);
    }

    case "FOCUS_APP": {
      const appId = intent.appId;
      if (!active.openAppIds.includes(appId)) return state;
      const next: CharacterWorkspaceState = {
        ...active,
        minimizedAppIds: active.minimizedAppIds.filter((id) => id !== appId),
        selectedAppId: appId,
        cardPresentationByAppId: new Map(
          [...active.cardPresentationByAppId.entries()].map(([id, presentation]) => [
            id,
            {
              ...presentation,
              zIndex: id === appId ? 6 : Math.max(1, presentation.zIndex - 1),
              selected: id === appId,
            },
          ]),
        ),
      };
      return applyCharacterWorkspace(state, next);
    }

    case "SET_CARD_POSITION": {
      if (!active.openAppIds.includes(intent.appId)) return state;
      const current = active.cardPresentationByAppId.get(intent.appId);
      if (!current) return state;
      const cardPresentationByAppId = new Map(active.cardPresentationByAppId);
      const nextPosition = clampCardPosition(intent.x, intent.y);
      cardPresentationByAppId.set(intent.appId, {
        ...current,
        x: nextPosition.x,
        y: nextPosition.y,
        hasManualPosition: true,
      });
      return applyCharacterWorkspace(state, { ...active, cardPresentationByAppId });
    }

    case "SET_CARD_POSITION_PREVIEW": {
      if (!active.openAppIds.includes(intent.appId)) return state;
      const current = active.cardPresentationByAppId.get(intent.appId);
      if (!current) return state;
      const cardPresentationByAppId = new Map(active.cardPresentationByAppId);
      cardPresentationByAppId.set(intent.appId, {
        ...current,
        x: Math.max(0, Math.min(72, intent.x)),
        y: Math.max(0, Math.min(72, intent.y)),
      });
      return applyCharacterWorkspace(state, { ...active, cardPresentationByAppId });
    }

    case "OPEN_DETAILS": {
      const appId = intent.appId;
      if (!active.openAppIds.includes(appId)) return state;
      
      // Capture current state as return snapshot BEFORE opening details
      const snapshot = copyWorkspaceState(active);
      
      const next: CharacterWorkspaceState = {
        ...active,
        selectedAppId: appId,
        detailAppId: appId,
        detailReturnSnapshot: snapshot,
      };
      return applyCharacterWorkspace(state, next);
    }

    case "CLOSE_DETAILS": {
      if (!active.detailAppId) return state;
      
      // If we have a return snapshot, restore to that exact state
      if (active.detailReturnSnapshot) {
        const restored: CharacterWorkspaceState = {
          ...active.detailReturnSnapshot,
          detailAppId: null,
          detailReturnSnapshot: null,
        };
        return applyCharacterWorkspace(state, restored);
      } else {
        // No snapshot - just close details
        const next: CharacterWorkspaceState = {
          ...active,
          detailAppId: null,
        };
        return applyCharacterWorkspace(state, next);
      }
    }

    case "CLOSE_ALL_APPS": {
      const next: CharacterWorkspaceState = emptyCharacterWorkspaceState();
      return applyCharacterWorkspace(state, next);
    }

    case "SET_OVERFLOW_PAGE": {
      const next: CharacterWorkspaceState = {
        ...active,
        overflowPage: intent.page,
      };
      return applyCharacterWorkspace(state, next);
    }

    case "SHOW_APP_LAUNCHER": {
      return { ...state, launcherMode: "FLOATING" };
    }

    case "HIDE_APP_LAUNCHER": {
      return { ...state, launcherMode: "HIDDEN" };
    }

    case "RETURN_HOME": {
      const next: CharacterWorkspaceState = emptyCharacterWorkspaceState();
      return applyCharacterWorkspace(state, next);
    }

    case "SET_PRESENCE_MODE": {
      // Update presence mode but keep character workspaces independent
      return { ...state, presenceMode: intent.mode };
    }

    default:
      return state;
  }
}

export function normalizeShellCommand(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SHELL_APP_ALIASES: Record<string, ShellAppId> = {
  home: "home",
  messages: "messages",
  message: "messages",
  inbox: "messages",
  tasks: "tasks",
  task: "tasks",
  news: "news",
  workspace: "workspace",
  files: "workspace",
  calendar: "calendar",
  automation: "automation",
  automations: "automation",
  settings: "settings",
  health: "health",
  system: "health",
  provider: "provider-health",
  "provider health": "provider-health",
};

export function resolveShellIntent(raw: string): ShellIntent | null {
  const text = normalizeShellCommand(raw);
  if (!text) return null;

  if (/^return home$|^go home$|^back to character view$/.test(text)) {
    return { type: "RETURN_HOME" };
  }
  if (/^close all panels$|^close all$|^close all apps$/.test(text)) {
    return { type: "CLOSE_ALL_APPS" };
  }
  if (/^switch to onyx$|^show only onyx$|^show onyx$/.test(text)) {
    return { type: "SET_PRESENCE_MODE", mode: "ONYX_ONLY" };
  }
  if (/^switch to nova$|^show only nova$|^show nova$/.test(text)) {
    return { type: "SET_PRESENCE_MODE", mode: "NOVA_ONLY" };
  }
  if (/^show onyx and nova$|^show both$|^show onyx and nova together$/.test(text)) {
    return { type: "SET_PRESENCE_MODE", mode: "ONYX_AND_NOVA" };
  }

  const detailsMatch = text.match(/^(open|show)\s+(.+)\s+details$/);
  if (detailsMatch) {
    const targetText = (detailsMatch[2] ?? "").trim();
    const appId = SHELL_APP_ALIASES[targetText] ?? SHELL_APP_ALIASES[targetText.replace(/\s+/g, " ")];
    if (appId) return { type: "OPEN_DETAILS", appId };
  }

  const match = text.match(/^(open|show|focus|minimize|close)\s+(.+)$/);
  if (match) {
    const verb = match[1] ?? "open";
    const targetText = (match[2] ?? "").trim();
    const appId = SHELL_APP_ALIASES[targetText] ?? SHELL_APP_ALIASES[targetText.replace(/\s+/g, " ")];
    if (!appId) return null;

    if (verb === "open") return { type: "OPEN_APP", appId };
    if (verb === "show") return { type: "OPEN_APP", appId };
    if (verb === "focus") return { type: "FOCUS_APP", appId };
    if (verb === "minimize") return { type: "MINIMIZE_APP", appId };
    if (verb === "close") return { type: "CLOSE_APP", appId };
  }

  return null;
}
