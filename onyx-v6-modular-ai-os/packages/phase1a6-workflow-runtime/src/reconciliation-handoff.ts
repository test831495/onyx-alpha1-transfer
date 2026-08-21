import { GOVERNED_REPOSITORY, type Workflow } from "@onyx/phase1a5-workflow-engine";
import type { UncertainOperation } from "./runtime-host";
import type { RuntimeSnapshot } from "./runtime-snapshot";

export interface ReconciliationHandoff {
  readonly workflowId: string;
  readonly runtimeId: string;
  readonly repository: typeof GOVERNED_REPOSITORY;
  readonly currentState: Workflow["state"];
  readonly currentStep: string;
  readonly lastTrustedCheckpoint: string | null;
  readonly uncertainOperation: { capability: string; idempotencyKey: string; detail: string };
  readonly idempotencyKey: string;
  readonly resourceReferences: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly recommendedReadOnlyReconciliationChecks: readonly string[];
  readonly automaticRetryPermitted: false;
  readonly remoteDeletionPermitted: false;
  readonly forcePushPermitted: false;
  readonly mergePermitted: false;
  readonly productionPermitted: false;
  readonly createdAt: string;
}

/**
 * Produces a deterministic, read-only reconciliation package. This function never
 * executes reconciliation; it only describes what a human or downstream process
 * must verify before any further action is taken.
 */
export function createReconciliationHandoff(
  snapshot: RuntimeSnapshot,
  uncertainOperation: UncertainOperation,
  now: Date = new Date(),
): ReconciliationHandoff {
  const recommendedReadOnlyReconciliationChecks = [
    `Confirm whether ${uncertainOperation.capability} actually completed on the remote provider.`,
    "Read the remote resource state without creating, merging, or deleting anything.",
    "Compare the remote resource identity against the recorded idempotency key.",
    "Escalate to a human reviewer before any further automated action.",
  ];
  return Object.freeze({
    workflowId: snapshot.workflowId,
    runtimeId: snapshot.runtimeId,
    repository: GOVERNED_REPOSITORY,
    currentState: snapshot.currentWorkflowState,
    currentStep: uncertainOperation.capability,
    lastTrustedCheckpoint: snapshot.latestCheckpointDigest,
    uncertainOperation: {
      capability: uncertainOperation.capability,
      idempotencyKey: uncertainOperation.idempotencyKey,
      detail: uncertainOperation.detail,
    },
    idempotencyKey: uncertainOperation.idempotencyKey,
    resourceReferences: [...uncertainOperation.resourceReferences],
    evidenceReferences: snapshot.latestCheckpointDigest ? [snapshot.latestCheckpointDigest] : [],
    recommendedReadOnlyReconciliationChecks,
    automaticRetryPermitted: false,
    remoteDeletionPermitted: false,
    forcePushPermitted: false,
    mergePermitted: false,
    productionPermitted: false,
    createdAt: now.toISOString(),
  });
}
