import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DRAFT_PR_BASE_BRANCH,
  DRAFT_PR_CAPABILITY,
  DRAFT_PR_HEAD_BRANCH,
  DRAFT_PR_HEAD_COMMIT,
  DRAFT_PR_ISSUE_NUMBER,
  DRAFT_PR_REPOSITORY,
  DRAFT_PR_TITLE,
  createApprovedDraftPr,
  requestDraftPrApproval,
  type DraftPrApproval,
  type DraftPrBridgeRequest,
  type DraftPrChecks,
  type DraftPrBridgeResult,
} from "./index";
import { GitHubDraftPrAdapter } from "./github-draft-pr-adapter";

export const LIVE_CONFIRMATION = "APPROVE_PHASE1A4D_SINGLE_DRAFT_PR" as const;
export const IMPLEMENTATION_BRANCH = "feature/phase1a4d-draft-pr-bridge" as const;
export const LIVE_REASON = "Approve the exact single Phase 1A.4D Draft PR creation." as const;
export const LIVE_EVIDENCE_PATH = ".phase1a4d-live-draft-pr-evidence.json" as const;

export interface LiveDraftPrEvidence {
  repository: string;
  issueNumber: number;
  capability: typeof DRAFT_PR_CAPABILITY;
  scopeHash: string;
  evidenceDigest: string;
  idempotencyKey: string;
  approvalIssuedAt: string;
  approvalExpiry: string;
  baseBranch: string;
  headBranch: string;
  headCommit: string;
  draftPrTitle: string;
  firstResult: DraftPrBridgeResult;
  replayResult: DraftPrBridgeResult;
  draftPrNumber?: number;
  draftPrUrl?: string;
  newDraftPrCount: number;
  idempotentReplayStatus: boolean;
  draft: true;
  mergeAllowed: false;
  productionDeployAllowed: false;
  branchDeleted: false;
  forcePushUsed: false;
  completedAt: string;
}

export interface LiveDraftPrOptions {
  env?: NodeJS.ProcessEnv;
  repositoryRoot?: string;
  checks?: DraftPrChecks & { implementationBranch?: () => Promise<string> | string; githubAuthenticated?: () => Promise<boolean> | boolean };
  adapter?: {
    findByIdempotencyKey: (key: string) => Promise<{ number: number; url: string; draft: boolean; repository?: string; baseBranch?: string; headBranch?: string; headCommit?: string; idempotencyKey?: string } | null>;
    createDraft: (input: {
      repository: string;
      baseBranch: string;
      headBranch: string;
      headCommit: string;
      title: string;
      body: string;
      draft: true;
      idempotencyKey: string;
    }) => Promise<{ number: number; url: string; draft: boolean; uncertain?: boolean }>;
    findByRepositoryBaseHead?: (repository: string, baseBranch: string, headBranch: string) => Promise<{ number: number; url: string; draft: boolean; repository: string; baseBranch: string; headBranch: string; headCommit: string; idempotencyKey: string } | null>;
  };
  now?: () => Date;
  writeEvidence?: (path: string, value: LiveDraftPrEvidence) => Promise<void>;
}

function fixedRequest(now: Date): DraftPrBridgeRequest {
  const body = `## Purpose
Create exactly one Draft PR for Issue 7 after exact governance checks and approval.

## Issue 7
- Issue: #7
- Title: Phase 1A.4A Live Smoke Test

## Exact scope hash
- Scope hash: ${DRAFT_PR_CAPABILITY}:${DRAFT_PR_REPOSITORY}:${DRAFT_PR_ISSUE_NUMBER}:${DRAFT_PR_BASE_BRANCH}:${DRAFT_PR_HEAD_BRANCH}:${DRAFT_PR_HEAD_COMMIT}

## Exact evidence digest
- Evidence digest: sha256:phase1a4d-live-draft-pr-evidence

## Base branch
- ${DRAFT_PR_BASE_BRANCH}

## Head branch
- ${DRAFT_PR_HEAD_BRANCH}

## Head commit
- ${DRAFT_PR_HEAD_COMMIT}

## Validation evidence
- Implementation branch: ${IMPLEMENTATION_BRANCH}
- Approved by: Rahul Kumar
- Time window: ${now.toISOString()}

## Security impact
- No secret or credential material is included.
- Only the exact Draft PR operation is permitted.

## Cost impact
- No production deployment or Merge action is allowed.

## Provider impact
- GitHub automation is used only for the bounded Draft PR creation flow.

## Known limitations
- This runner is intentionally limited to one mock or live Draft PR and uses deterministic replay checks.
- Merge, promotion, and branch mutation remain blocked.

## Rollback instructions
1. Stop before adapter invocation if any preflight validation fails.
2. Keep the Issue and branch state unchanged.
3. Preserve the evidence file for audit review.

## Reviewer checklist
- [ ] Issue 7 remains OPEN and unchanged.
- [ ] The exact repository, base branch, head branch, and head commit are preserved.
- [ ] The approval is exact-scope and within its expiry window.
- [ ] The Draft PR state remains true and merge is blocked.
- [ ] No tokens, credentials, or secrets are exposed.

## Governance boundaries
This runner is strictly limited to the exact Draft PR creation capability. Merge, promotion, force push, branch deletion, and deployment remain prohibited.`;

  return {
    run: {
      runId: `phase1a4d-live-draft-pr-${now.getTime()}`,
      state: "DRY_RUN_READY",
      scopeHash: `${DRAFT_PR_CAPABILITY}:${DRAFT_PR_REPOSITORY}:${DRAFT_PR_ISSUE_NUMBER}:${DRAFT_PR_BASE_BRANCH}:${DRAFT_PR_HEAD_BRANCH}:${DRAFT_PR_HEAD_COMMIT}`,
      repository: DRAFT_PR_REPOSITORY,
      branchCreated: false,
      draftPrCreated: false,
      mergeAllowed: false,
      productionDeployAllowed: false,
    },
    reason: LIVE_REASON,
    evidenceDigest: "sha256:phase1a4d-live-draft-pr-evidence",
    title: "Phase 1A.4D Live Draft PR Smoke Test",
    body,
    draft: true,
  };
}

function requireEqual(actual: string, expected: string, label: string): void {
  if (actual !== expected) throw new Error(`${label} must be ${expected}.`);
}

async function preflight(options: LiveDraftPrOptions, checks: DraftPrChecks & { implementationBranch?: () => Promise<string> | string; githubAuthenticated?: () => Promise<boolean> | boolean; repository?: () => Promise<string> | string; actor?: () => Promise<string> | string; issue?: () => Promise<{ number: number; state: "OPEN" | "CLOSED"; title: string }>; worktree?: () => Promise<{ clean: boolean; detached: boolean }>; remoteBranch?: (branch: string) => Promise<{ exists: boolean; commit?: string }>; }): Promise<void> {
  if (!checks) throw new Error("Live Draft PR checks are required.");
  if (checks.githubAuthenticated && !(await checks.githubAuthenticated())) throw new Error("GitHub CLI authentication is required.");
  const implementationBranch = checks.implementationBranch ? await checks.implementationBranch() : "";
  requireEqual(implementationBranch, IMPLEMENTATION_BRANCH, "Current implementation branch");
  const worktree = await checks.worktree();
  if (!worktree.clean) throw new Error("Working tree must be clean.");
  if (worktree.detached) throw new Error("Detached HEAD is not allowed.");
  requireEqual(await checks.actor(), "coolscorpiorahul", "Authenticated GitHub actor");
  requireEqual(await checks.repository(), DRAFT_PR_REPOSITORY, "Repository");
  const issue = await checks.issue();
  if (issue.number !== DRAFT_PR_ISSUE_NUMBER || issue.state !== "OPEN" || issue.title !== "Phase 1A.4A Live Smoke Test") {
    throw new Error("Issue 7 must be OPEN with the governed title.");
  }
  const remote = await checks.remoteBranch(DRAFT_PR_HEAD_BRANCH);
  if (!remote.exists) throw new Error("Missing remote head branch.");
  if (remote.commit !== DRAFT_PR_HEAD_COMMIT) throw new Error("Remote head branch must resolve exactly to the approved commit.");
  if (String(DRAFT_PR_BASE_BRANCH) === String(DRAFT_PR_HEAD_BRANCH)) throw new Error("Identical base and head branches are not allowed.");
}

export async function runLiveDraftPr(options: LiveDraftPrOptions = {}): Promise<LiveDraftPrEvidence> {
  const env = options.env ?? process.env;
  if (env.PHASE1A4D_LIVE_CONFIRMATION !== LIVE_CONFIRMATION) {
    throw new Error(`Set PHASE1A4D_LIVE_CONFIRMATION=${LIVE_CONFIRMATION} to authorize the exact single Draft PR creation.`);
  }

  const adapter = options.adapter ?? new GitHubDraftPrAdapter();
  const checks = options.checks ?? (adapter as unknown as DraftPrChecks & { implementationBranch?: () => Promise<string> | string; githubAuthenticated?: () => Promise<boolean> | boolean });
  await preflight(options, checks);

  const existing = ("findByRepositoryBaseHead" in adapter && typeof adapter.findByRepositoryBaseHead === "function")
    ? await adapter.findByRepositoryBaseHead(DRAFT_PR_REPOSITORY, DRAFT_PR_BASE_BRANCH, DRAFT_PR_HEAD_BRANCH)
    : null;
  if (existing && (!existing.draft || existing.repository !== DRAFT_PR_REPOSITORY || existing.baseBranch !== DRAFT_PR_BASE_BRANCH || existing.headBranch !== DRAFT_PR_HEAD_BRANCH)) {
    throw new Error("Existing pull request is incompatible with the approved Draft PR request.");
  }

  const now = (options.now ?? (() => new Date()))();
  const request = fixedRequest(now);
  const approval = requestDraftPrApproval(request, now);
  const firstResult = await createApprovedDraftPr(request, approval, checks, adapter, now.getTime());
  if (firstResult.finalState !== "DRAFT_PR_CREATED" || !firstResult.newlyCreated || !firstResult.prNumber || !firstResult.prUrl || firstResult.draft !== true) {
    throw new Error(`Live Draft PR stopped after first result: ${firstResult.finalState}.`);
  }

  const replayResult = await createApprovedDraftPr(request, approval, checks, adapter, now.getTime());
  if (replayResult.finalState !== "DRAFT_PR_CREATED" || replayResult.newlyCreated || !replayResult.compatibleDraftPrReuse || replayResult.idempotencyResult !== "REUSED" || replayResult.prNumber !== firstResult.prNumber || replayResult.prUrl !== firstResult.prUrl) {
    throw new Error("Live Draft PR replay did not reuse the original result.");
  }

  const evidence: LiveDraftPrEvidence = {
    repository: DRAFT_PR_REPOSITORY,
    issueNumber: DRAFT_PR_ISSUE_NUMBER,
    capability: DRAFT_PR_CAPABILITY,
    scopeHash: approval.scopeHash,
    evidenceDigest: approval.evidenceDigest,
    idempotencyKey: approval.idempotencyKey,
    approvalIssuedAt: approval.approvedAt,
    approvalExpiry: approval.expiresAt,
    baseBranch: DRAFT_PR_BASE_BRANCH,
    headBranch: DRAFT_PR_HEAD_BRANCH,
    headCommit: DRAFT_PR_HEAD_COMMIT,
    draftPrTitle: request.title ?? "Phase 1A.4D Live Draft PR Smoke Test",
    firstResult,
    replayResult,
    draftPrNumber: firstResult.prNumber,
    draftPrUrl: firstResult.prUrl,
    newDraftPrCount: 1,
    idempotentReplayStatus: true,
    draft: true,
    mergeAllowed: false,
    productionDeployAllowed: false,
    branchDeleted: false,
    forcePushUsed: false,
    completedAt: new Date().toISOString(),
  };

  const evidencePath = resolve(options.repositoryRoot ?? process.cwd(), LIVE_EVIDENCE_PATH);
  await (options.writeEvidence ?? (async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 })))(evidencePath, evidence);
  return evidence;
}

if (process.argv[1]?.endsWith("live-draft-pr.ts")) {
  runLiveDraftPr().then(value => {
    console.log(JSON.stringify({ finalState: value.replayResult.finalState, draftPrUrl: value.draftPrUrl, evidence: LIVE_EVIDENCE_PATH }, null, 2));
  }).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
