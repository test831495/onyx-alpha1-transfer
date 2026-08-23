import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUSH_BRANCH, PUSH_CAPABILITY, PUSH_COMMIT, PUSH_ISSUE_NUMBER, PUSH_ISSUE_TITLE, PUSH_REMOTE, PUSH_REPOSITORY,
  pushApprovedIsolatedBranch, requestPushApproval,
  type PushAdapter, type PushApproval, type PushBridgeRequest, type PushChecks,
} from "../src/index";
import { IMPLEMENTATION_BRANCH, LIVE_CONFIRMATION, runLivePush } from "../src/live-push";

const request: PushBridgeRequest = { run: { runId: "run-7", state: "DRY_RUN_READY", scopeHash: "run-scope", repository: PUSH_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false }, reason: "Approve the isolated branch push for Issue 7." };
class MockChecks implements PushChecks {
  actorName = "coolscorpiorahul"; repositoryName = PUSH_REPOSITORY; issueState: "OPEN" | "CLOSED" = "OPEN"; issueNumber = 7; issueTitle = PUSH_ISSUE_TITLE; clean = true; detached = false; branchName = PUSH_BRANCH; localExists = true; localCommit = PUSH_COMMIT; remoteExists = false; remoteCommit: string | undefined;
  actor() { return this.actorName; } repository() { return this.repositoryName; }
  issue() { return Promise.resolve({ number: this.issueNumber, state: this.issueState, title: this.issueTitle }); }
  worktree() { return Promise.resolve({ clean: this.clean, detached: this.detached }); }
  currentBranch() { return this.branchName; }
  localBranch() { return Promise.resolve({ exists: this.localExists, commit: this.localCommit }); }
  remoteBranch() { return Promise.resolve({ exists: this.remoteExists, commit: this.remoteCommit }); }
}
class MockAdapter implements PushAdapter {
  calls = 0; failure: string | undefined; uncertain = false;
  async push() { this.calls++; if (this.failure) throw new Error(this.failure); return { pushed: true, remoteCommit: PUSH_COMMIT, uncertain: this.uncertain }; }
}
const approved = (changes: Partial<PushApproval> = {}) => ({ ...requestPushApproval(request, new Date("2026-01-01T00:00:00.000Z")), ...changes }) as PushApproval;
const execute = (checks = new MockChecks(), adapter = new MockAdapter(), approval = approved(), value = request) => pushApprovedIsolatedBranch(value, approval, checks, adapter, Date.parse("2026-01-01T00:01:00.000Z"));

const rejectionCases: Array<[string, Partial<PushApproval>, Partial<MockChecks>, string]> = [
  ["wrong actor", {}, { actorName: "other" }, "coolscorpiorahul"], ["wrong repository", {}, { repositoryName: "other/repo" as never }, "Repository"], ["wrong issue", {}, { issueNumber: 8 }, "number"], ["closed issue", {}, { issueState: "CLOSED" }, "OPEN"], ["wrong issue title", {}, { issueTitle: "Wrong" as never }, "governed"], ["wrong capability", { capability: "CREATE_ISOLATED_BRANCH" as never }, {}, "PUSH_ISOLATED_BRANCH"], ["expired approval", { expiresAt: new Date(0).toISOString() }, {}, "expired"], ["scope-hash mismatch", { scopeHash: "wrong" }, {}, "scope hash"], ["idempotency-key mismatch", { idempotencyKey: "wrong" }, {}, "idempotency"], ["dirty worktree", {}, { clean: false }, "clean"], ["detached HEAD", {}, { detached: true }, /detached/i as never], ["missing local branch", {}, { localExists: false }, "missing"], ["wrong local commit", {}, { localCommit: "wrong" as never }, "commit"], ["protected branch", { remoteBranch: "main" as never }, {}, "exact push scope"], ["invalid branch name", { localBranch: "bad branch" as never }, {}, "exact push scope"], ["arbitrary remote rejection", { remote: "upstream" as never }, {}, "exact push scope"],
];

describe("Phase 1A.4C approval-gated isolated branch push", () => {
  it("remote absent: pushes the exact branch once", async () => {
    const adapter = new MockAdapter(); const result = await execute(new MockChecks(), adapter);
    expect(result).toMatchObject({ repository: PUSH_REPOSITORY, issueNumber: 7, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, localCommit: PUSH_COMMIT, remoteCommit: PUSH_COMMIT, newlyPushed: true, compatibleRemoteReuse: false, idempotencyResult: "PUSHED", finalState: "BRANCH_PUSHED_REMOTE", forcePushUsed: false, branchDeleted: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false });
    expect(adapter.calls).toBe(1);
  });
  it("rejects missing approval", async () => { await expect(pushApprovedIsolatedBranch(request, undefined, new MockChecks(), new MockAdapter())).rejects.toThrow("approval"); });
  it.each(rejectionCases)("rejects %s", async (_label, approvalChanges, checkChanges, message) => { await expect(execute(Object.assign(new MockChecks(), checkChanges), new MockAdapter(), approved(approvalChanges))).rejects.toThrow(message); });
  it.each([["force push rejection", { force: true }, "Force"], ["branch deletion rejection", { delete: true }, "deletion"], ["arbitrary refspec rejection", { refspec: "refs/heads/other:refs/heads/other" }, "refspec"]] as const)("rejects %s", async (_label, changes, message) => { await expect(execute(new MockChecks(), new MockAdapter(), approved(), { ...request, ...changes })).rejects.toThrow(message); });
  it("compatible remote reuse supports idempotent replay with no duplicate push", async () => { const checks = new MockChecks(); const adapter = new MockAdapter(); const approval = approved(); const first = await execute(checks, adapter, approval); checks.remoteExists = true; checks.remoteCommit = PUSH_COMMIT; const second = await execute(checks, adapter, approval); expect(first.newlyPushed).toBe(true); expect(second).toMatchObject({ newlyPushed: false, compatibleRemoteReuse: true, idempotencyResult: "REUSED", finalState: "BRANCH_PUSHED_REMOTE" }); expect(adapter.calls).toBe(1); });
  it("incompatible remote rejection", async () => { const checks = new MockChecks(); checks.remoteExists = true; checks.remoteCommit = "different"; await expect(execute(checks)).rejects.toThrow("incompatible"); });
  it.each([["adapter failure", "provider failed", "PUSH_FAILED_SAFE"], ["uncertain response", "timeout: uncertain response", "PUSH_RECONCILIATION_REQUIRED"]] as const)("classifies %s", async (_label, failure, state) => { const adapter = new MockAdapter(); adapter.failure = failure; const result = await execute(new MockChecks(), adapter); expect(result.finalState).toBe(state); expect(adapter.calls).toBe(1); });
  it("binds Rahul, capability, exact issue, branch, commit, origin, scope, reason, expiry, idempotency, and consumed state", () => { const value = requestPushApproval(request, new Date("2026-01-01T00:00:00.000Z")); expect(value).toMatchObject({ approver: "Rahul Kumar", capability: PUSH_CAPABILITY, repository: PUSH_REPOSITORY, issueNumber: PUSH_ISSUE_NUMBER, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, localCommit: PUSH_COMMIT, remote: PUSH_REMOTE, reason: request.reason, consumed: false }); expect(value.expiresAt).toBe("2026-01-01T00:15:00.000Z"); expect(value.scopeHash).toMatch(/^sha256-v1-[0-9a-f]{64}$/); expect(value.idempotencyKey).toMatch(/^sha256-v1-[0-9a-f]{64}$/); });
  it("does not authorize push with a Phase 1A.4B approval", async () => { await expect(execute(new MockChecks(), new MockAdapter(), approved({ capability: "CREATE_ISOLATED_BRANCH" as never }))).rejects.toThrow("PUSH_ISOLATED_BRANCH"); });
  it("redacts adapter evidence", async () => { const adapter = new MockAdapter(); adapter.failure = "token abc secret xyz"; const result = await execute(new MockChecks(), adapter); expect(JSON.stringify(result.evidence)).not.toMatch(/token|secret/i); });
});

class LiveMockChecks extends MockChecks {
  implementation = IMPLEMENTATION_BRANCH;
  remoteUrl = PUSH_REPOSITORY;
  implementationBranch() { return this.implementation; }
  remoteRepository() { return this.remoteUrl; }
}

class LiveMockAdapter implements PushAdapter {
  calls = 0;
  checks: LiveMockChecks;
  failure: string | undefined;
  uncertain = false;
  constructor(checks: LiveMockChecks) { this.checks = checks; }
  async push() { this.calls++; if (this.failure) throw new Error(this.failure); if (this.uncertain) return { pushed: false, remoteCommit: PUSH_COMMIT, uncertain: true }; this.checks.remoteExists = true; this.checks.remoteCommit = PUSH_COMMIT; return { pushed: true, remoteCommit: PUSH_COMMIT }; }
}

async function liveExecute(checks = new LiveMockChecks(), adapter = new LiveMockAdapter(checks), env: NodeJS.ProcessEnv = { PHASE1A4C_LIVE_CONFIRMATION: LIVE_CONFIRMATION }) {
  const directory = await mkdtemp(join("/tmp", "phase1a4c-live-test-"));
  try { return await runLivePush({ env, checks, adapter, repositoryRoot: directory, now: () => new Date("2026-01-01T00:00:00.000Z") }); } finally { await rm(directory, { recursive: true, force: true }); }
}

describe("Phase 1A.4C.1 guarded live push runner", () => {
  it.each([["missing confirmation", {}], ["wrong confirmation", { PHASE1A4C_LIVE_CONFIRMATION: "WRONG" }]])("rejects %s", async (_label, env) => { await expect(liveExecute(new LiveMockChecks(), new LiveMockAdapter(new LiveMockChecks()), env)).rejects.toThrow("PHASE1A4C_LIVE_CONFIRMATION"); });
  it.each([["wrong actor", { actorName: "other" }, "coolscorpiorahul"], ["wrong repository", { repositoryName: "other/repo" as never }, "Repository"], ["wrong issue", { issueNumber: 8 }, "Issue 7"], ["closed issue", { issueState: "CLOSED" as const }, "Issue 7"], ["wrong issue title", { issueTitle: "Wrong" as never }, "Issue 7"], ["wrong current implementation branch", { implementation: "main" }, IMPLEMENTATION_BRANCH], ["dirty worktree", { clean: false }, "clean"], ["detached HEAD", { detached: true }, "Detached"], ["missing local branch", { localExists: false }, "missing"], ["wrong local commit", { localCommit: "wrong" as never }, "commit"], ["remote repository mismatch", { remoteUrl: "other/repo" }, "Remote repository"]] as const)("rejects %s", async (_label, changes, message) => { const checks = Object.assign(new LiveMockChecks(), changes); await expect(liveExecute(checks, new LiveMockAdapter(checks))).rejects.toThrow(message); });
  it("performs one mock push, replays compatibly, writes redacted evidence, and preserves safety flags", async () => { const checks = new LiveMockChecks(); const adapter = new LiveMockAdapter(checks); const evidence = await liveExecute(checks, adapter); expect(evidence).toMatchObject({ repository: PUSH_REPOSITORY, issueNumber: 7, capability: PUSH_CAPABILITY, remote: PUSH_REMOTE, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, approvedCommit: PUSH_COMMIT, newRemoteBranchCount: 1, idempotentReplayStatus: true, forcePushUsed: false, branchDeleted: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, firstResult: { finalState: "BRANCH_PUSHED_REMOTE", newlyPushed: true }, replayResult: { finalState: "BRANCH_PUSHED_REMOTE", newlyPushed: false, compatibleRemoteReuse: true, idempotencyResult: "REUSED" } }); expect(adapter.calls).toBe(1); });
  it("rejects a remote branch unexpectedly present with an incompatible commit", async () => { const checks = new LiveMockChecks(); checks.remoteExists = true; checks.remoteCommit = "different"; await expect(liveExecute(checks, new LiveMockAdapter(checks))).rejects.toThrow("incompatible"); });
  it.each([["adapter failure", "provider failed", "PUSH_FAILED_SAFE"], ["uncertain result", "timeout: uncertain response", "PUSH_RECONCILIATION_REQUIRED"]] as const)("stops on %s", async (_label, failure, state) => { const checks = new LiveMockChecks(); const adapter = new LiveMockAdapter(checks); adapter.failure = failure; await expect(liveExecute(checks, adapter)).rejects.toThrow(state); expect(adapter.calls).toBe(1); });
  it("denies force-push, branch-deletion, different-refspec, and tag-push requests", async () => { const checks = new MockChecks(); await expect(execute(checks, new MockAdapter(), approved(), { ...request, force: true })).rejects.toThrow("Force"); await expect(execute(checks, new MockAdapter(), approved(), { ...request, delete: true })).rejects.toThrow("deletion"); await expect(execute(checks, new MockAdapter(), approved(), { ...request, refspec: "refs/tags/v1:refs/tags/v1" })).rejects.toThrow("refspec"); });
  it("evidence redaction removes credentials", async () => { const checks = new LiveMockChecks(); const adapter = new LiveMockAdapter(checks); adapter.failure = "token abc secret xyz"; await expect(liveExecute(checks, adapter)).rejects.toThrow("PUSH_FAILED_SAFE"); });
});
