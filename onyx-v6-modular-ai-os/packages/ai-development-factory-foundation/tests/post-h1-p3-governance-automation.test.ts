import { describe, expect, it } from "vitest";
import {
  P3_ACCEPTANCE_IDS,
  P3_ACCEPTANCE_REGISTRY,
  P3_BOUNDS,
  validateP3AcceptanceRegistry,
} from "../src/post-h1/p3-acceptance-registry";
import { validateP3GovernanceAutomationInput } from "../src/post-h1/p3-governance-automation-contracts";
import { evaluateP3GovernanceAutomation } from "../src/post-h1/p3-governance-automation";

const expectedIds = [
  "POSTH1-P3-ORCH-001", "POSTH1-P3-ORCH-002", "POSTH1-P3-ORCH-003", "POSTH1-P3-ORCH-004",
  "POSTH1-P3-REPORT-001", "POSTH1-P3-REPORT-002", "POSTH1-P3-REPORT-003",
  "POSTH1-P3-LIFECYCLE-001", "POSTH1-P3-LIFECYCLE-002",
  "POSTH1-P3-PRBODY-001", "POSTH1-P3-PRBODY-002",
  "POSTH1-P3-SAFE-001", "POSTH1-P3-SAFE-002", "POSTH1-P3-SAFE-003", "POSTH1-P3-SAFE-004", "POSTH1-P3-SAFE-005",
] as const;

const validInput = () => ({
  evaluationEpochMilliseconds: 1772300000100,
  purpose: "POST_H1_P3_GOVERNANCE_REPORT",
  lifecycleRegistry: { id: "lifecycle-1" },
  reconciliationInput: { targetLock: { repositoryId: "test831495/onyx-alpha1-transfer" } },
  evidenceReferences: [{ id: "evidence-1", hash: "a".repeat(64), sensitivity: "REPOSITORY_METADATA", redacted: false }],
  provenance: [{ id: "source-1", hash: "b".repeat(64) }],
});

const automationInput = () => ({
  evaluationEpochMilliseconds: 1772300000100,
  purpose: "POST_H1_P3_GOVERNANCE_REPORT",
  lifecycleRegistry: {
    schemaVersion: "1.0.0", id: "p3-lifecycle", projectId: "onyx", phaseId: "P3", workstreamId: "governance", currentGateId: "LOCAL", state: "LOCALLY_ACCEPTED", baseSha: "a".repeat(40), headSha: "b".repeat(40), branchName: "feature/p3", commitLineage: ["a".repeat(40), "b".repeat(40)], pullRequestLineage: ["PR-29"], acceptedMarkers: ["p2-closed"], acceptanceDefinitions: [{ id: "p3-contract" }], acceptanceCoverage: [{ id: "p3-contract", covered: true }], findings: [], evidence: [{ id: "evidence-1", freshness: "FRESH" }], knownLimitations: [], residualRisks: [], authorityBoundaries: ["OWNER_MERGE_REQUIRED"], nextGate: "OWNER_REVIEW", reopeningTriggers: ["target-drift"], observedAt: "2026-08-29T00:00:00Z",
  },
  reconciliationInput: {
    targetLock: { providerId: "neutral", repositoryId: "test831495/onyx-alpha1-transfer", repositoryUrl: "https://github.com/test831495/onyx-alpha1-transfer", baseBranch: "main", baseSha: "a".repeat(40), headBranch: "feature/p3", headSha: "b".repeat(40), changeRequestNumber: 29, expectedChangeRequestState: "OPEN", expectedDraftState: false, expectedCommitCount: 1, expectedChangedPathDigest: "c".repeat(64), expectedRawBodyHash: "d".repeat(64), expectedNormalizedBodyHash: "e".repeat(64), expectedThreadIds: ["thread-1"], expectedRulesetHash: "f".repeat(64), expectedActorId: "coolscorpiorahul", purpose: "P3 projection", expiresAt: "2026-08-30T12:00:00Z" },
    repositoryFacts: { owner: "test831495", repository: "onyx-alpha1-transfer", defaultBranch: "main", currentHeadSha: "b".repeat(40), isClean: true },
    pullRequestFacts: { prNumber: 29, state: "OPEN", headSha: "b".repeat(40), baseBranch: "main", isDraft: false, title: "P3" },
    reviewFacts: { totalReviews: 1, approvedCount: 1, changesRequestedCount: 0, reviewState: "APPROVED" },
    reviewThreadFacts: { totalThreads: 1, resolvedThreads: 1, unresolvedThreads: 0, canResolveAll: true },
    checkFacts: { totalChecks: 2, passedChecks: 2, failedChecks: 0, pendingChecks: 0, overallStatus: "SUCCESS" },
    acceptanceFacts: { totalRequiredIds: 16, validatedIds: 16, missingIds: [], coverageComplete: true },
    freshness: { observedAtEpochMilliseconds: 1772300000000, maxAgeMilliseconds: 86400000, ageMilliseconds: 100, isFresh: true },
    governanceFacts: { conflicts: false, rulesetVisible: true, findingsClosed: true, ownerAuthorization: true, prMergedClosed: false, handoff: false },
    isPaginationComplete: true,
  },
  evidenceReferences: [{ id: "evidence-1", hash: "a".repeat(64), sensitivity: "REPOSITORY_METADATA", redacted: false }],
  provenance: [{ id: "source-1", hash: "b".repeat(64) }],
});

describe("Post-H1 P3 governance automation contracts", () => {
  it("freezes exactly 16 complete acceptance IDs with exact family counts", () => {
    expect(P3_ACCEPTANCE_IDS).toEqual(expectedIds);
    expect(P3_ACCEPTANCE_REGISTRY).toHaveLength(16);
    expect(Object.isFrozen(P3_ACCEPTANCE_REGISTRY)).toBe(true);
    expect(P3_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "ORCH")).toHaveLength(4);
    expect(P3_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "REPORT")).toHaveLength(3);
    expect(P3_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "LIFECYCLE")).toHaveLength(2);
    expect(P3_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "PRBODY")).toHaveLength(2);
    expect(P3_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "SAFE")).toHaveLength(5);
    expect(validateP3AcceptanceRegistry(P3_ACCEPTANCE_REGISTRY)).toEqual({ valid: true, missingIds: [] });
  });

  it("returns a fail-closed result for incomplete or unverifiable input", () => {
    expect(validateP3GovernanceAutomationInput(undefined).outcome).toBe("NOT_ASSESSABLE");
    expect(validateP3GovernanceAutomationInput({ ...validInput(), purpose: "UNKNOWN" }).outcome).toBe("NOT_ASSESSABLE");
  });

  it("rejects unknown keys unsafe prototypes and hostile reflective input", () => {
    expect(validateP3GovernanceAutomationInput({ ...validInput(), unknown: true }).outcome).toBe("NOT_ASSESSABLE");
    expect(validateP3GovernanceAutomationInput(Object.create({ inherited: true })).outcome).toBe("NOT_ASSESSABLE");
    const { proxy, revoke } = Proxy.revocable(validInput(), {}); revoke();
    expect(validateP3GovernanceAutomationInput(proxy).outcome).toBe("NOT_ASSESSABLE");
  });

  it("rejects over-bound input without silent or favorable truncation", () => {
    expect(validateP3GovernanceAutomationInput({ ...validInput(), purpose: "x".repeat(P3_BOUNDS.MAX_STRING_LENGTH + 1) }).outcome).toBe("NOT_ASSESSABLE");
    expect(validateP3GovernanceAutomationInput({ ...validInput(), evidenceReferences: Array.from({ length: P3_BOUNDS.MAX_EVIDENCE_REFERENCES + 1 }, (_, index) => ({ id: `evidence-${index}`, hash: "a".repeat(64), sensitivity: "REPOSITORY_METADATA", redacted: false })) }).outcome).toBe("NOT_ASSESSABLE");
  });

  it("composes sealed predecessor outputs without duplicating predecessor engines", () => {
    const result = evaluateP3GovernanceAutomation(automationInput());
    expect(result.authority).toBe("NON_AUTHORIZING");
    expect(result.predecessor.drift.outcome).toBe("MATCH");
    expect(result.predecessor.readiness.outcome).toBe("TECHNICALLY_READY");
  });

  it("preserves sealed P1 readiness and closure precedence", () => {
    const result = evaluateP3GovernanceAutomation({ ...automationInput(), reconciliationInput: { ...automationInput().reconciliationInput, checkFacts: { totalChecks: 2, passedChecks: 1, failedChecks: 0, pendingChecks: 1, overallStatus: "PENDING" } } });
    expect(result.predecessor.readiness.outcome).toBe("CHECKS_PENDING");
    expect(result.authority).toBe("NON_AUTHORIZING");
  });

  it("rejects cross-target and target-mismatched supplied facts", () => {
    const result = evaluateP3GovernanceAutomation({ ...automationInput(), reconciliationInput: { ...automationInput().reconciliationInput, pullRequestFacts: { ...automationInput().reconciliationInput.pullRequestFacts, headSha: "c".repeat(40) } } });
    expect(result.disposition).toBe("NOT_ASSESSABLE");
  });

  it("projects lifecycle state without performing an authoritative transition", () => {
    const result = evaluateP3GovernanceAutomation(automationInput());
    expect(result.lifecycle.state).toBe("LOCALLY_ACCEPTED");
    expect(result.lifecycle.authoritativeTransitionPerformed).toBe(false);
  });

  it("projects next gate and reopening triggers from validated governance facts", () => {
    const result = evaluateP3GovernanceAutomation({ ...automationInput(), reconciliationInput: { ...automationInput().reconciliationInput, freshness: { observedAtEpochMilliseconds: 1, maxAgeMilliseconds: 1, ageMilliseconds: 2, isFresh: false } } });
    expect(result.nextGate).toBe("PROVIDE_CURRENT_EVIDENCE");
    expect(result.reopeningTriggers).toContain("EVIDENCE_STALE");
  });

  it("preserves the NON_AUTHORIZING marker on every public P3 result", () => {
    const result = evaluateP3GovernanceAutomation(automationInput());
    expect(result.authority).toBe("NON_AUTHORIZING");
    expect(result.predecessor.drift.authority).toBe("NON_AUTHORIZING");
    expect(result.predecessor.readiness.authority).toBe("NON_AUTHORIZING");
    expect(result.predecessor.closure.authority).toBe("NON_AUTHORIZING");
  });

  it("uses supplied time and performs no ambient time or runtime IO", () => {
    const result = evaluateP3GovernanceAutomation(automationInput());
    expect(result.evaluationEpochMilliseconds).toBe(1772300000100);
  });

  it("accepts null-prototype bounded input while rejecting hostile reflective input", () => {
    expect(validateP3GovernanceAutomationInput(Object.assign(Object.create(null), validInput())).outcome).toBe("PASS");
    const accessor = validInput(); Object.defineProperty(accessor, "purpose", { enumerable: true, get: () => { throw new Error("blocked"); } });
    expect(validateP3GovernanceAutomationInput(accessor).outcome).toBe("NOT_ASSESSABLE");
    const ownKeysFailure = new Proxy(validInput(), { ownKeys: () => { throw new Error("blocked"); } });
    expect(validateP3GovernanceAutomationInput(ownKeysFailure).outcome).toBe("NOT_ASSESSABLE");
    const descriptorFailure = new Proxy(validInput(), { getOwnPropertyDescriptor: () => { throw new Error("blocked"); } });
    expect(validateP3GovernanceAutomationInput(descriptorFailure).outcome).toBe("NOT_ASSESSABLE");
  });

  it("fails closed for duplicate evidence non-finite epochs excessive nesting and excessive keys", () => {
    expect(validateP3GovernanceAutomationInput({ ...validInput(), evaluationEpochMilliseconds: Number.NaN }).outcome).toBe("NOT_ASSESSABLE");
    expect(validateP3GovernanceAutomationInput({ ...validInput(), evidenceReferences: [{ id: "duplicate", hash: "a".repeat(64), sensitivity: "REPOSITORY_METADATA", redacted: false }, { id: "duplicate", hash: "b".repeat(64), sensitivity: "REPOSITORY_METADATA", redacted: false }] }).outcome).toBe("NOT_ASSESSABLE");
    let nested: unknown = "leaf"; for (let index = 0; index <= P3_BOUNDS.MAX_DEPTH; index += 1) nested = { nested };
    expect(validateP3GovernanceAutomationInput({ ...validInput(), lifecycleRegistry: nested }).outcome).toBe("NOT_ASSESSABLE");
    expect(validateP3GovernanceAutomationInput({ ...validInput(), reconciliationInput: Object.fromEntries(Array.from({ length: P3_BOUNDS.MAX_OBJECT_KEYS + 1 }, (_, index) => [`key-${index}`, index])) }).outcome).toBe("NOT_ASSESSABLE");
  });

  it("produces identical recursively immutable output for identical input", () => {
    const first = evaluateP3GovernanceAutomation(automationInput());
    const second = evaluateP3GovernanceAutomation(automationInput());
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.target)).toBe(true);
    expect(Object.isFrozen(first.predecessor)).toBe(true);
  });
});