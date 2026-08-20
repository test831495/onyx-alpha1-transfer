import type { ApprovalRecord } from "@onyx/automation-foundation";
import { createScopeHash } from "@onyx/automation-foundation";
import { idempotencyKey } from "@onyx/github-automation";

export const BRANCH_CAPABILITY = "CREATE_ISOLATED_BRANCH" as const;
export const BRANCH_REPOSITORY = "test831495/onyx-alpha1-transfer" as const;
export const BRANCH_ISSUE_NUMBER = 7 as const;
export const BRANCH_ISSUE_TITLE = "Phase 1A.4A Live Smoke Test" as const;
export const BASE_BRANCH = "feature/phase1a4a-github-issue-bridge" as const;
export const PROPOSED_BRANCH = "automation/issue-7-phase1a4b-isolated-branch-smoke" as const;
export const VALIDATED_PREDECESSOR_COMMIT = "712f3546529f6eff8c37f480c0db61cad56f1b6c" as const;

export type BranchBridgeState = "AWAITING_BRANCH_APPROVAL" | "APPROVED_FOR_BRANCH_CREATION" | "BRANCH_CREATION_IN_PROGRESS" | "BRANCH_READY_LOCAL" | "BRANCH_CREATION_FAILED_SAFE" | "BRANCH_RECONCILIATION_REQUIRED";
export interface BranchRun { runId: string; state: "DRY_RUN_READY"; scopeHash: string; repository: string; branchCreated: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; }
export interface BranchApproval extends ApprovalRecord { approver: "Rahul Kumar"; capability: typeof BRANCH_CAPABILITY; reason: string; idempotencyKey: string; consumed: boolean; issueNumber: typeof BRANCH_ISSUE_NUMBER; repository: typeof BRANCH_REPOSITORY; baseBranch: typeof BASE_BRANCH; baseCommit: string; proposedBranch: typeof PROPOSED_BRANCH; }
export interface BranchBridgeRequest { run: BranchRun; reason: string; baseCommit?: string; expiresAt?: string; }
export interface BranchChecks { actor(): Promise<string> | string; repository(): Promise<string> | string; issue(): Promise<{ number: number; state: "OPEN" | "CLOSED"; title: string }>; worktree(): Promise<{ clean: boolean; detached: boolean }>; baseCommit(branch: string): Promise<string>; branch(name: string): Promise<{ exists: boolean; baseCommit?: string }>; }
export interface LocalBranchAdapter { create(request: { name: string; baseBranch: string; baseCommit: string; idempotencyKey: string }): Promise<{ created: boolean; reused: boolean; uncertain?: boolean }>; }
export interface BranchEvidence { event: string; detail: string; timestamp: string; }
export interface BranchBridgeResult { branchName: typeof PROPOSED_BRANCH; baseBranch: typeof BASE_BRANCH; baseCommit: string; newlyCreated: boolean; compatibleBranchReused: boolean; idempotencyResult: "CREATED" | "REUSED" | "FAILED" | "RECONCILIATION_REQUIRED"; evidence: BranchEvidence[]; remoteBranchPushed: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; finalState: BranchBridgeState; }

function scope(request: BranchBridgeRequest) { return { capability: BRANCH_CAPABILITY, repository: BRANCH_REPOSITORY, issueNumber: BRANCH_ISSUE_NUMBER, baseBranch: BASE_BRANCH, baseCommit: request.baseCommit ?? VALIDATED_PREDECESSOR_COMMIT, proposedBranch: PROPOSED_BRANCH }; }

export function requestBranchApproval(request: BranchBridgeRequest, now = new Date()): BranchApproval {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY before branch approval.");
  if (request.run.repository !== BRANCH_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  if (request.reason.trim().length < 12) throw new Error("Branch approval reason must contain at least 12 characters.");
  const baseCommit = request.baseCommit ?? VALIDATED_PREDECESSOR_COMMIT;
  const approvedScope = scope({ ...request, baseCommit });
  return { planId: request.run.runId, scopeHash: createScopeHash(approvedScope), approver: "Rahul Kumar", approvedAt: now.toISOString(), expiresAt: request.expiresAt ?? new Date(now.getTime() + 900000).toISOString(), capability: BRANCH_CAPABILITY, reason: request.reason.trim(), idempotencyKey: idempotencyKey(BRANCH_REPOSITORY, BRANCH_CAPABILITY, approvedScope), consumed: false, issueNumber: BRANCH_ISSUE_NUMBER, repository: BRANCH_REPOSITORY, baseBranch: BASE_BRANCH, baseCommit, proposedBranch: PROPOSED_BRANCH };
}

function evidence(event: string, detail: string): BranchEvidence { return { event, detail: detail.replace(/token|secret|password/gi, "[REDACTED]"), timestamp: new Date().toISOString() }; }

async function validate(request: BranchBridgeRequest, approval: BranchApproval, checks: BranchChecks, now: number) {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY.");
  if (await checks.actor() !== "coolscorpiorahul") throw new Error("Authenticated GitHub actor must be coolscorpiorahul.");
  if (await checks.repository() !== BRANCH_REPOSITORY || request.run.repository !== BRANCH_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  const issue = await checks.issue();
  if (issue.number !== BRANCH_ISSUE_NUMBER) throw new Error("Issue number must be 7.");
  if (issue.state !== "OPEN") throw new Error("Issue 7 must be OPEN.");
  if (issue.title !== BRANCH_ISSUE_TITLE) throw new Error("Issue title does not match the governed input.");
  if (approval.approver !== "Rahul Kumar") throw new Error("Branch approval authority must be Rahul Kumar.");
  if (approval.capability !== BRANCH_CAPABILITY) throw new Error("Capability must be CREATE_ISOLATED_BRANCH.");
  if (approval.repository !== BRANCH_REPOSITORY || approval.issueNumber !== BRANCH_ISSUE_NUMBER || approval.baseBranch !== BASE_BRANCH || approval.proposedBranch !== PROPOSED_BRANCH) throw new Error("Approval binding does not match the exact branch scope.");
  if (approval.scopeHash !== createScopeHash(scope(request))) throw new Error("Branch approval scope hash mismatch.");
  if (approval.expiresAt && Date.parse(approval.expiresAt) <= now) throw new Error("Branch approval has expired.");
  if (approval.idempotencyKey !== idempotencyKey(BRANCH_REPOSITORY, BRANCH_CAPABILITY, scope(request))) throw new Error("Branch idempotency key does not match the approved request.");
  if (!/^(automation|feature|fix|docs|chore)\/[a-z0-9][a-z0-9-]*$/.test(PROPOSED_BRANCH)) throw new Error("Invalid branch name.");
  if (["main", "integration/onyx-nova"].includes(BASE_BRANCH)) throw new Error("Protected branch cannot be used.");
  const worktree = await checks.worktree();
  if (!worktree.clean) throw new Error("Working tree must be clean.");
  if (worktree.detached) throw new Error("Detached HEAD is not allowed.");
  if (await checks.baseCommit(BASE_BRANCH) !== approval.baseCommit || approval.baseCommit !== VALIDATED_PREDECESSOR_COMMIT) throw new Error("Approved base commit does not match the validated predecessor commit.");
  const proposed = await checks.branch(PROPOSED_BRANCH);
  if (proposed.exists && proposed.baseCommit !== approval.baseCommit) throw new Error("Existing branch is incompatible with the approved base commit.");
}

export async function createApprovedBranch(request: BranchBridgeRequest, approval: BranchApproval | undefined, checks: BranchChecks, adapter: LocalBranchAdapter, now = Date.now()): Promise<BranchBridgeResult> {
  const baseCommit = request.baseCommit ?? VALIDATED_PREDECESSOR_COMMIT;
  const records = [evidence("BRANCH_CREATION_REQUESTED", "CREATE_ISOLATED_BRANCH received; remote push is disabled.")];
  if (!approval) throw new Error("A CREATE_ISOLATED_BRANCH approval is required.");
  await validate(request, approval, checks, now);
  records.push(evidence("APPROVED_FOR_BRANCH_CREATION", "Rahul Kumar approval and exact issue, branch, commit, scope, expiry, and idempotency bindings verified."));
  try {
    records.push(evidence("BRANCH_CREATION_IN_PROGRESS", "Local adapter invoked."));
    const result = await adapter.create({ name: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit, idempotencyKey: approval.idempotencyKey });
    if (result.uncertain) return { branchName: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit, newlyCreated: false, compatibleBranchReused: false, idempotencyResult: "RECONCILIATION_REQUIRED", evidence: [...records, evidence("BRANCH_RECONCILIATION_REQUIRED", "Adapter outcome is uncertain; no retry was performed.")], remoteBranchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, finalState: "BRANCH_RECONCILIATION_REQUIRED" };
    approval.consumed = true;
    const reused = result.reused;
    return { branchName: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit, newlyCreated: result.created, compatibleBranchReused: reused, idempotencyResult: reused ? "REUSED" : "CREATED", evidence: [...records, evidence(reused ? "BRANCH_READY_LOCAL_REUSED" : "BRANCH_READY_LOCAL", reused ? "Compatible local branch reused idempotently." : "Local isolated branch created.")], remoteBranchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, finalState: "BRANCH_READY_LOCAL" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Local adapter failure.";
    const uncertain = /uncertain|timeout|timed out|unknown response|reconcil/i.test(detail);
    return { branchName: PROPOSED_BRANCH, baseBranch: BASE_BRANCH, baseCommit, newlyCreated: false, compatibleBranchReused: false, idempotencyResult: uncertain ? "RECONCILIATION_REQUIRED" : "FAILED", evidence: [...records, evidence(uncertain ? "BRANCH_RECONCILIATION_REQUIRED" : "BRANCH_CREATION_FAILED_SAFE", uncertain ? "Adapter outcome is uncertain; no retry was performed." : "Adapter failure recorded; no retry was performed.")], remoteBranchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, finalState: uncertain ? "BRANCH_RECONCILIATION_REQUIRED" : "BRANCH_CREATION_FAILED_SAFE" };
  }
}