import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DRAFT_PR_BASE_BRANCH,
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
import { IMPLEMENTATION_BRANCH, LIVE_CONFIRMATION, runLiveDraftPr } from "../src/live-draft-pr";

const TEST_BASE_COMMIT = "1111111111111111111111111111111111111111";
const TEST_HEAD_COMMIT = "2222222222222222222222222222222222222222";

const request: DraftPrBridgeRequest = {
  run: { runId: "run-live-7", state: "DRY_RUN_READY", scopeHash: "draft-pr-live-scope", repository: DRAFT_PR_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false },
  reason: "Approve the exact single Phase 1A.4D Draft PR creation.",
  evidenceDigest: "sha256:phase1a4d-live-draft-pr-evidence",
  baseCommit: TEST_BASE_COMMIT,
  headCommit: TEST_HEAD_COMMIT,
  title: "Phase 1A.4D Live Draft PR Smoke Test",
  body: "Purpose\nIssue 7\nExact scope hash\nExact evidence digest\nBase branch\nHead branch\nHead commit\nValidation evidence\nSecurity impact\nCost impact\nProvider impact\nKnown limitations\nRollback instructions\nReviewer checklist\nGovernance boundaries",
  draft: true,
};

class LiveMockChecks implements DraftPrChecks {
  actorName = "coolscorpiorahul";
  repositoryName = DRAFT_PR_REPOSITORY;
  issueState: "OPEN" | "CLOSED" = "OPEN";
  issueNumber = DRAFT_PR_ISSUE_NUMBER;
  issueTitle = DRAFT_PR_ISSUE_TITLE;
  clean = true;
  detached = false;
  remoteExists = true;
  remoteCommit = TEST_HEAD_COMMIT;
  remoteCommits: string[] | undefined;
  localHeadCommitValue = TEST_HEAD_COMMIT;
  baseCommitValue = TEST_BASE_COMMIT;
  diff = { identicalCommits: false, ahead: true, diffNonEmpty: true };
  implementation = IMPLEMENTATION_BRANCH;
  actor() { return this.actorName; }
  repository() { return this.repositoryName; }
  issue() { return Promise.resolve({ number: this.issueNumber, state: this.issueState, title: this.issueTitle }); }
  worktree() { return Promise.resolve({ clean: this.clean, detached: this.detached }); }
  remoteBranch() { return Promise.resolve({ exists: this.remoteExists, commit: this.remoteCommits?.shift() ?? this.remoteCommit }); }
  localHeadCommit() { return this.localHeadCommitValue; }
  headDiff() { return Promise.resolve(this.diff); }
  baseBranchCommit() { return this.baseCommitValue; }
  implementationBranch() { return this.implementation; }
  githubAuthenticated() { return true; }
}

class LiveMockAdapter implements DraftPrAdapter {
  calls = 0;
  existing: { number: number; url: string; draft: boolean; repository: string; baseBranch: string; headBranch: string; headCommit: string; idempotencyKey: string } | null = null;
  failure: string | undefined;
  uncertain = false;

  async findByIdempotencyKey() { return this.existing; }
  async findByRepositoryBaseHead(repository: string, baseBranch: string, headBranch: string) {
    if (!this.existing) return null;
    if (repository !== DRAFT_PR_REPOSITORY || baseBranch !== DRAFT_PR_BASE_BRANCH || headBranch !== DRAFT_PR_HEAD_BRANCH) return null;
    return { ...this.existing, repository, baseBranch, headBranch, headCommit: this.existing.headCommit };
  }
  async createDraft(input: Parameters<DraftPrAdapter["createDraft"]>[0]) {
    this.calls += 1;
    if (this.failure) throw new Error(this.failure);
    if (this.uncertain) return { number: 99, url: "https://example.com/pull/99", draft: true, uncertain: true };
    this.existing = {
      number: 101,
      url: "https://example.com/pull/101",
      draft: true,
      repository: input.repository,
      baseBranch: input.baseBranch,
      headBranch: input.headBranch,
      headCommit: input.headCommit,
      idempotencyKey: input.idempotencyKey,
    };
    return { number: 101, url: "https://example.com/pull/101", draft: true };
  }
}

const approve = (changes: Partial<DraftPrApproval> = {}) => ({ ...requestDraftPrApproval(request, new Date("2026-01-01T00:00:00.000Z"), { evidenceDigest: request.evidenceDigest ?? "sha256:phase1a4d-live-draft-pr-evidence", title: request.title ?? DRAFT_PR_TITLE, body: request.body ?? "body" }), ...changes } as DraftPrApproval);
const executeBridge = (checks = new LiveMockChecks(), adapter = new LiveMockAdapter(), approval = approve(), value = request) => createApprovedDraftPr(value, approval, checks, adapter, Date.parse("2026-01-01T00:01:00.000Z"));

async function liveExecute(checks = new LiveMockChecks(), adapter = new LiveMockAdapter(), env: NodeJS.ProcessEnv = { PHASE1A4D_LIVE_CONFIRMATION: LIVE_CONFIRMATION }) {
  const directory = await mkdtemp(join("/tmp", "phase1a4d-live-test-"));
  try {
    return await runLiveDraftPr({ env, checks, adapter, repositoryRoot: directory, now: () => new Date("2026-01-01T00:00:00.000Z") });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Phase 1A.4D.1 guarded live Draft PR runner", () => {
  it.each([
    ["missing confirmation", {}],
    ["wrong confirmation", { PHASE1A4D_LIVE_CONFIRMATION: "WRONG" }],
  ])("rejects %s", async (_label, env) => {
    const checks = new LiveMockChecks();
    await expect(liveExecute(checks, new LiveMockAdapter(), env)).rejects.toThrow("PHASE1A4D_LIVE_CONFIRMATION");
  });

  it.each([
    ["wrong actor", { actorName: "other-user" }, "coolscorpiorahul"],
    ["wrong repository", { repositoryName: "other/repo" as never }, "Repository"],
    ["wrong issue", { issueNumber: 8 }, "Issue 7"],
    ["closed issue", { issueState: "CLOSED" as const }, "Issue 7"],
    ["wrong issue title", { issueTitle: "Wrong" as never }, "Issue 7"],
    ["wrong implementation branch", { implementation: "main" }, IMPLEMENTATION_BRANCH],
    ["dirty worktree", { clean: false }, "clean"],
    ["detached HEAD", { detached: true }, "Detached"],
    ["missing remote head", { remoteExists: false }, "Missing remote head branch"],
    ["wrong remote head commit", { remoteCommit: "deadbeef" as never }, /remote head/i],
    ["unpushed local head", { localHeadCommitValue: "3333333333333333333333333333333333333333" }, /unpushed/i],
    ["head does not differ from base", { baseCommitValue: TEST_HEAD_COMMIT }, /differ from base/i],
    ["head is not ahead of base", { diff: { identicalCommits: false, ahead: false, diffNonEmpty: true } }, /ahead of base/i],
    ["base-to-head diff is empty", { diff: { identicalCommits: false, ahead: true, diffNonEmpty: false } }, /diff.*non-empty/i],
  ] as const)("rejects %s", async (_label, changes, message) => {
    const checks = Object.assign(new LiveMockChecks(), changes);
    await expect(liveExecute(checks, new LiveMockAdapter(), { PHASE1A4D_LIVE_CONFIRMATION: LIVE_CONFIRMATION })).rejects.toThrow(message);
  });

  it("rejects wrong base branch when the approval is mutated", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ baseBranch: "main" as never });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("exact base branch");
  });

  it("rejects wrong head branch when the approval is mutated", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ headBranch: "main" as never });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("exact head branch");
  });

  it("rejects identical base and head when the approval is mutated", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ baseBranch: DRAFT_PR_HEAD_BRANCH as never, headBranch: DRAFT_PR_HEAD_BRANCH as never });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("identical");
  });

  it("detects existing incompatible pull request and existing non-Draft pull request", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    adapter.existing = { number: 12, url: "https://example.com/pull/12", draft: false, repository: DRAFT_PR_REPOSITORY, baseBranch: DRAFT_PR_BASE_BRANCH, headBranch: DRAFT_PR_HEAD_BRANCH, headCommit: TEST_HEAD_COMMIT, idempotencyKey: "existing" };
    await expect(liveExecute(checks, adapter)).rejects.toThrow(/incompatible/i);
  });

  it("successful first mock Draft PR creation and compatible replay", async () => {
    const evidence = await liveExecute();
    expect(evidence).toMatchObject({
      repository: DRAFT_PR_REPOSITORY,
      issueNumber: DRAFT_PR_ISSUE_NUMBER,
      capability: DRAFT_PR_CAPABILITY,
      baseBranch: DRAFT_PR_BASE_BRANCH,
      headBranch: DRAFT_PR_HEAD_BRANCH,
      headCommit: TEST_HEAD_COMMIT,
      draftPrNumber: 101,
      draftPrUrl: "https://example.com/pull/101",
      newDraftPrCount: 1,
      idempotentReplayStatus: true,
      draft: true,
      mergeAllowed: false,
      productionDeployAllowed: false,
      branchDeleted: false,
      forcePushUsed: false,
      firstResult: { finalState: "DRAFT_PR_CREATED", newlyCreated: true, prNumber: 101, prUrl: "https://example.com/pull/101", draft: true, mergeAllowed: false, productionDeployAllowed: false },
      replayResult: { finalState: "DRAFT_PR_CREATED", newlyCreated: false, compatibleDraftPrReuse: true, idempotencyResult: "REUSED", prNumber: 101, prUrl: "https://example.com/pull/101", draft: true, mergeAllowed: false, productionDeployAllowed: false },
    });
  });

  it("requires local and remote implementation heads to be equal", async () => {
    const checks = new LiveMockChecks();
    checks.remoteCommit = "3333333333333333333333333333333333333333";
    await expect(liveExecute(checks)).rejects.toThrow(/unpushed/i);
  });

  it("rejects an implementation head that moves after approval", async () => {
    const checks = new LiveMockChecks();
    checks.remoteCommits = [TEST_HEAD_COMMIT, "3333333333333333333333333333333333333333"];
    await expect(liveExecute(checks)).rejects.toThrow(/changed after approval/i);
  });

  it("binds the approval to the runtime-resolved head and rejects an old approval for a changed SHA", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve();
    const changedRequest = { ...request, headCommit: "3333333333333333333333333333333333333333" };
    await expect(executeBridge(checks, adapter, approval, changedRequest)).rejects.toThrow(/scope hash|head commit/i);
    const result = await executeBridge(checks, adapter, approval);
    expect(result.headCommit).toBe(TEST_HEAD_COMMIT);
  });

  it("rejects scope mismatch", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ scopeHash: "wrong" });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("scope hash");
  });

  it("rejects evidence-digest mismatch", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ evidenceDigest: "wrong" });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("evidence digest");
  });

  it("rejects idempotency mismatch", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ idempotencyKey: "wrong" });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("idempotency");
  });

  it("rejects expired approval", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve({ expiresAt: new Date(0).toISOString() });
    await expect(executeBridge(checks, adapter, approval)).rejects.toThrow("expired");
  });

  it("rejects non-Draft request denial", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve();
    await expect(executeBridge(checks, adapter, approval, { ...request, draft: false as never })).rejects.toThrow("Draft");
  });

  it("rejects merge denial, production denial, secret denial, permission denial, and branch-protection denial", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const approval = approve();
    const result = await executeBridge(checks, adapter, approval);
    expect(result).toMatchObject({ draft: true, mergeAllowed: false, productionDeployAllowed: false, branchDeleted: false, forcePushUsed: false });
  });

  it("classifies adapter failure and uncertain result safely", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    adapter.failure = "provider failed";
    await expect(executeBridge(checks, adapter)).resolves.toMatchObject({ finalState: "DRAFT_PR_CREATION_FAILED_SAFE" });
    const uncertain = new LiveMockAdapter();
    uncertain.uncertain = true;
    await expect(executeBridge(checks, uncertain)).resolves.toMatchObject({ finalState: "DRAFT_PR_RECONCILIATION_REQUIRED" });
  });

  it("enforces no duplicate pull request count", async () => {
    const checks = new LiveMockChecks();
    const adapter = new LiveMockAdapter();
    const first = await executeBridge(checks, adapter);
    const second = await executeBridge(checks, adapter);
    expect(first.newlyCreated).toBe(true);
    expect(second).toMatchObject({ newlyCreated: false, compatibleDraftPrReuse: true, idempotencyResult: "REUSED" });
    expect(adapter.calls).toBe(1);
  });

  it("redacts evidence and preserves the required safety flags", async () => {
    const evidence = await liveExecute(new LiveMockChecks(), new LiveMockAdapter());
    expect(JSON.stringify(evidence)).not.toMatch(/token|secret/i);
    expect(evidence).toMatchObject({ draft: true, mergeAllowed: false, productionDeployAllowed: false, branchDeleted: false, forcePushUsed: false });
  });
});
