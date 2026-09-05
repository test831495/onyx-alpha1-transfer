import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import opaFixtures from "../fixtures/opa-compatible-fixtures.json";
import {
  CHARACTER_DEVICE_CLASSES,
  InMemoryCharacterSelectionProjection,
  MINIATURE_AGENT_ROLES,
  MODEL_ROUTER_REASON_CODES,
  buildMiniatureAgentProjection,
  compareOpaFixtureParity,
  computeCandidateSetSnapshotHash,
  createTrustedContext,
  decideEligibility,
  deterministicDocumentId,
  projectRoute,
  routeModel,
  type CandidateSnapshot,
  type ModelRouter,
  type OpaCompatibleFixture,
  type PolicyDecisionPoint,
} from "../src/index";

const candidate = (id: string, quality: number, cost: number): CandidateSnapshot => ({
  candidateId: id,
  capability: "text-generation",
  lifecycle: "ACTIVE",
  health: "HEALTHY",
  region: "EU",
  snapshotVersion: "snapshot-1",
  snapshotHash: "a".repeat(64),
  evidence: { quality, privacy: 0.9, reliability: 0.95, latency: 0.8, cost, portability: 0.7, freshAt: 1000 },
});
const canonical = (value: unknown): string => {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
};
const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const withVerifiedSetHash = (...candidates: CandidateSnapshot[]): CandidateSnapshot[] => {
  const hash = sha256(canonical({ candidates: candidates.map(({ snapshotHash: _ignored, ...rest }) => rest).sort((left, right) => left.candidateId.localeCompare(right.candidateId)) }));
  return candidates.map((entry) => ({ ...entry, snapshotHash: hash }));
};

describe("Prompt 2 character runtime foundation", () => {
  it("creates bounded trusted context and rejects raw prompt authority", () => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 10, requirements: { quality: 0.5 } });
    expect(context.ok && context.value.requestClassification).toBe("summarize");
    expect(createTrustedContext({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, prompt: "raw" } as never)).toMatchObject({ ok: false, errorCode: "POLICY_CONTEXT_INVALID" });
    expect(createTrustedContext({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, harmlessButUnknown: "not allowed" } as never)).toMatchObject({ ok: false, errorCode: "POLICY_CONTEXT_INVALID" });
  });

  it("fails closed and scores only eligible candidates", () => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 10, requirements: { quality: 0.5 } });
    if (!context.ok) throw new Error(context.errorCode);
    const unhealthy = candidate("unhealthy", 1, 0.1);
    const eligible = candidate("eligible", 0.7, 0.5);
    const [unhealthyVerified, eligibleVerified] = withVerifiedSetHash({ ...unhealthy, health: "UNHEALTHY" }, eligible);
    const decisions = [decideEligibility(context.value, unhealthyVerified!), decideEligibility(context.value, eligibleVerified!)];
    expect(decisions[0]!.outcome).toBe("INELIGIBLE");
    expect(decisions[0]!.reasonCodes).toContain("CANDIDATE_UNHEALTHY");
    const routed = routeModel(context.value, [unhealthyVerified!, eligibleVerified!]);
    expect(routed.ok && routed.value.selectedCandidateId).toBe("eligible");
    expect(routed.ok && Object.keys(routed.value.scoreComponents)).toEqual(["eligible"]);
  });

  it("produces deterministic receipt and one-way privacy projection", () => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 10, requirements: { quality: 0.5 } });
    if (!context.ok) throw new Error(context.errorCode);
    const verified = withVerifiedSetHash(candidate("b", 0.8, 0.4), candidate("a", 0.8, 0.4));
    const decision = routeModel(context.value, verified);
    expect(decision.ok && decision.value.selectedCandidateId).toBe("a");
    if (!decision.ok) throw new Error(decision.errorCode);
    expect(decision.value.routeDecisionId).toMatch(/^route_/);
    expect(decision.value.candidateSnapshotHash).toBe(computeCandidateSetSnapshotHash(verified));
    expect(projectRoute(decision.value)).toMatchObject({ ok: true, value: { activityType: "MODEL_ROUTING", sourceRouteDecisionId: decision.value.routeDecisionId } });
    expect(projectRoute({ ...decision.value, prompt: "secret" } as never)).toMatchObject({ ok: false, errorCode: "ROUTE_PROJECTION_INVALID" });
  });

  it("keeps projection storage provider-neutral and CAS protected", () => {
    const store = new InMemoryCharacterSelectionProjection();
    expect(deterministicDocumentId("account-scope_a", "ONYX")).toMatchObject({ ok: true, value: expect.stringMatching(/^account-character-/) });
    const first = store.compareAndSet({ accountScope: "account-scope_a", characterId: "ONYX", avatarId: "onyx-1", version: 1, integrityHash: "a".repeat(64), operationId: "op-1", trustedTime: 1000 }, 0);
    expect(first.ok).toBe(true);
    if (!first.ok || !first.document) throw new Error("missing document");
    expect(store.compareAndSet({ ...first.document, avatarId: "onyx-2", version: 2, operationId: "op-2" }, 0).reason).toBe("STALE_VERSION");
    const update = store.compareAndSet({ ...first.document, avatarId: "onyx-2", version: 2, operationId: "op-2", auditReceiptId: "audit-2" }, 1);
    expect(update.ok).toBe(true);
    expect(store.compareAndSet({ ...first.document, avatarId: "onyx-2", version: 2, operationId: "op-2", auditReceiptId: "audit-2" }, 1).idempotent).toBe(true);
    expect(store.compareAndSet({ ...first.document, accountScope: "account-scope_b", operationId: "op-2" }, 0).idempotent).toBe(false);
    expect(store.rollback("account-scope_a", "ONYX", 1, "op-rollback", 1001).ok).toBe(true);
    expect(store.revoke("account-scope_a", "ONYX", "op-revoke", 1002).ok).toBe(true);
    expect(store.changesAfter("account-scope_a", undefined).changes.length).toBeGreaterThanOrEqual(3);
    expect(store.transactionalBatch([{ document: { accountScope: "account-scope_a", characterId: "NOVA", avatarId: "nova-1", version: 1, integrityHash: "b".repeat(64), operationId: "op-nova", trustedTime: 1003 }, expectedVersion: 0 }], "batch-1").ok).toBe(true);
  });

  it("bounds miniature-agent projections and excludes sensitive fields", () => {
    const projection = buildMiniatureAgentProjection({ role: "ROUTING", state: "WORKING", activityType: "MODEL_ROUTING", status: "EVALUATING", sourceId: "route-1", trustedTime: 1000 });
    expect(projection).toMatchObject({ ok: true, value: { role: "ROUTING", state: "WORKING", nonAuthorizing: true } });
    if (!projection.ok) throw new Error(projection.errorCode);
    expect(Object.keys(projection.value)).toEqual(["role", "state", "activityType", "status", "sourceId", "trustedTime", "nonAuthorizing"]);
    expect(buildMiniatureAgentProjection({ role: "ROUTING", state: "WORKING", activityType: "MODEL_ROUTING", status: "EVALUATING", sourceId: "route-1", trustedTime: 1000, privateMemory: "secret" } as never)).toMatchObject({ ok: false, errorCode: "INVALID_AGENT_PROJECTION" });
    expect(CHARACTER_DEVICE_CLASSES).toContain("FUTURE_XR");
    expect(MODEL_ROUTER_REASON_CODES).toContain("POLICY_UNAVAILABLE");
  });

  it("exports stable PDP and ModelRouter contracts with all closed reason states", () => {
    const context = createTrustedContext({ requestClassification: "generate", sessionAssurance: "standard", approvalRequired: true, approvalPresent: false, operatingMode: "AUTONOMOUS_DISABLED", trustedTime: 1000, region: "EU", budget: 0.2, policyAvailable: false, requiredCapability: "vision", privacyPolicyAllowed: false, requirements: { quality: 0.9, privacy: 0.95, reliability: 0.99, latency: 0.95, cost: 0.1, portability: 0.95 } });
    expect(context.ok).toBe(true);
    if (!context.ok) throw new Error(context.errorCode);
    const pdp: PolicyDecisionPoint = { decideEligibility };
    const decision = pdp.decideEligibility(context.value, withVerifiedSetHash(candidate("weak", 0.2, 0.9))[0]!);
    expect(decision.outcome).toBe("NOT_ASSESSABLE");
    expect(decision.reasonCodes).toEqual(expect.arrayContaining(["POLICY_UNAVAILABLE", "CAPABILITY_MISMATCH", "PRIVACY_POLICY_DENIED", "OPERATING_MODE_DENIED", "APPROVAL_REQUIRED", "BUDGET_DENIED"]));
    const router: ModelRouter = { routeModel };
    expect(router.routeModel(context.value, withVerifiedSetHash(candidate("weak", 0.2, 0.9)))).toMatchObject({ ok: true, value: { fallbackClass: "NOT_ASSESSABLE" } });
  });

  it("rejects duplicate, tampered, oversized and malformed candidate sets without scoring", () => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 1, requirements: { quality: 0.5 } });
    if (!context.ok) throw new Error(context.errorCode);
    const verified = withVerifiedSetHash(candidate("dup", 0.8, 0.2), candidate("dup", 0.9, 0.2));
    expect(routeModel(context.value, verified)).toMatchObject({ ok: false, errorCode: "DUPLICATE_CANDIDATE_ID" });
    expect(routeModel(context.value, [{ ...candidate("tampered", 0.8, 0.2), snapshotHash: "f".repeat(64) }])).toMatchObject({ ok: false, errorCode: "CANDIDATE_SNAPSHOT_INVALID" });
    expect(routeModel(context.value, Array.from({ length: 33 }, (_, index) => candidate(`candidate-${index}`, 0.8, 0.2)))).toMatchObject({ ok: false, errorCode: "CANDIDATE_SET_OVER_BOUND" });
    expect(decideEligibility(context.value, { ...candidate("bad-fresh", 0.8, 0.2), evidence: { ...candidate("bad-fresh", 0.8, 0.2).evidence, freshAt: -1 }, snapshotHash: "a".repeat(64) }).reasonCodes).toContain("CANDIDATE_SNAPSHOT_INVALID");
  });

  it("keeps route receipts deeply immutable and deterministic under epsilon ties", () => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 1 });
    if (!context.ok) throw new Error(context.errorCode);
    const verified = withVerifiedSetHash(candidate("b", 0.8000000001, 0.2), candidate("a", 0.8, 0.2));
    const first = routeModel(context.value, verified);
    const second = routeModel(context.value, [...verified].reverse());
    expect(first.ok && first.value.selectedCandidateId).toBe("a");
    expect(second.ok && second.value).toEqual(first.ok && first.value);
    if (!first.ok) throw new Error(first.errorCode);
    expect(() => ((first.value.scoreComponents.a as Record<string, number>).quality = 0)).toThrow();
  });

  it.each([
    ["CAPABILITY_MISMATCH", { requiredCapability: "vision" }, candidate("reason-capability", 0.9, 0.1)],
    ["PRIVACY_POLICY_DENIED", { privacyPolicyAllowed: false }, candidate("reason-privacy", 0.9, 0.1)],
    ["RESIDENCY_DENIED", { region: "US" }, candidate("reason-region", 0.9, 0.1)],
    ["BUDGET_DENIED", { budget: 0.1 }, candidate("reason-budget", 0.9, 0.9)],
    ["CANDIDATE_UNHEALTHY", {}, { ...candidate("reason-unhealthy", 0.9, 0.1), health: "UNHEALTHY" }],
    ["EVIDENCE_EXPIRED", {}, { ...candidate("reason-expired", 0.9, 0.1), evidence: { ...candidate("reason-expired", 0.9, 0.1).evidence, freshAt: 1 } }],
    ["PROVIDER_DISABLED", {}, { ...candidate("reason-disabled", 0.9, 0.1), lifecycle: "DISABLED" }],
    ["OPERATING_MODE_DENIED", { allowedOperatingModes: ["REVIEW"] }, candidate("reason-mode", 0.9, 0.1)],
    ["APPROVAL_REQUIRED", { approvalRequired: true, approvalPresent: false }, candidate("reason-approval", 0.9, 0.1)],
    ["POLICY_UNAVAILABLE", { policyAvailable: false }, candidate("reason-policy", 0.9, 0.1)],
    ["TRUSTED_TIME_UNAVAILABLE", { trustedTime: undefined }, candidate("reason-time", 0.9, 0.1)],
    ["CANDIDATE_SNAPSHOT_INVALID", {}, { ...candidate("reason-snapshot", 2, 0.1) }],
  ] as const)("emits %s deterministically", (reason, contextOverride, rawCandidate) => {
    const context = createTrustedContext({ requestClassification: "summarize", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 1, ...contextOverride });
    if (!context.ok) throw new Error(context.errorCode);
    const candidateUnderTest = reason === "CANDIDATE_SNAPSHOT_INVALID" ? rawCandidate : withVerifiedSetHash(rawCandidate)[0]!;
    expect(decideEligibility(context.value, candidateUnderTest).reasonCodes).toContain(reason);
  });

  it("emits POLICY_CONTEXT_INVALID for malformed PDP envelopes", () => {
    const decision = decideEligibility({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", contextHash: "bad", schemaVersion: "TRUSTED_CONTEXT_V1" } as never, withVerifiedSetHash(candidate("reason-context", 0.9, 0.1))[0]!);
    expect(decision.outcome).toBe("NOT_ASSESSABLE");
    expect(decision.reasonCodes).toContain("POLICY_CONTEXT_INVALID");
  });

  it.each(MINIATURE_AGENT_ROLES)("accepts miniature-agent role %s without leaking extra fields", (role) => {
    const projection = buildMiniatureAgentProjection({ role, state: "WORKING", activityType: "MODEL_ROUTING", status: "EVALUATING", sourceId: `source-${role.toLowerCase()}`, trustedTime: 1000 });
    expect(projection.ok && projection.value.role).toBe(role);
  });

  it.each(CHARACTER_DEVICE_CLASSES)("keeps device class %s as a stable non-routing vocabulary value", (deviceClass) => {
    expect(deviceClass).toMatch(/^[A-Z_]+$/);
    const context = createTrustedContext({ requestClassification: `device-${deviceClass.toLowerCase()}`, sessionAssurance: "standard", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000 });
    expect(context.ok).toBe(true);
  });

  it("compares package-local OPA-compatible fixtures against TypeScript authority outputs", () => {
    const result = compareOpaFixtureParity(opaFixtures as { fixtures: readonly OpaCompatibleFixture[] });
    expect(result).toMatchObject({ ok: true, opaRuntime: "UNAVAILABLE_DETERMINISTIC_SKIP", providerCalls: 0, realModelCalls: 0, paidUsage: 0 });
    expect(result.caseResults.every((entry) => entry.matched)).toBe(true);
  });
});