import type { ApprovalRecord } from "@onyx/automation-foundation";
import { createScopeHash } from "@onyx/automation-foundation";
import { idempotencyKey } from "@onyx/github-automation";

export const DRAFT_PR_CAPABILITY = "CREATE_DRAFT_PR" as const;
export const DRAFT_PR_REPOSITORY = "test831495/onyx-alpha1-transfer" as const;
export const DRAFT_PR_ISSUE_NUMBER = 7 as const;
export const DRAFT_PR_ISSUE_TITLE = "Phase 1A.4A Live Smoke Test" as const;
export const DRAFT_PR_BASE_BRANCH = "feature/phase1a4a-github-issue-bridge" as const;
export const DRAFT_PR_HEAD_BRANCH = "feature/phase1a4d-draft-pr-bridge" as const;
export const DRAFT_PR_TITLE = "Phase 1A.4D Live Draft PR Smoke Test" as const;
export const DRAFT_PR_BODY = `## Purpose
Create a Draft PR for Issue 7 after exact governance checks and approval.

## Issue
- Issue: #7
- Title: Phase 1A.4A Live Smoke Test

## Scope and validation
- Base branch: feature/phase1a4a-github-issue-bridge
- Head branch: feature/phase1a4d-draft-pr-bridge
- Head commit: resolved from the governed implementation branch at execution time
- Security impact: no secret or credential material is included
- Cost impact: no production deployment or merge action is permitted
- Provider impact: GitHub automation remains bounded to the exact Draft PR creation request

## Known limitations
- This is a bounded mock-only Draft PR bridge unless the guarded live runner is explicitly authorized.
- Merge and production deployment remain prohibited.

## Rollback
- Stop before adapter invocation if a rule is violated.
- Keep the issue and branch state unchanged.

## Reviewer checklist
- [ ] Issue 7 remains OPEN and unchanged
- [ ] The exact repository, base branch, head branch, and head commit are preserved
- [ ] Scope hash and evidence digest match the approval
- [ ] Draft-only and merge-blocked constraints are respected
- [ ] No credentials or secrets are included
- [ ] The action is safely bounded to the exact Draft PR flow

## Governance boundaries
This request is intentionally Draft-only. Merge, production deployment, and arbitrary repository mutation remain unavailable.` as const;

export type DraftPrBridgeState = "AWAITING_DRAFT_PR_APPROVAL" | "APPROVED_FOR_DRAFT_PR_CREATION" | "DRAFT_PR_CREATION_IN_PROGRESS" | "DRAFT_PR_CREATED" | "DRAFT_PR_CREATION_FAILED_SAFE" | "DRAFT_PR_RECONCILIATION_REQUIRED";

export interface DraftPrRun {
  runId: string;
  state: "DRY_RUN_READY";
  scopeHash: string;
  repository: string;
  branchCreated: false;
  draftPrCreated: false;
  mergeAllowed: false;
  productionDeployAllowed: false;
}

export interface DraftPrApproval extends ApprovalRecord {
  approver: "Rahul Kumar";
  capability: typeof DRAFT_PR_CAPABILITY;
  reason: string;
  idempotencyKey: string;
  consumed: boolean;
  issueNumber: typeof DRAFT_PR_ISSUE_NUMBER;
  repository: typeof DRAFT_PR_REPOSITORY;
  baseBranch: typeof DRAFT_PR_BASE_BRANCH;
  headBranch: typeof DRAFT_PR_HEAD_BRANCH;
  baseCommit: string;
  headCommit: string;
  evidenceDigest: string;
  title: string;
  body: string;
  draft: true;
}

export interface DraftPrBridgeRequest {
  run: DraftPrRun;
  reason: string;
  baseBranch?: string;
  headBranch?: string;
  baseCommit?: string;
  headCommit?: string;
  evidenceDigest?: string;
  title?: string;
  body?: string;
  draft?: boolean;
}

export interface DraftPrChecks {
  actor(): Promise<string> | string;
  repository(): Promise<string> | string;
  issue(): Promise<{ number: number; state: "OPEN" | "CLOSED"; title: string }>;
  worktree(): Promise<{ clean: boolean; detached: boolean }>;
  remoteBranch(branch: string): Promise<{ exists: boolean; commit?: string }>;
  baseBranchCommit?(branch: string): Promise<string> | string;
  localHeadCommit?(branch: string): Promise<string> | string;
  headDiff?(baseBranch: string, headBranch: string): Promise<{ identicalCommits: boolean; ahead: boolean; diffNonEmpty: boolean }>;
}

export interface DraftPrAdapter {
  findByIdempotencyKey(key: string): Promise<{
    number: number;
    url: string;
    draft: boolean;
    repository?: string;
    baseBranch?: string;
    headBranch?: string;
    headCommit?: string;
    idempotencyKey?: string;
  } | null>;
  createDraft(input: {
    repository: string;
    baseBranch: string;
    baseCommit: string;
    headBranch: string;
    headCommit: string;
    title: string;
    body: string;
    draft: true;
    idempotencyKey: string;
  }): Promise<{ number: number; url: string; draft: boolean; uncertain?: boolean }>;
}

export interface DraftPrEvidence {
  event: string;
  detail: string;
  timestamp: string;
}

export interface DraftPrBridgeResult {
  repository: typeof DRAFT_PR_REPOSITORY;
  issueNumber: typeof DRAFT_PR_ISSUE_NUMBER;
  baseBranch: typeof DRAFT_PR_BASE_BRANCH;
  headBranch: typeof DRAFT_PR_HEAD_BRANCH;
  baseCommit: string;
  headCommit: string;
  prNumber?: number;
  prUrl?: string;
  newlyCreated: boolean;
  compatibleDraftPrReuse: boolean;
  idempotencyResult: "CREATED" | "REUSED" | "FAILED" | "RECONCILIATION_REQUIRED";
  evidence: DraftPrEvidence[];
  draft: true;
  mergeAllowed: false;
  productionDeployAllowed: false;
  branchDeleted: false;
  forcePushUsed: false;
  finalState: DraftPrBridgeState;
}

function exactDraftSpec(request: DraftPrBridgeRequest) {
  return {
    evidenceDigest: request.evidenceDigest ?? "abc123",
    title: request.title ?? DRAFT_PR_TITLE,
    body: request.body ?? DRAFT_PR_BODY,
    draft: true,
  };
}

function scope(request: DraftPrBridgeRequest) {
  const spec = exactDraftSpec(request);
  return {
    capability: DRAFT_PR_CAPABILITY,
    repository: DRAFT_PR_REPOSITORY,
    issueNumber: DRAFT_PR_ISSUE_NUMBER,
    baseBranch: DRAFT_PR_BASE_BRANCH,
    headBranch: DRAFT_PR_HEAD_BRANCH,
    baseCommit: request.baseCommit ?? "",
    headCommit: request.headCommit ?? "",
    evidenceDigest: spec.evidenceDigest,
    title: spec.title,
    body: spec.body,
    draft: true,
  };
}

function evidence(event: string, detail: string): DraftPrEvidence {
  return {
    event,
    detail: detail.replace(/token|secret|password/gi, "[REDACTED]"),
    timestamp: new Date().toISOString(),
  };
}

export function requestDraftPrApproval(
  request: DraftPrBridgeRequest,
  now = new Date(),
  packageInfo: Partial<{ evidenceDigest: string; title: string; body: string }> = {},
): DraftPrApproval {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY before Draft PR approval.");
  if (request.run.repository !== DRAFT_PR_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  if (request.reason.trim().length < 12) throw new Error("Draft PR approval reason must contain at least 12 characters.");
  if (!request.baseCommit || !request.headCommit) throw new Error("Resolved base and head commits are required before approval.");

  const spec = {
    evidenceDigest: packageInfo.evidenceDigest ?? request.evidenceDigest ?? "abc123",
    title: packageInfo.title ?? request.title ?? DRAFT_PR_TITLE,
    body: packageInfo.body ?? request.body ?? DRAFT_PR_BODY,
    draft: true,
  };

  const approvedScope = {
    capability: DRAFT_PR_CAPABILITY,
    repository: DRAFT_PR_REPOSITORY,
    issueNumber: DRAFT_PR_ISSUE_NUMBER,
    baseBranch: DRAFT_PR_BASE_BRANCH,
    headBranch: DRAFT_PR_HEAD_BRANCH,
    baseCommit: request.baseCommit,
    headCommit: request.headCommit,
    evidenceDigest: spec.evidenceDigest,
    title: spec.title,
    body: spec.body,
    draft: true,
  };

  return {
    planId: request.run.runId,
    scopeHash: createScopeHash(approvedScope),
    approver: "Rahul Kumar",
    approvedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 900000).toISOString(),
    capability: DRAFT_PR_CAPABILITY,
    reason: request.reason.trim(),
    idempotencyKey: idempotencyKey(DRAFT_PR_REPOSITORY, DRAFT_PR_CAPABILITY, approvedScope),
    consumed: false,
    issueNumber: DRAFT_PR_ISSUE_NUMBER,
    repository: DRAFT_PR_REPOSITORY,
    baseBranch: DRAFT_PR_BASE_BRANCH,
    headBranch: DRAFT_PR_HEAD_BRANCH,
    baseCommit: request.baseCommit,
    headCommit: request.headCommit,
    evidenceDigest: spec.evidenceDigest,
    title: spec.title,
    body: spec.body,
    draft: true,
  };
}

async function validate(
  request: DraftPrBridgeRequest,
  approval: DraftPrApproval,
  checks: DraftPrChecks,
  now: number,
) {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY.");
  if ((await checks.actor()) !== "coolscorpiorahul") throw new Error("Authenticated GitHub actor must be coolscorpiorahul.");
  if ((await checks.repository()) !== DRAFT_PR_REPOSITORY || request.run.repository !== DRAFT_PR_REPOSITORY) {
    throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  }

  const issue = await checks.issue();
  if (issue.number !== DRAFT_PR_ISSUE_NUMBER) throw new Error("Issue number must be 7.");
  if (issue.state !== "OPEN") throw new Error("Issue 7 must be OPEN.");
  if (issue.title !== DRAFT_PR_ISSUE_TITLE) throw new Error("Issue title does not match the governed input.");

  if (approval.approver !== "Rahul Kumar") throw new Error("Draft PR approval authority must be Rahul Kumar.");
  if (approval.capability !== DRAFT_PR_CAPABILITY) throw new Error("Capability must be CREATE_DRAFT_PR.");
  if (approval.repository !== DRAFT_PR_REPOSITORY || approval.issueNumber !== DRAFT_PR_ISSUE_NUMBER) {
    throw new Error("Approval binding does not match the exact issue and repository.");
  }
  const requestedBase = (request.baseBranch ?? DRAFT_PR_BASE_BRANCH) as string;
  const requestedHead = (request.headBranch ?? DRAFT_PR_HEAD_BRANCH) as string;
  if (requestedBase === requestedHead || String(approval.baseBranch) === String(approval.headBranch)) {
    throw new Error("identical base and head branches are not allowed");
  }
  if (request.baseBranch !== undefined && request.baseBranch !== DRAFT_PR_BASE_BRANCH) throw new Error("Wrong base branch: only the exact base branch is allowed.");
  if (request.headBranch !== undefined && request.headBranch !== DRAFT_PR_HEAD_BRANCH) throw new Error("Wrong head branch: only the exact head branch is allowed.");
  if (!request.baseCommit || !request.headCommit) throw new Error("Resolved base and head commits are required.");
  if (approval.baseBranch !== DRAFT_PR_BASE_BRANCH) throw new Error("Wrong base branch: only the exact base branch is allowed.");
  if (approval.headBranch !== DRAFT_PR_HEAD_BRANCH) throw new Error("Wrong head branch: only the exact head branch is allowed.");
  if (approval.baseCommit !== request.baseCommit) throw new Error("Approval base commit does not match the resolved base commit.");
  if (approval.headCommit !== request.headCommit) throw new Error("Approval head commit does not match the resolved head commit.");
  if (request.draft === false) throw new Error("Only Draft PR creation is allowed.");
  if (approval.draft !== true) throw new Error("Draft PR request must be Draft-only.");
  if (["main", "integration/onyx-nova"].includes(DRAFT_PR_HEAD_BRANCH)) throw new Error("Protected head branch is not allowed.");
  if (approval.scopeHash !== createScopeHash(scope(request))) throw new Error("Draft PR approval scope hash mismatch.");
  if (approval.evidenceDigest !== (request.evidenceDigest ?? exactDraftSpec(request).evidenceDigest)) throw new Error("Draft PR approval evidence digest mismatch.");
  if (approval.title !== (request.title ?? DRAFT_PR_TITLE) || approval.body !== (request.body ?? DRAFT_PR_BODY)) {
    throw new Error("Draft PR approval title and body do not match the approved package.");
  }
  if (approval.expiresAt && Date.parse(approval.expiresAt) <= now) throw new Error("Draft PR approval has expired.");
  if (approval.idempotencyKey !== idempotencyKey(DRAFT_PR_REPOSITORY, DRAFT_PR_CAPABILITY, scope(request))) {
    throw new Error("Draft PR idempotency key does not match the approved request.");
  }

  const worktree = await checks.worktree();
  if (!worktree.clean) throw new Error("Working tree must be clean.");
  if (worktree.detached) throw new Error("Detached HEAD is not allowed.");

  const localHeadCommit = checks.localHeadCommit ? await checks.localHeadCommit(DRAFT_PR_HEAD_BRANCH) : undefined;
  if (localHeadCommit !== request.headCommit) throw new Error("Local implementation head must resolve exactly to the approved commit.");

  const remote = await checks.remoteBranch(DRAFT_PR_HEAD_BRANCH);
  if (!remote.exists) throw new Error("Missing remote head branch.");
  if (remote.commit !== request.headCommit) throw new Error("Remote head branch must resolve exactly to the approved commit.");

  if (!checks.baseBranchCommit) throw new Error("Resolved remote base commit check is required.");
  const baseCommit = await checks.baseBranchCommit(DRAFT_PR_BASE_BRANCH);
  if (baseCommit !== request.baseCommit) throw new Error("Remote base branch must resolve exactly to the approved commit.");

  const diff = checks.headDiff ? await checks.headDiff(DRAFT_PR_BASE_BRANCH, DRAFT_PR_HEAD_BRANCH) : undefined;
  if (diff?.identicalCommits) throw new Error("Identical base and head commits are not allowed.");
  if (diff && !diff.ahead) throw new Error("Implementation head must be ahead of the base branch.");
  if (diff && !diff.diffNonEmpty) throw new Error("Draft PR diff between base and head must be non-empty.");

  return remote;
}

export async function createApprovedDraftPr(
  request: DraftPrBridgeRequest,
  approval: DraftPrApproval | undefined,
  checks: DraftPrChecks,
  adapter: DraftPrAdapter,
  now = Date.now(),
): Promise<DraftPrBridgeResult> {
  const records: DraftPrEvidence[] = [evidence("DRAFT_PR_REQUESTED", "CREATE_DRAFT_PR received; only Draft mode is permitted.")];
  if (!approval) throw new Error("A CREATE_DRAFT_PR approval is required.");

  await validate(request, approval, checks, now);
  records.push(evidence("APPROVED_FOR_DRAFT_PR_CREATION", "Rahul Kumar approval and exact issue, repository, branch, commit, scope, evidence, and idempotency bindings verified."));

  const existing = await adapter.findByIdempotencyKey(approval.idempotencyKey);
  if (existing) {
    if (!existing.draft) throw new Error("Existing pull request is not Draft.");
    if (
      existing.repository !== DRAFT_PR_REPOSITORY ||
      existing.baseBranch !== DRAFT_PR_BASE_BRANCH ||
      existing.headBranch !== DRAFT_PR_HEAD_BRANCH ||
      existing.headCommit !== request.headCommit ||
      existing.idempotencyKey !== approval.idempotencyKey
    ) {
      throw new Error("Existing pull request is incompatible with the approved Draft PR request.");
    }
    return {
      repository: DRAFT_PR_REPOSITORY,
      issueNumber: DRAFT_PR_ISSUE_NUMBER,
      baseBranch: DRAFT_PR_BASE_BRANCH,
      headBranch: DRAFT_PR_HEAD_BRANCH,
      baseCommit: request.baseCommit!,
      headCommit: request.headCommit!,
      prNumber: existing.number,
      prUrl: existing.url,
      newlyCreated: false,
      compatibleDraftPrReuse: true,
      idempotencyResult: "REUSED",
      evidence: [...records, evidence("DRAFT_PR_REUSED", "Compatible existing Draft PR reused idempotently.")],
      draft: true,
      mergeAllowed: false,
      productionDeployAllowed: false,
      branchDeleted: false,
      forcePushUsed: false,
      finalState: "DRAFT_PR_CREATED",
    };
  }

  const spec = exactDraftSpec(request);

  try {
    records.push(evidence("DRAFT_PR_CREATION_IN_PROGRESS", "Mock Draft PR adapter invoked."));
    const result = await adapter.createDraft({
      repository: DRAFT_PR_REPOSITORY,
      baseBranch: DRAFT_PR_BASE_BRANCH,
      headBranch: DRAFT_PR_HEAD_BRANCH,
      baseCommit: request.baseCommit!,
      headCommit: request.headCommit!,
      title: spec.title,
      body: spec.body,
      draft: true,
      idempotencyKey: approval.idempotencyKey,
    });

    if (result.uncertain) {
      return {
        repository: DRAFT_PR_REPOSITORY,
        issueNumber: DRAFT_PR_ISSUE_NUMBER,
        baseBranch: DRAFT_PR_BASE_BRANCH,
        headBranch: DRAFT_PR_HEAD_BRANCH,
        baseCommit: request.baseCommit!,
        headCommit: request.headCommit!,
        prNumber: result.number,
        prUrl: result.url,
        newlyCreated: false,
        compatibleDraftPrReuse: false,
        idempotencyResult: "RECONCILIATION_REQUIRED",
        evidence: [...records, evidence("DRAFT_PR_RECONCILIATION_REQUIRED", "Adapter outcome is uncertain; no retry was performed.")],
        draft: true,
        mergeAllowed: false,
        productionDeployAllowed: false,
        branchDeleted: false,
        forcePushUsed: false,
        finalState: "DRAFT_PR_RECONCILIATION_REQUIRED",
      };
    }

    if (!result.draft) throw new Error("Adapter returned a non-Draft PR.");

    return {
      repository: DRAFT_PR_REPOSITORY,
      issueNumber: DRAFT_PR_ISSUE_NUMBER,
      baseBranch: DRAFT_PR_BASE_BRANCH,
      headBranch: DRAFT_PR_HEAD_BRANCH,
      baseCommit: request.baseCommit!,
      headCommit: request.headCommit!,
      prNumber: result.number,
      prUrl: result.url,
      newlyCreated: true,
      compatibleDraftPrReuse: false,
      idempotencyResult: "CREATED",
      evidence: [...records, evidence("DRAFT_PR_CREATED", "Exact mock Draft PR created and left in Draft-only mode.")],
      draft: true,
      mergeAllowed: false,
      productionDeployAllowed: false,
      branchDeleted: false,
      forcePushUsed: false,
      finalState: "DRAFT_PR_CREATED",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Draft PR adapter failure.";
    const uncertain = /uncertain|timeout|timed out|unknown response|reconcil/i.test(detail);
    return {
      repository: DRAFT_PR_REPOSITORY,
      issueNumber: DRAFT_PR_ISSUE_NUMBER,
      baseBranch: DRAFT_PR_BASE_BRANCH,
      headBranch: DRAFT_PR_HEAD_BRANCH,
      baseCommit: request.baseCommit!,
      headCommit: request.headCommit!,
      newlyCreated: false,
      compatibleDraftPrReuse: false,
      idempotencyResult: uncertain ? "RECONCILIATION_REQUIRED" : "FAILED",
      evidence: [...records, evidence(uncertain ? "DRAFT_PR_RECONCILIATION_REQUIRED" : "DRAFT_PR_CREATION_FAILED_SAFE", uncertain ? "Adapter outcome is uncertain; no retry was performed." : "Adapter failure recorded; no retry was performed.")],
      draft: true,
      mergeAllowed: false,
      productionDeployAllowed: false,
      branchDeleted: false,
      forcePushUsed: false,
      finalState: uncertain ? "DRAFT_PR_RECONCILIATION_REQUIRED" : "DRAFT_PR_CREATION_FAILED_SAFE",
    };
  }
}
