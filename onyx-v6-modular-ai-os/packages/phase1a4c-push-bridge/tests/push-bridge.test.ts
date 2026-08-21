import { describe, expect, it } from "vitest";
import {
  PUSH_BRANCH, PUSH_CAPABILITY, PUSH_COMMIT, PUSH_ISSUE_NUMBER, PUSH_ISSUE_TITLE, PUSH_REMOTE, PUSH_REPOSITORY,
  pushApprovedIsolatedBranch, requestPushApproval,
  type PushAdapter, type PushApproval, type PushBridgeRequest, type PushChecks,
} from "../src/index";

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
  it("binds Rahul, capability, exact issue, branch, commit, origin, scope, reason, expiry, idempotency, and consumed state", () => { const value = requestPushApproval(request, new Date("2026-01-01T00:00:00.000Z")); expect(value).toMatchObject({ approver: "Rahul Kumar", capability: PUSH_CAPABILITY, repository: PUSH_REPOSITORY, issueNumber: PUSH_ISSUE_NUMBER, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, localCommit: PUSH_COMMIT, remote: PUSH_REMOTE, reason: request.reason, consumed: false }); expect(value.expiresAt).toBe("2026-01-01T00:15:00.000Z"); expect(value.scopeHash).toContain("fnv1a-"); expect(value.idempotencyKey).toContain("fnv1a-"); });
  it("does not authorize push with a Phase 1A.4B approval", async () => { await expect(execute(new MockChecks(), new MockAdapter(), approved({ capability: "CREATE_ISOLATED_BRANCH" as never }))).rejects.toThrow("PUSH_ISOLATED_BRANCH"); });
  it("redacts adapter evidence", async () => { const adapter = new MockAdapter(); adapter.failure = "token abc secret xyz"; const result = await execute(new MockChecks(), adapter); expect(JSON.stringify(result.evidence)).not.toMatch(/token|secret/i); });
});
