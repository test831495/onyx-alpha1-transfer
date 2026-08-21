import { describe, expect, it } from "vitest";
import { createApprovalPackage } from "../src/approval-package";
import { InMemoryCheckpointStore } from "../src/checkpoint-store";
import { CAPABILITIES, WORKFLOW_CONTRACT_VERSION, WORKFLOW_STATES } from "../src/contracts";
import { MockWorkflowExecutor, runLocalSimulation, simulationInput } from "../src/local-simulation";
import { canTransition, transition } from "../src/state-machine";
import { WorkflowEngine } from "../src/workflow-engine";

describe("governed workflow engine", () => {
  it("creates, freezes, approves, and completes the exact sequential workflow", async () => {
    const executor = new MockWorkflowExecutor();
    const engine = new WorkflowEngine(executor, new InMemoryCheckpointStore());
    const workflow = engine.create(simulationInput());
    expect(workflow.contractVersion).toBe(WORKFLOW_CONTRACT_VERSION);
    engine.freeze(workflow);
    expect(workflow.state).toBe("AWAITING_WORKFLOW_APPROVAL");
    engine.approve(workflow, "Approve the exact governed Phase 1A.5 workflow.");
    await engine.run(workflow);
    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
    expect(executor.calls).toEqual(["issue", "branch", "push", "validation", "evidence", "draft-pr"]);
    expect(workflow.flags.mergeAllowed).toBe(false);
    expect(engine.evidence.list().map((entry) => entry.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("rejects missing approval, expired approval, scope mutation, and illegal transitions", async () => {
    const engine = new WorkflowEngine(new MockWorkflowExecutor());
    const workflow = engine.create(simulationInput());
    await expect(engine.run(workflow)).rejects.toThrow();
    engine.freeze(workflow);
    const approval = createApprovalPackage(workflow, "Approve the exact governed workflow.", new Date("2026-01-01T00:00:00Z"), 10);
    workflow.approval = approval;
    expect(() => transition("WORKFLOW_CREATED", "WORKFLOW_COMPLETED")).toThrow();
    expect(canTransition("WORKFLOW_CREATED", "SCOPE_FROZEN")).toBe(true);
    workflow.scope.issue.title = "mutated";
    expect(() => engine.approve(workflow, "another meaningful reason")).toThrow();
    expect(() => { workflow.approval = approval; }).not.toThrow();
  });
  it("runs the complete deterministic local simulation", async () => {
    await expect(runLocalSimulation()).resolves.toMatchObject({ workflowState: "WORKFLOW_COMPLETED", mergeAllowed: false, productionDeployAllowed: false });
  });
  it("exposes the frozen 31-state contract and six ordered capabilities", () => {
    expect(WORKFLOW_STATES).toHaveLength(32);
    expect(CAPABILITIES).toHaveLength(6);
  });
});
