import {
  InMemoryCheckpointStore,
  WorkflowEngine,
  type Checkpoint,
  type CheckpointStore,
  type ExecutorResult,
  type ProviderClassification,
  type StepInput,
  type Workflow,
  type WorkflowExecutor,
} from "@onyx/phase1a5-workflow-engine";
import { simulationInput } from "@onyx/phase1a5-workflow-engine/local-simulation";
import { AdapterRegistry, type CapabilityAdapter } from "./adapter-registry";
import { CAPABILITIES, RUNTIME_EXECUTION_LANE_LIMIT, type Capability } from "./contracts";
import { RecoveryHost } from "./recovery-host";
import { createReconciliationHandoff, type ReconciliationHandoff } from "./reconciliation-handoff";
import { RuntimeHost } from "./runtime-host";

/** The runtime never invokes the Phase 1A.5 executor directly; it drives capability adapters instead. */
function unusedExecutor(): WorkflowExecutor {
  const fail = async (): Promise<ExecutorResult> => {
    throw new Error("The Phase 1A.6 runtime never invokes the Phase 1A.5 executor directly.");
  };
  return { createGithubIssue: fail, createIsolatedBranch: fail, pushIsolatedBranch: fail, runValidation: fail, generateEvidence: fail, createDraftPr: fail };
}

export function buildFrozenApprovedWorkflow(now: Date, reason = "Approve the exact governed Phase 1A.6 runtime workflow.", ttlMs?: number): Workflow {
  const engine = new WorkflowEngine(unusedExecutor(), new InMemoryCheckpointStore(), () => now);
  const workflow = engine.create(simulationInput());
  engine.freeze(workflow);
  engine.approve(workflow, reason, ttlMs);
  return workflow;
}

export class ScriptedCapabilityAdapter implements CapabilityAdapter {
  invocationCount = 0;
  constructor(readonly capability: Capability, private readonly classification: ProviderClassification = "DETERMINISTIC_SUCCESS") {}
  async invoke(_input: StepInput): Promise<ExecutorResult> {
    this.invocationCount += 1;
    if (this.classification === "DETERMINISTIC_SUCCESS") {
      return { classification: "DETERMINISTIC_SUCCESS", resourceId: `${this.capability}-resource`, resourceUrl: `local://${this.capability}` };
    }
    if (this.classification === "UNCERTAIN_RESULT") {
      return { classification: "UNCERTAIN_RESULT", detail: `${this.capability} uncertain remote outcome`, resourceId: `${this.capability}-maybe-resource` };
    }
    return { classification: "DETERMINISTIC_FAILURE", detail: `${this.capability} deterministic failure` };
  }
}

export function buildMockRegistry(overrides: Partial<Record<Capability, ProviderClassification>> = {}) {
  const registry = new AdapterRegistry();
  const adapters = {} as Record<Capability, ScriptedCapabilityAdapter>;
  for (const capability of CAPABILITIES) {
    const adapter = new ScriptedCapabilityAdapter(capability, overrides[capability] ?? "DETERMINISTIC_SUCCESS");
    adapters[capability] = adapter;
    registry.register(adapter);
  }
  return { registry, adapters };
}

/** A checkpoint store wrapper that returns a corrupted checkpoint chain for negative testing. */
class CorruptingCheckpointStore implements CheckpointStore {
  constructor(private readonly inner: CheckpointStore) {}
  append(value: Omit<Checkpoint, "digest">): Promise<Checkpoint> {
    return this.inner.append(value);
  }
  async list(workflowId: string): Promise<Checkpoint[]> {
    const records = await this.inner.list(workflowId);
    if (records.length === 0) return records;
    const corrupted = [...records];
    const last = corrupted.at(-1)!;
    corrupted[corrupted.length - 1] = { ...last, scopeHash: `${last.scopeHash}-corrupted` };
    return corrupted;
  }
}

export interface LocalRuntimeSimulationResult {
  completedWorkflowState: string;
  statusSequence: string[];
  pausedAndResumed: boolean;
  recoveredWithoutDuplication: boolean;
  deterministicFailureHandled: boolean;
  uncertainResultHandled: boolean;
  reconciliationHandoff: ReconciliationHandoff | null;
  unsafeCancellationRejected: boolean;
  scopeInvalidationRejected: boolean;
  approvalExpiryRejected: boolean;
  checkpointCorruptionRejected: boolean;
  safeCancellationHandled: boolean;
  rollbackRecommendationProjected: boolean;
  laneLimit: number;
  mergeAllowed: false;
  productionDeployAllowed: false;
  forcePushAllowed: false;
  branchDeletionAllowed: false;
}

export async function runLocalRuntimeSimulation(): Promise<LocalRuntimeSimulationResult> {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const clock = () => now;

  // 1-7: complete ordered workflow, pause after each step, resume, recover from checkpoint, no duplicate invocation.
  const checkpointStore = new InMemoryCheckpointStore();
  const { registry, adapters } = buildMockRegistry();
  const workflow = buildFrozenApprovedWorkflow(now);
  let host = new RuntimeHost(workflow, { registry, checkpoints: checkpointStore, clock });

  const statusSequence: string[] = [];
  let pausedAndResumed = false;
  let recoveredWithoutDuplication = true;

  for (let index = 0; index < CAPABILITIES.length; index += 1) {
    host.requestPause();
    const outcome = await host.runNextStep();
    statusSequence.push(host.snapshot().currentStatus);
    if (outcome.classification === "PAUSED") {
      pausedAndResumed = true;
      host.resume();
      const recoveryHost = new RecoveryHost(checkpointStore);
      const recovered = await recoveryHost.recover(workflow, clock);
      if (recovered.completedCapabilities.length !== index + 1) recoveredWithoutDuplication = false;
      host = recoveryHost.resumeHost(workflow, registry, recovered, clock);
    }
  }

  const noDuplicateInvocation = CAPABILITIES.every((capability) => adapters[capability].invocationCount === 1);
  recoveredWithoutDuplication = recoveredWithoutDuplication && noDuplicateInvocation;

  // 14: safe cancellation on a fresh, still-pending workflow.
  const cancellationWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed cancellation scenario.");
  const cancellationRegistry = buildMockRegistry().registry;
  const cancellationHost = new RuntimeHost(cancellationWorkflow, { registry: cancellationRegistry, clock });
  await cancellationHost.runNextStep();
  cancellationHost.cancel();
  const safeCancellationHandled = cancellationHost.snapshot().currentStatus === "CANCELLED";

  // 8, 15: deterministic failure and policy-only rollback recommendation.
  const failureWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed failure scenario.");
  const failureRegistry = buildMockRegistry({ CREATE_ISOLATED_BRANCH: "DETERMINISTIC_FAILURE" }).registry;
  const failureHost = new RuntimeHost(failureWorkflow, { registry: failureRegistry, clock });
  await failureHost.run();
  const deterministicFailureHandled = failureHost.snapshot().currentStatus === "FAILED_SAFE";
  const rollback = failureHost.projectRollback("Policy-only rollback after a deterministic safe stop.");
  const rollbackRecommendationProjected = rollback.remoteDeletionPermitted === false && rollback.forcePushPermitted === false && rollback.mergePermitted === false;
  failureHost.completeRollback();

  // 9, 10, unsafe cancellation: uncertain result, reconciliation handoff, and rejected cancellation.
  const uncertainWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed uncertain-result scenario.");
  const uncertainRegistry = buildMockRegistry({ PUSH_ISOLATED_BRANCH: "UNCERTAIN_RESULT" }).registry;
  const uncertainHost = new RuntimeHost(uncertainWorkflow, { registry: uncertainRegistry, clock });
  await uncertainHost.runNextStep();
  await uncertainHost.runNextStep();
  const uncertainOutcome = await uncertainHost.runNextStep();
  const uncertainResultHandled = uncertainOutcome.classification === "RECONCILIATION_REQUIRED";
  const uncertainOperation = uncertainHost.getUncertainOperation();
  const reconciliationHandoff = uncertainOperation ? createReconciliationHandoff(uncertainHost.snapshot(), uncertainOperation, now) : null;
  let unsafeCancellationRejected = false;
  try {
    uncertainHost.cancel();
  } catch {
    unsafeCancellationRejected = true;
  }

  // 11: scope invalidation is rejected at runtime host acceptance.
  const scopeWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed scope-invalidation scenario.");
  (scopeWorkflow.scope.issue as Record<string, unknown>).title = "mutated after freeze";
  let scopeInvalidationRejected = false;
  try {
    new RuntimeHost(scopeWorkflow, { registry: buildMockRegistry().registry, clock });
  } catch {
    scopeInvalidationRejected = true;
  }

  // 12: approval expiry is rejected at runtime host acceptance.
  const expiringWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed approval-expiry scenario.", 1);
  let approvalExpiryRejected = false;
  try {
    new RuntimeHost(expiringWorkflow, { registry: buildMockRegistry().registry, clock: () => new Date(now.getTime() + 10) });
  } catch {
    approvalExpiryRejected = true;
  }

  // 13: checkpoint corruption is rejected during recovery.
  const corruptionWorkflow = buildFrozenApprovedWorkflow(now, "Approve the exact governed checkpoint-corruption scenario.");
  const corruptionStore = new InMemoryCheckpointStore();
  const corruptionHost = new RuntimeHost(corruptionWorkflow, { registry: buildMockRegistry().registry, checkpoints: corruptionStore, clock });
  await corruptionHost.runNextStep();
  let checkpointCorruptionRejected = false;
  try {
    await new RecoveryHost(new CorruptingCheckpointStore(corruptionStore)).recover(corruptionWorkflow, clock);
  } catch {
    checkpointCorruptionRejected = true;
  }

  const finalSnapshot = host.snapshot();
  return {
    completedWorkflowState: workflow.state,
    statusSequence,
    pausedAndResumed,
    recoveredWithoutDuplication,
    deterministicFailureHandled,
    uncertainResultHandled,
    reconciliationHandoff,
    unsafeCancellationRejected,
    scopeInvalidationRejected,
    approvalExpiryRejected,
    checkpointCorruptionRejected,
    safeCancellationHandled,
    rollbackRecommendationProjected,
    laneLimit: RUNTIME_EXECUTION_LANE_LIMIT,
    mergeAllowed: finalSnapshot.mergeAllowed,
    productionDeployAllowed: finalSnapshot.productionDeployAllowed,
    forcePushAllowed: finalSnapshot.forcePushAllowed,
    branchDeletionAllowed: finalSnapshot.branchDeletionAllowed,
  };
}
