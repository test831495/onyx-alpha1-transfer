import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

export interface ReconciliationDecisionInput {
  failureClass: string;
  providerOutcome: "SUCCESS" | "FAILURE" | "UNKNOWN" | "UNCERTAIN";
  remoteSideEffectStatus: "NONE" | "KNOWN" | "NOT_APPLIED" | "UNCERTAIN" | "UNKNOWN";
  idempotencyKey: string;
  checkpointLineageValid: boolean;
  approvalValid: boolean;
  permissionValid: boolean;
  scopeValid: boolean;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export interface ReconciliationDecisionResult {
  failureClass: string;
  required: boolean;
  disposition: string;
  retryPermitted: boolean;
  resumePermitted: boolean;
  reassignmentPermitted: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export function evaluateReconciliationDecision(
  input: ReconciliationDecisionInput,
): ReconciliationDecisionResult {
  const denialReasons: string[] = [];
  const uncertain = input.remoteSideEffectStatus === "UNCERTAIN" || input.providerOutcome === "UNKNOWN" || input.providerOutcome === "UNCERTAIN";
  const governanceInvalid = !input.checkpointLineageValid || !input.approvalValid || !input.permissionValid || !input.scopeValid;

  if (input.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("contract-version-mismatch");
    return {
      failureClass: input.failureClass,
      required: true,
      disposition: "PROHIBITED",
      retryPermitted: false,
      resumePermitted: false,
      reassignmentPermitted: false,
      denialReasons,
      evidenceArtifactIds: input.evidenceArtifactIds,
      contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    };
  }

  if (uncertain || input.failureClass === "UNKNOWN_EXTERNAL_WRITE" || input.failureClass === "UNCERTAIN_REMOTE_EFFECT") {
    denialReasons.push("provider-truth-required");
    return {
      failureClass: input.failureClass,
      required: true,
      disposition: "RECONCILE_PROVIDER_TRUTH",
      retryPermitted: false,
      resumePermitted: false,
      reassignmentPermitted: false,
      denialReasons,
      evidenceArtifactIds: input.evidenceArtifactIds,
      contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    };
  }

  if (governanceInvalid) {
    denialReasons.push("governance-revalidation-required");
    return {
      failureClass: input.failureClass,
      required: true,
      disposition: "RECONCILE_APPROVAL",
      retryPermitted: false,
      resumePermitted: false,
      reassignmentPermitted: false,
      denialReasons,
      evidenceArtifactIds: input.evidenceArtifactIds,
      contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    };
  }

  if (!input.idempotencyKey) {
    denialReasons.push("missing-idempotency-key");
    return {
      failureClass: input.failureClass,
      required: true,
      disposition: "WAIT_FOR_OWNER",
      retryPermitted: false,
      resumePermitted: false,
      reassignmentPermitted: false,
      denialReasons,
      evidenceArtifactIds: input.evidenceArtifactIds,
      contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    };
  }

  return {
    failureClass: input.failureClass,
    required: false,
    disposition: "NO_RECOVERY_REQUIRED",
    retryPermitted: true,
    resumePermitted: true,
    reassignmentPermitted: true,
    denialReasons: [],
    evidenceArtifactIds: input.evidenceArtifactIds,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };
}
