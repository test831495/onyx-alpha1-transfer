import { afterEach, describe, expect, it } from "vitest";
import {
  BASE_BRANCH,
  BRANCH_CAPABILITY,
  BRANCH_ISSUE_NUMBER,
  BRANCH_ISSUE_TITLE,
  BRANCH_REPOSITORY,
  PROPOSED_BRANCH,
  VALIDATED_PREDECESSOR_COMMIT,
  createApprovedBranch,
  requestBranchApproval,
  type BranchApproval,
  type BranchBridgeRequest,
  type BranchChecks,
  type LocalBranchAdapter,
} from "../src/index";

const request: BranchBridgeRequest = {
  run: { runId: "run-7", state: "DRY_RUN_READY", scopeHash: "run-scope", repository: BRANCH_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false },
  reason: "Approve the isolated local branch smoke test.",
};

class MockChecks implements BranchChecks {
  actorName = "coolscorpiorahul";
  repositoryName = BRANCH_REPOSITORY;
  issueState: "OPEN" | "CLOSED" = "OPEN";
  issueNumber = BRANCH_ISSUE_NUMBER;
  issueTitle = BRANCH_ISSUE_TITLE;
  clean = true;
  detached = false;
  predecessor = VALIDATED_PREDECESSOR_COMMIT;
  proposed: { exists: boolean; baseCommit?: string } = { exists: false };
  actor() { return this.actorName; }
  repository() { return this.repositoryName; }
  issue() { return Promise.resolve({ number: this.issueNumber, state: this.issueState, title: this.issueTitle }); }
  worktree() { return Promise.resolve({ clean: this.clean, detached: this.detached }); }
  baseCommit(branch: string) { return Promise.resolve(branch === BASE_BRANCH ? this.predecessor : "unknown"); }
  branch() { return Promise.resolve(this.proposed); }
}

class MockAdapter implements LocalBranchAdapter {
  calls = 0;
  existing = false;
  failure: string | undefined;
  async create() {
    this.calls += 1;
    if (this.failure) throw new Error(this.failure);
    if (this.existing) return { created: false, reused: true };
    this.existing = true;
    return { created: true, reused: false };
  }
}

const approvals: BranchApproval[] = [];
const approved = (overrides: Partial<BranchApproval> = {}) => {
  const value = { ...requestBranchApproval(request), ...overrides } as BranchApproval;
  approvals.push(value);
  return value;
};
const execute = (checks = new MockChecks(), adapter = new MockAdapter(), approval = approved()) => createApprovedBranch(request, approval, checks, adapter);

afterEach(() => { approvals.splice(0); });

describe("Phase 1A.4B isolated branch bridge", () => {
  it("creates the approved local branch and preserves remote safety flags", async () => {
    const result = await execute();
    expect(result).toMatchObject({ branchName: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit: VALIDATED_PREDECESSOR_COMMIT, newlyCreated: true, compatibleBranchReused: false, idempotencyResult: "CREATED", finalState: "BRANCH_READY_LOCAL", remoteBranchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false });
  });

  it("rejects missing approval", async () => {
    await expect(createApprovedBranch(request, undefined, new MockChecks(), new MockAdapter())).rejects.toThrow("approval");
  });

  it.each([
    ["wrong actor", approved(), Object.assign(new MockChecks(), { actorName: "other-user" }), "coolscorpiorahul"],
    ["wrong repository", approved(), Object.assign(new MockChecks(), { repositoryName: "other/repo" }), "Repository"],
    ["wrong issue", approved(), Object.assign(new MockChecks(), { issueNumber: 8 }), "number"],
    ["closed issue", approved(), Object.assign(new MockChecks(), { issueState: "CLOSED" as const }), "OPEN"],
    ["dirty working tree", approved(), Object.assign(new MockChecks(), { clean: false }), "clean"],
    ["detached HEAD", approved(), Object.assign(new MockChecks(), { detached: true }), /detached/i],
  ])("rejects %s", async (_label, approval, checks, message) => {
    await expect(execute(checks, new MockAdapter(), approval as BranchApproval | undefined)).rejects.toThrow(message);
  });

  it.each([
    ["wrong base branch", { baseBranch: "main" }, "exact branch scope"],
    ["base-commit mismatch", { baseCommit: "0".repeat(40) }, "predecessor"],
    ["scope-hash mismatch", { scopeHash: "wrong" }, "scope hash"],
    ["expired approval", { expiresAt: new Date(0).toISOString() }, "expired"],
    ["wrong capability", { capability: "CREATE_GITHUB_ISSUE" }, "CREATE_ISOLATED_BRANCH"],
    ["invalid branch name", { proposedBranch: "bad branch" }, "exact branch scope"],
    ["protected branch", { baseBranch: "integration/onyx-nova" }, "exact branch scope"],
  ])("rejects %s", async (_label, changes, message) => {
    await expect(execute(new MockChecks(), new MockAdapter(), approved(changes as Partial<BranchApproval>))).rejects.toThrow(message);
  });

  it("rejects an incompatible existing branch", async () => {
    const checks = Object.assign(new MockChecks(), { proposed: { exists: true, baseCommit: "wrong" } });
    await expect(execute(checks)).rejects.toThrow("incompatible");
  });

  it("reuses a compatible branch idempotently", async () => {
    const checks = new MockChecks();
    const adapter = new MockAdapter();
    const approval = approved();
    const first = await execute(checks, adapter, approval);
    checks.proposed = { exists: true, baseCommit: VALIDATED_PREDECESSOR_COMMIT };
    const second = await execute(checks, adapter, approval);
    expect(first.newlyCreated).toBe(true);
    expect(second).toMatchObject({ newlyCreated: false, compatibleBranchReused: true, idempotencyResult: "REUSED", finalState: "BRANCH_READY_LOCAL" });
    expect(adapter.calls).toBe(2);
  });

  it.each([
    ["adapter failure", "provider failed", "BRANCH_CREATION_FAILED_SAFE"],
    ["uncertain result", "timeout: uncertain response", "BRANCH_RECONCILIATION_REQUIRED"],
  ])("classifies %s safely", async (_label, failure, state) => {
    const adapter = new MockAdapter();
    adapter.failure = failure;
    const result = await execute(new MockChecks(), adapter);
    expect(result.finalState).toBe(state);
    expect(result.remoteBranchPushed).toBe(false);
  });

  it("binds the exact capability, issue, branches, scope, expiry, reason, and idempotency key", () => {
    const approval = requestBranchApproval(request, new Date("2026-01-01T00:00:00.000Z"));
    expect(approval).toMatchObject({ approver: "Rahul Kumar", capability: BRANCH_CAPABILITY, issueNumber: 7, repository: BRANCH_REPOSITORY, baseBranch: BASE_BRANCH, proposedBranch: PROPOSED_BRANCH, consumed: false, reason: request.reason });
    expect(approval.approvedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(approval.expiresAt).toBe("2026-01-01T00:15:00.000Z");
    expect(approval.scopeHash).toContain("fnv1a-");
    expect(approval.idempotencyKey).toContain("fnv1a-");
  });
});

describe("Phase 1A.4B local smoke runner focused tests", () => {
  class LocalSmokeChecks implements BranchChecks {
    actorName = "coolscorpiorahul";
    repositoryName = BRANCH_REPOSITORY;
    issueState: "OPEN" | "CLOSED" = "OPEN";
    issueNumber = BRANCH_ISSUE_NUMBER;
    issueTitle = BRANCH_ISSUE_TITLE;
    clean = true;
    detached = false;
    predecessor = VALIDATED_PREDECESSOR_COMMIT;
    proposed: { exists: boolean; baseCommit?: string } = { exists: false };
    actor() { return this.actorName; }
    repository() { return this.repositoryName; }
    issue() { return Promise.resolve({ number: this.issueNumber, state: this.issueState, title: this.issueTitle }); }
    worktree() { return Promise.resolve({ clean: this.clean, detached: this.detached }); }
    baseCommit(branch: string) { return Promise.resolve(branch === BASE_BRANCH ? this.predecessor : "unknown"); }
    branch() { return Promise.resolve(this.proposed); }
  }

  class LocalSmokeAdapter implements LocalBranchAdapter {
    calls = 0;
    existing = false;
    failure: string | undefined;
    async create() {
      this.calls += 1;
      if (this.failure) throw new Error(this.failure);
      if (this.existing) return { created: false, reused: true };
      this.existing = true;
      return { created: true, reused: false };
    }
  }

  it("creates local branch with first invocation and reuses idempotently", async () => {
    const checks = new LocalSmokeChecks();
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    const first = await createApprovedBranch(request, approval, checks, adapter);
    expect(first).toMatchObject({ branchName: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit: VALIDATED_PREDECESSOR_COMMIT, newlyCreated: true, compatibleBranchReused: false, idempotencyResult: "CREATED", finalState: "BRANCH_READY_LOCAL", remoteBranchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false });

    checks.proposed = { exists: true, baseCommit: VALIDATED_PREDECESSOR_COMMIT };
    const second = await createApprovedBranch(request, approval, checks, adapter);
    expect(second).toMatchObject({ newlyCreated: false, compatibleBranchReused: true, idempotencyResult: "REUSED", finalState: "BRANCH_READY_LOCAL" });
    expect(adapter.calls).toBe(2);
  });

  it("rejects wrong actor", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { actorName: "other-user" });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("coolscorpiorahul");
  });

  it("rejects wrong repository", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { repositoryName: "other/repo" });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("Repository");
  });

  it("rejects wrong issue number", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { issueNumber: 8 });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("number");
  });

  it("rejects closed issue", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { issueState: "CLOSED" as const });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("OPEN");
  });

  it("rejects wrong issue title", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { issueTitle: "Wrong Title" });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("governed input");
  });

  it("rejects dirty working tree", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { clean: false });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("clean");
  });

  it("rejects detached HEAD", async () => {
    const checks = Object.assign(new LocalSmokeChecks(), { detached: true });
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow(/detached/i);
  });

  it("rejects base commit mismatch", async () => {
    const checks = new LocalSmokeChecks();
    (checks as any).predecessor = "0".repeat(40);
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("predecessor");
  });

  it("rejects remote branch already exists", async () => {
    const checks = new LocalSmokeChecks();
    checks.proposed = { exists: true, baseCommit: "different-commit" };
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("incompatible");
  });

  it("classifies adapter failure safely", async () => {
    const checks = new LocalSmokeChecks();
    const adapter = new LocalSmokeAdapter();
    adapter.failure = "provider failed";
    const approval = requestBranchApproval(request, new Date());
    const result = await createApprovedBranch(request, approval, checks, adapter);
    expect(result.finalState).toBe("BRANCH_CREATION_FAILED_SAFE");
    expect(result.remoteBranchPushed).toBe(false);
  });

  it("classifies uncertain adapter response safely", async () => {
    const checks = new LocalSmokeChecks();
    const adapter = new LocalSmokeAdapter();
    adapter.failure = "timeout: uncertain response";
    const approval = requestBranchApproval(request, new Date());
    const result = await createApprovedBranch(request, approval, checks, adapter);
    expect(result.finalState).toBe("BRANCH_RECONCILIATION_REQUIRED");
    expect(result.remoteBranchPushed).toBe(false);
  });

  it("redacts evidence from tokens and credentials", async () => {
    const checks = new LocalSmokeChecks();
    const adapter = new LocalSmokeAdapter();
    adapter.failure = "token abc123 secret xyz123";
    const approval = requestBranchApproval(request, new Date());
    const result = await createApprovedBranch(request, approval, checks, adapter);
    const evidence = JSON.stringify(result.evidence);
    // Verify sensitive data is not included in evidence
    expect(evidence).not.toMatch(/token|secret|password/i);
    expect(evidence).not.toContain("abc123");
    expect(evidence).not.toContain("xyz123");
  });

  it("preserves remote safety flags: no push, no draft PR, no merge, no production", async () => {
    const checks = new LocalSmokeChecks();
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    const result = await createApprovedBranch(request, approval, checks, adapter);
    expect(result.remoteBranchPushed).toBe(false);
    expect(result.draftPrCreated).toBe(false);
    expect(result.mergeAllowed).toBe(false);
    expect(result.productionDeployAllowed).toBe(false);
  });

  it("handles compatible branch reuse with idempotency", async () => {
    const checks = new LocalSmokeChecks();
    checks.proposed = { exists: true, baseCommit: VALIDATED_PREDECESSOR_COMMIT };
    const adapter = new LocalSmokeAdapter();
    adapter.existing = true;
    const approval = requestBranchApproval(request, new Date());
    const result = await createApprovedBranch(request, approval, checks, adapter);
    expect(result.newlyCreated).toBe(false);
    expect(result.compatibleBranchReused).toBe(true);
    expect(result.idempotencyResult).toBe("REUSED");
  });

  it("rejects incompatible existing branch", async () => {
    const checks = new LocalSmokeChecks();
    checks.proposed = { exists: true, baseCommit: "different-commit" };
    const adapter = new LocalSmokeAdapter();
    const approval = requestBranchApproval(request, new Date());
    await expect(createApprovedBranch(request, approval, checks, adapter)).rejects.toThrow("incompatible");
  });
});