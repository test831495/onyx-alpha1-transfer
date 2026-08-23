import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { GitHubApprovalGatedWriteAdapter, GhWriteCommandRunner, InMemoryIdempotencyStore, type WriteCommandRunner } from "@onyx/github-automation";
import { createApprovedIssue, ISSUE_CAPABILITY, ISSUE_REPOSITORY, issueScopeHash, requestIssueApproval, type IssueBridgeRequest, type IssueBridgeResult } from "./index";

export const LIVE_CONFIRMATION = "APPROVE_PHASE1A4A_SINGLE_ISSUE_SMOKE";
export const LIVE_BRANCH = "feature/phase1a4a-github-issue-bridge";
export const LIVE_TITLE = "Phase 1A.4A Live Smoke Test";
export const LIVE_EVIDENCE_PATH = ".phase1a4a-live-smoke-evidence.json";
export const LIVE_BODY = `Purpose:
Validate approval-gated GitHub issue creation through the Phase 1A.4A bridge.

Scope:
Create exactly one GitHub issue and replay the same request to verify
idempotency.

Expected results:
One issue is created.
Issue number and URL are captured.
The replay returns the existing result.
No duplicate issue is created.
Evidence is written locally.

Governance:
No branch creation.
No branch push.
No Draft PR.
No merge.
No production deployment.
No Netlify update.
No secret change.
No permission change.
No branch-protection change.
No force push.
No destructive Git operation.`;

export interface LiveSmokeOptions {
  env?: NodeJS.ProcessEnv;
  commandRunner?: WriteCommandRunner;
  preflight?: () => Promise<LiveSmokePreflight>;
  currentBranch?: () => string;
  isWorktreeClean?: () => boolean;
  writeEvidence?: (evidence: LiveSmokeEvidence) => Promise<void>;
  now?: () => Date;
}

export interface LiveSmokePreflight {
  branch: string;
  authenticated: boolean;
  actor: string;
  repository: string;
  worktreeClean: boolean;
}

export interface LiveSmokeEvidence {
  repository: string;
  capability: typeof ISSUE_CAPABILITY;
  scopeHash: string;
  idempotencyKey: string;
  approvalIssuedAt: string;
  approvalExpiry: string;
  firstResult: IssueBridgeResult;
  replayResult: IssueBridgeResult;
  issueNumber?: number;
  issueUrl?: string;
  newIssueCount: number;
  idempotentReplayStatus: boolean;
  branchCreated: false;
  branchPushed: false;
  draftPrCreated: false;
  mergeAllowed: false;
  productionDeployAllowed: false;
  completedAt: string;
}

function fixedRequest(now: Date): IssueBridgeRequest {
  const scopeHash = issueScopeHash(LIVE_TITLE, LIVE_BODY);
  return {
    run: { runId: `phase1a4a-live-smoke-${scopeHash.slice(0, 12)}`, state: "DRY_RUN_READY", scopeHash, repository: ISSUE_REPOSITORY, branchCreated: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false },
    title: LIVE_TITLE,
    body: LIVE_BODY,
    reason: "Approve the exact single-issue Phase 1A.4A live smoke test.",
    expiresAt: new Date(now.getTime() + 600000).toISOString(),
  };
}

function gitValue(args: string[]): string { return execFileSync("git", args, { encoding: "utf8" }).trim(); }

async function livePreflight(options: LiveSmokeOptions, runner: WriteCommandRunner): Promise<LiveSmokePreflight> {
  if (options.preflight) return options.preflight();
  const branch = (options.currentBranch ?? (() => gitValue(["branch", "--show-current"])))();
  if (branch !== LIVE_BRANCH) throw new Error(`Current branch must be ${LIVE_BRANCH}.`);
  const worktreeClean = (options.isWorktreeClean ?? (() => gitValue(["status", "--porcelain"]) === ""))();
  if (!worktreeClean) throw new Error("Working tree must be clean.");
  const auth = await runner.run(["auth", "status", "--hostname", "github.com"]);
  const login = (auth.stdout + "\n" + auth.stderr).match(/Logged in to github\.com account ([A-Za-z0-9-]+)/i)?.[1] ?? "";
  const repository = await runner.run(["repo", "view", ISSUE_REPOSITORY, "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  return {
    branch,
    authenticated: auth.exitCode === 0,
    actor: login,
    repository: repository.stdout.trim(),
    worktreeClean,
  };
}

export async function runLiveSmoke(options: LiveSmokeOptions = {}): Promise<LiveSmokeEvidence> {
  const env = options.env ?? process.env;
  if (env.PHASE1A4A_LIVE_CONFIRMATION !== LIVE_CONFIRMATION) throw new Error(`Set PHASE1A4A_LIVE_CONFIRMATION=${LIVE_CONFIRMATION} to authorize exactly one live issue smoke test.`);
  const runner = options.commandRunner ?? new GhWriteCommandRunner();
  const preflight = await livePreflight(options, runner);
  if (preflight.branch !== LIVE_BRANCH) throw new Error(`Current branch must be ${LIVE_BRANCH}.`);
  if (!preflight.worktreeClean) throw new Error("Working tree must be clean.");
  if (!preflight.authenticated) throw new Error("GitHub CLI authentication is required.");
  if (preflight.actor !== "coolscorpiorahul") throw new Error("Authenticated GitHub login must be coolscorpiorahul.");
  if (preflight.repository !== ISSUE_REPOSITORY) throw new Error(`Repository must be ${ISSUE_REPOSITORY}.`);

  const now = (options.now ?? (() => new Date()))();
  const request = fixedRequest(now);
  const approval = requestIssueApproval(request, now);
  const adapter = new GitHubApprovalGatedWriteAdapter(runner, new InMemoryIdempotencyStore());
  const firstResult = await createApprovedIssue(request, approval, adapter, now.getTime());
  if (firstResult.finalState === "ISSUE_RECONCILIATION_REQUIRED" || firstResult.finalState === "ISSUE_CREATION_FAILED_SAFE") throw new Error(`Live smoke stopped without retry: ${firstResult.finalState}.`);
  if (firstResult.finalState !== "ISSUE_CREATED" || !firstResult.newIssueCreated || !firstResult.issueUrl || firstResult.issueNumber === undefined) throw new Error("First live smoke result did not create one issue with a number and URL.");
  const replayResult = await createApprovedIssue(request, approval, adapter, now.getTime());
  if (replayResult.finalState !== "ISSUE_CREATED" || replayResult.newIssueCreated || !replayResult.idempotentlyReused || replayResult.issueUrl !== firstResult.issueUrl || replayResult.issueNumber !== firstResult.issueNumber) throw new Error("Live smoke replay did not reuse the first issue result.");

  const evidence: LiveSmokeEvidence = { repository: ISSUE_REPOSITORY, capability: ISSUE_CAPABILITY, scopeHash: request.run.scopeHash, idempotencyKey: approval.idempotencyKey, approvalIssuedAt: approval.approvedAt, approvalExpiry: approval.expiresAt ?? "", firstResult, replayResult, issueNumber: firstResult.issueNumber, issueUrl: firstResult.issueUrl, newIssueCount: 1, idempotentReplayStatus: replayResult.idempotentlyReused, branchCreated: false, branchPushed: false, draftPrCreated: false, mergeAllowed: false, productionDeployAllowed: false, completedAt: new Date().toISOString() };
  await (options.writeEvidence ?? (value => writeFile(LIVE_EVIDENCE_PATH, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 })))(evidence);
  return evidence;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveSmoke().then(evidence => { console.log(JSON.stringify({ repository: evidence.repository, issueNumber: evidence.issueNumber, issueUrl: evidence.issueUrl, newIssueCount: evidence.newIssueCount, idempotentReplayStatus: evidence.idempotentReplayStatus, evidence: LIVE_EVIDENCE_PATH }, null, 2)); }).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}