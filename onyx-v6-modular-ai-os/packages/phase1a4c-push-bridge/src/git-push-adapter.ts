import { spawn } from "node:child_process";
import type { PushAdapter, PushChecks } from "./index";
import { PUSH_BRANCH, PUSH_COMMIT, PUSH_REPOSITORY, PUSH_REMOTE } from "./index";

export interface PushIssue { number: number; state: "OPEN" | "CLOSED"; title: string; }

export interface CommandResult { stdout: string; stderr: string; exitCode: number; }
export type CommandRunner = (executable: "git" | "gh", args: readonly string[]) => Promise<CommandResult>;

const defaultRunner: CommandRunner = (executable, args) => new Promise((resolve, reject) => {
  const child = spawn(executable, [...args], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += String(chunk); });
  child.stderr.on("data", chunk => { stderr += String(chunk); });
  child.on("error", reject);
  child.on("close", code => resolve({ stdout, stderr, exitCode: code ?? 1 }));
});

function requireSuccess(result: CommandResult, operation: string): string {
  if (result.exitCode !== 0) throw new Error(result.stderr.trim() || `${operation} failed.`);
  return result.stdout.trim();
}
function requireFixed(value: string, expected: string, label: string): void {
  if (value !== expected) throw new Error(`${label} must be ${expected}.`);
}

export class GitPushAdapter implements PushAdapter, PushChecks {
  constructor(private readonly runCommand: CommandRunner = defaultRunner) {}
  private async run(executable: "git" | "gh", args: readonly string[], operation: string): Promise<string> { return requireSuccess(await this.runCommand(executable, args), operation); }

  async actor(): Promise<string> {
    const output = await this.run("gh", ["api", "user", "--jq", ".login"], "GitHub actor lookup");
    return output;
  }
  async githubAuthenticated(): Promise<boolean> {
    const result = await this.runCommand("gh", ["auth", "status", "--hostname", "github.com"]);
    return result.exitCode === 0;
  }
  async repository(): Promise<string> {
    return this.run("gh", ["repo", "view", PUSH_REPOSITORY, "--json", "nameWithOwner", "--jq", ".nameWithOwner"], "GitHub repository lookup");
  }
  async issue(): Promise<PushIssue> {
    const output = await this.run("gh", ["issue", "view", String(7), "--repo", PUSH_REPOSITORY, "--json", "number,state,title"], "Issue 7 lookup");
    return JSON.parse(output) as PushIssue;
  }
  async worktree(): Promise<{ clean: boolean; detached: boolean }> {
    const status = await this.run("git", ["status", "--porcelain"], "Working tree check");
    const branch = await this.run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], "HEAD check").catch(() => "");
    return { clean: status === "", detached: branch === "" };
  }
  async currentBranch(): Promise<string> {
    return this.run("git", ["branch", "--show-current"], "Current branch lookup");
  }
  async implementationBranch(): Promise<string> {
    return this.currentBranch();
  }
  async localBranch(name: string): Promise<{ exists: boolean; commit?: string }> {
    requireFixed(name, PUSH_BRANCH, "Local branch");
    const result = await this.runCommand("git", ["rev-parse", "--verify", `refs/heads/${PUSH_BRANCH}`]);
    return result.exitCode === 0 ? { exists: true, commit: result.stdout.trim() } : { exists: false };
  }
  async remoteBranch(remote: string, name: string): Promise<{ exists: boolean; commit?: string }> {
    requireFixed(remote, PUSH_REMOTE, "Remote");
    requireFixed(name, PUSH_BRANCH, "Remote branch");
    const result = await this.runCommand("git", ["ls-remote", "--heads", PUSH_REMOTE, `refs/heads/${PUSH_BRANCH}`]);
    if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "Remote branch lookup failed.");
    const commit = result.stdout.trim().split(/\s+/)[0];
    return commit ? { exists: true, commit } : { exists: false };
  }
  async remoteRepository(): Promise<string> {
    const url = await this.run("git", ["remote", "get-url", PUSH_REMOTE], "Remote repository lookup");
    const match = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i);
    return match?.[1] ?? url;
  }
  async push(request: Parameters<PushAdapter["push"]>[0]): Promise<{ pushed: boolean; remoteCommit: string; uncertain?: boolean }> {
    requireFixed(request.remote, PUSH_REMOTE, "Remote");
    requireFixed(request.localBranch, PUSH_BRANCH, "Local branch");
    requireFixed(request.remoteBranch, PUSH_BRANCH, "Remote branch");
    requireFixed(request.commit, PUSH_COMMIT, "Commit");
    requireFixed(request.refspec, `${PUSH_BRANCH}:${PUSH_BRANCH}`, "Refspec");
    if (request.force || request.delete) throw new Error("Force push and branch deletion are not permitted.");
    const result = await this.runCommand("git", ["push", PUSH_REMOTE, `${PUSH_BRANCH}:${PUSH_BRANCH}`]);
    if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "Git push failed.");
    return { pushed: true, remoteCommit: PUSH_COMMIT };
  }
}
