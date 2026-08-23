import { spawnSync } from "node:child_process";

export const APPROVED_BRANCH_REPO = "test831495/onyx-alpha1-transfer" as const;
export const APPROVED_CURRENT_BRANCH = "feature/phase1a4b-isolated-branch-bridge" as const;
export const APPROVED_TARGET_BRANCH = "automation/issue-7-phase1a4b-isolated-branch-smoke" as const;
export const APPROVED_BASE_BRANCH = "feature/phase1a4a-github-issue-bridge" as const;
export const APPROVED_BASE_REF = `origin/${APPROVED_BASE_BRANCH}` as const;
export const APPROVED_BASE_COMMIT = "712f3546529f6eff8c37f480c0db61cad56f1b6c" as const;

export interface LocalGitOperations {
  currentBranch(): string;
  worktreeClean(): boolean;
  headDetached(): boolean;
  baseCommit(ref: string): string;
  localBranchExists(name: string): boolean;
  remoteBranchExists(name: string): boolean;
  createLocalBranch(name: string, baseCommit: string): { created: boolean; reused: boolean; uncertain?: boolean };
  checkGitHubSession(): { authenticated: boolean; actor: string; repository: string; issue: { number: number; state: "OPEN" | "CLOSED"; title: string } };
}

function ensureExact(value: string, expected: string, label: string): string {
  if (value !== expected) {
    throw new Error(`${label} must be ${expected}.`);
  }
  return value;
}

function runGitResult(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("git", [...args], { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runGitHubResult(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("gh", [...args], { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export class NodeLocalGitAdapter implements LocalGitOperations {
  currentBranch(): string {
    const result = runGitResult(["branch", "--show-current"]);
    return result.status === 0 ? result.stdout.trim() : "";
  }

  worktreeClean(): boolean {
    const result = runGitResult(["status", "--porcelain"]);
    return result.status === 0 && result.stdout.trim() === "";
  }

  headDetached(): boolean {
    const result = runGitResult(["symbolic-ref", "-q", "HEAD"]);
    return result.status !== 0;
  }

  baseCommit(ref: string): string {
    ensureExact(ref, APPROVED_BASE_REF, "Base reference");
    const result = runGitResult(["rev-parse", "--verify", ref]);
    if (result.status !== 0) {
      throw new Error(`Base reference ${ref} is not available.`);
    }
    return result.stdout.trim();
  }

  localBranchExists(name: string): boolean {
    ensureExact(name, APPROVED_TARGET_BRANCH, "Target branch");
    const result = runGitResult(["show-ref", "--verify", `refs/heads/${name}`]);
    return result.status === 0;
  }

  remoteBranchExists(name: string): boolean {
    ensureExact(name, APPROVED_TARGET_BRANCH, "Target branch");
    const result = runGitResult(["ls-remote", "--heads", "origin", name]);
    return result.status === 0 && result.stdout.trim().length > 0;
  }

  createLocalBranch(name: string, baseCommit: string): { created: boolean; reused: boolean; uncertain?: boolean } {
    const targetName = ensureExact(name, APPROVED_TARGET_BRANCH, "Target branch");
    const approvedCommit = ensureExact(baseCommit, APPROVED_BASE_COMMIT, "Base commit");
    if (this.localBranchExists(targetName)) {
      const existing = this.runLocalBranchCommit(targetName);
      if (existing === approvedCommit) {
        return { created: false, reused: true };
      }
      throw new Error("Existing branch does not point to the approved base commit.");
    }

    const result = runGitResult(["branch", targetName, approvedCommit]);
    if (result.status !== 0) {
      throw new Error(`Local branch creation failed for ${targetName}.`);
    }
    return { created: true, reused: false };
  }

  private runLocalBranchCommit(name: string): string {
    const result = runGitResult(["rev-parse", name]);
    return result.status === 0 ? result.stdout.trim() : "";
  }

  checkGitHubSession(): { authenticated: boolean; actor: string; repository: string; issue: { number: number; state: "OPEN" | "CLOSED"; title: string } } {
    const auth = runGitHubResult(["auth", "status", "--hostname", "github.com"]);
    const login = (auth.stdout + "\n" + auth.stderr).match(/Logged in to github\.com account ([A-Za-z0-9-]+)/i)?.[1] ?? "";
    if (auth.status !== 0 || !login) {
      return { authenticated: false, actor: "", repository: "", issue: { number: 0, state: "CLOSED", title: "" } };
    }

    const repo = runGitHubResult(["repo", "view", APPROVED_BRANCH_REPO, "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
    const issueResult = runGitHubResult(["issue", "view", "7", "--json", "number,state,title", "--jq", "."]);
    let issue: { number: number; state: "OPEN" | "CLOSED"; title: string };
    try {
      issue = JSON.parse(issueResult.stdout);
    } catch {
      issue = { number: 0, state: "CLOSED", title: "" };
    }
    return {
      authenticated: auth.status === 0,
      actor: login,
      repository: repo.stdout.trim(),
      issue,
    };
  }
}
