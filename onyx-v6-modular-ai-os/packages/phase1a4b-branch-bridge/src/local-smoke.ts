import { writeFile } from "node:fs/promises";
import { createApprovedBranch, BRANCH_CAPABILITY, BRANCH_ISSUE_NUMBER, BRANCH_ISSUE_TITLE, BRANCH_REPOSITORY, PROPOSED_BRANCH, VALIDATED_PREDECESSOR_COMMIT, requestBranchApproval, type BranchBridgeRequest, type BranchBridgeResult, type BranchChecks, type LocalBranchAdapter } from "./index";
import { NodeLocalGitAdapter, type LocalGitOperations } from "./local-git-adapter";

export const LOCAL_CONFIRMATION = "APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE";
export const LOCAL_BRANCH = "feature/phase1a4b-isolated-branch-bridge";
export const LOCAL_TARGET_BRANCH = "automation/issue-7-phase1a4b-isolated-branch-smoke";
export const LOCAL_EVIDENCE_PATH = ".phase1a4b-local-smoke-evidence.json";

export interface LocalSmokePreflight {
  currentBranch: string;
  authenticated: boolean;
  actor: string;
  repository: string;
  worktreeClean: boolean;
  headDetached: boolean;
  issueNumber: number;
  issueState: "OPEN" | "CLOSED";
  issueTitle: string;
  baseCommit: string;
  targetBranchExists: boolean;
  targetBranchRemote: boolean;
}

export interface LocalSmokeEvidence {
  repository: string;
  issueNumber: number;
  capability: typeof BRANCH_CAPABILITY;
  scopeHash: string;
  idempotencyKey: string;
  approvalIssuedAt: string;
  approvalExpiry: string;
  baseBranch: string;
  baseCommit: string;
  targetBranch: string;
  firstResult: BranchBridgeResult;
  replayResult: BranchBridgeResult;
  newLocalBranchCount: number;
  idempotentReplayStatus: boolean;
  currentBranchUnchanged: boolean;
  remoteBranchPushed: false;
  draftPrCreated: false;
  mergeAllowed: false;
  productionDeployAllowed: false;
  completedAt: string;
}

export interface LocalSmokeOptions {
  env?: NodeJS.ProcessEnv;
  checksProvider?: () => Promise<BranchChecks>;
  localAdapter?: LocalBranchAdapter;
  git?: LocalGitOperations;
  preflight?: () => Promise<LocalSmokePreflight>;
  currentBranch?: () => string;
  isWorktreeClean?: () => boolean;
  isHeadDetached?: () => boolean;
  writeEvidence?: (evidence: LocalSmokeEvidence) => Promise<void>;
  now?: () => Date;
}

async function localPreflight(options: LocalSmokeOptions): Promise<LocalSmokePreflight> {
  if (options.preflight) return options.preflight();

  const git = options.git ?? new NodeLocalGitAdapter();
  const currentBranch = (options.currentBranch ?? (() => git.currentBranch()))();
  if (currentBranch !== LOCAL_BRANCH) throw new Error(`Current branch must be ${LOCAL_BRANCH}.`);

  const worktreeClean = (options.isWorktreeClean ?? (() => git.worktreeClean()))();
  if (!worktreeClean) throw new Error("Working tree must be clean.");

  const headDetached = (options.isHeadDetached ?? (() => git.headDetached()))();
  if (headDetached) throw new Error("HEAD must not be detached.");

  const session = git.checkGitHubSession();
  if (!session.authenticated) throw new Error("GitHub CLI authentication is required.");
  if (session.actor !== "coolscorpiorahul") throw new Error("Authenticated GitHub login must be coolscorpiorahul.");
  if (session.repository !== BRANCH_REPOSITORY) throw new Error(`Repository must be ${BRANCH_REPOSITORY}.`);
  if (session.issue.number !== BRANCH_ISSUE_NUMBER) throw new Error("Issue number must be 7.");
  if (session.issue.state !== "OPEN") throw new Error("Issue 7 must be OPEN.");
  if (session.issue.title !== BRANCH_ISSUE_TITLE) throw new Error("Issue title does not match the governed input.");

  const baseCommit = git.baseCommit("origin/feature/phase1a4a-github-issue-bridge");
  if (baseCommit !== VALIDATED_PREDECESSOR_COMMIT) throw new Error("Approved base reference must resolve to the validated predecessor commit.");

  const targetExists = git.localBranchExists(LOCAL_TARGET_BRANCH);
  const targetRemote = git.remoteBranchExists(LOCAL_TARGET_BRANCH);

  return {
    currentBranch,
    authenticated: session.authenticated,
    actor: session.actor,
    repository: session.repository,
    worktreeClean,
    headDetached,
    issueNumber: session.issue.number,
    issueState: session.issue.state,
    issueTitle: session.issue.title,
    baseCommit,
    targetBranchExists: targetExists,
    targetBranchRemote: targetRemote,
  };
}

function createMockChecks(preflight: LocalSmokePreflight): BranchChecks {
  return {
    actor: async () => preflight.actor,
    repository: async () => preflight.repository,
    issue: async () => ({ number: preflight.issueNumber, state: preflight.issueState, title: preflight.issueTitle }),
    worktree: async () => ({ clean: preflight.worktreeClean, detached: preflight.headDetached }),
    baseCommit: async (branch: string) => {
      if (branch === "feature/phase1a4a-github-issue-bridge") return preflight.baseCommit;
      return "";
    },
    branch: async (name: string) => {
      if (name === LOCAL_TARGET_BRANCH && preflight.targetBranchExists) return { exists: true, baseCommit: preflight.baseCommit };
      return { exists: false };
    },
  };
}

function createLocalGitAdapter(git: LocalGitOperations = new NodeLocalGitAdapter()): LocalBranchAdapter {
  return {
    create: async (request) => git.createLocalBranch(request.name, request.baseCommit),
  };
}

export async function runLocalSmoke(options: LocalSmokeOptions = {}): Promise<LocalSmokeEvidence> {
  const env = options.env ?? process.env;
  if (env.PHASE1A4B_LOCAL_CONFIRMATION !== LOCAL_CONFIRMATION) throw new Error(`Set PHASE1A4B_LOCAL_CONFIRMATION=${LOCAL_CONFIRMATION} to authorize exactly one local branch smoke test.`);

  const preflight = await localPreflight(options);
  if (preflight.targetBranchRemote) throw new Error("Target branch must not exist remotely.");

  const git = options.git ?? new NodeLocalGitAdapter();
  const checks = await (options.checksProvider?.() ?? Promise.resolve(createMockChecks(preflight)));
  const adapter = options.localAdapter ?? createLocalGitAdapter(git);

  const now = (options.now ?? (() => new Date()))();
  const request: BranchBridgeRequest = {
    run: {
      runId: `phase1a4b-local-smoke-${now.getTime()}`,
      state: "DRY_RUN_READY",
      scopeHash: "local-smoke-scope",
      repository: BRANCH_REPOSITORY,
      branchCreated: false,
      draftPrCreated: false,
      mergeAllowed: false,
      productionDeployAllowed: false,
    },
    reason: "Approve the exact single local branch Phase 1A.4B smoke test.",
    baseCommit: VALIDATED_PREDECESSOR_COMMIT,
    expiresAt: new Date(now.getTime() + 600000).toISOString(),
  };

  const approval = requestBranchApproval(request, now);

  const currentBranchBefore = git.currentBranch();
  const firstResult = await createApprovedBranch(request, approval, checks, adapter, now.getTime());

  if (firstResult.finalState === "BRANCH_RECONCILIATION_REQUIRED" || firstResult.finalState === "BRANCH_CREATION_FAILED_SAFE") {
    throw new Error(`Local smoke stopped without retry: ${firstResult.finalState}.`);
  }

  if (firstResult.finalState !== "BRANCH_READY_LOCAL" || !firstResult.newlyCreated) {
    throw new Error("First local smoke result did not create the local branch.");
  }

  const currentBranchAfterFirst = git.currentBranch();
  if (currentBranchAfterFirst !== currentBranchBefore) throw new Error("Current branch was changed by first invocation.");

  const replayResult = await createApprovedBranch(request, approval, checks, adapter, now.getTime());

  if (replayResult.finalState !== "BRANCH_READY_LOCAL" || replayResult.newlyCreated || !replayResult.compatibleBranchReused) {
    throw new Error("Local smoke replay did not reuse the first branch result.");
  }

  const currentBranchAfterReplay = git.currentBranch();
  if (currentBranchAfterReplay !== currentBranchBefore) throw new Error("Current branch was changed by replay invocation.");

  if (!git.localBranchExists(LOCAL_TARGET_BRANCH)) {
    throw new Error("Target branch does not exist after successful creation.");
  }

  if (git.remoteBranchExists(LOCAL_TARGET_BRANCH)) {
    throw new Error("Target branch must not be pushed remotely.");
  }

  const evidence: LocalSmokeEvidence = {
    repository: BRANCH_REPOSITORY,
    issueNumber: BRANCH_ISSUE_NUMBER,
    capability: BRANCH_CAPABILITY,
    scopeHash: request.run.scopeHash,
    idempotencyKey: approval.idempotencyKey,
    approvalIssuedAt: approval.approvedAt,
    approvalExpiry: approval.expiresAt ?? "",
    baseBranch: firstResult.baseBranch,
    baseCommit: firstResult.baseCommit,
    targetBranch: firstResult.branchName,
    firstResult,
    replayResult,
    newLocalBranchCount: 1,
    idempotentReplayStatus: replayResult.compatibleBranchReused,
    currentBranchUnchanged: currentBranchAfterReplay === currentBranchBefore,
    remoteBranchPushed: false,
    draftPrCreated: false,
    mergeAllowed: false,
    productionDeployAllowed: false,
    completedAt: new Date().toISOString(),
  };

  await (options.writeEvidence ?? (value => writeFile(LOCAL_EVIDENCE_PATH, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 })))(evidence);
  return evidence;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLocalSmoke()
    .then(evidence => {
      console.log(
        JSON.stringify(
          {
            repository: evidence.repository,
            issueNumber: evidence.issueNumber,
            targetBranch: evidence.targetBranch,
            newLocalBranchCount: evidence.newLocalBranchCount,
            idempotentReplayStatus: evidence.idempotentReplayStatus,
            currentBranchUnchanged: evidence.currentBranchUnchanged,
            remoteBranchPushed: false,
            evidence: LOCAL_EVIDENCE_PATH,
          },
          null,
          2
        )
      );
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
