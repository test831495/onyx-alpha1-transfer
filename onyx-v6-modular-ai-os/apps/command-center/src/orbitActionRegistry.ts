import type { ShellAppId } from "./shellState";

/**
 * Canonical stable-ID orbit action registry for the ONYX/NOVA HeroCore action
 * ring. This is the single source of truth for what orbit nodes exist, what
 * they are allowed to do, and how they must be dispatched. No orbit node may
 * be rendered or dispatched by raw visible label; every node must resolve
 * through this registry by its stable `id`.
 */

export type OrbitCharacter = "onyx" | "nova";

export type OrbitActionKind =
  | "NAVIGATION"
  | "REGISTERED_ACTION"
  | "DISABLED_UNAVAILABLE";

export type OrbitAuthorityClassification = "NONE";
export type OrbitPrivacyClassification = "NONE";

export type OrbitActionHandler =
  | { readonly kind: "OPEN_SHELL_APP"; readonly appId: ShellAppId }
  | { readonly kind: "VOICE_LISTEN" }
  | { readonly kind: "ASSISTANT_SWITCH" };

export interface OrbitActionDefinition {
  readonly id: string;
  readonly character: OrbitCharacter;
  readonly label: string;
  readonly shortLabel: string;
  readonly angle: number;
  readonly kind: OrbitActionKind;
  /** Present only when `kind !== "DISABLED_UNAVAILABLE"`. */
  readonly handler?: OrbitActionHandler;
  /** Present only when `kind === "DISABLED_UNAVAILABLE"`. */
  readonly disabledReason?: string;
  readonly authority: OrbitAuthorityClassification;
  readonly privacy: OrbitPrivacyClassification;
}

export const ORBIT_ACTION_REGISTRY: readonly OrbitActionDefinition[] = [
  {
    id: "nova.listen",
    character: "nova",
    label: "Listen",
    shortLabel: "Listen",
    angle: 0,
    kind: "REGISTERED_ACTION",
    handler: { kind: "VOICE_LISTEN" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "nova.tasks",
    character: "nova",
    label: "Tasks",
    shortLabel: "Tasks",
    angle: 60,
    kind: "NAVIGATION",
    handler: { kind: "OPEN_SHELL_APP", appId: "tasks" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "nova.files",
    character: "nova",
    label: "Files",
    shortLabel: "Files",
    angle: 120,
    kind: "DISABLED_UNAVAILABLE",
    disabledReason: "Files is not available in this Alpha.",
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "nova.calendar",
    character: "nova",
    label: "Calendar",
    shortLabel: "Calendar",
    angle: 180,
    kind: "NAVIGATION",
    handler: { kind: "OPEN_SHELL_APP", appId: "calendar" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "nova.system",
    character: "nova",
    label: "System",
    shortLabel: "System",
    angle: 240,
    kind: "NAVIGATION",
    handler: { kind: "OPEN_SHELL_APP", appId: "health" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "nova.switch",
    character: "nova",
    label: "Switch to ONYX",
    shortLabel: "Switch",
    angle: 300,
    kind: "REGISTERED_ACTION",
    handler: { kind: "ASSISTANT_SWITCH" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.listen",
    character: "onyx",
    label: "Listen",
    shortLabel: "Listen",
    angle: 0,
    kind: "REGISTERED_ACTION",
    handler: { kind: "VOICE_LISTEN" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.executive",
    character: "onyx",
    label: "Executive",
    shortLabel: "Executive",
    angle: 60,
    kind: "DISABLED_UNAVAILABLE",
    disabledReason: "Executive is not available in this Alpha.",
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.finance",
    character: "onyx",
    label: "Finance",
    shortLabel: "Finance",
    angle: 120,
    kind: "DISABLED_UNAVAILABLE",
    disabledReason: "Finance is not available in this Alpha.",
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.news",
    character: "onyx",
    label: "News",
    shortLabel: "News",
    angle: 180,
    kind: "NAVIGATION",
    handler: { kind: "OPEN_SHELL_APP", appId: "news" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.automation",
    character: "onyx",
    label: "Automation",
    shortLabel: "Auto",
    angle: 240,
    kind: "NAVIGATION",
    handler: { kind: "OPEN_SHELL_APP", appId: "automation" },
    authority: "NONE",
    privacy: "NONE",
  },
  {
    id: "onyx.switch",
    character: "onyx",
    label: "Switch to NOVA",
    shortLabel: "Switch",
    angle: 300,
    kind: "REGISTERED_ACTION",
    handler: { kind: "ASSISTANT_SWITCH" },
    authority: "NONE",
    privacy: "NONE",
  },
];

export function getOrbitActions(
  character: OrbitCharacter,
): readonly OrbitActionDefinition[] {
  return ORBIT_ACTION_REGISTRY.filter((entry) => entry.character === character);
}

export function findOrbitAction(id: string): OrbitActionDefinition | undefined {
  return ORBIT_ACTION_REGISTRY.find((entry) => entry.id === id);
}

/**
 * Resolve a stable orbit action ID to its dispatchable handler. Returns
 * `undefined` for unknown IDs and for disabled/unavailable actions, which
 * fails closed: no handler means no dispatch, no intent-engine fallback, and
 * no RECOVERING transition.
 */
export function resolveOrbitHandler(id: string): OrbitActionHandler | undefined {
  const definition = findOrbitAction(id);
  if (!definition || definition.kind === "DISABLED_UNAVAILABLE") {
    return undefined;
  }
  return definition.handler;
}

/**
 * Validates the registry contract: stable, duplicate-free IDs; every
 * enabled entry has exactly one handler; every disabled entry has no
 * handler and a disabled reason.
 */
export function validateOrbitRegistry(
  registry: readonly OrbitActionDefinition[] = ORBIT_ACTION_REGISTRY,
): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const entry of registry) {
    if (seenIds.has(entry.id)) {
      errors.push(`Duplicate orbit action ID: ${entry.id}`);
    }
    seenIds.add(entry.id);

    if (entry.kind === "DISABLED_UNAVAILABLE") {
      if (entry.handler) {
        errors.push(`Disabled orbit action must not have a handler: ${entry.id}`);
      }
      if (!entry.disabledReason) {
        errors.push(`Disabled orbit action missing disabledReason: ${entry.id}`);
      }
    } else if (!entry.handler) {
      errors.push(`Enabled orbit action missing a handler: ${entry.id}`);
    }
  }

  return errors;
}
