import {
  AdapterRegistry,
  RecoveryHost,
  RuntimeHost,
  type RuntimeSnapshot,
  type RuntimeStepOutcome,
  type Workflow,
} from "@onyx/phase1a6-workflow-runtime";
import { buildFrozenApprovedWorkflow, buildMockRegistry } from "@onyx/phase1a6-workflow-runtime/local-runtime-simulation";

/**
 * Injected runtime controller surface used by the Automation Center dashboard.
 * Every implementation must be mock or local-simulation only: no GitHub call,
 * no Git mutation, no connector action, no paid API call, no child process,
 * and no command or shell interface.
 */
export interface AutomationRuntimeController {
  getSnapshot(): RuntimeSnapshot;
  pause(): void;
  resume(): void;
  cancel(): void;
  recover(): Promise<RuntimeSnapshot>;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

/**
 * Mock-only local-simulation runtime controller. It wraps a Phase 1A.6
 * `RuntimeHost` driven exclusively by scripted, deterministic capability
 * adapters. It never calls a live GitHub, Git, connector, or paid API, and it
 * enforces every UI-level guard on top of the guards already enforced inside
 * the reused Phase 1A.6 runtime host and recovery host.
 */
export class LocalAutomationRuntimeController implements AutomationRuntimeController {
  private readonly workflow: Workflow;
  private readonly registry: AdapterRegistry;
  private readonly clock: () => Date;
  private host: RuntimeHost;
  private recoveryHost: RecoveryHost;
  private pauseRequestPending = false;

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.workflow = buildFrozenApprovedWorkflow(this.clock());
    this.registry = buildMockRegistry().registry;
    this.host = new RuntimeHost(this.workflow, { registry: this.registry, clock: this.clock });
    this.recoveryHost = new RecoveryHost(this.host.getCheckpointStore());
  }

  getSnapshot(): RuntimeSnapshot {
    return this.host.snapshot();
  }

  /** Mock-only step advance. Not wired to any dashboard control; used only to build local scenarios. */
  async runNextStep(): Promise<RuntimeStepOutcome> {
    const status = this.getSnapshot().currentStatus;
    if (TERMINAL_STATUSES.has(status)) {
      throw new Error(`Cannot continue: runtime already reached a terminal status: ${status}.`);
    }
    const outcome = await this.host.runNextStep();
    this.pauseRequestPending = false;
    return outcome;
  }

  pause(): void {
    const snapshot = this.getSnapshot();
    if (TERMINAL_STATUSES.has(snapshot.currentStatus)) {
      throw new Error(`Cannot pause: runtime already reached a terminal status: ${snapshot.currentStatus}.`);
    }
    if (snapshot.currentStatus === "PAUSED") {
      throw new Error("Cannot pause: runtime is already paused.");
    }
    if (this.pauseRequestPending) {
      throw new Error("Cannot pause: a pause request is already pending.");
    }
    this.pauseRequestPending = true;
    this.host.requestPause();
  }

  resume(): void {
    const snapshot = this.getSnapshot();
    if (snapshot.currentStatus !== "PAUSED") {
      throw new Error("Cannot resume: runtime is not paused.");
    }
    this.host.resume();
    this.pauseRequestPending = false;
  }

  cancel(): void {
    const snapshot = this.getSnapshot();
    if (TERMINAL_STATUSES.has(snapshot.currentStatus)) {
      throw new Error(`Cannot cancel: runtime already reached a terminal status: ${snapshot.currentStatus}.`);
    }
    if (snapshot.reconciliationRequired) {
      throw new Error("Cannot cancel: reconciliation is required before any further action.");
    }
    this.host.cancel();
    this.pauseRequestPending = false;
  }

  async recover(): Promise<RuntimeSnapshot> {
    const snapshot = this.getSnapshot();
    if (snapshot.reconciliationRequired) {
      throw new Error("Cannot recover: reconciliation is required and automatic retry is not permitted.");
    }
    if (!snapshot.recoveryAvailable) {
      throw new Error("Cannot recover: no trusted checkpoint is available.");
    }
    const recovered = await this.recoveryHost.recover(this.workflow, this.clock);
    this.host = this.recoveryHost.resumeHost(this.workflow, this.registry, recovered, this.clock);
    this.pauseRequestPending = false;
    return this.host.snapshot();
  }
}
