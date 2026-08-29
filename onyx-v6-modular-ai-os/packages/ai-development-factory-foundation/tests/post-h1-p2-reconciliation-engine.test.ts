import { describe, expect, it } from "vitest";
import {
  ReconciliationEngineInput,
  reconcileTargetAndDrift,
} from "../src/post-h1/p2-reconciliation-engine";

describe("Post-H1 P2 Bundle B Reconciliation Engine", () => {
  const baseValidInput: ReconciliationEngineInput = {
    targetLock: {
      repository: "onyx-alpha1-transfer",
      headSha: "b4ea365eed6a4e71faabb9579004bb56567f2a46",
      baseBranch: "main",
    },
    repositoryFacts: {
      owner: "test831495",
      repository: "onyx-alpha1-transfer",
      defaultBranch: "main",
      currentHeadSha: "b4ea365eed6a4e71faabb9579004bb56567f2a46",
      isClean: true,
    },
    pullRequestFacts: {
      prNumber: 27,
      state: "OPEN",
      headSha: "b4ea365eed6a4e71faabb9579004bb56567f2a46",
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

  it("POSTH1-P2-DRIFT-001: detects repository mismatch against target lock", () => {
    const input: ReconciliationEngineInput = {
      ...baseValidInput,
      repositoryFacts: {
        ...baseValidInput.repositoryFacts,
        repository: "wrong-repo",
      },
    };
    const report = reconcileTargetAndDrift(input);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("TARGET_MISMATCH");
    expect(report.authority).toBe("NON_AUTHORIZING");
  });

  it("POSTH1-P2-DRIFT-002: detects HEAD SHA mismatch against target lock", () => {
    const input: ReconciliationEngineInput = {
      ...baseValidInput,
      pullRequestFacts: {
        ...baseValidInput.pullRequestFacts,
        headSha: "1111111111222222222233333333334444444444",
      },
    };
    const report = reconcileTargetAndDrift(input);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("TARGET_MISMATCH");
  });

  it("POSTH1-P2-DRIFT-003: detects PR draft status or non-open state", () => {
    const inputDraft: ReconciliationEngineInput = {
      ...baseValidInput,
      pullRequestFacts: {
        ...baseValidInput.pullRequestFacts,
        isDraft: true,
      },
    };
    const reportDraft = reconcileTargetAndDrift(inputDraft);
    expect(reportDraft.outcome).toBe("DRIFT_DETECTED");
    expect(reportDraft.reasons).toContain("REVIEW_STATE_DRIFT");
  });

  it("POSTH1-P2-DRIFT-004: detects review approval state drift", () => {
    const inputPending: ReconciliationEngineInput = {
      ...baseValidInput,
      reviewFacts: {
        totalReviews: 1,
        approvedCount: 0,
        changesRequestedCount: 0,
        reviewState: "PENDING",
      },
    };
    const report = reconcileTargetAndDrift(inputPending);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("REVIEW_STATE_DRIFT");
  });

  it("POSTH1-P2-DRIFT-005: classifies unresolved review threads as blocking drift", () => {
    const inputUnresolved: ReconciliationEngineInput = {
      ...baseValidInput,
      reviewThreadFacts: {
        totalThreads: 3,
        resolvedThreads: 2,
        unresolvedThreads: 1,
        canResolveAll: true,
      },
    };
    const report = reconcileTargetAndDrift(inputUnresolved);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("THREAD_UNRESOLVED");
  });

  it("POSTH1-P2-DRIFT-006: detects check failure or pending status", () => {
    const inputPendingCheck: ReconciliationEngineInput = {
      ...baseValidInput,
      checkFacts: {
        totalChecks: 5,
        passedChecks: 4,
        failedChecks: 0,
        pendingChecks: 1,
        overallStatus: "PENDING",
      },
    };
    const report = reconcileTargetAndDrift(inputPendingCheck);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("CHECK_PENDING");
  });

  it("POSTH1-P2-DRIFT-007: detects incomplete acceptance coverage", () => {
    const inputIncompleteCoverage: ReconciliationEngineInput = {
      ...baseValidInput,
      acceptanceFacts: {
        totalRequiredIds: 24,
        validatedIds: 23,
        missingIds: ["POSTH1-P2-SAFE-004"],
        coverageComplete: false,
      },
    };
    const report = reconcileTargetAndDrift(inputIncompleteCoverage);
    expect(report.outcome).toBe("DRIFT_DETECTED");
    expect(report.reasons).toContain("ACCEPTANCE_COVERAGE_INCOMPLETE");
  });

  it("POSTH1-P2-DRIFT-008: returns NOT_ASSESSABLE with EVIDENCE_STALE for stale evidence without creating drift", () => {
    const inputStale: ReconciliationEngineInput = {
      ...baseValidInput,
      freshness: {
        observedAtEpochMilliseconds: 1000,
        maxAgeMilliseconds: 86400000,
        ageMilliseconds: 999999999,
        isFresh: false,
      },
    };
    const report = reconcileTargetAndDrift(inputStale);
    expect(report.outcome).toBe("NOT_ASSESSABLE");
    expect(report.reasons).toEqual(["EVIDENCE_STALE"]);
    expect(report.authority).toBe("NON_AUTHORIZING");
  });

  it("POSTH1-P2-SAFE-003: maps provider outages, rate limits, and pagination incomplete to NOT_ASSESSABLE", () => {
    const inputRateLimited: ReconciliationEngineInput = {
      ...baseValidInput,
      providerFailureReason: "RATE_LIMITED",
    };
    const reportRateLimit = reconcileTargetAndDrift(inputRateLimited);
    expect(reportRateLimit.outcome).toBe("NOT_ASSESSABLE");
    expect(reportRateLimit.reasons).toContain("RATE_LIMITED");

    const inputIncompletePagination: ReconciliationEngineInput = {
      ...baseValidInput,
      isPaginationComplete: false,
    };
    const reportPagination = reconcileTargetAndDrift(inputIncompletePagination);
    expect(reportPagination.outcome).toBe("NOT_ASSESSABLE");
    expect(reportPagination.reasons).toContain("PAGINATION_INCOMPLETE");
  });
});
