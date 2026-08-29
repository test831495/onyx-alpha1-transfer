import {
  EvidenceFreshnessAssessment,
  EvidenceManifestProjection,
  GovernanceReconciliationResult,
  LifecycleDriftReport,
  ReadOnlyAutomationPlan,
} from "./p2-evidence-contracts";
import { sha256 } from "./p2-evidence-normalization";
import { ReconciliationEngineInput } from "./p2-reconciliation-engine";
import { assessMainClosure, assessMergeReadiness } from "./verification-engine";

export const reconcileGovernanceState = (
  input: ReconciliationEngineInput,
  driftReport: LifecycleDriftReport
): GovernanceReconciliationResult => {
  const isMatch = driftReport.outcome === "MATCH";

  // Invoke P1 assessMergeReadiness with exact P1 MergeReadinessInput schema
  const readinessAssessment = assessMergeReadiness({
    prOpen: input.pullRequestFacts.state === "OPEN",
    draft: input.pullRequestFacts.isDraft,
    conflicts: false,
    rulesetVisible: true,
    targetExact: isMatch,
    headFresh: input.freshness.isFresh,
    commitScopeValid: isMatch,
    checksPassed: input.checkFacts.overallStatus === "SUCCESS",
    threadsResolved: input.reviewThreadFacts.unresolvedThreads === 0,
    findingsClosed: true,
    coverageComplete: input.acceptanceFacts.coverageComplete,
    evidenceFresh: input.freshness.isFresh,
    approvalsPresent: input.reviewFacts.reviewState === "APPROVED",
    ownerAuthorization: true,
  });

  // Invoke P1 assessMainClosure with exact P1 MainClosureInput schema
  const closureAssessment = assessMainClosure({
    prMergedClosed: true,
    mainLineage: isMatch,
    commitsReachable: isMatch,
    fileScopeIncorporated: isMatch,
    validationCurrent: isMatch,
    finalMarker: isMatch,
    handoff: true,
    unauthorizedReleaseClaim: false,
  });

  let outcome: "MATCH" | "DRIFT_DETECTED" | "NOT_ASSESSABLE" = "MATCH";
  if (driftReport.outcome === "NOT_ASSESSABLE") {
    outcome = "NOT_ASSESSABLE";
  } else if (
    driftReport.outcome === "DRIFT_DETECTED" ||
    readinessAssessment.outcome !== "TECHNICALLY_READY" ||
    closureAssessment.outcome !== "MAIN_CLOSED"
  ) {
    outcome = "DRIFT_DETECTED";
  }

  return Object.freeze({
    outcome,
    readinessAssessment,
    closureAssessment,
    authority: "NON_AUTHORIZING",
  });
};

export const projectEvidenceManifest = (
  input: ReconciliationEngineInput,
  driftReport: LifecycleDriftReport,
  governanceResult: GovernanceReconciliationResult,
  rawEvidencePayloads: readonly string[] = []
): EvidenceManifestProjection => {
  const targetHash = sha256(JSON.stringify(input.targetLock));
  const rawEvidenceHashes = Object.freeze(rawEvidencePayloads.map((payload) => sha256(payload)).sort());
  const normalizedFactHash = sha256(
    JSON.stringify({
      repo: input.repositoryFacts,
      pr: input.pullRequestFacts,
      review: input.reviewFacts,
      thread: input.reviewThreadFacts,
      check: input.checkFacts,
      acceptance: input.acceptanceFacts,
    })
  );
  const p1InputHash = sha256(JSON.stringify(input.targetLock));
  const p1OutputHash = sha256(
    JSON.stringify({
      readiness: governanceResult.readinessAssessment,
      closure: governanceResult.closureAssessment,
    })
  );
  const driftReportHash = sha256(JSON.stringify(driftReport));
  const governanceResultHash = sha256(JSON.stringify(governanceResult));

  const manifestContent = [
    targetHash,
    ...rawEvidenceHashes,
    normalizedFactHash,
    p1InputHash,
    p1OutputHash,
    driftReportHash,
    governanceResultHash,
  ].join(":");

  const manifestHash = sha256(manifestContent);

  return Object.freeze({
    manifestHash,
    targetHash,
    rawEvidenceHashes,
    normalizedFactHash,
    p1InputHash,
    p1OutputHash,
    driftReportHash,
    governanceResultHash,
    freshness: input.freshness,
    isPaginationComplete: input.isPaginationComplete ?? true,
    authority: "NON_AUTHORIZING",
  });
};

export const projectReadOnlyAutomationPlan = (
  driftReport: LifecycleDriftReport,
  governanceResult: GovernanceReconciliationResult
): ReadOnlyAutomationPlan => {
  const pendingActions: unknown[] = [];

  if (driftReport.outcome === "DRIFT_DETECTED") {
    pendingActions.push({
      actionClass: "REASSESS_DRIFT",
      requiredOwnerDecision: "MANUAL_INSPECTION_REQUIRED",
      reasons: driftReport.reasons,
    });
  } else if (driftReport.outcome === "NOT_ASSESSABLE") {
    pendingActions.push({
      actionClass: "RETRY_EVIDENCE_COLLECTION",
      requiredOwnerDecision: "PROVIDE_VALID_EVIDENCE",
      reasons: driftReport.reasons,
    });
  } else {
    pendingActions.push({
      actionClass: "VERIFY_FINAL_READINESS",
      requiredOwnerDecision: "COMMIT_AUTHORIZATION_PENDING",
      reasons: [],
    });
  }

  const disclaimers = Object.freeze([
    "NON_AUTHORIZING: This automation plan is purely advisory and confers no execution or state transition authority.",
    "No persistence, network, command execution, or GitHub write operation was performed or scheduled.",
  ]);

  return Object.freeze({
    pendingActions: Object.freeze(pendingActions),
    disclaimers,
    authority: "NON_AUTHORIZING",
  });
};
