import { spawn } from "node:child_process";
import type { DraftPrAdapter, DraftPrChecks } from "./index.js";
import {
  DRAFT_PR_BASE_BRANCH,
  DRAFT_PR_HEAD_BRANCH,
  DRAFT_PR_HEAD_COMMIT,
  DRAFT_PR_ISSUE_NUMBER,
  DRAFT_PR_ISSUE_TITLE,
  DRAFT_PR_REPOSITORY,
} from "./index.js";

export interface DraftPrIssue {
  number: number;
  state: "OPEN" | "CLOSED";
  title: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

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

export class GitHubDraftPrAdapter implements DraftPrAdapter, DraftPrChecks {
  constructor(private readonly runCommand: CommandRunner = defaultRunner) {}

  private async run(executable: "git" | "gh", args: readonly string[], operation: string): Promise<string> {
    return requireSuccess(await this.runCommand(executable, args), operation);
  }

  async actor(): Promise<string> {
    return this.run("gh", ["api", "user", "--jq", ".login"], "GitHub actor lookup");
  }

  async githubAuthenticated(): Promise<boolean> {
    const result = await this.runCommand("gh", ["auth", "status", "--hostname", "github.com"]);
    return result.exitCode === 0;
  }

  async repository(): Promise<string> {
    return this.run("gh", ["repo", "view", DRAFT_PR_REPOSITORY, "--json", "nameWithOwner", "--jq", ".nameWithOwner"], "Repository lookup");
  }

  async issue(): Promise<DraftPrIssue> {
    const output = await this.run("gh", ["issue", "view", String(DRAFT_PR_ISSUE_NUMBER), "--repo", DRAFT_PR_REPOSITORY, "--json", "number,state,title"], "Issue lookup");
    return JSON.parse(output) as DraftPrIssue;
  }

  async worktree(): Promise<{ clean: boolean; detached: boolean }> {
    const status = await this.run("git", ["status", "--porcelain"], "Worktree status");
    const branch = await this.run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], "HEAD check").catch(() => "");
    return { clean: status === "", detached: branch === "" };
  }

  async currentBranch(): Promise<string> {
    return this.run("git", ["branch", "--show-current"], "Current branch lookup");
  }

  async implementationBranch(): Promise<string> {
    return this.currentBranch();
  }

  async remoteBranch(branch: string): Promise<{ exists: boolean; commit?: string }> {
    requireFixed(branch, DRAFT_PR_HEAD_BRANCH, "Remote branch");
    const result = await this.runCommand("git", ["ls-remote", "--heads", "origin", `refs/heads/${DRAFT_PR_HEAD_BRANCH}`]);
    if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "Remote branch lookup failed.");
    const commit = result.stdout.trim().split(/\s+/)[0];
    return commit ? { exists: true, commit } : { exists: false };
  }

  async findByRepositoryBaseHead(repository: string, baseBranch: string, headBranch: string): Promise<{
    number: number;
    url: string;
    draft: boolean;
    repository: string;
    baseBranch: string;
    headBranch: string;
    headCommit: string;
    idempotencyKey: string;
  } | null> {
    requireFixed(repository, DRAFT_PR_REPOSITORY, "Repository");
    requireFixed(baseBranch, DRAFT_PR_BASE_BRANCH, "Base branch");
    requireFixed(headBranch, DRAFT_PR_HEAD_BRANCH, "Head branch");

    const result = await this.runCommand("gh", ["pr", "list", "--repo", repository, "--state", "all", "--limit", "200", "--json", "number,url,isDraft,baseRefName,headRefName,headRefOid"]);
    const rows = JSON.parse(result.stdout.trim() || "[]") as Array<{ number: number; url: string; isDraft: boolean; baseRefName: string; headRefName: string; headRefOid: string }>;
    const match = rows.find(pr => pr.isDraft && pr.baseRefName === baseBranch && pr.headRefName === headBranch && pr.headRefOid === DRAFT_PR_HEAD_COMMIT);
    if (!match) return null;
    return {
      number: match.number,
      url: match.url,
      draft: true,
      repository,
      baseBranch,
      headBranch,
      headCommit: DRAFT_PR_HEAD_COMMIT,
      idempotencyKey: "gh-pr-lookup",
    };
  }

  async findByIdempotencyKey(key: string): Promise<{
    number: number;
    url: string;
    draft: boolean;
    repository?: string;
    baseBranch?: string;
    headBranch?: string;
    headCommit?: string;
    idempotencyKey?: string;
  } | null> {
    const existing = await this.findByRepositoryBaseHead(DRAFT_PR_REPOSITORY, DRAFT_PR_BASE_BRANCH, DRAFT_PR_HEAD_BRANCH);
    if (!existing) return null;
    return { ...existing, idempotencyKey: key };
  }

  async createDraft(input: Parameters<DraftPrAdapter["createDraft"]>[0]): Promise<{ number: number; url: string; draft: boolean; uncertain?: boolean }> {
    requireFixed(input.repository, DRAFT_PR_REPOSITORY, "Repository");
    requireFixed(input.baseBranch, DRAFT_PR_BASE_BRANCH, "Base branch");
    requireFixed(input.headBranch, DRAFT_PR_HEAD_BRANCH, "Head branch");
    requireFixed(input.headCommit, DRAFT_PR_HEAD_COMMIT, "Head commit");
    if (!input.draft) throw new Error("Only Draft PR creation is allowed.");

    const result = await this.runCommand("gh", [
      "pr",
      "create",
      "--repo",
      input.repository,
      "--base",
      input.baseBranch,
      "--head",
      input.headBranch,
      "--title",
      input.title,
      "--body",
      input.body,
      "--draft",
    ]);

    const text = (result.stdout + "\n" + result.stderr).trim();
    const urlMatch = /https:\/\/github\.com\/[^\s]+\/pull\/\d+/i.exec(text);
    if (!urlMatch) throw new Error("Draft PR creation did not return a valid URL.");

    const url = urlMatch[0];
    const number = Number(url.match(/\/pull\/(\d+)/)?.[1]);
    if (!Number.isFinite(number)) throw new Error("Draft PR creation did not return a valid number.");

    return { number, url, draft: true };
  }
}

export const LIVE_DRAFT_PR_ISSUE = {
  number: DRAFT_PR_ISSUE_NUMBER,
  state: "OPEN" as const,
  title: DRAFT_PR_ISSUE_TITLE,
};
