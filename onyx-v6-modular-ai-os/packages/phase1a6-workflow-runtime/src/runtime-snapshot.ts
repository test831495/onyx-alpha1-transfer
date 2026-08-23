import { CAPABILITIES, type Capability, type RuntimeStatus, type WorkflowState } from "./browser";
import { projectRuntimeStatus } from "./status-projector";

export interface RuntimeSnapshot {
  readonly runtimeId: string;
  readonly workflowId: string;
  readonly contractVersion: string;
  readonly repository: string;
  readonly scopeHash: string;
  readonly approvalDigest: string;
  readonly currentWorkflowState: WorkflowState;
  readonly currentStatus: RuntimeStatus;
  readonly currentStep: Capability | null;
  readonly orderedCapabilities: readonly Capability[];
  readonly completedCapabilities: readonly Capability[];
  readonly pendingCapabilities: readonly Capability[];
  readonly checkpointCount: number;
  readonly latestCheckpointDigest: string | null;
  readonly evidenceCount: number;
  readonly latestEvidenceSequence: number | null;
  readonly recoveryAvailable: boolean;
  readonly reconciliationRequired: boolean;
  readonly pauseAvailable: boolean;
  readonly cancelAvailable: boolean;
  readonly laneLimit: number;
  readonly mergeAllowed: false;
  readonly productionDeployAllowed: false;
  readonly forcePushAllowed: false;
  readonly branchDeletionAllowed: false;
  readonly updatedAt: string;
}

export interface RuntimeSnapshotInput {
  runtimeId: string;
  workflowId: string;
  contractVersion: string;
  repository: string;
  scopeHash: string;
  approvalDigest: string;
  currentWorkflowState: WorkflowState;
  completedCapabilities: readonly Capability[];
  checkpointCount: number;
  latestCheckpointDigest: string | null;
  evidenceCount: number;
  latestEvidenceSequence: number | null;
  recoveryAvailable: boolean;
  reconciliationRequired: boolean;
  pauseAvailable: boolean;
  cancelAvailable: boolean;
  laneLimit: number;
  updatedAt: string;
}

export function buildRuntimeSnapshot(input: RuntimeSnapshotInput): RuntimeSnapshot {
  const pendingCapabilities = CAPABILITIES.filter((capability) => !input.completedCapabilities.includes(capability));
  const currentStep = pendingCapabilities[0] ?? null;
  const snapshot: RuntimeSnapshot = {
    runtimeId: input.runtimeId,
    workflowId: input.workflowId,
    contractVersion: input.contractVersion,
    repository: input.repository,
    scopeHash: input.scopeHash,
    approvalDigest: input.approvalDigest,
    currentWorkflowState: input.currentWorkflowState,
    currentStatus: projectRuntimeStatus(input.currentWorkflowState),
    currentStep,
    orderedCapabilities: [...CAPABILITIES],
    completedCapabilities: [...input.completedCapabilities],
    pendingCapabilities,
    checkpointCount: input.checkpointCount,
    latestCheckpointDigest: input.latestCheckpointDigest,
    evidenceCount: input.evidenceCount,
    latestEvidenceSequence: input.latestEvidenceSequence,
    recoveryAvailable: input.recoveryAvailable,
    reconciliationRequired: input.reconciliationRequired,
    pauseAvailable: input.pauseAvailable,
    cancelAvailable: input.cancelAvailable,
    laneLimit: input.laneLimit,
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
    updatedAt: input.updatedAt,
  };
  return Object.freeze(snapshot);
}
