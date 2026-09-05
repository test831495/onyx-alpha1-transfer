import { createHash } from "node:crypto";

export type SuccessResult<T> = Readonly<{ ok: true; value: Readonly<T> }>;
export type ErrorResult = Readonly<{ ok: false; errorCode: string; message?: string }>;
export type Result<T> = SuccessResult<T> | ErrorResult;

const ok = <T>(value: T): SuccessResult<T> => deepFreeze({ ok: true as const, value });
const error = (errorCode: string, message?: string): ErrorResult => deepFreeze(message ? { ok: false as const, errorCode, message } : { ok: false as const, errorCode });
const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const bounded = (value: unknown, maximum = 128): value is string => typeof value === "string" && value.length > 0 && value.length <= maximum;
const finiteUnit = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const finiteNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const sameKeys = (value: object, allowed: readonly string[]): boolean => Object.keys(value).every((key) => allowed.includes(key));

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value as Readonly<T>;
}

function cloneFreeze<T>(value: T): Readonly<T> { return deepFreeze(structuredClone(value)); }

export const CHARACTER_DEVICE_CLASSES = ["WEB", "DESKTOP", "PHONE", "TABLET", "TV", "FUTURE_XR"] as const;
export type CharacterDeviceClass = (typeof CHARACTER_DEVICE_CLASSES)[number];
export type CharacterId = "ONYX" | "NOVA";

export const MINIATURE_AGENT_ROLES = ["RESEARCH", "VALIDATION", "BUILD", "TEST", "MEMORY", "GOVERNANCE", "SYNC", "RECOVERY", "SECURITY", "COST", "REPORTING", "ROUTING"] as const;
export type MiniatureAgentRole = (typeof MINIATURE_AGENT_ROLES)[number];
export const MINIATURE_AGENT_STATES = ["IDLE", "RECEIVING_TASK", "WORKING", "WAITING", "VALIDATING", "HANDOFF", "COMPLETED", "BLOCKED", "RECOVERING", "OFFLINE"] as const;
export type MiniatureAgentState = (typeof MINIATURE_AGENT_STATES)[number];

export const MODEL_ROUTER_REASON_CODES = [
  "CAPABILITY_MISMATCH", "PRIVACY_POLICY_DENIED", "RESIDENCY_DENIED", "BUDGET_DENIED", "CANDIDATE_UNHEALTHY",
  "EVIDENCE_EXPIRED", "PROVIDER_DISABLED", "OPERATING_MODE_DENIED", "APPROVAL_REQUIRED", "POLICY_CONTEXT_INVALID",
  "POLICY_UNAVAILABLE", "CANDIDATE_SNAPSHOT_INVALID", "TRUSTED_TIME_UNAVAILABLE",
] as const;
export type ModelRouterReasonCode = (typeof MODEL_ROUTER_REASON_CODES)[number];
export type EligibilityOutcome = "ELIGIBLE" | "INELIGIBLE" | "NOT_ASSESSABLE";
export type TrustedFactProvenance = Readonly<{ source: "SERVER_AUTHORITY" | "OWNER_FIXTURE" | "TEST_HARNESS"; receiptId: string; trustedTime: number }>;

const requirementKeys = ["quality", "privacy", "reliability", "latency", "cost", "portability"] as const;
type RequirementKey = (typeof requirementKeys)[number];
type TrustedContextInput = Readonly<{
  requestClassification: string;
  sessionAssurance: "low" | "standard" | "strong";
  approvalRequired: boolean;
  approvalPresent: boolean;
  operatingMode: "ASSISTED" | "AUTONOMOUS_DISABLED" | "REVIEW";
  trustedTime?: number;
  region?: string;
  budget?: number;
  requirements?: Readonly<Partial<Record<RequirementKey, number>>>;
  policyAvailable?: boolean;
  requiredCapability?: string;
  privacyPolicyAllowed?: boolean;
  allowedOperatingModes?: readonly TrustedContextInput["operatingMode"][];
  provenance?: TrustedFactProvenance;
}>;

export type TrustedContextEnvelope = Readonly<TrustedContextInput & { schemaVersion: "TRUSTED_CONTEXT_V1"; contextHash: string }>;
export type CandidateEvidence = Readonly<{ quality: number; privacy: number; reliability: number; latency: number; cost: number; portability: number; freshAt: number }>;
export type CandidateSnapshot = Readonly<{
  candidateId: string;
  capability: string;
  lifecycle: "ACTIVE" | "DISABLED" | "REVOKED";
  health: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  region: string;
  snapshotVersion: string;
  snapshotHash: string;
  evidence: CandidateEvidence;
}>;
export type EligibilityDecision = Readonly<{ outcome: EligibilityOutcome; candidateId: string; reasonCodes: readonly ModelRouterReasonCode[]; policyVersion: string }>;
export interface PolicyDecisionPoint { decideEligibility(context: TrustedContextEnvelope, candidate: CandidateSnapshot, evidenceMaxAge?: number): EligibilityDecision }

const trustedContextKeys = ["requestClassification", "sessionAssurance", "approvalRequired", "approvalPresent", "operatingMode", "trustedTime", "region", "budget", "requirements", "policyAvailable", "requiredCapability", "privacyPolicyAllowed", "allowedOperatingModes", "provenance"] as const;
const routeDecisionKeys = ["routeDecisionId", "requestClassification", "eligibleCandidateIds", "selectedCandidateId", "policyVersion", "scoringProfileVersion", "candidateSnapshotVersion", "candidateSnapshotHash", "reasonCodes", "scoreComponents", "trustedDecisionTime", "fallbackClass", "approvalRequired"] as const;
const miniatureAgentKeys = ["role", "state", "activityType", "status", "sourceId", "trustedTime"] as const;
const forbiddenContextKeys = new Set(["prompt", "rawPrompt", "secrets", "credentials", "privateMemory", "conversationHistory", "biometrics", "animationState", "authorityToken", "endpoint", "privatePolicyContext", "reasoning", "householdData"]);

function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new TypeError("UNSUPPORTED_CONTEXT_VALUE");
  return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

function validateRequirements(requirements: TrustedContextInput["requirements"]): boolean {
  return requirements === undefined || (typeof requirements === "object" && sameKeys(requirements, requirementKeys) && Object.values(requirements).every((value) => value === undefined || finiteUnit(value)));
}

export function createTrustedContext(input: TrustedContextInput): Result<TrustedContextEnvelope> {
  if (!input || typeof input !== "object" || !sameKeys(input as object, trustedContextKeys) || Object.keys(input as object).some((key) => forbiddenContextKeys.has(key))) return error("POLICY_CONTEXT_INVALID");
  if (!bounded(input.requestClassification) || !["low", "standard", "strong"].includes(input.sessionAssurance) || !["ASSISTED", "AUTONOMOUS_DISABLED", "REVIEW"].includes(input.operatingMode)) return error("POLICY_CONTEXT_INVALID");
  if (typeof input.approvalRequired !== "boolean" || typeof input.approvalPresent !== "boolean" || (input.trustedTime !== undefined && !finiteNonNegative(input.trustedTime))) return error("POLICY_CONTEXT_INVALID");
  if (input.budget !== undefined && !finiteNonNegative(input.budget)) return error("POLICY_CONTEXT_INVALID");
  if ((input.region !== undefined && !bounded(input.region)) || (input.requiredCapability !== undefined && !bounded(input.requiredCapability))) return error("POLICY_CONTEXT_INVALID");
  if ((input.policyAvailable !== undefined && typeof input.policyAvailable !== "boolean") || (input.privacyPolicyAllowed !== undefined && typeof input.privacyPolicyAllowed !== "boolean")) return error("POLICY_CONTEXT_INVALID");
  if (input.allowedOperatingModes !== undefined && (!Array.isArray(input.allowedOperatingModes) || input.allowedOperatingModes.some((mode) => !["ASSISTED", "AUTONOMOUS_DISABLED", "REVIEW"].includes(mode)))) return error("POLICY_CONTEXT_INVALID");
  if (!validateRequirements(input.requirements)) return error("POLICY_CONTEXT_INVALID");
  const context = { ...structuredClone(input), schemaVersion: "TRUSTED_CONTEXT_V1" as const };
  return ok({ ...context, contextHash: sha256(canonical(context)) });
}

function canonicalCandidate(candidate: CandidateSnapshot): Omit<CandidateSnapshot, "snapshotHash"> {
  const { snapshotHash: _snapshotHash, ...rest } = candidate;
  return rest;
}

export function computeCandidateSetSnapshotHash(candidates: readonly CandidateSnapshot[]): string {
  return sha256(canonical({ candidates: candidates.map(canonicalCandidate).sort((left, right) => left.candidateId.localeCompare(right.candidateId)) }));
}

function validSnapshot(candidate: CandidateSnapshot): boolean {
  return Boolean(candidate && typeof candidate === "object")
    && sameKeys(candidate, ["candidateId", "capability", "lifecycle", "health", "region", "snapshotVersion", "snapshotHash", "evidence"])
    && bounded(candidate.candidateId) && bounded(candidate.capability) && bounded(candidate.snapshotVersion) && /^[0-9a-f]{64}$/.test(candidate.snapshotHash) && bounded(candidate.region)
    && ["ACTIVE", "DISABLED", "REVOKED"].includes(candidate.lifecycle) && ["HEALTHY", "DEGRADED", "UNHEALTHY"].includes(candidate.health)
    && sameKeys(candidate.evidence, ["quality", "privacy", "reliability", "latency", "cost", "portability", "freshAt"])
    && requirementKeys.every((key) => finiteUnit(candidate.evidence[key])) && finiteNonNegative(candidate.evidence.freshAt);
}

export function decideEligibility(context: TrustedContextEnvelope, candidate: CandidateSnapshot, evidenceMaxAge = 300): EligibilityDecision {
  const reasons: ModelRouterReasonCode[] = [];
  if (!context || typeof context !== "object" || context.schemaVersion !== "TRUSTED_CONTEXT_V1" || !/^[0-9a-f]{64}$/.test(context.contextHash)) reasons.push("POLICY_CONTEXT_INVALID");
  if (context?.policyAvailable === false) reasons.push("POLICY_UNAVAILABLE");
  if (!finiteNonNegative(context?.trustedTime)) reasons.push("TRUSTED_TIME_UNAVAILABLE");
  if (!validSnapshot(candidate)) reasons.push("CANDIDATE_SNAPSHOT_INVALID");
  if (candidate.lifecycle !== "ACTIVE") reasons.push("PROVIDER_DISABLED");
  if (context.region && candidate.region !== context.region) reasons.push("RESIDENCY_DENIED");
  if (context.requiredCapability && candidate.capability !== context.requiredCapability) reasons.push("CAPABILITY_MISMATCH");
  if (context.privacyPolicyAllowed === false) reasons.push("PRIVACY_POLICY_DENIED");
  if ((context.allowedOperatingModes && !context.allowedOperatingModes.includes(context.operatingMode)) || context.operatingMode === "AUTONOMOUS_DISABLED") reasons.push("OPERATING_MODE_DENIED");
  if (context.approvalRequired && !context.approvalPresent) reasons.push("APPROVAL_REQUIRED");
  if (context.budget !== undefined && candidate.evidence.cost > context.budget) reasons.push("BUDGET_DENIED");
  if (context.trustedTime !== undefined && context.trustedTime - candidate.evidence.freshAt > evidenceMaxAge) reasons.push("EVIDENCE_EXPIRED");
  for (const key of requirementKeys) if (context.requirements?.[key] !== undefined && candidate.evidence[key] < context.requirements[key]) reasons.push(key === "privacy" ? "PRIVACY_POLICY_DENIED" : key === "cost" ? "BUDGET_DENIED" : "CAPABILITY_MISMATCH");
  const uniqueReasons = [...new Set(reasons)];
  const notAssessable = uniqueReasons.some((reason) => ["POLICY_CONTEXT_INVALID", "POLICY_UNAVAILABLE", "TRUSTED_TIME_UNAVAILABLE", "CANDIDATE_SNAPSHOT_INVALID"].includes(reason));
  return deepFreeze({ outcome: uniqueReasons.length === 0 ? "ELIGIBLE" : notAssessable ? "NOT_ASSESSABLE" : "INELIGIBLE", candidateId: candidate.candidateId, reasonCodes: uniqueReasons, policyVersion: "pdp-v1" });
}

export type RouteDecision = Readonly<{
  routeDecisionId: string;
  requestClassification: string;
  eligibleCandidateIds: readonly string[];
  selectedCandidateId: string | null;
  policyVersion: string;
  scoringProfileVersion: string;
  candidateSnapshotVersion: string;
  candidateSnapshotHash: string;
  reasonCodes: readonly ModelRouterReasonCode[];
  scoreComponents: Readonly<Record<string, Readonly<Record<string, number>>>>;
  trustedDecisionTime: number | null;
  fallbackClass: "NONE" | "NO_ELIGIBLE_CANDIDATE" | "NOT_ASSESSABLE";
  approvalRequired: boolean;
}>;
export interface ModelRouter { routeModel(context: TrustedContextEnvelope, candidates: readonly CandidateSnapshot[]): Result<RouteDecision> }

function score(evidence: CandidateEvidence): number { return (evidence.quality + evidence.privacy + evidence.reliability + evidence.latency + (1 - evidence.cost) + evidence.portability) / 6; }

export function routeModel(context: TrustedContextEnvelope, candidates: readonly CandidateSnapshot[]): Result<RouteDecision> {
  if (!Array.isArray(candidates) || candidates.length > 32) return error("CANDIDATE_SET_OVER_BOUND");
  const ids = candidates.map((candidate) => candidate.candidateId);
  if (new Set(ids).size !== ids.length) return error("DUPLICATE_CANDIDATE_ID");
  const aggregateHash = candidates.length ? computeCandidateSetSnapshotHash(candidates) : sha256("none");
  if (candidates.some((candidate) => !validSnapshot(candidate) || candidate.snapshotHash !== aggregateHash)) return error("CANDIDATE_SNAPSHOT_INVALID");
  const checks = candidates.map((candidate) => ({ candidate, decision: decideEligibility(context, candidate) }));
  const eligible = checks.filter((entry) => entry.decision.outcome === "ELIGIBLE");
  const scoreComponents: Record<string, Readonly<Record<string, number>>> = {};
  for (const entry of eligible) scoreComponents[entry.candidate.candidateId] = deepFreeze({ ...entry.candidate.evidence, score: score(entry.candidate.evidence) });
  const epsilon = 1e-9;
  const ranked = [...eligible].sort((left, right) => {
    const rightScore = scoreComponents[right.candidate.candidateId]?.score ?? 0;
    const leftScore = scoreComponents[left.candidate.candidateId]?.score ?? 0;
    if (Math.abs(rightScore - leftScore) > epsilon) return rightScore > leftScore ? 1 : -1;
    return left.candidate.candidateId.localeCompare(right.candidate.candidateId);
  });
  const selected = ranked[0]?.candidate;
  const reasonCodes = eligible.length ? [] : [...new Set(checks.flatMap((entry) => entry.decision.reasonCodes))];
  const fallbackClass = selected ? "NONE" : reasonCodes.some((reason) => ["POLICY_CONTEXT_INVALID", "POLICY_UNAVAILABLE", "TRUSTED_TIME_UNAVAILABLE", "CANDIDATE_SNAPSHOT_INVALID"].includes(reason)) ? "NOT_ASSESSABLE" : "NO_ELIGIBLE_CANDIDATE";
  const seed = canonical({ request: context.requestClassification, ids: eligible.map((entry) => entry.candidate.candidateId).sort(), aggregateHash, time: context.trustedTime ?? null, reasons: reasonCodes });
  return ok({ routeDecisionId: `route_${sha256(seed).slice(0, 24)}`, requestClassification: context.requestClassification, eligibleCandidateIds: eligible.map((entry) => entry.candidate.candidateId).sort(), selectedCandidateId: selected?.candidateId ?? null, policyVersion: "pdp-v1", scoringProfileVersion: "score-v1", candidateSnapshotVersion: `candidate-set:${aggregateHash.slice(0, 16)}`, candidateSnapshotHash: aggregateHash, reasonCodes, scoreComponents: deepFreeze(scoreComponents), trustedDecisionTime: context.trustedTime ?? null, fallbackClass, approvalRequired: context.approvalRequired });
}

export type RouteProjection = Readonly<{ routeProjectionId: string; activityType: "MODEL_ROUTING"; status: "EVALUATING" | "ROUTED" | "BLOCKED" | "FALLBACK" | "RECOVERING"; routeClass: "SELECTED" | "NO_ROUTE"; candidateCountClass: "NONE" | "FEW" | "MANY"; eligibleCountClass: "NONE" | "FEW" | "MANY"; privacyBand: "RESTRICTED"; costBand: "BOUNDED"; latencyBand: "BOUNDED"; reasonClass: string; approvalRequired: boolean; freshness: "TRUSTED" | "UNKNOWN"; sourceRouteDecisionId: string }>;
export function projectRoute(decision: RouteDecision): Result<RouteProjection> {
  if (!decision || typeof decision !== "object" || !sameKeys(decision, routeDecisionKeys) || Object.keys(decision).some((key) => forbiddenContextKeys.has(key))) return error("ROUTE_PROJECTION_INVALID");
  const count = (value: number): "NONE" | "FEW" | "MANY" => value === 0 ? "NONE" : value < 4 ? "FEW" : "MANY";
  return ok({ routeProjectionId: `projection_${sha256(decision.routeDecisionId).slice(0, 24)}`, activityType: "MODEL_ROUTING", status: decision.selectedCandidateId ? "ROUTED" : decision.fallbackClass === "NOT_ASSESSABLE" ? "BLOCKED" : "FALLBACK", routeClass: decision.selectedCandidateId ? "SELECTED" : "NO_ROUTE", candidateCountClass: count(decision.eligibleCandidateIds.length), eligibleCountClass: count(decision.eligibleCandidateIds.length), privacyBand: "RESTRICTED", costBand: "BOUNDED", latencyBand: "BOUNDED", reasonClass: decision.reasonCodes[0] ?? "NONE", approvalRequired: decision.approvalRequired, freshness: decision.trustedDecisionTime === null ? "UNKNOWN" : "TRUSTED", sourceRouteDecisionId: decision.routeDecisionId });
}

export type CharacterSelectionStatus = "ACTIVE" | "ROLLED_BACK" | "REVOKED" | "QUARANTINED";
export type CharacterSelectionDocument = Readonly<{ accountScope: string; characterId: CharacterId; avatarId: string; version: number; integrityHash: string; operationId: string; trustedTime: number; auditReceiptId?: string; priorVersion?: number; rollbackOfVersion?: number; status?: CharacterSelectionStatus }>;
export type ProjectionWriteResult = Readonly<{ ok: boolean; idempotent: boolean; reason?: "STALE_VERSION" | "DUPLICATE_OPERATION" | "INVALID_DOCUMENT" | "NOT_FOUND"; document?: CharacterSelectionDocument; auditReceiptId?: string }>;
export type ProjectionChange = Readonly<{ cursor: string; operationId: string; documentId: string; version: number; status: CharacterSelectionStatus; trustedTime: number; auditReceiptId: string }>;
export type ProjectionChangePage = Readonly<{ changes: readonly ProjectionChange[]; nextCursor?: string }>;
export function deterministicDocumentId(accountScope: string, characterId: CharacterId): Result<string> { return !bounded(accountScope) || !["ONYX", "NOVA"].includes(characterId) ? error("INVALID_DOCUMENT") : ok(`account-character-${sha256(`${accountScope}:${characterId}`).slice(0, 32)}`); }
export class InMemoryCharacterSelectionProjection {
  private readonly documents = new Map<string, CharacterSelectionDocument>();
  private readonly operations = new Map<string, CharacterSelectionDocument>();
  private readonly history = new Map<string, CharacterSelectionDocument[]>();
  private readonly changes: ProjectionChange[] = [];
  private operationKey(document: Pick<CharacterSelectionDocument, "accountScope" | "characterId" | "operationId">): string { return `${document.accountScope}:${document.characterId}:${document.operationId}`; }
  private validate(document: CharacterSelectionDocument): boolean { return !(!bounded(document.accountScope) || !["ONYX", "NOVA"].includes(document.characterId) || !bounded(document.avatarId) || !/^[0-9a-f]{64}$/.test(document.integrityHash) || !Number.isInteger(document.version) || document.version < 1 || !bounded(document.operationId) || !finiteNonNegative(document.trustedTime)); }
  private appendChange(id: string, document: CharacterSelectionDocument): void { this.changes.push(deepFreeze({ cursor: `${this.changes.length + 1}`, operationId: document.operationId, documentId: id, version: document.version, status: document.status ?? "ACTIVE", trustedTime: document.trustedTime, auditReceiptId: document.auditReceiptId ?? `audit_${sha256(this.operationKey(document)).slice(0, 16)}` })); }
  public compareAndSet(document: CharacterSelectionDocument, expectedVersion: number): ProjectionWriteResult {
    if (!this.validate(document)) return deepFreeze({ ok: false, idempotent: false, reason: "INVALID_DOCUMENT" });
    const operation = this.operations.get(this.operationKey(document));
    if (operation) return deepFreeze({ ok: true, idempotent: true, document: operation, auditReceiptId: operation.auditReceiptId });
    const id = deterministicDocumentId(document.accountScope, document.characterId);
    if (!id.ok) return deepFreeze({ ok: false, idempotent: false, reason: "INVALID_DOCUMENT" });
    const current = this.documents.get(id.value as string);
    if ((current?.version ?? 0) !== expectedVersion) return deepFreeze({ ok: false, idempotent: false, reason: "STALE_VERSION", document: current });
    const stored = cloneFreeze({ ...document, status: document.status ?? "ACTIVE", priorVersion: current?.version, auditReceiptId: document.auditReceiptId ?? `audit_${sha256(this.operationKey(document)).slice(0, 16)}` });
    this.documents.set(id.value as string, stored);
    this.operations.set(this.operationKey(document), stored);
    this.history.set(id.value as string, [...(this.history.get(id.value as string) ?? []), stored]);
    this.appendChange(id.value as string, stored);
    return deepFreeze({ ok: true, idempotent: false, document: stored, auditReceiptId: stored.auditReceiptId });
  }
  public rollback(accountScope: string, characterId: CharacterId, targetVersion: number, operationId: string, trustedTime: number): ProjectionWriteResult {
    const id = deterministicDocumentId(accountScope, characterId);
    if (!id.ok || !bounded(operationId) || !finiteNonNegative(trustedTime)) return deepFreeze({ ok: false, idempotent: false, reason: "INVALID_DOCUMENT" });
    const operation = this.operations.get(`${accountScope}:${characterId}:${operationId}`);
    if (operation) return deepFreeze({ ok: true, idempotent: true, document: operation, auditReceiptId: operation.auditReceiptId });
    const prior = (this.history.get(id.value as string) ?? []).find((entry) => entry.version === targetVersion);
    const current = this.documents.get(id.value as string);
    if (!prior || !current) return deepFreeze({ ok: false, idempotent: false, reason: "NOT_FOUND" });
    return this.compareAndSet({ ...prior, version: current.version + 1, operationId, trustedTime, rollbackOfVersion: current.version, status: "ROLLED_BACK" }, current.version);
  }
  public revoke(accountScope: string, characterId: CharacterId, operationId: string, trustedTime: number): ProjectionWriteResult { return this.mark(accountScope, characterId, operationId, trustedTime, "REVOKED"); }
  public quarantine(accountScope: string, characterId: CharacterId, operationId: string, trustedTime: number): ProjectionWriteResult { return this.mark(accountScope, characterId, operationId, trustedTime, "QUARANTINED"); }
  private mark(accountScope: string, characterId: CharacterId, operationId: string, trustedTime: number, status: CharacterSelectionStatus): ProjectionWriteResult {
    const id = deterministicDocumentId(accountScope, characterId);
    const current = id.ok ? this.documents.get(id.value as string) : undefined;
    if (!id.ok || !current) return deepFreeze({ ok: false, idempotent: false, reason: "NOT_FOUND" });
    return this.compareAndSet({ ...current, version: current.version + 1, operationId, trustedTime, status }, current.version);
  }
  public transactionalBatch(writes: readonly { document: CharacterSelectionDocument; expectedVersion: number }[], batchId: string): ProjectionWriteResult {
    if (!bounded(batchId) || writes.length > 16 || writes.some((write) => !this.validate(write.document))) return deepFreeze({ ok: false, idempotent: false, reason: "INVALID_DOCUMENT" });
    const results = writes.map((write) => this.compareAndSet({ ...write.document, auditReceiptId: write.document.auditReceiptId ?? `batch_${batchId}` }, write.expectedVersion));
    const failed = results.find((result) => !result.ok);
    return failed ?? deepFreeze({ ok: true, idempotent: results.every((result) => result.idempotent), document: results.at(-1)?.document, auditReceiptId: `batch_${batchId}` });
  }
  public read(accountScope: string, characterId: CharacterId): CharacterSelectionDocument | undefined { const id = deterministicDocumentId(accountScope, characterId); return id.ok ? cloneFreeze(this.documents.get(id.value as string)) : undefined; }
  public list(accountScope: string): readonly CharacterSelectionDocument[] { return [...this.documents.values()].filter((document) => document.accountScope === accountScope).map((document) => cloneFreeze(document)); }
  public changesAfter(accountScope: string, cursor?: string): ProjectionChangePage { const after = cursor ? Number(cursor) : 0; const changes = this.changes.filter((change) => Number(change.cursor) > after && this.documents.get(change.documentId)?.accountScope === accountScope); return deepFreeze({ changes, nextCursor: changes.at(-1)?.cursor }); }
}

export function buildMiniatureAgentProjection(input: Readonly<{ role: MiniatureAgentRole; state: MiniatureAgentState; activityType: string; status: string; sourceId: string; trustedTime: number }>): Result<Readonly<{ role: MiniatureAgentRole; state: MiniatureAgentState; activityType: string; status: string; sourceId: string; trustedTime: number; nonAuthorizing: true }>> {
  if (!input || typeof input !== "object" || !sameKeys(input, miniatureAgentKeys) || Object.keys(input).some((key) => forbiddenContextKeys.has(key)) || !MINIATURE_AGENT_ROLES.includes(input.role) || !MINIATURE_AGENT_STATES.includes(input.state) || !bounded(input.activityType) || !bounded(input.status) || !bounded(input.sourceId) || !finiteNonNegative(input.trustedTime)) return error("INVALID_AGENT_PROJECTION");
  return ok({ role: input.role, state: input.state, activityType: input.activityType, status: input.status, sourceId: input.sourceId, trustedTime: input.trustedTime, nonAuthorizing: true as const });
}

export type OpaCompatibleFixture = Readonly<{ id: string; context: TrustedContextInput; candidates: readonly Omit<CandidateSnapshot, "snapshotHash">[]; expected: Readonly<{ ok: boolean; selectedCandidateId: string | null; fallbackClass: RouteDecision["fallbackClass"]; reasonCodes: readonly ModelRouterReasonCode[] }> }>;
export type OpaParityResult = Readonly<{ ok: boolean; opaRuntime: "UNAVAILABLE_DETERMINISTIC_SKIP"; providerCalls: 0; realModelCalls: 0; paidUsage: 0; caseResults: readonly Readonly<{ id: string; matched: boolean; aggregateSnapshotHash?: string; receiptSemanticHash?: string }>[] }>;
export function compareOpaFixtureParity(fixtureSet: { fixtures?: readonly OpaCompatibleFixture[] }): OpaParityResult {
  const caseResults = (fixtureSet.fixtures ?? []).map((fixture) => {
    const context = createTrustedContext(fixture.context);
    if (!context.ok) return { id: fixture.id, matched: !fixture.expected.ok && fixture.expected.reasonCodes.includes("POLICY_CONTEXT_INVALID") };
    const candidates = fixture.candidates.map((candidate) => ({ ...candidate, snapshotHash: "0".repeat(64) }));
    const aggregateSnapshotHash = computeCandidateSetSnapshotHash(candidates);
    const routed = routeModel(context.value, candidates.map((candidate) => ({ ...candidate, snapshotHash: aggregateSnapshotHash })));
    const actual = routed.ok ? { ok: true, selectedCandidateId: routed.value.selectedCandidateId, fallbackClass: routed.value.fallbackClass, reasonCodes: routed.value.reasonCodes } : { ok: false, selectedCandidateId: null, fallbackClass: "NOT_ASSESSABLE" as const, reasonCodes: [routed.errorCode as ModelRouterReasonCode] };
    return { id: fixture.id, matched: actual.ok === fixture.expected.ok && actual.selectedCandidateId === fixture.expected.selectedCandidateId && actual.fallbackClass === fixture.expected.fallbackClass && fixture.expected.reasonCodes.every((reason) => actual.reasonCodes.includes(reason)), aggregateSnapshotHash, receiptSemanticHash: sha256(canonical(actual)) };
  });
  return deepFreeze({ ok: caseResults.every((entry) => entry.matched), opaRuntime: "UNAVAILABLE_DETERMINISTIC_SKIP", providerCalls: 0, realModelCalls: 0, paidUsage: 0, caseResults });
}