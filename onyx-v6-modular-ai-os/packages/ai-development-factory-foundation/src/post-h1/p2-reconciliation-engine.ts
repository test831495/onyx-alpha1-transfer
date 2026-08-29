import {
  EvidenceFreshnessAssessment,
  LifecycleDriftDetail,
  LifecycleDriftReport,
  NormalizedAcceptanceFacts,
  NormalizedCheckFacts,
  NormalizedPullRequestFacts,
  NormalizedRepositoryFacts,
  NormalizedReviewFacts,
  NormalizedReviewThreadFacts,
  P2ReasonCode,
} from "./p2-evidence-contracts";
import { TargetLock, compareTargetLocks, validateTargetLock } from "./target-lock";

export interface ReconciliationEngineInput {
  readonly targetLock: TargetLock;
  readonly repositoryFacts: NormalizedRepositoryFacts;
  readonly pullRequestFacts: NormalizedPullRequestFacts;
  readonly reviewFacts: NormalizedReviewFacts;
  readonly reviewThreadFacts: NormalizedReviewThreadFacts;
  readonly checkFacts: NormalizedCheckFacts;
  readonly acceptanceFacts: NormalizedAcceptanceFacts;
  readonly freshness: EvidenceFreshnessAssessment;
  readonly isPaginationComplete?: boolean;
  readonly providerFailureReason?: P2ReasonCode;
}

export const reconcileTargetAndDrift = (input: ReconciliationEngineInput): LifecycleDriftReport => {
  const details: LifecycleDriftDetail[] = [];
  const reasons: P2ReasonCode[] = [];

  // Check provider failure / unavailability / rate-limiting / pagination first
  if (input.providerFailureReason) {
    return Object.freeze({
      outcome: "NOT_ASSESSABLE",
      driftCount: 0,
      details: Object.freeze([]),
      reasons: Object.freeze([input.providerFailureReason] as P2ReasonCode[]),
      authority: "NON_AUTHORIZING",
    });
  }

  if (input.isPaginationComplete === false) {
    return Object.freeze({
      outcome: "NOT_ASSESSABLE",
      driftCount: 0,
      details: Object.freeze([]),
      reasons: Object.freeze(["PAGINATION_INCOMPLETE" as P2ReasonCode]),
      authority: "NON_AUTHORIZING",
    });
  }

  // DRIFT-008: Stale evidence returns NOT_ASSESSABLE with EVIDENCE_STALE
  if (!input.freshness.isFresh) {
    return Object.freeze({
      outcome: "NOT_ASSESSABLE",
      driftCount: 0,
      details: Object.freeze([]),
      reasons: Object.freeze(["EVIDENCE_STALE" as P2ReasonCode]),
      authority: "NON_AUTHORIZING",
    });
  }

  // Target Lock Comparison (consumes P0/P1 target lock function)
  if (input.targetLock && typeof input.targetLock === "object" && "expiresAt" in input.targetLock) {
    const targetLockValidation = validateTargetLock(
      input.targetLock,
      new Date(input.freshness.observedAtEpochMilliseconds)
    );
    if (targetLockValidation.outcome !== "PASS") {
      reasons.push("TARGET_MISMATCH");
      details.push({
        field: "targetLock",
        expected: "PASS",
        actual: targetLockValidation.outcome,
        severity: "BLOCKING",
      });
    }
  }

  const expectedLockRepo = String(input.targetLock.repository ?? input.targetLock.repositoryId ?? "");
  if (expectedLockRepo && input.repositoryFacts.repository !== expectedLockRepo && !expectedLockRepo.endsWith(`/${input.repositoryFacts.repository}`)) {
    reasons.push("TARGET_MISMATCH");
    details.push({
      field: "repository",
      expected: expectedLockRepo,
      actual: input.repositoryFacts.repository,
      severity: "BLOCKING",
    });
  }

  const expectedHeadSha = String(input.targetLock.headSha ?? "");
  if (expectedHeadSha && input.pullRequestFacts.headSha !== expectedHeadSha) {
    reasons.push("TARGET_MISMATCH");
    details.push({
      field: "headSha",
      expected: expectedHeadSha,
      actual: input.pullRequestFacts.headSha,
      severity: "BLOCKING",
    });
  }

  // PR State checks
  if (input.pullRequestFacts.state !== "OPEN" || input.pullRequestFacts.isDraft) {
    reasons.push("REVIEW_STATE_DRIFT");
    details.push({
      field: "prState",
      expected: "OPEN_NON_DRAFT",
      actual: `${input.pullRequestFacts.state}_DRAFT_${input.pullRequestFacts.isDraft}`,
      severity: "BLOCKING",
    });
  }

  // Review state checks
  if (input.reviewFacts.reviewState !== "APPROVED" || input.reviewFacts.changesRequestedCount > 0) {
    reasons.push("REVIEW_STATE_DRIFT");
    details.push({
      field: "reviewState",
      expected: "APPROVED",
      actual: input.reviewFacts.reviewState,
      severity: "BLOCKING",
    });
  }

  // Thread checks
  if (input.reviewThreadFacts.unresolvedThreads > 0) {
    reasons.push("THREAD_UNRESOLVED");
    details.push({
      field: "unresolvedThreads",
      expected: "0",
      actual: String(input.reviewThreadFacts.unresolvedThreads),
      severity: "BLOCKING",
    });
  }

  // Check facts
  if (input.checkFacts.overallStatus === "FAILURE") {
    reasons.push("CHECK_STATE_AMBIGUOUS");
    details.push({
      field: "checkStatus",
      expected: "SUCCESS",
      actual: "FAILURE",
      severity: "BLOCKING",
    });
  } else if (input.checkFacts.overallStatus === "PENDING") {
    reasons.push("CHECK_PENDING");
    details.push({
      field: "checkStatus",
      expected: "SUCCESS",
      actual: "PENDING",
      severity: "BLOCKING",
    });
  }

  // Acceptance coverage check
  if (!input.acceptanceFacts.coverageComplete) {
    reasons.push("ACCEPTANCE_COVERAGE_INCOMPLETE");
    details.push({
      field: "acceptanceCoverage",
      expected: "COMPLETE",
      actual: `MISSING_${input.acceptanceFacts.missingIds.join(",")}`,
      severity: "BLOCKING",
    });
  }

  // Deduplicate reason codes
  const uniqueReasons = Array.from(new Set(reasons)) as P2ReasonCode[];
  const outcome = details.length > 0 ? "DRIFT_DETECTED" : "MATCH";

  return Object.freeze({
    outcome,
    driftCount: details.length,
    details: Object.freeze(details),
    reasons: Object.freeze(uniqueReasons),
    authority: "NON_AUTHORIZING",
  });
};
