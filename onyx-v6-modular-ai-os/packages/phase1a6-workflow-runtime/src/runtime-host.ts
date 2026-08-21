import {
  EvidenceTimeline,
  GOVERNED_ACTOR,
  InMemoryCheckpointStore,
  canTransition,
  classifyRollback,
  digest,
  transition,
  validateApproval,
  validateCapabilityBoundary,
  type ApprovalPackage,
  type Checkpoint,
  type CheckpointStore,
  type EvidenceEntry,
  type ExecutorResult,
  type RollbackPolicyResult,
  type Workflow,
} from "@onyx/phase1a5-workflow-engine";
import { AdapterRegistry } from "./adapter-registry";
import {
  CAPABILITIES,
  COMPATIBLE_WORKFLOW_CONTRACT_VERSION,
  GOVERNED_REPOSITORY,
  RUNTIME_DEFAULT_REMOTE_RETRY_BUDGET,
  RUNTIME_EXECUTION_LANE_LIMIT,
  makeRuntimeId,
  makeRuntimeSessionId,
  type Capability,
} from "./contracts";
import { buildRuntimeSnapshot, type RuntimeSnapshot } from "./runtime-snapshot";

/** Ordered [pending, inProgress, completed] workflow states driven per capability. */
const CAPABILITY_STEP_STATES: Record<Capability, [Workflow["state"], Workflow["state"], Workflow["state"]]> = {
  CREATE_GITHUB_ISSUE: ["ISSUE_STEP_PENDING", "ISSUE_STEP_IN_PROGRESS", "ISSUE_STEP_COMPLETED"],
  CREATE_ISOLATED_BRANCH: ["BRANCH_STEP_PENDING", "BRANCH_STEP_IN_PROGRESS", "BRANCH_STEP_COMPLETED"],
  PUSH_ISOLATED_BRANCH: ["PUSH_STEP_PENDING", "PUSH_STEP_IN_PROGRESS", "PUSH_STEP_COMPLETED"],
  RUN_VALIDATION: ["VALIDATION_PENDING", "VALIDATION_IN_PROGRESS", "VALIDATION_PASSED"],
  GENERATE_EVIDENCE: ["EVIDENCE_PENDING", "EVIDENCE_PENDING", "EVIDENCE_READY"],
  CREATE_DRAFT_PR: ["DRAFT_PR_STEP_PENDING", "DRAFT_PR_STEP_IN_PROGRESS", "DRAFT_PR_STEP_COMPLETED"],
};

function capabilityInputKey(capability: Capability): "issue" | "branch" | "validationPlan" | "evidencePlan" | "draftPrPlan" {
  switch (capability) {
    case "CREATE_GITHUB_ISSUE":
      return "issue";
    case "CREATE_ISOLATED_BRANCH":
    case "PUSH_ISOLATED_BRANCH":
      return "branch";
    case "RUN_VALIDATION":
      return "validationPlan";
    case "GENERATE_EVIDENCE":
      return "evidencePlan";
    case "CREATE_DRAFT_PR":
      return "draftPrPlan";
  }
}

export type RuntimeStepClassification =
  | "COMPLETED"
  | "FAILED_SAFE"
  | "RECONCILIATION_REQUIRED"
  | "PAUSED"
  | "CANCELLED";

export interface RuntimeStepOutcome {
  capability: Capability | null;
  classification: RuntimeStepClassification;
  attempt: number;
  executorResult?: ExecutorResult;
}

export interface UncertainOperation {
  capability: Capability;
  idempotencyKey: string;
  resourceReferences: string[];
  detail: string;
}

export interface RuntimeHostOptions {
  registry: AdapterRegistry;
  checkpoints?: CheckpointStore;
  clock?: () => Date;
  /** Capabilities already completed by a prior runtime host instance (used by recovery). */
  alreadyCompleted?: readonly Capability[];
  /** Last trusted checkpoint digest from a prior runtime host instance (used by recovery). */
  previousCheckpointDigest?: string;
}

/**
 * Phase 1A.6 mock-only runtime host. Consumes exactly one frozen Phase 1A.5 workflow
 * and its bound approval package, and drives capability adapters sequentially,
 * with pause/cancel, checkpoints, evidence, and reconciliation on uncertain results.
 */
export class RuntimeHost {
  readonly runtimeId: string;
  readonly sessionId: string;
  readonly laneLimit = RUNTIME_EXECUTION_LANE_LIMIT;

  private readonly workflow: Workflow;
  private readonly approval: ApprovalPackage;
  private readonly registry: AdapterRegistry;
  private readonly checkpoints: CheckpointStore;
  private readonly clock: () => Date;
  private readonly attempts = new Map<Capability, number>();

  readonly evidence = new EvidenceTimeline();

  private completed: Capability[];
  private lastCheckpoint: Checkpoint | undefined;
  private checkpointCount = 0;
  private paused = false;
  private pauseRequested = false;
  private cancelled = false;
  private reconciliationRequired = false;
  private failedSafe = false;
  private preInterruptState: Workflow["state"] | undefined;
  private uncertainOperation: UncertainOperation | undefined;

  constructor(workflow: Workflow, options: RuntimeHostOptions) {
    if (workflow.state === "WORKFLOW_CREATED") {
      throw new Error("Runtime host requires a frozen Phase 1A.5 workflow.");
    }
    if (workflow.repository !== GOVERNED_REPOSITORY) {
      throw new Error(`Repository is outside the governed boundary: ${workflow.repository}`);
    }
    if (digest(workflow.scope) !== workflow.scopeHash) {
      throw new Error("Workflow scope hash mismatch: scope was mutated after freeze.");
    }
    if (workflow.contractVersion !== COMPATIBLE_WORKFLOW_CONTRACT_VERSION) {
      throw new Error(`Unsupported workflow contract version: ${workflow.contractVersion}`);
    }
    const approval = workflow.approval;
    if (!approval) {
      throw new Error("Runtime host requires a valid Phase 1A.5 approval package.");
    }
    if (approval.consumed) {
      throw new Error("Approval package has already been consumed by a prior runtime session.");
    }
    const clock = options.clock ?? (() => new Date());
    validateApproval(workflow, approval, clock().getTime());
    if (approval.orderedCapabilities.length !== CAPABILITIES.length || approval.orderedCapabilities.some((capability, index) => capability !== CAPABILITIES[index])) {
      throw new Error("Approval capability sequence does not match the exact bound sequence.");
    }

    this.workflow = workflow;
    this.approval = approval;
    this.registry = options.registry;
    this.checkpoints = options.checkpoints ?? new InMemoryCheckpointStore();
    this.clock = clock;
    this.completed = [...(options.alreadyCompleted ?? [])];
    this.lastCheckpoint = options.previousCheckpointDigest !== undefined ? ({ digest: options.previousCheckpointDigest } as Checkpoint) : undefined;

    this.runtimeId = makeRuntimeId(workflow);
    this.sessionId = makeRuntimeSessionId(this.runtimeId, approval.digest);
  }

  private pendingCapabilities(): Capability[] {
    return CAPABILITIES.filter((capability) => !this.completed.includes(capability));
  }

  requestPause(): void {
    if (this.cancelled) throw new Error("Cannot pause a cancelled runtime.");
    this.pauseRequested = true;
  }

  cancel(): void {
    if (this.reconciliationRequired) {
      throw new Error("Cancellation is not permitted while an uncertain result requires reconciliation.");
    }
    if (this.pendingCapabilities().length === 0) {
      throw new Error("Cannot cancel a workflow that has already completed.");
    }
    if (this.workflow.state === "WORKFLOW_PAUSED") {
      this.workflow.state = "WORKFLOW_CANCELLED";
    } else if (canTransition(this.workflow.state, "WORKFLOW_CANCELLED")) {
      this.workflow.state = transition(this.workflow.state, "WORKFLOW_CANCELLED");
    } else {
      this.workflow.state = "WORKFLOW_CANCELLED";
    }
    this.cancelled = true;
    this.paused = false;
  }

  resume(): void {
    if (!this.paused) throw new Error("Runtime is not paused.");
    if (!this.preInterruptState) throw new Error("No prior state available to resume from.");
    this.workflow.state = this.preInterruptState;
    this.preInterruptState = undefined;
    this.paused = false;
  }

  private async appendCheckpoint(fields: Omit<Checkpoint, "digest" | "previousCheckpointDigest">): Promise<Checkpoint> {
    const record = await this.checkpoints.append({ ...fields, previousCheckpointDigest: this.lastCheckpoint?.digest ?? "" });
    this.lastCheckpoint = record;
    this.checkpointCount += 1;
    return record;
  }

  private recordEvidence(input: {
    capability: Capability;
    stateTransition: string;
    inputDigest: string;
    outputDigest: string;
    providerClassification: string;
    resourceReferences: string[];
    checkpointDigest: string;
    detail: string;
  }): EvidenceEntry {
    return this.evidence.add({
      workflowId: this.workflow.workflowId,
      stateTransition: input.stateTransition,
      stepId: input.capability,
      actor: GOVERNED_ACTOR,
      capability: input.capability,
      approvalDigest: this.approval.digest,
      scopeHash: this.workflow.scopeHash,
      inputDigest: input.inputDigest,
      outputDigest: input.outputDigest,
      providerClassification: input.providerClassification,
      resourceReferences: input.resourceReferences,
      timestamp: this.clock().toISOString(),
      checkpointDigest: input.checkpointDigest,
      detail: input.detail,
    });
  }

  async runNextStep(): Promise<RuntimeStepOutcome> {
    if (this.cancelled) return { capability: null, classification: "CANCELLED", attempt: 0 };
    if (this.reconciliationRequired) throw new Error("Cannot continue: an uncertain result requires reconciliation.");
    if (this.failedSafe) throw new Error("Cannot continue: workflow already stopped in a failed-safe state.");
    const pending = this.pendingCapabilities();
    if (pending.length === 0) return { capability: null, classification: "COMPLETED", attempt: 0 };

    if (this.workflow.state === "WORKFLOW_APPROVED") {
      this.workflow.state = transition(this.workflow.state, "PREFLIGHT_IN_PROGRESS");
      this.workflow.state = transition(this.workflow.state, "PREFLIGHT_PASSED");
    }

    const capability = pending[0]!;

    validateApproval(this.workflow, this.approval, this.clock().getTime());
    validateCapabilityBoundary(this.approval, capability);

    const [pendingState, activeState, completedState] = CAPABILITY_STEP_STATES[capability];
    const input = this.workflow.scope[capabilityInputKey(capability)];
    const inputDigest = digest(input);
    const idempotencyKey = `${this.workflow.workflowId}:${capability}:${inputDigest}`;
    const attempt = (this.attempts.get(capability) ?? 0) + 1;
    this.attempts.set(capability, attempt);

    if (attempt === 1) {
      this.workflow.state = transition(this.workflow.state, pendingState);
      if (activeState !== pendingState) this.workflow.state = transition(this.workflow.state, activeState);
    }

    const before = await this.appendCheckpoint({
      workflowId: this.workflow.workflowId,
      workflowVersion: this.workflow.contractVersion,
      repository: this.workflow.repository,
      currentState: this.workflow.state,
      stepId: capability,
      scopeHash: this.workflow.scopeHash,
      approvalPackageDigest: this.approval.digest,
      inputDigest,
      idempotencyKey,
      attempt,
      startedAt: this.clock().toISOString(),
    });

    const result = await this.registry.resolve(capability).invoke({ workflow: this.workflow, capability, input: input as Record<string, unknown>, attempt });

    if (result.classification === "UNCERTAIN_RESULT") {
      this.workflow.state = "WORKFLOW_RECONCILIATION_REQUIRED";
      this.reconciliationRequired = true;
      const after = await this.appendCheckpoint({
        workflowId: this.workflow.workflowId,
        workflowVersion: this.workflow.contractVersion,
        repository: this.workflow.repository,
        currentState: this.workflow.state,
        stepId: capability,
        scopeHash: this.workflow.scopeHash,
        approvalPackageDigest: this.approval.digest,
        inputDigest,
        idempotencyKey,
        attempt,
        startedAt: before.startedAt,
        outputDigest: digest(result.output ?? {}),
        providerResultClassification: result.classification,
        resourceId: result.resourceId,
        resourceUrl: result.resourceUrl,
        completedAt: this.clock().toISOString(),
        evidenceReferences: [],
        nextPermittedState: "WORKFLOW_RECONCILIATION_REQUIRED",
      });
      const resourceReferences = [result.resourceId, result.resourceUrl].filter((value): value is string => Boolean(value));
      this.recordEvidence({
        capability,
        stateTransition: `${activeState}->WORKFLOW_RECONCILIATION_REQUIRED`,
        inputDigest,
        outputDigest: digest(result.output ?? {}),
        providerClassification: result.classification,
        resourceReferences,
        checkpointDigest: after.digest,
        detail: result.detail ?? "uncertain remote outcome",
      });
      this.uncertainOperation = { capability, idempotencyKey, resourceReferences, detail: result.detail ?? "uncertain remote outcome" };
      return { capability, classification: "RECONCILIATION_REQUIRED", attempt, executorResult: result };
    }

    if (result.classification === "DETERMINISTIC_FAILURE" || result.classification === "PROHIBITED_OPERATION") {
      const retryLimit = capability === "RUN_VALIDATION" ? this.validationRetryLimit() : RUNTIME_DEFAULT_REMOTE_RETRY_BUDGET + 1;
      if (attempt < retryLimit) {
        return this.runNextStep();
      }
      this.workflow.state = "WORKFLOW_FAILED_SAFE";
      this.failedSafe = true;
      const after = await this.appendCheckpoint({
        workflowId: this.workflow.workflowId,
        workflowVersion: this.workflow.contractVersion,
        repository: this.workflow.repository,
        currentState: this.workflow.state,
        stepId: capability,
        scopeHash: this.workflow.scopeHash,
        approvalPackageDigest: this.approval.digest,
        inputDigest,
        idempotencyKey,
        attempt,
        startedAt: before.startedAt,
        outputDigest: digest(result.output ?? {}),
        providerResultClassification: result.classification,
        completedAt: this.clock().toISOString(),
        evidenceReferences: [],
        nextPermittedState: "WORKFLOW_FAILED_SAFE",
      });
      this.recordEvidence({
        capability,
        stateTransition: `${activeState}->WORKFLOW_FAILED_SAFE`,
        inputDigest,
        outputDigest: digest(result.output ?? {}),
        providerClassification: result.classification,
        resourceReferences: [],
        checkpointDigest: after.digest,
        detail: result.detail ?? "deterministic failure",
      });
      return { capability, classification: "FAILED_SAFE", attempt, executorResult: result };
    }

    const nextPermittedState = capability === "CREATE_DRAFT_PR" ? "WORKFLOW_COMPLETED" : completedState;
    const after = await this.appendCheckpoint({
      workflowId: this.workflow.workflowId,
      workflowVersion: this.workflow.contractVersion,
      repository: this.workflow.repository,
      currentState: completedState,
      stepId: capability,
      scopeHash: this.workflow.scopeHash,
      approvalPackageDigest: this.approval.digest,
      inputDigest,
      idempotencyKey,
      attempt,
      startedAt: before.startedAt,
      outputDigest: digest(result.output ?? {}),
      providerResultClassification: result.classification,
      resourceId: result.resourceId,
      resourceUrl: result.resourceUrl,
      completedAt: this.clock().toISOString(),
      evidenceReferences: [],
      nextPermittedState,
    });
    const resourceReferences = [result.resourceId, result.resourceUrl].filter((value): value is string => Boolean(value));
    this.recordEvidence({
      capability,
      stateTransition: `${activeState}->${completedState}`,
      inputDigest,
      outputDigest: digest(result.output ?? {}),
      providerClassification: result.classification,
      resourceReferences,
      checkpointDigest: after.digest,
      detail: result.detail ?? "step completed",
    });
    this.workflow.state = completedState;
    this.completed.push(capability);

    if (this.completed.length === CAPABILITIES.length) {
      this.workflow.state = transition(this.workflow.state, "WORKFLOW_COMPLETED");
    } else if (this.pauseRequested) {
      this.preInterruptState = this.workflow.state;
      this.workflow.state = "WORKFLOW_PAUSED";
      this.paused = true;
      this.pauseRequested = false;
      return { capability, classification: "PAUSED", attempt, executorResult: result };
    }

    return { capability, classification: "COMPLETED", attempt, executorResult: result };
  }

  private validationRetryLimit(): number {
    const plan = this.workflow.scope.validationPlan as { retryLimit?: number } | undefined;
    const configured = typeof plan?.retryLimit === "number" ? plan.retryLimit : 1;
    return Math.max(1, configured);
  }

  async run(): Promise<RuntimeSnapshot> {
    while (!this.cancelled && !this.paused && !this.reconciliationRequired && !this.failedSafe && this.pendingCapabilities().length > 0) {
      await this.runNextStep();
    }
    return this.snapshot();
  }

  getUncertainOperation(): UncertainOperation | undefined {
    return this.uncertainOperation;
  }

  /** Projects a policy-only rollback recommendation without deleting any remote resource. */
  projectRollback(reason: string): RollbackPolicyResult {
    if (this.workflow.state !== "WORKFLOW_FAILED_SAFE") {
      throw new Error("Rollback recommendations are only projected from a failed-safe state.");
    }
    this.workflow.state = transition(this.workflow.state, "WORKFLOW_ROLLBACK_REQUIRED");
    const stepId = this.completed.at(-1) ?? this.pendingCapabilities()[0] ?? "WORKFLOW";
    return classifyRollback(this.workflow.workflowId, stepId, reason, this.lastCheckpoint ? [this.lastCheckpoint.digest] : []);
  }

  /** Marks the rollback as complete. This is policy bookkeeping only; no remote resource is touched. */
  completeRollback(): void {
    this.workflow.state = transition(this.workflow.state, "WORKFLOW_ROLLED_BACK");
  }

  getWorkflow(): Workflow {
    return this.workflow;
  }

  getCheckpointStore(): CheckpointStore {
    return this.checkpoints;
  }

  snapshot(): RuntimeSnapshot {
    const pending = this.pendingCapabilities();
    return buildRuntimeSnapshot({
      runtimeId: this.runtimeId,
      workflowId: this.workflow.workflowId,
      contractVersion: this.workflow.contractVersion,
      repository: this.workflow.repository,
      scopeHash: this.workflow.scopeHash,
      approvalDigest: this.approval.digest,
      currentWorkflowState: this.workflow.state,
      completedCapabilities: [...this.completed],
      checkpointCount: this.checkpointCount,
      latestCheckpointDigest: this.lastCheckpoint?.digest ?? null,
      evidenceCount: this.evidence.list().length,
      latestEvidenceSequence: this.evidence.list().at(-1)?.sequence ?? null,
      recoveryAvailable: this.checkpointCount > 0,
      reconciliationRequired: this.reconciliationRequired,
      pauseAvailable: pending.length > 0 && !this.cancelled && !this.reconciliationRequired && !this.failedSafe,
      cancelAvailable: pending.length > 0 && !this.reconciliationRequired && !this.cancelled,
      laneLimit: this.laneLimit,
      updatedAt: this.clock().toISOString(),
    });
  }
}
