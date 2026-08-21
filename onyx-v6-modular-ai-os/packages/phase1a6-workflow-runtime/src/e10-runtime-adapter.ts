import { GOVERNED_REPOSITORY, digest, type WorkflowInput } from "@onyx/phase1a5-workflow-engine";
import { COMPATIBLE_WORKFLOW_CONTRACT_VERSION, RUNTIME_EXECUTION_LANE_LIMIT } from "./contracts";
import { buildRuntimeSnapshot, type RuntimeSnapshot } from "./runtime-snapshot";

/** Minimal structural shape of an E.10 supervised run in the DRY_RUN_READY state. */
export interface E10DryRunReadyInput {
  runId: string;
  state: string;
  repository: string;
  scopeHash: string;
  baseBranch: string;
  proposedBranch: string;
  plan: {
    objective: string;
    allowedPaths: string[];
    acceptanceCriteria: string[];
    validationPlan: string[];
    rollbackPlan: string[];
  };
  remoteWritesPerformed: boolean;
  branchCreated: boolean;
  issueCreated: boolean;
  draftPrCreated: boolean;
  mergeAllowed: boolean;
  productionDeployAllowed: boolean;
}

export interface E10RuntimeIntake {
  readonly runId: string;
  readonly repository: typeof GOVERNED_REPOSITORY;
  readonly scopeHash: string;
  readonly workflowInput: WorkflowInput;
  readonly remoteWritesPerformed: false;
  readonly branchCreated: false;
  readonly issueCreated: false;
  readonly draftPrCreated: false;
  readonly mergeAllowed: false;
  readonly productionDeployAllowed: false;
  readonly forcePushAllowed: false;
  readonly branchDeletionAllowed: false;
}

/**
 * Converts a DRY_RUN_READY E.10 supervised run into a Phase 1A.5 workflow runtime
 * request. This never performs a live GitHub action; every remote-write flag is
 * forced false ahead of workflow approval.
 */
export function convertE10DryRunToRuntimeIntake(run: E10DryRunReadyInput, expectedScopeHash: string): E10RuntimeIntake {
  if (run.state !== "DRY_RUN_READY") {
    throw new Error(`E.10 input must be in DRY_RUN_READY state, received: ${run.state}`);
  }
  if (run.repository !== GOVERNED_REPOSITORY) {
    throw new Error(`E.10 repository mismatch: ${run.repository}`);
  }
  if (run.scopeHash !== expectedScopeHash) {
    throw new Error("E.10 scope hash mismatch.");
  }

  const workflowInput: WorkflowInput = {
    repository: GOVERNED_REPOSITORY,
    issue: { title: run.plan.objective, allowedPaths: run.plan.allowedPaths },
    branch: { baseBranch: run.baseBranch, headBranch: run.proposedBranch },
    baseBranch: run.baseBranch,
    headBranch: run.proposedBranch,
    validationPlan: { checks: run.plan.validationPlan },
    evidencePlan: { acceptanceCriteria: run.plan.acceptanceCriteria },
    draftPrPlan: { draft: true, rollbackPlan: run.plan.rollbackPlan },
  };

  return Object.freeze({
    runId: run.runId,
    repository: GOVERNED_REPOSITORY,
    scopeHash: run.scopeHash,
    workflowInput,
    remoteWritesPerformed: false,
    branchCreated: false,
    issueCreated: false,
    draftPrCreated: false,
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
  });
}

/**
 * Exposes a pre-approval runtime snapshot preview so the Automation Center can
 * display E.10 intake state before a Phase 1A.5 workflow is created or approved.
 */
export function previewRuntimeSnapshotFromE10Intake(intake: E10RuntimeIntake, now: Date = new Date()): RuntimeSnapshot {
  return buildRuntimeSnapshot({
    runtimeId: `p16rt-preview-${digest({ runId: intake.runId, scopeHash: intake.scopeHash }).slice(0, 24)}`,
    workflowId: `pending-${intake.runId}`,
    contractVersion: COMPATIBLE_WORKFLOW_CONTRACT_VERSION,
    repository: intake.repository,
    scopeHash: intake.scopeHash,
    approvalDigest: "",
    currentWorkflowState: "WORKFLOW_CREATED",
    completedCapabilities: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
    laneLimit: RUNTIME_EXECUTION_LANE_LIMIT,
    updatedAt: now.toISOString(),
  });
}
