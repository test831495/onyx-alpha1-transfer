import { describe, expect, it, vi } from "vitest";
import { GitHubApprovalGatedWriteAdapter, InMemoryIdempotencyStore } from "@onyx/github-automation";
import { createApprovedIssue, requestIssueApproval, type IssueApproval, type IssueBridgeRequest } from "../src/index";

const run = { runId: "run-1", state: "DRY_RUN_READY", scopeHash: "a".repeat(64), repository: "test831495/onyx-alpha1-transfer", branchCreated: false as const, draftPrCreated: false as const, mergeAllowed: false as const, productionDeployAllowed: false as const };
const base: IssueBridgeRequest = { run, title: "Implement bridge", body: "Approved issue body", reason: "Approve this exact issue creation scope." };
const writer = (response = { stdout: "https://github.com/test831495/onyx-alpha1-transfer/issues/42", stderr: "", exitCode: 0 }) => {
  const runner = { run: vi.fn().mockResolvedValue(response) };
  const adapter = new GitHubApprovalGatedWriteAdapter(runner, new InMemoryIdempotencyStore());
  return { runner, adapter };
};
const approval = (request = base) => requestIssueApproval(request);

describe("Phase 1A.4A issue bridge", () => {
  it("creates one approved issue through the existing writer", async () => {
    const { adapter, runner } = writer();
    const result = await createApprovedIssue(base, approval(), adapter, 1);
    expect(result).toMatchObject({ issueNumber: 42, issueUrl: "https://github.com/test831495/onyx-alpha1-transfer/issues/42", newIssueCreated: true, idempotentlyReused: false, finalState: "ISSUE_CREATED" });
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(base.run).toMatchObject({ state: "DRY_RUN_READY", repository: "test831495/onyx-alpha1-transfer" });
  });

  it.each([
    ["wrong actor", { approver: "Other" }, "Rahul Kumar"],
    ["wrong repository", { run: { ...run, repository: "other/repo" } }, "test831495/onyx-alpha1-transfer"],
    ["scope hash mismatch", { run: { ...run, scopeHash: "b".repeat(64) } }, "scope hash"],
    ["wrong capability", { capability: "CREATE_DRAFT_PR" }, "capability"],
    ["expired approval", { expiresAt: new Date(-1).toISOString() }, "expired"],
  ])("rejects %s", async (_label, changes, expected) => {
    const typedChanges = changes as { run?: typeof run };
    const request = { ...base, ...(typedChanges.run ? { run: typedChanges.run } : {}) };
    const approved = { ...approval(base), ...changes } as IssueApproval;
    await expect(createApprovedIssue(request, approved, writer().adapter, 0)).rejects.toThrow(expected);
  });

  it("requires DRY_RUN_READY, approval, non-empty content, and matching key", async () => {
    expect(() => requestIssueApproval({ ...base, run: { ...run, state: "PRECHECKED" } })).toThrow("DRY_RUN_READY");
    await expect(createApprovedIssue(base, undefined, writer().adapter)).rejects.toThrow("approval");
    expect(() => requestIssueApproval({ ...base, title: " " })).toThrow("title");
    expect(() => requestIssueApproval({ ...base, body: " " })).toThrow("body");
    await expect(createApprovedIssue(base, { ...approval(), idempotencyKey: "wrong" }, writer().adapter)).rejects.toThrow("idempotency");
  });

  it("reuses an idempotent result without a duplicate issue", async () => {
    const { adapter, runner } = writer();
    const approved = approval();
    const first = await createApprovedIssue(base, approved, adapter);
    const second = await createApprovedIssue(base, approved, adapter);
    expect(first.newIssueCreated).toBe(true);
    expect(second).toMatchObject({ issueNumber: 42, newIssueCreated: false, idempotentlyReused: true, finalState: "ISSUE_CREATED" });
    expect(runner.run).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ stdout: "", stderr: "provider failed", exitCode: 1 }, "ISSUE_CREATION_FAILED_SAFE"],
    [{ stdout: "", stderr: "timeout: uncertain response", exitCode: 1 }, "ISSUE_RECONCILIATION_REQUIRED"],
  ])("classifies provider outcome as %s", async (response, state) => {
    const result = await createApprovedIssue(base, approval(), writer(response).adapter);
    expect(result.finalState).toBe(state);
    expect(result.newIssueCreated).toBe(false);
  });

  it("keeps merge, production, branch, and Draft PR operations unavailable", async () => {
    const result = await createApprovedIssue(base, approval(), writer().adapter);
    expect(base.run).toMatchObject({ branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false });
    expect(result.finalState).toBe("ISSUE_CREATED");
  });
});