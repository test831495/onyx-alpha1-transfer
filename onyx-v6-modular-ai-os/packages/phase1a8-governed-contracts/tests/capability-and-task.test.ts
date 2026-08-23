import { describe, expect, it } from "vitest";
import {
  GOVERNED_CAPABILITY_IDS,
  CAPABILITY_CATALOG,
  assertGovernedCapabilityId,
  assertValidCapabilityDeclaration,
  classifyCapabilityDeclarationViolations,
  createCapabilityDeclaration,
} from "../src/track-a/capability-declaration";
import { canTransitionTask, assertLegalTaskTransition, transitionTask, createDraftTask, assertReassignmentPreservesLineage, assertTaskDoesNotExpandApprovalScope, type Task } from "../src/track-a/task";

describe("capability allowlist", () => {
  it("declares a closed allowlist of governed capabilities", () => {
    expect(GOVERNED_CAPABILITY_IDS).toHaveLength(13);
    expect(Object.keys(CAPABILITY_CATALOG)).toHaveLength(13);
  });

  it("rejects a missing capability id", () => {
    expect(() => assertGovernedCapabilityId("")).toThrow();
  });

  it("rejects an unknown capability id", () => {
    expect(() => assertGovernedCapabilityId("DELETE_EVERYTHING")).toThrow();
  });

  it("rejects an id resembling an arbitrary command or shell surface even if never catalogued", () => {
    expect(() => assertGovernedCapabilityId("RUN_SHELL_COMMAND")).toThrow();
    expect(() => assertGovernedCapabilityId("EXEC_CHILD_PROCESS")).toThrow();
  });

  it("builds a valid declaration directly from the catalog for every governed capability", () => {
    for (const capabilityId of GOVERNED_CAPABILITY_IDS) {
      const declaration = createCapabilityDeclaration(capabilityId, "agent-1");
      expect(() => assertValidCapabilityDeclaration(declaration)).not.toThrow();
    }
  });

  it("requires requiresFreshApproval to be true for R4", () => {
    const declaration = createCapabilityDeclaration("EXECUTE_PROTECTED_PROMOTION", "agent-1");
    expect(declaration.riskClass).toBe("R4");
    expect(declaration.requiresFreshApproval).toBe(true);
    const tampered = { ...declaration, requiresFreshApproval: false };
    expect(classifyCapabilityDeclarationViolations(tampered)).toContain("R4 requires requiresFreshApproval to be true");
  });

  it("always rejects R5 regardless of other fields", () => {
    const declaration = createCapabilityDeclaration("READ_EVIDENCE", "agent-1");
    const tampered = { ...declaration, riskClass: "R5" as const };
    expect(classifyCapabilityDeclarationViolations(tampered)).toContain("R5 is always prohibited");
  });

  it("rejects a missing or unknown parallelSafetyClass", () => {
    const declaration = createCapabilityDeclaration("READ_EVIDENCE", "agent-1");
    const missing = { ...declaration, parallelSafetyClass: "" as unknown as (typeof declaration)["parallelSafetyClass"] };
    expect(classifyCapabilityDeclarationViolations(missing)).toContain("missing parallelSafetyClass");
    const unknown = { ...declaration, parallelSafetyClass: "NOT_A_CLASS" as unknown as (typeof declaration)["parallelSafetyClass"] };
    expect(classifyCapabilityDeclarationViolations(unknown)).toContain("unknown parallelSafetyClass");
  });

  it("authorizes only its exact catalog boundary: a mismatched operationClass is rejected", () => {
    const declaration = createCapabilityDeclaration("READ_EVIDENCE", "agent-1");
    const tampered = { ...declaration, operationClass: "GITHUB_MUTATION" as const };
    expect(classifyCapabilityDeclarationViolations(tampered)).toContain("operationClass does not match the capability catalog");
  });
});

function baseTask(overrides: Partial<Task> = {}): Task {
  // createDraftTask always starts evidenceReferences at [] (a fresh draft legitimately has no evidence yet),
  // so any evidenceReferences/status/contractVersion override must be applied after construction, not before.
  const { evidenceReferences, status, contractVersion, ...rest } = overrides;
  const draft = createDraftTask({
    taskId: "task-1",
    workflowId: "workflow-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    stepId: "step-1",
    capabilityId: "READ_EVIDENCE",
    scopeHash: "scope-hash-1",
    approvalId: "approval-1",
    approvalPolicyVersion: "1.0.0",
    riskClass: "R0",
    inputDigest: "digest-1",
    idempotencyKey: "idempotency-1",
    dependencyTaskIds: [],
    requiredAgentCapabilities: ["READ_EVIDENCE"],
    requiredPermissions: ["read:evidence"],
    requiredConnectorScopes: [],
    requiredMemoryScopes: [],
    priority: 0,
    operationClass: "READ",
    parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
    promotionRequired: false,
    tokenBudgetId: "token-budget-1",
    costBudgetId: "cost-budget-1",
    createdAt: "2026-08-21T00:00:00.000Z",
    expiresAt: "2026-08-22T00:00:00.000Z",
    ...rest,
  });
  return { ...draft, ...(evidenceReferences ? { evidenceReferences } : {}), ...(status ? { status } : {}), ...(contractVersion ? { contractVersion } : {}) };
}

describe("task transition validation", () => {
  it("declares exactly the 9 approved task states", () => {
    expect(canTransitionTask("DRAFT", "READY")).toBe(true);
  });

  it("permits the approved lifecycle path", () => {
    let task = baseTask();
    task = transitionTask(task, "READY");
    task = transitionTask(task, "LEASED");
    task = transitionTask(task, "IN_PROGRESS");
    task = transitionTask(task, "COMPLETED");
    expect(task.status).toBe("COMPLETED");
  });

  it("rejects illegal transitions", () => {
    expect(() => assertLegalTaskTransition("DRAFT", "COMPLETED")).toThrow();
    expect(() => transitionTask(baseTask(), "COMPLETED")).toThrow();
  });

  it("treats COMPLETED, FAILED_SAFE, and CANCELLED as terminal", () => {
    expect(canTransitionTask("COMPLETED", "READY")).toBe(false);
    expect(canTransitionTask("FAILED_SAFE", "READY")).toBe(false);
    expect(canTransitionTask("CANCELLED", "READY")).toBe(false);
  });
});

describe("task reassignment invariant preservation", () => {
  it("accepts a reassignment that preserves scope, approval, permission, memory, connector scope, idempotency, and evidence", () => {
    const before = baseTask({ evidenceReferences: ["evidence-1"] });
    const after = { ...before, evidenceReferences: ["evidence-1", "evidence-2"] };
    expect(() => assertReassignmentPreservesLineage(before, after)).not.toThrow();
  });

  it("rejects a reassignment that changes the scope hash", () => {
    const before = baseTask();
    const after = { ...before, scopeHash: "different-hash" };
    expect(() => assertReassignmentPreservesLineage(before, after)).toThrow();
  });

  it("rejects a reassignment that drops existing evidence", () => {
    const before = baseTask({ evidenceReferences: ["evidence-1"] });
    const after = { ...before, evidenceReferences: [] };
    expect(() => assertReassignmentPreservesLineage(before, after)).toThrow();
  });

  it("rejects a reassignment that changes required permission scope", () => {
    const before = baseTask({ requiredPermissions: ["read:evidence"] });
    const after = { ...before, requiredPermissions: ["read:evidence", "write:memory"] };
    expect(() => assertReassignmentPreservesLineage(before, after)).toThrow();
  });
});

describe("task must not expand its approval scope", () => {
  it("rejects a requested action outside the approved action list", () => {
    const task = baseTask();
    expect(() => assertTaskDoesNotExpandApprovalScope(task, ["CREATE_ISSUE"], ["CREATE_ISSUE", "MERGE_PR"])).toThrow();
  });

  it("permits requested actions that are a subset of approved actions", () => {
    const task = baseTask();
    expect(() => assertTaskDoesNotExpandApprovalScope(task, ["CREATE_ISSUE", "MERGE_PR"], ["CREATE_ISSUE"])).not.toThrow();
  });
});
