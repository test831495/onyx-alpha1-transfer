import { createHash } from "node:crypto";

export const GOVERNANCE_FLAGS = Object.freeze({ owner_override_runtime: "OFF" as const });
export const RISK_CLASSES = ["R1", "R2", "R3", "R4"] as const;
export const OWNER_DECISIONS = ["APPROVE", "REJECT", "DEFER", "REVOKE", "SUSPEND", "REOPEN"] as const;

type OverrideRequest = {
  readonly requestId: string;
  readonly ownerId: "rahul-kumar";
  readonly actorClass: "PRIMARY_OWNER";
  readonly decision: typeof OWNER_DECISIONS[number];
  readonly riskClass: typeof RISK_CLASSES[number];
  readonly exactScope: readonly string[];
  readonly candidate: { readonly head: string; readonly tree: string };
  readonly policyVersion: string;
  readonly evidenceHash: string;
  readonly consequencePreviewHash: string;
  readonly observedVersion: number;
  readonly expiresAt: string;
};

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function canonicalConflictKey(scope: readonly string[]): string {
  return hash([...scope].sort());
}

export function validateOverrideRequest(request: OverrideRequest): Readonly<OverrideRequest> {
  if (request.ownerId !== "rahul-kumar" || request.actorClass !== "PRIMARY_OWNER" || !OWNER_DECISIONS.includes(request.decision) || !RISK_CLASSES.includes(request.riskClass) || request.exactScope.length === 0 || request.observedVersion < 0) throw new TypeError("Invalid Owner override request");
  return deepFreeze(structuredClone(request));
}

function bindingsMatch(request: OverrideRequest, current: OverrideRequest): boolean {
  return hash({ scope: [...request.exactScope].sort(), candidate: request.candidate, policyVersion: request.policyVersion, evidenceHash: request.evidenceHash, consequencePreviewHash: request.consequencePreviewHash }) === hash({ scope: [...current.exactScope].sort(), candidate: current.candidate, policyVersion: current.policyVersion, evidenceHash: current.evidenceHash, consequencePreviewHash: current.consequencePreviewHash });
}

export function projectAuthorization(input: { readonly request: OverrideRequest; readonly now: string; readonly currentVersion: number; readonly blockerStatus: "CLEAR" | "BLOCKED"; readonly verificationOutcome: "PASS" | "FAIL" | "NOT_ASSESSABLE"; readonly ownerDisposition: "APPROVED" | "REJECTED" | "NOT_RECORDED"; readonly currentBindings: OverrideRequest }) {
  validateOverrideRequest(input.request);
  const effectiveAuthorization = input.blockerStatus === "CLEAR" && input.verificationOutcome === "PASS" && input.ownerDisposition === "APPROVED" && input.currentVersion === input.request.observedVersion && Date.parse(input.request.expiresAt) > Date.parse(input.now) && bindingsMatch(input.request, input.currentBindings) ? "BOUNDED_ONLY" : "DENIED";
  return deepFreeze({ verificationOutcome: input.verificationOutcome, blockerStatus: input.blockerStatus, ownerDisposition: input.ownerDisposition, effectiveAuthorization });
}

export function classifyConcurrentRequest(existing: OverrideRequest, incoming: OverrideRequest): "EXACT_DUPLICATE" | "STALE_REVIEW_REQUIRED" | "CONTRADICTORY_CONFLICT" | "INDEPENDENT" {
  if (hash(existing) === hash(incoming)) return "EXACT_DUPLICATE";
  if (incoming.observedVersion !== existing.observedVersion) return "STALE_REVIEW_REQUIRED";
  if (canonicalConflictKey(existing.exactScope) === canonicalConflictKey(incoming.exactScope) && existing.decision !== incoming.decision) return "CONTRADICTORY_CONFLICT";
  return "INDEPENDENT";
}

export function projectSessionRevocation(sessions: readonly string[], current: string, action: "REVOKE_ALL" | "REVOKE_OTHER"): readonly string[] {
  return Object.freeze(action === "REVOKE_ALL" ? [] : sessions.filter((session) => session === current));
}

export function projectLease(lease: { readonly leaseId: string; readonly ownerToken: string; readonly fencingToken: number; readonly expiresAt: string }, now: string) {
  return deepFreeze({ ...lease, state: Date.parse(lease.expiresAt) <= Date.parse(now) ? "EXPIRED" : "PROJECTED", authorizing: false as const });
}

export function redisCompareAndDelete(storedToken: string | undefined, presentedToken: string): boolean {
  return storedToken !== undefined && storedToken === presentedToken;
}

export function appendAuditEvent<T extends { readonly id: string; readonly previousHash: string | null }>(events: readonly T[], event: T): readonly Readonly<T>[] {
  if (events.some((entry) => entry.id === event.id)) throw new TypeError("Audit event IDs are append-only");
  return deepFreeze([...structuredClone(events), structuredClone(event)]);
}

export interface ConsequencePreview { readonly exactScope: readonly string[]; readonly riskClass: typeof RISK_CLASSES[number]; readonly effects: readonly string[]; readonly rollback: string; }
export interface SessionEpoch { readonly accountId: string; readonly epoch: number; readonly observedEpoch: number; }
export interface DurableLeaseContract { readonly leaseId: string; readonly ownerToken: string; readonly fencingToken: number; readonly mutating: false; }

// CORR-GOV-001: complete freshness dependency/invalidation vocabulary and evaluator.
export const GOV_FRESHNESS_DEPENDENCIES = Object.freeze([
  "CANDIDATE_HEAD_AND_TREE",
  "PROTECTED_SOURCE_AND_TEST_FINGERPRINTS",
  "POLICY_VERSION",
  "ACCEPTANCE_REGISTRY_VERSION",
  "DEPENDENCY_LOCK_BINDING",
  "TOOLCHAIN_AND_VALIDATION_PROFILE",
  "ENVIRONMENT_PROFILE",
  "FEATURE_FLAG_SNAPSHOT",
  "DEPENDENT_EVIDENCE_IDS",
  "GENERATION_TIMESTAMP",
  "VALIDITY_WINDOW",
] as const);

export const GOV_INVALIDATION_TRIGGERS = Object.freeze([
  "CANDIDATE_HEAD_OR_TREE_CHANGE",
  "PROTECTED_HASH_CHANGE",
  "POLICY_VERSION_CHANGE",
  "ACCEPTANCE_REGISTRY_CHANGE",
  "DEPENDENCY_LOCK_CHANGE",
  "TOOLCHAIN_OR_PROFILE_CHANGE",
  "ENVIRONMENT_PROFILE_CHANGE",
  "FEATURE_FLAG_SNAPSHOT_CHANGE",
  "CONFLICTING_CURRENT_EVIDENCE",
  "SECURITY_INCIDENT",
  "OWNER_SCOPE_CHANGE",
  "SUPERSEDING_ACCEPTED_EVIDENCE",
] as const);

export const GOV_FRESHNESS_STATES = ["CURRENT", "STALE", "EXPIRED", "INVALIDATED", "SUPERSEDED", "NOT_ASSESSABLE"] as const;
export type GovFreshnessState = typeof GOV_FRESHNESS_STATES[number];

export interface GovernanceFreshnessBinding {
  readonly candidateHead: string;
  readonly candidateTree: string;
  readonly protectedFingerprint: string;
  readonly policyVersion: string;
  readonly acceptanceRegistryVersion: string;
  readonly dependencyLockHash: string;
  readonly toolchainProfile: string;
  readonly environmentProfile: string;
  readonly featureFlagSnapshotHash: string;
  readonly dependentEvidenceIds: readonly string[];
  readonly validUntil?: string;
}

export function evaluateGovernanceFreshness(
  binding: GovernanceFreshnessBinding | undefined,
  current: GovernanceFreshnessBinding & { readonly now: string; readonly conflictingCurrentEvidence?: boolean; readonly securityIncident?: boolean; readonly ownerScopeChanged?: boolean; readonly superseded?: boolean },
): GovFreshnessState {
  if (!binding) return "NOT_ASSESSABLE";
  if (current.conflictingCurrentEvidence || current.securityIncident) return "INVALIDATED";
  if (current.superseded) return "SUPERSEDED";
  const unchanged = binding.candidateHead === current.candidateHead
    && binding.candidateTree === current.candidateTree
    && binding.protectedFingerprint === current.protectedFingerprint
    && binding.policyVersion === current.policyVersion
    && binding.acceptanceRegistryVersion === current.acceptanceRegistryVersion
    && binding.dependencyLockHash === current.dependencyLockHash
    && binding.toolchainProfile === current.toolchainProfile
    && binding.environmentProfile === current.environmentProfile
    && binding.featureFlagSnapshotHash === current.featureFlagSnapshotHash
    && current.ownerScopeChanged !== true;
  if (!unchanged) return "STALE";
  if (binding.validUntil && Date.parse(binding.validUntil) <= Date.parse(current.now)) return "EXPIRED";
  return "CURRENT";
}

// CORR-GOV-002: complete override lifecycle, including suspension, revocation, and reopening.
export const OVERRIDE_LIFECYCLE_STATES = ["REQUESTED", "ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED", "REOPENED", "CLOSED"] as const;
export type OverrideLifecycleState = typeof OVERRIDE_LIFECYCLE_STATES[number];
type OverrideLifecycleAction = "APPROVE" | "EXPIRE" | "SUSPEND" | "REVOKE" | "REOPEN" | "CLOSE";

const OVERRIDE_TRANSITIONS: Record<OverrideLifecycleState, Partial<Record<OverrideLifecycleAction, OverrideLifecycleState>>> = {
  REQUESTED: { APPROVE: "ACTIVE", REVOKE: "REVOKED" },
  ACTIVE: { EXPIRE: "EXPIRED", SUSPEND: "SUSPENDED", REVOKE: "REVOKED", CLOSE: "CLOSED" },
  SUSPENDED: { REOPEN: "REOPENED", REVOKE: "REVOKED" },
  REOPENED: { EXPIRE: "EXPIRED", SUSPEND: "SUSPENDED", REVOKE: "REVOKED", CLOSE: "CLOSED" },
  EXPIRED: { REOPEN: "REOPENED" },
  REVOKED: {},
  CLOSED: {},
};

export function transitionOverrideLifecycle(state: OverrideLifecycleState, action: OverrideLifecycleAction, actorClass: "PRIMARY_OWNER" | "AGENT" | "ONYX" | "NOVA"): OverrideLifecycleState {
  if (actorClass !== "PRIMARY_OWNER") throw new TypeError("Only Rahul as PRIMARY_OWNER may transition override lifecycle");
  const next = OVERRIDE_TRANSITIONS[state]?.[action];
  if (!next) throw new TypeError("Invalid override lifecycle transition");
  return next;
}