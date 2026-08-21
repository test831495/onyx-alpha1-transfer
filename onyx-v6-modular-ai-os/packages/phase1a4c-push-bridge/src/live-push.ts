import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PUSH_BRANCH, PUSH_CAPABILITY, PUSH_COMMIT, PUSH_REMOTE, PUSH_REPOSITORY, PUSH_ISSUE_NUMBER, requestPushApproval, pushApprovedIsolatedBranch, type PushApproval, type PushBridgeRequest, type PushBridgeResult, type PushChecks, type PushAdapter } from "./index";
import { GitPushAdapter } from "./git-push-adapter";

export const LIVE_CONFIRMATION = "APPROVE_PHASE1A4C_SINGLE_BRANCH_PUSH";
export const IMPLEMENTATION_BRANCH = "feature/phase1a4c-isolated-branch-push-bridge";
export const PUSH_REASON = "Approve the exact single Phase 1A4C isolated branch push.";
export const LIVE_EVIDENCE_PATH = ".phase1a4c-live-push-evidence.json";

export interface LivePushEvidence { repository: string; issueNumber: number; capability: typeof PUSH_CAPABILITY; scopeHash: string; idempotencyKey: string; approvalIssuedAt: string; approvalExpiry: string; remote: typeof PUSH_REMOTE; localBranch: typeof PUSH_BRANCH; remoteBranch: typeof PUSH_BRANCH; approvedCommit: typeof PUSH_COMMIT; firstResult: PushBridgeResult; replayResult: PushBridgeResult; newRemoteBranchCount: 0 | 1; idempotentReplayStatus: boolean; forcePushUsed: false; branchDeleted: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; completedAt: string; }
export interface LivePushOptions { env?: NodeJS.ProcessEnv; repositoryRoot?: string; checks?: PushChecks & { implementationBranch?: () => Promise<string> | string; remoteRepository?: () => Promise<string> | string; githubAuthenticated?: () => Promise<boolean> | boolean }; adapter?: PushAdapter; now?: () => Date; writeEvidence?: (path: string, value: LivePushEvidence) => Promise<void>; }

function fixedRequest(runId: string): PushBridgeRequest { return { run: { runId, state: "DRY_RUN_READY", scopeHash: "live-push-scope", repository: PUSH_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false }, reason: PUSH_REASON, localCommit: PUSH_COMMIT, remote: PUSH_REMOTE, remoteBranch: PUSH_BRANCH, refspec: `${PUSH_BRANCH}:${PUSH_BRANCH}` }; }
function requireEqual(actual: string, expected: string, label: string): void { if (actual !== expected) throw new Error(`${label} must be ${expected}.`); }

async function preflight(options: LivePushOptions, checks: LivePushOptions["checks"]): Promise<void> {
  if (!checks) throw new Error("Live push checks are required.");
  if (checks.githubAuthenticated && !(await checks.githubAuthenticated())) throw new Error("GitHub CLI authentication is required.");
  const implementationBranch = checks.implementationBranch ? await checks.implementationBranch() : await checks.currentBranch();
  requireEqual(implementationBranch, IMPLEMENTATION_BRANCH, "Current implementation branch");
  const worktree = await checks.worktree();
  if (!worktree.clean) throw new Error("Working tree must be clean.");
  if (worktree.detached) throw new Error("Detached HEAD is not allowed.");
  requireEqual(await checks.actor(), "coolscorpiorahul", "Authenticated GitHub actor");
  requireEqual(await checks.repository(), PUSH_REPOSITORY, "Repository");
  if (checks.remoteRepository) requireEqual(await checks.remoteRepository(), PUSH_REPOSITORY, "Remote repository");
  const local = await checks.localBranch(PUSH_BRANCH);
  if (!local.exists) throw new Error("Approved local branch is missing.");
  requireEqual(local.commit ?? "", PUSH_COMMIT, "Local branch commit");
  const issue = await checks.issue();
  if (issue.number !== PUSH_ISSUE_NUMBER || issue.state !== "OPEN" || issue.title !== "Phase 1A.4A Live Smoke Test") throw new Error("Issue 7 must be OPEN with the governed title.");
}

export async function runLivePush(options: LivePushOptions = {}): Promise<LivePushEvidence> {
  if ((options.env ?? process.env).PHASE1A4C_LIVE_CONFIRMATION !== LIVE_CONFIRMATION) throw new Error(`Set PHASE1A4C_LIVE_CONFIRMATION=${LIVE_CONFIRMATION} to authorize the live push.`);
  const adapter = options.adapter ?? new GitPushAdapter();
  const checks = options.checks ?? (adapter as GitPushAdapter);
  await preflight(options, checks);
  const now = (options.now ?? (() => new Date()))();
  const request = fixedRequest(`phase1a4c-live-push-${now.getTime()}`);
  const approval = requestPushApproval(request, now);
  const firstResult = await pushApprovedIsolatedBranch(request, approval, checks, adapter, now.getTime());
  if (firstResult.finalState !== "BRANCH_PUSHED_REMOTE" || !firstResult.newlyPushed || firstResult.remoteCommit !== PUSH_COMMIT) throw new Error(`Live push stopped after first result: ${firstResult.finalState}.`);
  const replayResult = await pushApprovedIsolatedBranch(request, approval, checks, adapter, now.getTime());
  if (replayResult.finalState !== "BRANCH_PUSHED_REMOTE" || replayResult.newlyPushed || !replayResult.compatibleRemoteReuse || replayResult.idempotencyResult !== "REUSED" || replayResult.remoteCommit !== PUSH_COMMIT) throw new Error("Live push replay did not reuse the approved remote branch.");
  const evidence: LivePushEvidence = { repository: PUSH_REPOSITORY, issueNumber: PUSH_ISSUE_NUMBER, capability: PUSH_CAPABILITY, scopeHash: approval.scopeHash, idempotencyKey: approval.idempotencyKey, approvalIssuedAt: approval.approvedAt, approvalExpiry: approval.expiresAt ?? "", remote: PUSH_REMOTE, localBranch: PUSH_BRANCH, remoteBranch: PUSH_BRANCH, approvedCommit: PUSH_COMMIT, firstResult, replayResult, newRemoteBranchCount: 1, idempotentReplayStatus: true, forcePushUsed: false, branchDeleted: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, completedAt: new Date().toISOString() };
  const evidencePath = resolve(options.repositoryRoot ?? process.cwd(), LIVE_EVIDENCE_PATH);
  await (options.writeEvidence ?? (async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 })))(evidencePath, evidence);
  return evidence;
}

if (process.argv[1]?.endsWith("live-push.ts")) runLivePush().then(value => console.log(JSON.stringify({ finalState: value.replayResult.finalState, evidence: LIVE_EVIDENCE_PATH }, null, 2))).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
