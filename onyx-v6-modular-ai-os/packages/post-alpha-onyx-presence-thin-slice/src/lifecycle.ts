import { deepFreeze, LIFECYCLE_STATES, type PresenceLifecycleState } from "./contracts";

export type LifecycleEvent = "INITIALIZE" | "STABILIZE" | "BEGIN_INPUT" | "INPUT_COMPLETE" | "BEGIN_REASONING" | "BEGIN_RESPONSE" | "COMPLETE_RESPONSE" | "INTERRUPT" | "RECOVER" | "RECOVERY_COMPLETE" | "DEPENDENCY_FAILED" | "PRIVACY_FAILURE" | "STOP";
export type FailureKind = "CANCELLED" | "INTERRUPTED" | "TIMEOUT" | "MODEL_UNAVAILABLE" | "TOOL_UNAVAILABLE" | "RENDERER_UNAVAILABLE" | "TV_UNAVAILABLE" | "AUDIO_UNAVAILABLE" | "EVIDENCE_UNAVAILABLE" | "MEMORY_UNAVAILABLE" | "PRIVACY_UNESTABLISHED";
export type RecoveryDependency = "model" | "tool" | "renderer" | "evidence" | "privacy";

const TRANSITIONS: Readonly<Record<PresenceLifecycleState, Partial<Record<LifecycleEvent, PresenceLifecycleState>>>> = {
  UNINITIALIZED: { INITIALIZE: "READY", STOP: "STOPPED" },
  READY: { STABILIZE: "IDLE", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  IDLE: { BEGIN_INPUT: "LISTENING", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  LISTENING: { INPUT_COMPLETE: "UNDERSTANDING", INTERRUPT: "INTERRUPTED", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  UNDERSTANDING: { BEGIN_REASONING: "THINKING", INTERRUPT: "INTERRUPTED", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  THINKING: { BEGIN_RESPONSE: "SPEAKING", INTERRUPT: "INTERRUPTED", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  SPEAKING: { COMPLETE_RESPONSE: "IDLE", INTERRUPT: "INTERRUPTED", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  INTERRUPTED: { RECOVER: "RECOVERING", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  PRIVACY_RESTRICTED: { RECOVER: "RECOVERING", STOP: "STOPPED" },
  RECOVERING: { RECOVERY_COMPLETE: "IDLE", DEPENDENCY_FAILED: "OFFLINE", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  OFFLINE: { RECOVER: "RECOVERING", PRIVACY_FAILURE: "PRIVACY_RESTRICTED", STOP: "STOPPED" },
  STOPPED: {},
};

export interface TransitionProjection {
  readonly state: PresenceLifecycleState;
  readonly authorizing: false;
  readonly operationalTruth: false;
  readonly immutable: true;
}

export function projectTransition(state: PresenceLifecycleState, event: LifecycleEvent): Readonly<TransitionProjection> {
  if (!(LIFECYCLE_STATES as readonly string[]).includes(state)) throw new TypeError("Unknown Presence lifecycle state");
  const next = TRANSITIONS[state][event];
  if (!next) throw new TypeError("Invalid Presence lifecycle transition");
  return deepFreeze({ state: next, authorizing: false as const, operationalTruth: false as const, immutable: true as const });
}

export function runLifecycle(initial: PresenceLifecycleState, events: readonly LifecycleEvent[]): readonly PresenceLifecycleState[] {
  let state = initial;
  const projected = events.map((event) => {
    state = projectTransition(state, event).state;
    return state;
  });
  return deepFreeze(projected);
}

export function projectFailure(state: PresenceLifecycleState, failure: FailureKind) {
  if (!(LIFECYCLE_STATES as readonly string[]).includes(state) || state === "STOPPED") throw new TypeError("Failure cannot be projected from this state");
  const interrupted = failure === "CANCELLED" || failure === "INTERRUPTED";
  const timeout = failure === "TIMEOUT";
  const privacyRestricted = failure === "PRIVACY_UNESTABLISHED";
  const unavailable = failure.endsWith("_UNAVAILABLE");
  const suppressed = interrupted || timeout || privacyRestricted;
  return deepFreeze({
    state: privacyRestricted ? "PRIVACY_RESTRICTED" as const : interrupted ? "INTERRUPTED" as const : "RECOVERING" as const,
    failure,
    responseSuppressed: suppressed,
    toolProjectionSuppressed: suppressed,
    presentationSuppressed: suppressed,
    speechSuppressed: suppressed,
    fallback: unavailable && failure !== "TOOL_UNAVAILABLE" && failure !== "EVIDENCE_UNAVAILABLE" ? "SAFE_TEXT" as const : null,
    assessability: failure === "TOOL_UNAVAILABLE" || failure === "EVIDENCE_UNAVAILABLE" ? "NOT_ASSESSABLE" as const : "ASSESSABLE" as const,
    authorizing: false as const,
  });
}

export interface RecoveryEvidenceEnvelope {
  readonly dependency: RecoveryDependency;
  readonly health: "RECOVERED" | "FAILED" | "UNKNOWN";
  readonly freshness: "CURRENT" | "STALE";
  readonly interactionId: string;
  readonly correlationId: string;
  readonly validated: boolean;
}

export function projectRecovery(state: PresenceLifecycleState, evidence: RecoveryEvidenceEnvelope) {
  if (state !== "RECOVERING") throw new TypeError("Recovery proof is only accepted from RECOVERING");
  const valid = evidence.health === "RECOVERED" && evidence.freshness === "CURRENT" && evidence.validated === true && evidence.interactionId.length > 0 && evidence.correlationId.length > 0;
  return deepFreeze({ state: valid ? "IDLE" as const : "RECOVERING" as const, evidence: structuredClone(evidence), proofAccepted: valid, authorizing: false as const });
}