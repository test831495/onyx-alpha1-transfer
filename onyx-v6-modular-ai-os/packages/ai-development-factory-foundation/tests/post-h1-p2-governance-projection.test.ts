import { describe, expect, it } from "vitest";
import { ReconciliationEngineInput, reconcileTargetAndDrift } from "../src/post-h1/p2-reconciliation-engine";
import {
  projectEvidenceManifest,
  projectReadOnlyAutomationPlan,
  reconcileGovernanceState,
} from "../src/post-h1/p2-governance-projection";

describe("Post-H1 P2 Bundle B Governance Projection", () => {
  const baseValidInput: ReconciliationEngineInput = {
    targetLock: {
      providerId: "provider",
      repositoryId: "test831495/onyx-alpha1-transfer",
      repositoryUrl: "https://github.com/test831495/onyx-alpha1-transfer",
      baseBranch: "main",
      baseSha: "a".repeat(40),
      headBranch: "main",
      headSha: "b".repeat(40),
      changeRequestNumber: 27,
      expectedChangeRequestState: "OPEN",
      expectedDraftState: true,
      expectedCommitCount: 1,
      expectedChangedPathDigest: "c".repeat(64),
      expectedRawBodyHash: "d".repeat(64),
      expectedNormalizedBodyHash: "e".repeat(64),
      expectedThreadIds: ["thread-1"],
      expectedRulesetHash: "f".repeat(64),
      expectedActorId: "actor-1",
      purpose: "verify local candidate",
      expiresAt: "2026-08-30T12:00:00Z",
    },
    repositoryFacts: {
      owner: "test831495",
      repository: "onyx-alpha1-transfer",
      defaultBranch: "main",
      currentHeadSha: "b".repeat(40),
      isClean: true,
    },
    pullRequestFacts: {
      prNumber: 27,
      state: "OPEN",
      headSha: "b".repeat(40),
      baseBranch: "main",
      isDraft: false,
      title: "P1 Verification",
    },
    reviewFacts: {
      totalReviews: 2,
      approvedCount: 2,
      changesRequestedCount: 0,
      reviewState: "APPROVED",
    },
    reviewThreadFacts: {
      totalThreads: 3,
      resolvedThreads: 3,
      unresolvedThreads: 0,
      canResolveAll: true,
    },
    checkFacts: {
      totalChecks: 5,
      passedChecks: 5,
      failedChecks: 0,
      pendingChecks: 0,
      overallStatus: "SUCCESS",
    },
    acceptanceFacts: {
      totalRequiredIds: 24,
      validatedIds: 24,
      missingIds: [],
      coverageComplete: true,
    },
    freshness: {
      observedAtEpochMilliseconds: 1772300000000,
      maxAgeMilliseconds: 86400000,
      ageMilliseconds: 100,
      isFresh: true,
    },
    isPaginationComplete: true,
  };

  it("POSTH1-P2-ORCH-001 & ORCH-002 & Finding 003 (Comment ID 3886895627): orchestrates P1 readiness and main closure assessments with fail-closed governance facts", () => {
    const driftReport = reconcileTargetAndDrift(baseValidInput);
    const govResult = reconcileGovernanceState(baseValidInput, driftReport);

    expect(govResult.authority).toBe("NON_AUTHORIZING");
    expect(govResult.readinessAssessment).toBeDefined();
    expect((govResult.readinessAssessment as any).outcome).toBe("TECHNICALLY_READY");
    expect((govResult.closureAssessment as any).outcome).toBe("MAIN_CLOSED");

    const inputUnsuppliedFacts: ReconciliationEngineInput = {
      ...baseValidInput,
      governanceFacts: {
        rulesetVisible: false,
      },
    };
    const driftUnsupplied = reconcileTargetAndDrift(inputUnsuppliedFacts);
    const govUnsupplied = reconcileGovernanceState(inputUnsuppliedFacts, driftUnsupplied);
    expect(govUnsupplied.outcome).toBe("DRIFT_DETECTED");
    expect((govUnsupplied.readinessAssessment as any).outcome).toBe("NOT_ASSESSABLE");
  });

  it("POSTH1-P2-ORCH-003: generates structured governance reconciliation result", () => {
    const driftReport = reconcileTargetAndDrift(baseValidInput);
    const govResult = reconcileGovernanceState(baseValidInput, driftReport);
    expect(govResult.authority).toBe("NON_AUTHORIZING");
  });

  it("POSTH1-P2-ORCH-004 & Finding 004 (Comment ID 3886895634): projects evidence manifest with cryptographic hash summaries of actual P1 inputs", () => {
    const driftReport = reconcileTargetAndDrift(baseValidInput);
    const govResult = reconcileGovernanceState(baseValidInput, driftReport);
    const manifest = projectEvidenceManifest(baseValidInput, driftReport, govResult, ['{"raw": "payload"}']);

    expect(manifest.manifestHash).toBeDefined();
    expect(manifest.targetHash).toBeDefined();
    expect(manifest.p1InputHash).toBeDefined();
    expect(manifest.p1InputHash).not.toBe(manifest.targetHash);
    expect(manifest.authority).toBe("NON_AUTHORIZING");
    expect(manifest.isPaginationComplete).toBe(true);
  });

  it("POSTH1-P2-ORCH-005: projects advisory read-only automation plan with explicit disclaimers", () => {
    const driftReport = reconcileTargetAndDrift(baseValidInput);
    const govResult = reconcileGovernanceState(baseValidInput, driftReport);
    const plan = projectReadOnlyAutomationPlan(driftReport, govResult);

    expect(plan.authority).toBe("NON_AUTHORIZING");
    expect(plan.disclaimers[0]).toContain("NON_AUTHORIZING");
    expect(plan.pendingActions).toHaveLength(1);
  });

  it("POSTH1-P2-ORCH-006: produces byte-for-byte identical manifest hashes for equal inputs", () => {
    const driftReport1 = reconcileTargetAndDrift(baseValidInput);
    const govResult1 = reconcileGovernanceState(baseValidInput, driftReport1);
    const manifest1 = projectEvidenceManifest(baseValidInput, driftReport1, govResult1, ['{"payload": 1}']);

    const driftReport2 = reconcileTargetAndDrift(baseValidInput);
    const govResult2 = reconcileGovernanceState(baseValidInput, driftReport2);
    const manifest2 = projectEvidenceManifest(baseValidInput, driftReport2, govResult2, ['{"payload": 1}']);

    expect(manifest1.manifestHash).toBe(manifest2.manifestHash);
  });
});
