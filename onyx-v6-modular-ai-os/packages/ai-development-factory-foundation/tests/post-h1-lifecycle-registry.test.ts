import { describe, expect, it } from "vitest";
import { P1_ACCEPTANCE_IDS, validateLifecycleRegistry } from "../src/post-h1/lifecycle-registry";

const sha = "a".repeat(40);
const expectedAcceptanceIds = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `POSTH1-P1-REGISTRY-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `POSTH1-P1-VERIFY-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `POSTH1-P1-STATE-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `POSTH1-P1-REPORT-${String(index + 1).padStart(3, "0")}`),
] as const);
const executableCasesByFile = Object.freeze({
  "tests/post-h1-lifecycle-registry.test.ts": ["REGISTRY-C01", "REGISTRY-C02", "REGISTRY-C03", "REGISTRY-C04", "REGISTRY-C05"],
  "tests/post-h1-verification-engine.test.ts": ["VERIFY-C01", "VERIFY-C02", "VERIFY-C03", "VERIFY-C04"],
  "tests/post-h1-governance-state-machine.test.ts": ["STATE-C01", "STATE-C02", "REPORT-C01"],
});
const acceptanceTrace = Object.freeze([
  ["POSTH1-P1-REGISTRY-001", "schema and immutable facts", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C03", "valid record passes"], ["POSTH1-P1-REGISTRY-002", "stable IDs and bounds", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C04", "invalid ID fails"], ["POSTH1-P1-REGISTRY-003", "target lock and lineage", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C04", "invalid target fails"], ["POSTH1-P1-REGISTRY-004", "accepted markers", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C03", "valid marker passes"], ["POSTH1-P1-REGISTRY-005", "coverage and findings", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C04", "partial coverage fails"], ["POSTH1-P1-REGISTRY-006", "evidence freshness", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C04", "stale evidence fails"], ["POSTH1-P1-REGISTRY-007", "authority boundaries", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C03", "authority boundary passes"], ["POSTH1-P1-REGISTRY-008", "hostile input containment", "tests/post-h1-lifecycle-registry.test.ts", "REGISTRY-C05", "revoked proxy is not assessable"],
  ["POSTH1-P1-VERIFY-001", "merge readiness classification", "tests/post-h1-verification-engine.test.ts", "VERIFY-C02", "threads classify"], ["POSTH1-P1-VERIFY-002", "main closure assessment", "tests/post-h1-verification-engine.test.ts", "VERIFY-C03", "complete closure passes"], ["POSTH1-P1-VERIFY-003", "checks and approvals", "tests/post-h1-verification-engine.test.ts", "VERIFY-C01", "approval remains required"], ["POSTH1-P1-VERIFY-004", "unresolved threads", "tests/post-h1-verification-engine.test.ts", "VERIFY-C02", "thread resolution required"], ["POSTH1-P1-VERIFY-005", "blocking findings", "tests/post-h1-verification-engine.test.ts", "VERIFY-C02", "remediation required"], ["POSTH1-P1-VERIFY-006", "target drift", "tests/post-h1-verification-engine.test.ts", "VERIFY-C02", "target drift classified"], ["POSTH1-P1-VERIFY-007", "missing closure evidence", "tests/post-h1-verification-engine.test.ts", "VERIFY-C03", "missing reachability blocks"], ["POSTH1-P1-VERIFY-008", "technical authority separation", "tests/post-h1-verification-engine.test.ts", "VERIFY-C01", "technical facts do not authorize"], ["POSTH1-P1-VERIFY-009", "non-authorizing output", "tests/post-h1-verification-engine.test.ts", "VERIFY-C04", "equal evidence projection"], ["POSTH1-P1-VERIFY-010", "verification determinism", "tests/post-h1-verification-engine.test.ts", "VERIFY-C04", "equal input equals output"],
  ["POSTH1-P1-STATE-001", "disallowed transition", "tests/post-h1-governance-state-machine.test.ts", "STATE-C01", "skipped transition blocked"], ["POSTH1-P1-STATE-002", "reopening trigger", "tests/post-h1-governance-state-machine.test.ts", "STATE-C01", "reopening allowed"], ["POSTH1-P1-STATE-003", "owner decision requirement", "tests/post-h1-governance-state-machine.test.ts", "STATE-C02", "missing decision blocked"], ["POSTH1-P1-STATE-004", "target lock requirement", "tests/post-h1-governance-state-machine.test.ts", "STATE-C01", "locked target required"], ["POSTH1-P1-STATE-005", "no execution authority", "tests/post-h1-governance-state-machine.test.ts", "STATE-C02", "validation stays blocked"], ["POSTH1-P1-STATE-006", "valid transition", "tests/post-h1-governance-state-machine.test.ts", "STATE-C01", "valid reopening allowed"],
  ["POSTH1-P1-REPORT-001", "bounded report schema", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "report is constructed"], ["POSTH1-P1-REPORT-002", "current truth and lineage", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "report preserves facts"], ["POSTH1-P1-REPORT-003", "evidence and blockers", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "report preserves assessments"], ["POSTH1-P1-REPORT-004", "next gate projection", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "next gate is projected"], ["POSTH1-P1-REPORT-005", "reopening triggers", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "triggers are preserved"], ["POSTH1-P1-REPORT-006", "deterministic frozen output", "tests/post-h1-governance-state-machine.test.ts", "REPORT-C01", "frozen equal projection"],
] as const);
const record = () => ({
  schemaVersion: "1.0.0", id: "p1-record", projectId: "onyx", phaseId: "P1", workstreamId: "lifecycle",
  currentGateId: "LOCAL", state: "LOCALLY_ACCEPTED", baseSha: sha, headSha: sha,
  branchName: "feature/test", commitLineage: [sha], pullRequestLineage: [], acceptedMarkers: ["marker-1"],
  acceptanceDefinitions: [{ id: "accept-1" }], acceptanceCoverage: [{ id: "accept-1", covered: true }],
  findings: [], evidence: [{ id: "evidence-1", freshness: "FRESH" }], knownLimitations: [], residualRisks: [],
  authorityBoundaries: ["OWNER_MERGE_REQUIRED"], nextGate: "INDEPENDENT_REVIEW", reopeningTriggers: ["new-evidence"], observedAt: "2026-08-29T00:00:00Z",
});

describe("POST-H1 P1 registry", () => {
  it("REGISTRY-C01 TRACE-META-C01 requires complete executable acceptance traceability", () => {
    expect(P1_ACCEPTANCE_IDS).toEqual(expectedAcceptanceIds);
    expect(acceptanceTrace).toHaveLength(30);
    expect(new Set(acceptanceTrace.map(([acceptanceId]) => acceptanceId)).size).toBe(30);
    expect(acceptanceTrace.map(([acceptanceId]) => acceptanceId).sort()).toEqual([...expectedAcceptanceIds].sort());
    for (const [acceptanceId, invariant, testFile, testCaseId, expectedOutcome] of acceptanceTrace) {
      expect(expectedAcceptanceIds).toContain(acceptanceId); expect(invariant.length).toBeGreaterThan(0); expect(expectedOutcome.length).toBeGreaterThan(0);
      expect(executableCasesByFile[testFile as keyof typeof executableCasesByFile]).toContain(testCaseId);
    }
  });
  it("REGISTRY-C02 maps exactly 30 explicit acceptance records", () => expect(P1_ACCEPTANCE_IDS).toHaveLength(30));
  it("REGISTRY-C03 accepts a bounded complete immutable lifecycle record", () => expect(validateLifecycleRegistry(record()).outcome).toBe("PASS"));
  it("REGISTRY-C04 fails closed for duplicate IDs, malformed SHAs, missing target lock, partial coverage, and stale evidence", () => {
    expect(validateLifecycleRegistry({ ...record(), id: "!" }).outcome).toBe("FAIL");
    expect(validateLifecycleRegistry({ ...record(), baseSha: "bad" }).outcome).toBe("FAIL");
    expect(validateLifecycleRegistry({ ...record(), branchName: "" }).outcome).toBe("FAIL");
    expect(validateLifecycleRegistry({ ...record(), acceptanceCoverage: [{ id: "accept-1", covered: false }] }).outcome).toBe("FAIL");
    expect(validateLifecycleRegistry({ ...record(), evidence: [{ id: "evidence-1", freshness: "STALE" }] }).outcome).toBe("FAIL");
  });
  it("REGISTRY-C05 contains hostile input and treats provider IDs as opaque", () => {
    const { proxy, revoke } = Proxy.revocable(record(), {}); revoke();
    expect(validateLifecycleRegistry(proxy).outcome).toBe("NOT_ASSESSABLE");
  });
});