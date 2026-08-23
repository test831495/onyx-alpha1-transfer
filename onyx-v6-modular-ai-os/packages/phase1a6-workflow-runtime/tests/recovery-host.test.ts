import { describe, expect, it } from "vitest";
import {
  InMemoryCheckpointStore,
  WorkflowEngine,
  type Checkpoint,
  type CheckpointStore,
  type ExecutorResult,
  type WorkflowExecutor,
} from "@onyx/phase1a5-workflow-engine";
import { simulationInput } from "@onyx/phase1a5-workflow-engine/local-simulation";
import { AdapterRegistry, type CapabilityAdapter } from "../src/adapter-registry";
import { CAPABILITIES, type Capability } from "../src/contracts";
import { RecoveryHost } from "../src/recovery-host";
import { RuntimeHost } from "../src/runtime-host";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const CLOCK = () => NOW;

function unusedExecutor(): WorkflowExecutor {
  const fail = async (): Promise<ExecutorResult> => {
    throw new Error("unused");
  };
  return { createGithubIssue: fail, createIsolatedBranch: fail, pushIsolatedBranch: fail, runValidation: fail, generateEvidence: fail, createDraftPr: fail };
}

function buildFrozenApprovedWorkflow(reason = "Approve the exact governed recovery workflow.", ttlMs?: number) {
  const engine = new WorkflowEngine(unusedExecutor(), new InMemoryCheckpointStore(), CLOCK);
  const workflow = engine.create(simulationInput());
  engine.freeze(workflow);
  engine.approve(workflow, reason, ttlMs);
  return workflow;
}

class SuccessAdapter implements CapabilityAdapter {
  invocationCount = 0;
  constructor(readonly capability: Capability) {}
  async invoke(): Promise<ExecutorResult> {
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

describe("Phase 1A.6 recovery host", () => {
  it("recovers after every capability without duplicating a completed invocation", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry, adapters } = buildSuccessRegistry();
    let host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });

    for (let index = 0; index < CAPABILITIES.length; index += 1) {
      await host.runNextStep();
      const recoveryHost = new RecoveryHost(checkpoints);
      const recovered = await recoveryHost.recover(workflow, CLOCK);
      expect(recovered.completedCapabilities).toHaveLength(index + 1);
      host = recoveryHost.resumeHost(workflow, registry, recovered, CLOCK);
    }

    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
    expect(CAPABILITIES.every((capability) => adapters[capability].invocationCount === 1)).toBe(true);
  });

  it("reconstructs the evidence timeline from the trusted checkpoint chain", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    await host.runNextStep();
    const recovered = await new RecoveryHost(checkpoints).recover(workflow, CLOCK);
    expect(recovered.reconstructedEvidence.length).toBeGreaterThan(0);
    expect(recovered.reconstructedEvidence.map((entry) => entry.stepId)).toEqual(expect.arrayContaining(["CREATE_GITHUB_ISSUE", "CREATE_ISOLATED_BRANCH"]));
  });

  it("rejects a corrupted checkpoint chain", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    const corrupting = new CorruptingCheckpointStore(checkpoints);
    await expect(new RecoveryHost(corrupting).recover(workflow, CLOCK)).rejects.toThrow();
  });

  it("rejects a changed scope during recovery", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    (workflow as { scopeHash: string }).scopeHash = "changed-scope";
    await expect(new RecoveryHost(checkpoints).recover(workflow, CLOCK)).rejects.toThrow();
  });

  it("rejects a changed capability order during recovery", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    const reordered = [...workflow.approval!.orderedCapabilities];
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    (workflow.approval as { orderedCapabilities: readonly Capability[] }).orderedCapabilities = reordered;
    await expect(new RecoveryHost(checkpoints).recover(workflow, CLOCK)).rejects.toThrow();
  });

  it("rejects an expired approval during recovery", async () => {
    const workflow = buildFrozenApprovedWorkflow("Approve the exact governed short-lived recovery workflow.", 1);
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    await expect(new RecoveryHost(checkpoints).recover(workflow, () => new Date(NOW.getTime() + 10))).rejects.toThrow();
  });

  it("rejects a repository mismatch during recovery", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    const { registry } = buildSuccessRegistry();
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    await host.runNextStep();
    (workflow as { repository: string }).repository = "other/repo";
    await expect(new RecoveryHost(checkpoints).recover(workflow, CLOCK)).rejects.toThrow();
  });

  it("rejects automatic resume when reconciliation is required", async () => {
    const workflow = buildFrozenApprovedWorkflow();
    const checkpoints = new InMemoryCheckpointStore();
    class UncertainAdapter implements CapabilityAdapter {
      readonly capability: Capability = "CREATE_GITHUB_ISSUE";
      async invoke(): Promise<ExecutorResult> {
        return { classification: "UNCERTAIN_RESULT", detail: "uncertain" };
      }
    }
    const registry = new AdapterRegistry();
    for (const capability of CAPABILITIES) {
      registry.register(capability === "CREATE_GITHUB_ISSUE" ? new UncertainAdapter() : new SuccessAdapter(capability));
    }
    const host = new RuntimeHost(workflow, { registry, checkpoints, clock: CLOCK });
    const outcome = await host.runNextStep();
    expect(outcome.classification).toBe("RECONCILIATION_REQUIRED");
    await expect(new RecoveryHost(checkpoints).recover(workflow, CLOCK)).rejects.toThrow();
  });
});
