import {
  GOVERNED_REPOSITORY,
  validateApproval,
  verifyCheckpointChain,
  type CheckpointStore,
  type Workflow,
} from "@onyx/phase1a5-workflow-engine";
import { AdapterRegistry } from "./adapter-registry";
import { CAPABILITIES, COMPATIBLE_WORKFLOW_CONTRACT_VERSION, RUNTIME_EXECUTION_LANE_LIMIT, makeRuntimeId, type Capability } from "./contracts";
import { RuntimeHost } from "./runtime-host";
import { buildRuntimeSnapshot, type RuntimeSnapshot } from "./runtime-snapshot";

export interface ReconstructedEvidenceEntry {
  sequence: number;
  stepId: string;
  providerClassification: string;
  checkpointDigest: string;
  resourceReferences: string[];
  timestamp: string;
}

export interface RecoveryResult {
  snapshot: RuntimeSnapshot;
  completedCapabilities: Capability[];
  reconstructedEvidence: ReconstructedEvidenceEntry[];
}

/**
 * Recovers runtime state exclusively from the trusted Phase 1A.5 checkpoint chain.
 * Never repeats a completed capability and never auto-resumes when reconciliation
 * is required.
 */
export class RecoveryHost {
  constructor(private readonly checkpoints: CheckpointStore) {}

  async recover(workflow: Workflow, clock: () => Date = () => new Date()): Promise<RecoveryResult> {
    const approval = workflow.approval;
    if (!approval) throw new Error("Recovery requires a valid Phase 1A.5 approval package.");
    if (workflow.repository !== GOVERNED_REPOSITORY) throw new Error("Repository mismatch during recovery.");
    if (workflow.contractVersion !== COMPATIBLE_WORKFLOW_CONTRACT_VERSION) {
      throw new Error(`Unsupported workflow contract version during recovery: ${workflow.contractVersion}`);
    }
    validateApproval(workflow, approval, clock().getTime());
    if (approval.orderedCapabilities.length !== CAPABILITIES.length || approval.orderedCapabilities.some((capability, index) => capability !== CAPABILITIES[index])) {
      throw new Error("Approval capability order changed; recovery rejected.");
    }

    const records = await this.checkpoints.list(workflow.workflowId);
    verifyCheckpointChain(records, {
      workflowId: workflow.workflowId,
      repository: workflow.repository,
      workflowVersion: workflow.contractVersion,
      scopeHash: workflow.scopeHash,
    });

    const last = records.at(-1);
    if (last?.nextPermittedState === "WORKFLOW_RECONCILIATION_REQUIRED") {
      throw new Error("Automatic resume is not permitted while an uncertain result requires reconciliation.");
    }

    const completed: Capability[] = [];
    for (const record of records) {
      const isSuccessful = record.providerResultClassification === "DETERMINISTIC_SUCCESS" || record.providerResultClassification === "COMPATIBLE_REUSE";
      if (record.completedAt && record.nextPermittedState && isSuccessful) {
        const capability = record.stepId as Capability;
        if (!completed.includes(capability)) completed.push(capability);
      }
    }
    const orderedCompleted = CAPABILITIES.filter((capability) => completed.includes(capability));

    const reconstructedEvidence: ReconstructedEvidenceEntry[] = records
      .filter((record) => record.completedAt)
      .map((record, index) => ({
        sequence: index + 1,
        stepId: record.stepId,
        providerClassification: record.providerResultClassification ?? "UNKNOWN",
        checkpointDigest: record.digest,
        resourceReferences: [record.resourceId, record.resourceUrl].filter((value): value is string => Boolean(value)),
        timestamp: record.completedAt as string,
      }));

    const currentState = (last?.currentState ?? workflow.state) as Workflow["state"];
    const reconciliationRequired = last?.nextPermittedState === "WORKFLOW_RECONCILIATION_REQUIRED";
    const snapshot = buildRuntimeSnapshot({
      runtimeId: makeRuntimeId(workflow),
      workflowId: workflow.workflowId,
      contractVersion: workflow.contractVersion,
      repository: workflow.repository,
      scopeHash: workflow.scopeHash,
      approvalDigest: approval.digest,
      currentWorkflowState: currentState,
      completedCapabilities: orderedCompleted,
      checkpointCount: records.length,
      latestCheckpointDigest: last?.digest ?? null,
      evidenceCount: reconstructedEvidence.length,
      latestEvidenceSequence: reconstructedEvidence.at(-1)?.sequence ?? null,
      recoveryAvailable: records.length > 0,
      reconciliationRequired,
      pauseAvailable: orderedCompleted.length < CAPABILITIES.length && !reconciliationRequired,
      cancelAvailable: orderedCompleted.length < CAPABILITIES.length && !reconciliationRequired,
      laneLimit: RUNTIME_EXECUTION_LANE_LIMIT,
      updatedAt: clock().toISOString(),
    });

    return { snapshot, completedCapabilities: orderedCompleted, reconstructedEvidence };
  }

  resumeHost(workflow: Workflow, registry: AdapterRegistry, recovered: RecoveryResult, clock?: () => Date): RuntimeHost {
    return new RuntimeHost(workflow, {
      registry,
      checkpoints: this.checkpoints,
      clock,
      alreadyCompleted: recovered.completedCapabilities,
      previousCheckpointDigest: recovered.snapshot.latestCheckpointDigest ?? undefined,
    });
  }
}
