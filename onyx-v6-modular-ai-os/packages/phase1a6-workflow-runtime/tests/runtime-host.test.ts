import { describe, expect, it } from "vitest";
import {
  InMemoryCheckpointStore,
  WorkflowEngine,
  type ExecutorResult,
  type StepInput,
  type WorkflowExecutor,
} from "@onyx/phase1a5-workflow-engine";
import { simulationInput } from "@onyx/phase1a5-workflow-engine/local-simulation";
import { AdapterRegistry, type CapabilityAdapter } from "../src/adapter-registry";
import {
  CAPABILITIES,
  COMPATIBLE_WORKFLOW_CONTRACT_VERSION,
  RUNTIME_CONTRACT_VERSION,
  RUNTIME_EXECUTION_LANE_LIMIT,
  WORKFLOW_STATES,
  makeRuntimeId,
  makeRuntimeSessionId,
  type Capability,
} from "../src/contracts";
import { projectRuntimeStatus } from "../src/status-projector";
import { RuntimeHost } from "../src/runtime-host";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const CLOCK = () => NOW;

function unusedExecutor(): WorkflowExecutor {
  const fail = async (): Promise<ExecutorResult> => {
    throw new Error("unused");
  };
  return { createGithubIssue: fail, createIsolatedBranch: fail, pushIsolatedBranch: fail, runValidation: fail, generateEvidence: fail, createDraftPr: fail };
}

function buildFrozenApprovedWorkflow(reason = "Approve the exact governed Phase 1A.6 runtime workflow.", ttlMs?: number) {
  const engine = new WorkflowEngine(unusedExecutor(), new InMemoryCheckpointStore(), CLOCK);
  const workflow = engine.create(simulationInput());
  engine.freeze(workflow);
  engine.approve(workflow, reason, ttlMs);
  return workflow;
}

class SuccessAdapter implements CapabilityAdapter {
  invocationCount = 0;
  constructor(readonly capability: Capability) {}
  async invoke(_input: StepInput): Promise<ExecutorResult> {
    this.invocationCount += 1;
    return { classification: "DETERMINISTIC_SUCCESS", resourceId: `${this.capability}-resource`, resourceUrl: `local://${this.capability}` };
  }
}

function buildSuccessRegistry(): { registry: AdapterRegistry; adapters: Record<Capability, SuccessAdapter> } {
  const registry = new AdapterRegistry();
  const adapters = {} as Record<Capability, SuccessAdapter>;
  for (const capability of CAPABILITIES) {
    const adapter = new SuccessAdapter(capability);
    adapters[capability] = adapter;
    registry.register(adapter);
  }
  return { registry, adapters };
}

describe("Phase 1A.6 runtime contract", () => {
  it("declares a runtime contract version bound to Phase 1A.5 version 1.0.0", () => {
    expect(RUNTIME_CONTRACT_VERSION).toBe("1.0.0");
    expect(COMPATIBLE_WORKFLOW_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("preserves all 32 Phase 1A.5 workflow states", () => {
    expect(WORKFLOW_STATES).toHaveLength(32);
    expect(WORKFLOW_STATES).toContain("WORKFLOW_CREATED");
    expect(WORKFLOW_STATES).toContain("WORKFLOW_COMPLETED");
    expect(WORKFLOW_STATES).toContain("WORKFLOW_RECONCILIATION_REQUIRED");
  });

  it("produces deterministic runtime IDs and session IDs", () => {
    const workflow = buildFrozenApprovedWorkflow();
    const id1 = makeRuntimeId(workflow);
    const id2 = makeRuntimeId(workflow);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^p16rt-[a-f0-9]{24}$/);
    const session1 = makeRuntimeSessionId(id1, workflow.approval!.digest);
    const session2 = makeRuntimeSessionId(id1, workflow.approval!.digest);
    expect(session1).toBe(session2);
    expect(session1).toMatch(/^p16sess-[a-f0-9]{24}$/);
  });

  it("rejects an unsupported workflow contract version", () => {
    const workflow = buildFrozenApprovedWorkflow();
    (workflow as { contractVersion: string }).contractVersion = "2.0.0";
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });
});

describe("Phase 1A.6 runtime host acceptance", () => {
  it("accepts a valid frozen workflow with a valid approval", () => {
    const workflow = buildFrozenApprovedWorkflow();
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).not.toThrow();
  });

  it("rejects an unfrozen workflow", () => {
    const engine = new WorkflowEngine(unusedExecutor(), new InMemoryCheckpointStore(), CLOCK);
    const workflow = engine.create(simulationInput());
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects a missing approval", () => {
    const engine = new WorkflowEngine(unusedExecutor(), new InMemoryCheckpointStore(), CLOCK);
    const workflow = engine.create(simulationInput());
    engine.freeze(workflow);
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects an expired approval", () => {
    const workflow = buildFrozenApprovedWorkflow("Approve the exact governed expiring workflow.", 1);
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: () => new Date(NOW.getTime() + 10) })).toThrow();
  });

  it("rejects a scope hash mismatch", () => {
    const workflow = buildFrozenApprovedWorkflow();
    (workflow.scope.issue as Record<string, unknown>).title = "mutated";
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects an approval digest mismatch", () => {
    const workflow = buildFrozenApprovedWorkflow();
    (workflow.approval as { digest: string }).digest = "tampered";
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects a repository mismatch", () => {
    const workflow = buildFrozenApprovedWorkflow();
    (workflow as { repository: string }).repository = "other/repo";
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects a reordered capability sequence", () => {
    const workflow = buildFrozenApprovedWorkflow();
    const reordered = [...workflow.approval!.orderedCapabilities];
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    (workflow.approval as { orderedCapabilities: readonly Capability[] }).orderedCapabilities = reordered;
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects an expanded capability sequence", () => {
    const workflow = buildFrozenApprovedWorkflow();
    const expanded = [...workflow.approval!.orderedCapabilities, "CREATE_GITHUB_ISSUE"] as Capability[];
    (workflow.approval as { orderedCapabilities: readonly Capability[] }).orderedCapabilities = expanded;
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects a reduced capability sequence", () => {
    const workflow = buildFrozenApprovedWorkflow();
    const reduced = workflow.approval!.orderedCapabilities.slice(0, 5) as Capability[];
    (workflow.approval as { orderedCapabilities: readonly Capability[] }).orderedCapabilities = reduced;
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });

  it("rejects a workflow whose approval was already marked consumed", () => {
    const workflow = buildFrozenApprovedWorkflow();
    (workflow.approval as { consumed: boolean }).consumed = true;
    expect(() => new RuntimeHost(workflow, { registry: buildSuccessRegistry().registry, clock: CLOCK })).toThrow();
  });
});

describe("Phase 1A.6 runtime execution", () => {
  it("runs sequentially with lane limit one, one checkpoint pair and one evidence entry per step", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const { registry, adapters } = buildSuccessRegistry();
    const checkpoints = new InMemoryCheckpointStore();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    expect(host.laneLimit).toBe(1);
    expect(RUNTIME_EXECUTION_LANE_LIMIT).toBe(1);
    await host.run();
    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
    expect(CAPABILITIES.every((capability) => adapters[capability].invocationCount === 1)).toBe(true);
    const records = await checkpoints.list(workflow.workflowId);
    expect(records).toHaveLength(CAPABILITIES.length * 2);
    expect(host.evidence.list()).toHaveLength(CAPABILITIES.length);
    expect(host.evidence.list().map((entry) => entry.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("never invokes a completed capability again, even after a paused resume", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const { registry, adapters } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    host.requestPause();
    const outcome = await host.runNextStep();
    expect(outcome.classification).toBe("PAUSED");
    expect(workflow.state).toBe("WORKFLOW_PAUSED");
    host.resume();
    await host.run();
    expect(adapters.CREATE_GITHUB_ISSUE.invocationCount).toBe(1);
    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
  });

  it("pauses between steps and resumes to the prior state", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    host.requestPause();
    await host.runNextStep();
    expect(projectRuntimeStatus(workflow.state)).toBe("PAUSED");
    host.resume();
    expect(projectRuntimeStatus(workflow.state)).toBe("RUNNING");
  });

  it("allows safe cancellation at a checkpoint boundary", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    await host.runNextStep();
    expect(() => host.cancel()).not.toThrow();
    expect(workflow.state).toBe("WORKFLOW_CANCELLED");
  });

  it("rejects cancellation while reconciliation is required", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    class UncertainAdapter implements CapabilityAdapter {
      readonly capability: Capability = "CREATE_ISOLATED_BRANCH";
      async invoke(): Promise<ExecutorResult> {
        return { classification: "UNCERTAIN_RESULT", detail: "uncertain" };
      }
    }
    const registryWithUncertain = new AdapterRegistry();
    for (const capability of CAPABILITIES) {
      registryWithUncertain.register(capability === "CREATE_ISOLATED_BRANCH" ? new UncertainAdapter() : new SuccessAdapter(capability));
    }
    const host = new RuntimeHost(workflow, { registry: registryWithUncertain, clock: CLOCK });
    await host.runNextStep();
    const outcome = await host.runNextStep();
    expect(outcome.classification).toBe("RECONCILIATION_REQUIRED");
    expect(() => host.cancel()).toThrow();
    await expect(host.runNextStep()).rejects.toThrow();
  });

  it("marks deterministic failures as failed-safe and never retries beyond the default zero budget", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    class FailingAdapter implements CapabilityAdapter {
      invocationCount = 0;
      readonly capability: Capability = "PUSH_ISOLATED_BRANCH";
      async invoke(): Promise<ExecutorResult> {
        this.invocationCount += 1;
        return { classification: "DETERMINISTIC_FAILURE", detail: "boom" };
      }
    }
    const failing = new FailingAdapter();
    const registry = new AdapterRegistry();
    for (const capability of CAPABILITIES) {
      registry.register(capability === "PUSH_ISOLATED_BRANCH" ? failing : new SuccessAdapter(capability));
    }
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    await host.run();
    expect(workflow.state).toBe("WORKFLOW_FAILED_SAFE");
    expect(failing.invocationCount).toBe(1);
  });

  it("bounds validation retry by policy and applies zero retry budget elsewhere", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    class FlakyValidationAdapter implements CapabilityAdapter {
      invocationCount = 0;
      readonly capability: Capability = "RUN_VALIDATION";
      async invoke(): Promise<ExecutorResult> {
        this.invocationCount += 1;
        return this.invocationCount < 2 ? { classification: "DETERMINISTIC_FAILURE", detail: "flaky" } : { classification: "DETERMINISTIC_SUCCESS", resourceId: "validation-resource" };
      }
    }
    const flaky = new FlakyValidationAdapter();
    const registry = new AdapterRegistry();
    for (const capability of CAPABILITIES) {
      registry.register(capability === "RUN_VALIDATION" ? flaky : new SuccessAdapter(capability));
    }
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    await host.run();
    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
    expect(flaky.invocationCount).toBe(2);
  });

  it("produces an immutable snapshot with deterministic fields and correct status projection", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    const snapshot = host.snapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (snapshot as { mergeAllowed: boolean }).mergeAllowed = true;
    }).toThrow();
    expect(snapshot.mergeAllowed).toBe(false);
    expect(snapshot.productionDeployAllowed).toBe(false);
    expect(snapshot.forcePushAllowed).toBe(false);
    expect(snapshot.branchDeletionAllowed).toBe(false);
    expect(snapshot.laneLimit).toBe(1);
    expect(snapshot.orderedCapabilities).toEqual(CAPABILITIES);
    expect(snapshot.currentStatus).toBe(projectRuntimeStatus(workflow.state));
    await host.run();
    expect(host.snapshot().currentStatus).toBe("COMPLETED");
  });

  it("projects a policy-only rollback recommendation without deleting remote resources", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    class FailingAdapter implements CapabilityAdapter {
      readonly capability: Capability = "CREATE_GITHUB_ISSUE";
      async invoke(): Promise<ExecutorResult> {
        return { classification: "DETERMINISTIC_FAILURE", detail: "boom" };
      }
    }
    const registry = new AdapterRegistry();
    for (const capability of CAPABILITIES) {
      registry.register(capability === "CREATE_GITHUB_ISSUE" ? new FailingAdapter() : new SuccessAdapter(capability));
    }
    const host = new RuntimeHost(workflow, { registry, clock: CLOCK });
    await host.run();
    const rollback = host.projectRollback("Policy-only rollback after a deterministic safe stop.");
    expect(rollback.remoteDeletionPermitted).toBe(false);
    expect(rollback.forcePushPermitted).toBe(false);
    expect(rollback.mergePermitted).toBe(false);
    expect(rollback.productionActionPermitted).toBe(false);
    expect(workflow.state).toBe("WORKFLOW_ROLLBACK_REQUIRED");
    host.completeRollback();
    expect(workflow.state).toBe("WORKFLOW_ROLLED_BACK");
  });
});
