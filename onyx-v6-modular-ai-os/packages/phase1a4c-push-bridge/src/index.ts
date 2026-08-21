import type { ApprovalRecord } from "@onyx/automation-foundation";
import { createScopeHash } from "@onyx/automation-foundation";
import { idempotencyKey } from "@onyx/github-automation";

export const PUSH_CAPABILITY = "PUSH_ISOLATED_BRANCH" as const;
export const PUSH_REPOSITORY = "test831495/onyx-alpha1-transfer" as const;
export const PUSH_ISSUE_NUMBER = 7 as const;
export const PUSH_ISSUE_TITLE = "Phase 1A.4A Live Smoke Test" as const;
export const PUSH_BRANCH = "automation/issue-7-phase1a4b-isolated-branch-smoke" as const;
export const PUSH_COMMIT = "712f3546529f6eff8c37f480c0db61cad56f1b6c" as const;
export const PUSH_REMOTE = "origin" as const;

export type PushBridgeState = "AWAITING_PUSH_APPROVAL" | "APPROVED_FOR_ISOLATED_BRANCH_PUSH" | "PUSH_IN_PROGRESS" | "BRANCH_PUSHED_REMOTE" | "PUSH_FAILED_SAFE" | "PUSH_RECONCILIATION_REQUIRED";
export interface PushRun { runId: string; state: "DRY_RUN_READY"; scopeHash: string; repository: string; branchCreated: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; }
export interface PushApproval extends ApprovalRecord { approver: "Rahul Kumar"; capability: typeof PUSH_CAPABILITY; reason: string; idempotencyKey: string; consumed: boolean; issueNumber: typeof PUSH_ISSUE_NUMBER; repository: typeof PUSH_REPOSITORY; localBranch: typeof PUSH_BRANCH; remoteBranch: typeof PUSH_BRANCH; localCommit: typeof PUSH_COMMIT; remote: typeof PUSH_REMOTE; }
export interface PushBridgeRequest { run: PushRun; reason: string; localCommit?: string; remote?: string; remoteBranch?: string; force?: boolean; delete?: boolean; refspec?: string; }
export interface PushChecks { actor(): Promise<string> | string; repository(): Promise<string> | string; issue(): Promise<{ number: number; state: "OPEN" | "CLOSED"; title: string }>; worktree(): Promise<{ clean: boolean; detached: boolean }>; currentBranch(): Promise<string> | string; localBranch(name: string): Promise<{ exists: boolean; commit?: string }>; remoteBranch(remote: string, name: string): Promise<{ exists: boolean; commit?: string }>; }
export interface PushAdapter { push(request: { remote: typeof PUSH_REMOTE; localBranch: typeof PUSH_BRANCH; remoteBranch: typeof PUSH_BRANCH; commit: typeof PUSH_COMMIT; force: false; delete: false; refspec: string; idempotencyKey: string }): Promise<{ pushed: boolean; remoteCommit: string; uncertain?: boolean }>; }
export interface PushEvidence { event: string; detail: string; timestamp: string; }
export interface PushBridgeResult { repository: typeof PUSH_REPOSITORY; issueNumber: typeof PUSH_ISSUE_NUMBER; localBranch: typeof PUSH_BRANCH; remoteBranch: typeof PUSH_BRANCH; localCommit: typeof PUSH_COMMIT; remoteCommit?: string; newlyPushed: boolean; compatibleRemoteReuse: boolean; idempotencyResult: "PUSHED" | "REUSED" | "FAILED" | "RECONCILIATION_REQUIRED"; evidence: PushEvidence[]; forcePushUsed: false; branchDeleted: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; finalState: PushBridgeState; }

function scope(request: PushBridgeRequest) { return { capability: PUSH_CAPABILITY, repository: PUSH_REPOSITORY, issueNumber: PUSH_ISSUE_NUMBER, localBranch: PUSH_BRANCH, remoteBranch: request.remoteBranch ?? PUSH_BRANCH, localCommit: request.localCommit ?? PUSH_COMMIT, remote: request.remote ?? PUSH_REMOTE }; }
function evidence(event: string, detail: string): PushEvidence { return { event, detail: detail.replace(/token|secret|password/gi, "[REDACTED]"), timestamp: new Date().toISOString() }; }
function result(overrides: Partial<PushBridgeResult>, records: PushEvidence[]): PushBridgeResult { return { repository: PUSH_REPOSITORY, issueNumber: PUSH_ISSUE_NUMBER, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, localCommit: PUSH_COMMIT, newlyPushed: false, compatibleRemoteReuse: false, idempotencyResult: "FAILED", evidence: records, forcePushUsed: false, branchDeleted: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, finalState: "PUSH_FAILED_SAFE", ...overrides }; }

export function requestPushApproval(request: PushBridgeRequest, now = new Date()): PushApproval {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY before push approval.");
  if (request.run.repository !== PUSH_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  if (request.reason.trim().length < 12) throw new Error("Push approval reason must contain at least 12 characters.");
  const approvedScope = scope(request);
  return { planId: request.run.runId, scopeHash: createScopeHash(approvedScope), approver: "Rahul Kumar", approvedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 900000).toISOString(), capability: PUSH_CAPABILITY, reason: request.reason.trim(), idempotencyKey: idempotencyKey(PUSH_REPOSITORY, PUSH_CAPABILITY, approvedScope), consumed: false, issueNumber: PUSH_ISSUE_NUMBER, repository: PUSH_REPOSITORY, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, localCommit: PUSH_COMMIT, remote: PUSH_REMOTE };
}

async function validate(request: PushBridgeRequest, approval: PushApproval, checks: PushChecks, now: number) {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY.");
  if (await checks.actor() !== "coolscorpiorahul") throw new Error("Authenticated GitHub actor must be coolscorpiorahul.");
  if (await checks.repository() !== PUSH_REPOSITORY || request.run.repository !== PUSH_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  const issue = await checks.issue();
  if (issue.number !== PUSH_ISSUE_NUMBER) throw new Error("Issue number must be 7.");
  if (issue.state !== "OPEN") throw new Error("Issue 7 must be OPEN.");
  if (issue.title !== PUSH_ISSUE_TITLE) throw new Error("Issue title does not match the governed input.");
  if (approval.approver !== "Rahul Kumar") throw new Error("Push approval authority must be Rahul Kumar.");
  if (approval.capability !== PUSH_CAPABILITY) throw new Error("Capability must be PUSH_ISOLATED_BRANCH.");
  if (approval.repository !== PUSH_REPOSITORY || approval.issueNumber !== PUSH_ISSUE_NUMBER || approval.localBranch !== PUSH_BRANCH || approval.remoteBranch !== PUSH_BRANCH || approval.remote !== PUSH_REMOTE || approval.localCommit !== PUSH_COMMIT) throw new Error("Approval binding does not match the exact push scope.");
  if (approval.scopeHash !== createScopeHash(scope(request))) throw new Error("Push approval scope hash mismatch.");
  if (approval.expiresAt && Date.parse(approval.expiresAt) <= now) throw new Error("Push approval has expired.");
  if (approval.idempotencyKey !== idempotencyKey(PUSH_REPOSITORY, PUSH_CAPABILITY, scope(request))) throw new Error("Push idempotency key does not match the approved request.");
  if (request.remote !== undefined && request.remote !== PUSH_REMOTE || request.remoteBranch !== undefined && request.remoteBranch !== PUSH_BRANCH) throw new Error("Only origin and the exact branch are permitted.");
  if (request.force === true) throw new Error("Force push is not permitted.");
  if (request.delete === true) throw new Error("Branch deletion is not permitted.");
  if (request.refspec !== undefined && request.refspec !== `${PUSH_BRANCH}:${PUSH_BRANCH}`) throw new Error("Only the exact branch refspec is permitted.");
  if (!/^(automation|feature|fix|docs|chore)\/[a-z0-9][a-z0-9-]*$/.test(PUSH_BRANCH)) throw new Error("Invalid branch name.");
  const worktree = await checks.worktree();
  if (!worktree.clean) throw new Error("Working tree must be clean.");
  if (worktree.detached) throw new Error("Detached HEAD is not allowed.");
  if (await checks.currentBranch() !== PUSH_BRANCH) throw new Error("Local branch must be the exact approved branch.");
  const local = await checks.localBranch(PUSH_BRANCH);
  if (!local.exists) throw new Error("Approved local branch is missing.");
  if (local.commit !== PUSH_COMMIT) throw new Error("Local branch commit does not match the approved commit.");
  return checks.remoteBranch(PUSH_REMOTE, PUSH_BRANCH);
}

export async function pushApprovedIsolatedBranch(request: PushBridgeRequest, approval: PushApproval | undefined, checks: PushChecks, adapter: PushAdapter, now = Date.now()): Promise<PushBridgeResult> {
  const records = [evidence("PUSH_REQUESTED", "PUSH_ISOLATED_BRANCH received; only normal origin push is permitted.")];
  if (!approval) throw new Error("A PUSH_ISOLATED_BRANCH approval is required.");
  const remote = await validate(request, approval, checks, now);
  if (remote.exists && remote.commit !== PUSH_COMMIT) throw new Error("Existing remote branch has an incompatible commit.");
  if (remote.exists) { approval.consumed = true; return result({ remoteCommit: remote.commit, compatibleRemoteReuse: true, idempotencyResult: "REUSED", evidence: [...records, evidence("BRANCH_PUSHED_REMOTE", "Compatible remote branch reused idempotently." )], finalState: "BRANCH_PUSHED_REMOTE" }, records); }
  if (approval.consumed) throw new Error("Consumed push approval has no compatible remote result.");
  try {
    records.push(evidence("PUSH_IN_PROGRESS", "Normal non-force push adapter invoked."));
    const pushed = await adapter.push({ remote: PUSH_REMOTE, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, commit: PUSH_COMMIT, force: false, delete: false, refspec: `${PUSH_BRANCH}:${PUSH_BRANCH}`, idempotencyKey: approval.idempotencyKey });
    if (pushed.uncertain) return result({ idempotencyResult: "RECONCILIATION_REQUIRED", evidence: [...records, evidence("PUSH_RECONCILIATION_REQUIRED", "Adapter outcome is uncertain; no retry was performed.")], finalState: "PUSH_RECONCILIATION_REQUIRED" }, records);
    approval.consumed = true;
    return result({ remoteCommit: pushed.remoteCommit, newlyPushed: pushed.pushed, idempotencyResult: "PUSHED", evidence: [...records, evidence("BRANCH_PUSHED_REMOTE", "Exact branch pushed normally to origin.")], finalState: "BRANCH_PUSHED_REMOTE" }, records);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Push adapter failure.";
    const uncertain = /uncertain|timeout|timed out|unknown response|reconcil/i.test(detail);
    return result({ idempotencyResult: uncertain ? "RECONCILIATION_REQUIRED" : "FAILED", evidence: [...records, evidence(uncertain ? "PUSH_RECONCILIATION_REQUIRED" : "PUSH_FAILED_SAFE", uncertain ? "Adapter outcome is uncertain; no retry was performed." : "Adapter failure recorded; no retry was performed.")], finalState: uncertain ? "PUSH_RECONCILIATION_REQUIRED" : "PUSH_FAILED_SAFE" }, records);
  }
}
