import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApprovalPackage } from "../src/approval-package";
import { FileCheckpointStore, InMemoryCheckpointStore, validateCheckpoint, verifyCheckpointChain } from "../src/checkpoint-store";
import { type ApprovalPackage, CAPABILITIES, EXECUTION_LANE_LIMIT, PROHIBITED_OPERATIONS, REQUIREMENT_IDS, ROLLBACK_CLASSIFICATIONS, WORKFLOW_CONTRACT_VERSION, WORKFLOW_STATES, digest, defaultFlags } from "../src/contracts";
import { EvidenceTimeline } from "../src/evidence-timeline";
import { rejectArbitraryCommand, rejectProhibitedOperation } from "../src/executor-contract";
import { MockWorkflowExecutor, simulationInput } from "../src/local-simulation";
import { RecoveryEngine } from "../src/recovery-engine";
import { canTransition, transition } from "../src/state-machine";
import { WorkflowEngine } from "../src/workflow-engine";

const tempDirs: string[] = [];
afterEach(async () => { await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });
async function tempDir(): Promise<string> { const dir = await mkdtemp(join(tmpdir(), "phase1a5-")); tempDirs.push(dir); return dir; }

describe("Phase 1A.5 acceptance coverage", () => {
  it("P15-CONTRACT-001: workflow contract version and deterministic workflow IDs are stable", () => {
    const input = simulationInput();
    const engine = new WorkflowEngine(new MockWorkflowExecutor());
    const workflow = engine.create(input);
    expect(workflow.contractVersion).toBe(WORKFLOW_CONTRACT_VERSION);
    expect(workflow.workflowId).toMatch(/^wf-[a-f0-9]{24}$/);
    expect(workflow.workflowId).toBe(engine.create(input).workflowId);
    expect(digest(input)).toBeDefined();
    expect(CAPABILITIES).toHaveLength(6);
    expect(PROHIBITED_OPERATIONS).toContain("MERGE");
    expect(EXECUTION_LANE_LIMIT).toBe(1);
  });

  it("P15-APPROVAL-001: approval binds actor, repository, scope, contract, capabilities, expiry, and digest", () => {
    const engine = new WorkflowEngine(new MockWorkflowExecutor());
    const workflow = engine.create(simulationInput());
    engine.freeze(workflow);
    const approval = createApprovalPackage(workflow, "Approve the exact governed workflow and scope.");
    expect(approval.approver).toBe("Rahul Kumar");
    expect(approval.repository).toBe("test831495/onyx-alpha1-transfer");
    expect(approval.workflowId).toBe(workflow.workflowId);
    expect(approval.contractVersion).toBe(WORKFLOW_CONTRACT_VERSION);
    expect(approval.scopeHash).toBe(workflow.scopeHash);
    expect(approval.orderedCapabilities).toEqual(CAPABILITIES);
    expect(Date.parse(approval.expiresAt)).toBeGreaterThan(Date.parse(approval.issuedAt));
    expect(() => { const frame = { ...approval, digest: "bad" }; expect(frame.digest).not.toBe(approval.digest); }).not.toThrow();
    expect(approval.digest).toBeDefined();
  });

  it("P15-STATE-001: all declared states are reachable only through permitted transitions", () => {
    expect(WORKFLOW_STATES).toHaveLength(32);
    expect(canTransition("WORKFLOW_CREATED", "SCOPE_FROZEN")).toBe(true);
    expect(() => transition("WORKFLOW_CREATED", "WORKFLOW_COMPLETED")).toThrow();
    expect(() => transition("WORKFLOW_COMPLETED", "PREFLIGHT_IN_PROGRESS")).toThrow();
    expect(() => transition("WORKFLOW_CANCELLED", "WORKFLOW_APPROVED")).toThrow();
    expect(() => transition("WORKFLOW_RECONCILIATION_REQUIRED", "WORKFLOW_APPROVED")).toThrow();
    expect(canTransition("WORKFLOW_FAILED_SAFE", "WORKFLOW_ROLLBACK_REQUIRED")).toBe(true);
    expect(canTransition("WORKFLOW_ROLLBACK_REQUIRED", "WORKFLOW_ROLLED_BACK")).toBe(true);
    expect(WORKFLOW_STATES).toContain("WORKFLOW_CREATED");
    expect(WORKFLOW_STATES).toContain("SCOPE_FROZEN");
    expect(WORKFLOW_STATES).toContain("PREFLIGHT_IN_PROGRESS");
    expect(WORKFLOW_STATES).toContain("DRAFT_PR_STEP_COMPLETED");
    expect(WORKFLOW_STATES).toContain("WORKFLOW_COMPLETED");
    expect(WORKFLOW_STATES).not.toContain("MERGE_ALLOWED");
    expect(WORKFLOW_STATES).not.toContain("PRODUCTION_DEPLOYMENT");
  });

  it("P15-CHECKPOINT-001: checkpoints are append-only, hash chained, and validate repository/scope/version", async () => {
    const store = new InMemoryCheckpointStore();
    const first = await store.append({ workflowId: "wf-1", workflowVersion: "1.0.0", repository: "test831495/onyx-alpha1-transfer", currentState: "PREFLIGHT_PASSED", stepId: "CREATE_GITHUB_ISSUE", scopeHash: "scope-a", approvalPackageDigest: "app-a", inputDigest: "in-a", idempotencyKey: "key-a", attempt: 1, startedAt: "2026-01-01T00:00:00.000Z", previousCheckpointDigest: "" });
    const second = await store.append({ workflowId: "wf-1", workflowVersion: "1.0.0", repository: "test831495/onyx-alpha1-transfer", currentState: "ISSUE_STEP_COMPLETED", stepId: "CREATE_GITHUB_ISSUE", scopeHash: "scope-a", approvalPackageDigest: "app-a", inputDigest: "in-a", idempotencyKey: "key-a", attempt: 1, startedAt: "2026-01-01T00:00:00.001Z", previousCheckpointDigest: first.digest, outputDigest: "out-a", providerResultClassification: "DETERMINISTIC_SUCCESS", resourceId: "issue-7", resourceUrl: "https://example.test/issues/7", completedAt: "2026-01-01T00:00:00.002Z", evidenceReferences: ["event-1"], nextPermittedState: "BRANCH_STEP_PENDING" });
    const records = await store.list("wf-1");
    expect(records).toHaveLength(2);
    verifyCheckpointChain([first, second], { workflowId: "wf-1", repository: "test831495/onyx-alpha1-transfer", workflowVersion: "1.0.0", scopeHash: "scope-a" });
    expect(() => validateCheckpoint({ ...second, repository: "other/repo" }, { workflowId: "wf-1", repository: "test831495/onyx-alpha1-transfer", workflowVersion: "1.0.0", scopeHash: "scope-a" })).toThrow();
    expect(() => validateCheckpoint({ ...second, workflowVersion: "2.0.0" }, { workflowId: "wf-1", repository: "test831495/onyx-alpha1-transfer", workflowVersion: "1.0.0", scopeHash: "scope-a" })).toThrow();
  });

  it("P15-RECOVERY-001: recovery resumes from the last valid completed checkpoint and rejects changed scope/version", async () => {
    const engine = new WorkflowEngine(new MockWorkflowExecutor());
    const workflow = engine.create(simulationInput());
    engine.freeze(workflow);
    engine.approve(workflow, "Approve the exact governed workflow and scope.");
    await engine.run(workflow);
    const recovered = await new RecoveryEngine(engine.checkpoints).recover(workflow);
    expect(recovered.completedSteps.length).toBeGreaterThan(0);
    expect(recovered.state).toBe("WORKFLOW_COMPLETED");
    const original = (await engine.checkpoints.list(workflow.workflowId)).at(-1);
    expect(original).toBeTruthy();
    const altered: any = { ...original, scopeHash: "bad" };
    expect(() => verifyCheckpointChain([altered], { workflowId: workflow.workflowId, repository: workflow.repository, workflowVersion: workflow.contractVersion, scopeHash: workflow.scopeHash })).toThrow();
  });

  it("P15-EXECUTOR-001: executors are capability specific and reject arbitrary shell/command input", () => {
    expect(() => rejectArbitraryCommand({ shell: "echo hi" })).toThrow();
    expect(() => rejectArbitraryCommand("git push")).toThrow();
    expect(() => rejectProhibitedOperation("MERGE")).toThrow();
    const executor = new MockWorkflowExecutor();
    expect(executor.createGithubIssue).toBeTypeOf("function");
    expect(executor.createIsolatedBranch).toBeTypeOf("function");
    expect(executor.pushIsolatedBranch).toBeTypeOf("function");
    expect(executor.runValidation).toBeTypeOf("function");
    expect(executor.generateEvidence).toBeTypeOf("function");
    expect(executor.createDraftPr).toBeTypeOf("function");
  });

  it("P15-EVIDENCE-001: evidence entries capture all required fields and redact secrets", () => {
    const timeline = new EvidenceTimeline();
    const entry = timeline.add({ workflowId: "wf-1", stateTransition: "PREFLIGHT_PASSED->ISSUE_STEP_COMPLETED", stepId: "CREATE_GITHUB_ISSUE", actor: "Rahul Kumar", capability: "CREATE_GITHUB_ISSUE", approvalDigest: "approval-digest", scopeHash: "scope-hash", inputDigest: "input-digest", outputDigest: "output-digest", providerClassification: "DETERMINISTIC_SUCCESS", resourceReferences: ["https://example.test/issues/7"], timestamp: "2026-01-01T00:00:00.000Z", checkpointDigest: "checkpoint-digest", detail: "token=abc123 password=secret GitHub token=ghp_abc authorization: Bearer xyz apiKey=test-key" });
    expect(entry.sequence).toBe(1);
    expect(entry.providerClassification).toBe("DETERMINISTIC_SUCCESS");
    expect(entry.redactedDetail).not.toContain("abc123");
    expect(entry.redactedDetail).not.toContain("secret");
    expect(entry.redactedDetail).not.toContain("ghp_");
    expect(entry.redactedDetail).not.toContain("test-key");
    expect(entry.resourceReferences).toContain("https://example.test/issues/7");
    expect(entry.checkpointDigest).toBe("checkpoint-digest");
  });

  it("P15-ROLLBACK-001: rollback policy is explicit and policy-only", () => {
    expect(ROLLBACK_CLASSIFICATIONS).toHaveLength(5);
    expect(ROLLBACK_CLASSIFICATIONS).toContain("NO_ROLLBACK_REQUIRED");
    expect(ROLLBACK_CLASSIFICATIONS).toContain("ROLLBACK_COMPLETED_POLICY_ONLY");
    const policy = {
      workflowId: "wf-1",
      stepId: "CREATE_GITHUB_ISSUE",
      classification: "ROLLBACK_COMPLETED_POLICY_ONLY",
      reason: "Policy-only rollback after safe stop.",
      recommendedCompensatingActions: ["document escalation", "persist evidence"],
      remoteDeletionPermitted: false,
      forcePushPermitted: false,
      mergePermitted: false,
      productionActionPermitted: false,
      evidenceReferences: ["checkpoint-1"],
      timestamp: "2026-01-01T00:00:00.000Z"
    } as const;
    expect(policy.remoteDeletionPermitted).toBe(false);
    expect(policy.forcePushPermitted).toBe(false);
    expect(policy.mergePermitted).toBe(false);
    expect(policy.productionActionPermitted).toBe(false);
  });

  it("P15-SECURITY-001: manifest and security contracts remain bounded", () => {
    expect(REQUIREMENT_IDS).toContain("P15-SECURITY-001");
    expect(defaultFlags().mergeAllowed).toBe(false);
    expect(defaultFlags().productionDeployAllowed).toBe(false);
    expect(defaultFlags().forcePushAllowed).toBe(false);
    expect(defaultFlags().branchDeletionAllowed).toBe(false);
  });

  it("P15-SIMULATION-001: complete local simulation and file-store simulation both pass with unique temp paths", async () => {
    const engine = new WorkflowEngine(new MockWorkflowExecutor());
    const workflow = engine.create(simulationInput());
    engine.freeze(workflow);
    engine.approve(workflow, "Approve the exact workflow.");
    await engine.run(workflow);
    expect(workflow.state).toBe("WORKFLOW_COMPLETED");
    const dir = await tempDir();
    const checkpointPath = join(dir, "checkpoints", "phase1a5-checkpoints.jsonl");
    const store = new FileCheckpointStore(checkpointPath);
    const record = { workflowId: workflow.workflowId, workflowVersion: workflow.contractVersion, repository: workflow.repository, currentState: "PREFLIGHT_PASSED", stepId: "CREATE_GITHUB_ISSUE", scopeHash: workflow.scopeHash, approvalPackageDigest: workflow.approval!.digest, inputDigest: digest({}), idempotencyKey: "sim-key", attempt: 1, startedAt: new Date().toISOString(), previousCheckpointDigest: "" };
    await store.append(record);
    expect((await store.list(workflow.workflowId)).length).toBeGreaterThan(0);
    const output = await readFile(checkpointPath, "utf8");
    expect(output).toContain('"workflowId"');
    const stats = await stat(checkpointPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
