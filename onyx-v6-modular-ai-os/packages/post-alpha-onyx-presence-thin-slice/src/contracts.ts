export const LIFECYCLE_STATES = [
  "UNINITIALIZED",
  "READY",
  "IDLE",
  "LISTENING",
  "UNDERSTANDING",
  "THINKING",
  "SPEAKING",
  "INTERRUPTED",
  "PRIVACY_RESTRICTED",
  "RECOVERING",
  "OFFLINE",
  "STOPPED",
] as const;

export const FLAG_MATURITY = ["OFF", "SYNTHETIC_ONLY", "OWNER_CANARY", "OWNER_ACTIVE", "GENERAL_ACTIVE"] as const;
export const ALLOWED_FOUNDATION_DEPENDENCIES = Object.freeze([
  "@onyx/post-alpha-governance-foundation",
  "@onyx/post-alpha-intelligence-foundation",
  "@onyx/post-alpha-avatar-foundation",
] as const);

export type PresenceLifecycleState = typeof LIFECYCLE_STATES[number];
export type PresenceFlagMaturity = typeof FLAG_MATURITY[number];
export type IntelSemanticState = "BOUND_INPUT" | "RESOLVE_EVIDENCE" | "CONFLICT_CHECK" | "MEMORY_PROJECT" | "MODEL_RESPOND";
export type AvatarSemanticState = "IDLE" | "LISTENING" | "UNDERSTANDING" | "THINKING" | "SPEAKING" | "INTERRUPTED";

export interface FoundationCompatibilityBinding {
  readonly intelligenceState: IntelSemanticState;
  readonly avatarState: AvatarSemanticState;
}

export interface PresenceContract {
  readonly workstream: "PA-PRESENCE-01";
  readonly owner: "rahul-kumar";
  readonly runtimeActivation: false;
  readonly authorizing: false;
}

export const PRESENCE_RUNTIME_FLAG = Object.freeze({
  name: "onyx_presence_thin_slice_runtime",
  owner: "PA-PRESENCE-01",
  state: "OFF" as const,
  implementationEqualsActivation: false,
  evidenceRequiredForPromotion: true,
  rahulDecisionRequiredForPromotion: true,
  rollbackState: "OFF" as const,
  activationSeparatelyAuthorized: false,
  reusesExistingFlag: false,
  predecessorFlagsRemainOff: true,
});

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

export function validatePresenceContract(contract: PresenceContract): Readonly<PresenceContract> {
  const keys = Object.keys(contract).sort();
  const expected = ["authorizing", "owner", "runtimeActivation", "workstream"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new TypeError("Unknown or missing Presence contract field");
  if (contract.workstream !== "PA-PRESENCE-01" || contract.owner !== "rahul-kumar" || contract.runtimeActivation !== false || contract.authorizing !== false) throw new TypeError("Presence contracts are owner-bound, inactive, and non-authorizing");
  return deepFreeze(structuredClone(contract));
}