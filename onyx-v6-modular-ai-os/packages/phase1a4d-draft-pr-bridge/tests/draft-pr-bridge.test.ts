import { describe, expect, it } from "vitest";
import {
  DRAFT_PR_BASE_BRANCH,
  DRAFT_PR_BODY,
  DRAFT_PR_CAPABILITY,
  DRAFT_PR_HEAD_BRANCH,
  DRAFT_PR_ISSUE_NUMBER,
  DRAFT_PR_ISSUE_TITLE,
  DRAFT_PR_REPOSITORY,
  DRAFT_PR_TITLE,
  createApprovedDraftPr,
  requestDraftPrApproval,
  type DraftPrAdapter,
  type DraftPrApproval,
  type DraftPrBridgeRequest,
  type DraftPrChecks,
} from "../src/index";

const TEST_BASE_COMMIT = "1111111111111111111111111111111111111111";
const TEST_HEAD_COMMIT = "2222222222222222222222222222222222222222";

const request: DraftPrBridgeRequest = {
  run: { runId: "run-7", state: "DRY_RUN_READY", scopeHash: "draft-pr-scope", repository: DRAFT_PR_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false },
  reason: "Approve the isolated draft PR creation for Issue 7.",
  evidenceDigest: "abc123",
  baseCommit: TEST_BASE_COMMIT,
  headCommit: TEST_HEAD_COMMIT,
  title: DRAFT_PR_TITLE,
  body: DRAFT_PR_BODY,
};

class MockChecks implements DraftPrChecks {
  actorName = "coolscorpiorahul";
  repositoryName = DRAFT_PR_REPOSITORY;
  issueState: "OPEN" | "CLOSED" = "OPEN";
  issueNumber = DRAFT_PR_ISSUE_NUMBER;
  issueTitle = DRAFT_PR_ISSUE_TITLE;
  clean = true;
  detached = false;
  remoteExists = true;
  remoteCommit: string | undefined = TEST_HEAD_COMMIT;
  localHeadCommitValue = TEST_HEAD_COMMIT;
  baseCommitValue = TEST_BASE_COMMIT;
  diff = { identicalCommits: false, ahead: true, diffNonEmpty: true };
  actor() { return this.actorName; }
  repository() { return this.repositoryName; }
  issue() { return Promise.resolve({ number: this.issueNumber, state: this.issueState, title: this.issueTitle }); }
  worktree() { return Promise.resolve({ clean: this.clean, detached: this.detached }); }
  remoteBranch() { return Promise.resolve({ exists: this.remoteExists, commit: this.remoteCommit }); }
  localHeadCommit() { return this.localHeadCommitValue; }
  headDiff() { return Promise.resolve(this.diff); }
  baseBranchCommit() { return this.baseCommitValue; }
}

class MockAdapter implements DraftPrAdapter {
  calls = 0;
  existing: { number: number; url: string; draft: boolean; repository: string; baseBranch: string; headBranch: string; headCommit: string; idempotencyKey: string; } | null = null;
  failure: string | undefined;
  uncertain = false;
  async findByIdempotencyKey() { return this.existing; }
  async createDraft() {
    this.calls += 1;
    if (this.failure) throw new Error(this.failure);
    if (this.uncertain) return { number: 99, url: "https://example.com/pull/99", draft: true, uncertain: true } as any;
    if (this.existing) return { number: this.existing.number, url: this.existing.url, draft: true };
    this.existing = { number: 101, url: "https://example.com/pull/101", draft: true, repository: DRAFT_PR_REPOSITORY, baseBranch: DRAFT_PR_BASE_BRANCH, headBranch: DRAFT_PR_HEAD_BRANCH, headCommit: TEST_HEAD_COMMIT, idempotencyKey: "mock-key" };
    return { number: 101, url: "https://example.com/pull/101", draft: true };
  }
}

const approved = (changes: Partial<DraftPrApproval> = {}) => ({ ...requestDraftPrApproval(request, new Date("2026-01-01T00:00:00.000Z"), { evidenceDigest: request.evidenceDigest ?? "abc123", title: DRAFT_PR_TITLE, body: DRAFT_PR_BODY }), ...changes } as DraftPrApproval);
const execute = (checks = new MockChecks(), adapter = new MockAdapter(), approval = approved(), value = request) => createApprovedDraftPr(value, approval, checks, adapter, Date.parse("2026-01-01T00:01:00.000Z"));

describe("Phase 1A.4D approval-gated draft PR bridge", () => {
  it("creates an approved mock Draft PR and preserves safety flags", async () => {
    const result = await execute();
    expect(result).toMatchObject({ repository: DRAFT_PR_REPOSITORY, issueNumber: 7, baseBranch: DRAFT_PR_BASE_BRANCH, headBranch: DRAFT_PR_HEAD_BRANCH, headCommit: TEST_HEAD_COMMIT, newlyCreated: true, compatibleDraftPrReuse: false, idempotencyResult: "CREATED", finalState: "DRAFT_PR_CREATED", draft: true, mergeAllowed: false, productionDeployAllowed: false, branchDeleted: false, forcePushUsed: false });
  });

  it("rejects missing approval", async () => {
    await expect(createApprovedDraftPr(request, undefined, new MockChecks(), new MockAdapter())).rejects.toThrow("approval");
  });

  it.each([
    ["wrong actor", {}, { actorName: "other-user" }, "coolscorpiorahul"],
    ["wrong repository", {}, { repositoryName: "other/repo" as never }, "Repository"],
    ["wrong issue", {}, { issueNumber: 8 }, "number"],
    ["closed issue", {}, { issueState: "CLOSED" as const }, "OPEN"],
    ["wrong issue title", {}, { issueTitle: "Wrong" as never }, "governed"],
    ["wrong capability", { capability: "PUSH_BRANCH" as never }, {}, "CREATE_DRAFT_PR"],
    ["expired approval", { expiresAt: new Date(0).toISOString() }, {}, "expired"],
    ["scope-hash mismatch", { scopeHash: "wrong" }, {}, "scope hash"],
    ["idempotency mismatch", { idempotencyKey: "wrong" }, {}, "idempotency"],
    ["evidence-digest mismatch", { evidenceDigest: "wrong" }, {}, "evidence digest"],
    ["wrong base branch", { baseBranch: "main" as never }, {}, "exact base branch"],
    ["wrong head branch", { headBranch: "main" as never }, {}, "exact head branch"],
    ["wrong head commit", { headCommit: "deadbeef" as never }, {}, /head commit/],
    ["missing remote head", {}, { remoteExists: false }, /missing remote head/i],
    ["incompatible remote head", {}, { remoteCommit: "deadbeef" as never }, /exactly to the approved commit/i],
    ["non-Draft request", { draft: false as never }, {}, "Draft"],
    ["identical base and head", { baseBranch: DRAFT_PR_HEAD_BRANCH as never }, {}, "identical"],
    ["dirty worktree", {}, { clean: false }, "clean"],
    ["detached HEAD", {}, { detached: true }, /detached/i],
  ])("rejects %s", async (_label, approvalChanges, checkChanges, message) => {
    await expect(execute(Object.assign(new MockChecks(), checkChanges), new MockAdapter(), approved(approvalChanges))).rejects.toThrow(message);
  });

  it("rejects earlier approvals lacking the Draft PR capability", async () => {
    await expect(execute(new MockChecks(), new MockAdapter(), approved({ capability: "CREATE_GITHUB_ISSUE" as never }))).rejects.toThrow("CREATE_DRAFT_PR");
  });

  it("compatibly reuses an existing Draft PR and does not call create twice", async () => {
    const checks = new MockChecks();
    const adapter = new MockAdapter();
    const approval = approved();
    const first = await execute(checks, adapter, approval);
    checks.remoteExists = true;
    checks.remoteCommit = TEST_HEAD_COMMIT;
    adapter.existing = { number: 11, url: "https://example.com/pull/11", draft: true, repository: DRAFT_PR_REPOSITORY, baseBranch: DRAFT_PR_BASE_BRANCH, headBranch: DRAFT_PR_HEAD_BRANCH, headCommit: TEST_HEAD_COMMIT, idempotencyKey: approval.idempotencyKey };
    const second = await execute(checks, adapter, approval);
    expect(first.newlyCreated).toBe(true);
    expect(second).toMatchObject({ newlyCreated: false, compatibleDraftPrReuse: true, idempotencyResult: "REUSED", finalState: "DRAFT_PR_CREATED" });
    expect(adapter.calls).toBe(1);
  });

  it("rejects incompatible or non-Draft existing PRs", async () => {
    const adapter = new MockAdapter();
    adapter.existing = { number: 11, url: "https://example.com/pull/11", draft: false, repository: DRAFT_PR_REPOSITORY, baseBranch: DRAFT_PR_BASE_BRANCH, headBranch: DRAFT_PR_HEAD_BRANCH, headCommit: TEST_HEAD_COMMIT, idempotencyKey: "other" };
    await expect(execute(new MockChecks(), adapter)).rejects.toThrow("Draft");
  });

  it.each([
    ["adapter failure", "provider failed", "DRAFT_PR_CREATION_FAILED_SAFE"],
    ["uncertain result", "timeout: uncertain response", "DRAFT_PR_RECONCILIATION_REQUIRED"],
  ])("classifies %s safely", async (_label, failure, state) => {
    const adapter = new MockAdapter();
    adapter.failure = failure;
    const result = await execute(new MockChecks(), adapter);
    expect(result.finalState).toBe(state);
  });

  it("redacts evidence and preserves safety settings", async () => {
    const adapter = new MockAdapter();
    adapter.failure = "token abc secret xyz";
    const result = await execute(new MockChecks(), adapter);
    expect(JSON.stringify(result.evidence)).not.toMatch(/token|secret/i);
    expect(result).toMatchObject({ draft: true, mergeAllowed: false, productionDeployAllowed: false, branchDeleted: false, forcePushUsed: false });
  });
});
