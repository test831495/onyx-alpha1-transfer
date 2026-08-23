import { describe, expect, it } from "vitest";
import { InMemoryCheckpointStore, verifyCheckpointChain } from "../src/checkpoint-store";
import { RecoveryEngine } from "../src/recovery-engine";
import { MockWorkflowExecutor, simulationInput } from "../src/local-simulation";
import { WorkflowEngine } from "../src/workflow-engine";

describe("recovery-first checkpoints", () => {
  it("recovers the last completed capability without duplicating calls", async () => {
    const store = new InMemoryCheckpointStore();
    const executor = new MockWorkflowExecutor();
    const engine = new WorkflowEngine(executor, store);
    const workflow = engine.create(simulationInput());
    engine.freeze(workflow);
    engine.approve(workflow, "Approve the exact governed workflow.");
    await engine.run(workflow);
    const recovered = await new RecoveryEngine(store).recover(workflow);
    expect(recovered.completedSteps).toEqual(expect.arrayContaining(["CREATE_GITHUB_ISSUE", "CREATE_ISOLATED_BRANCH", "PUSH_ISOLATED_BRANCH", "RUN_VALIDATION", "GENERATE_EVIDENCE", "CREATE_DRAFT_PR"]));
    expect(executor.calls).toHaveLength(6);
  });
  it("rejects corrupted, mismatched, and uncertain checkpoint histories", async () => {
    const store = new InMemoryCheckpointStore();
    const record = await store.append({ workflowId: "wf-a", workflowVersion: "1.0.0", repository: "test831495/onyx-alpha1-transfer", currentState: "ISSUE_STEP_IN_PROGRESS", stepId: "CREATE_GITHUB_ISSUE", scopeHash: "scope-a", approvalPackageDigest: "approval-a", inputDigest: "input-a", idempotencyKey: "key-a", attempt: 1, startedAt: "2026-01-01T00:00:00.000Z", previousCheckpointDigest: "" });
    expect(() => verifyCheckpointChain([{ ...record, scopeHash: "scope-b" }], { workflowId: "wf-a", repository: "test831495/onyx-alpha1-transfer", workflowVersion: "1.0.0", scopeHash: "scope-a" })).toThrow();
    expect(() => verifyCheckpointChain([{ ...record, digest: "bad" }], { workflowId: "wf-a", repository: "test831495/onyx-alpha1-transfer", workflowVersion: "1.0.0", scopeHash: "scope-a" })).toThrow();
  });
});
