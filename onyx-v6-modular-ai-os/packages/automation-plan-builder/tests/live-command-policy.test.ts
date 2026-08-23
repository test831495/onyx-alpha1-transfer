import { describe, expect, it } from "vitest";
import { commandAllowed, executeAllowlisted, type SafeCommandExecutor } from "../src/live-command-policy";

describe("live command policy", () => {
  it("preserves explicitly allowlisted read and bounded commands", () => {
    expect(commandAllowed(["gh", "auth", "status"])).toBe(true);
    expect(commandAllowed(["gh", "issue", "view", "7"])).toBe(true);
    expect(commandAllowed(["gh", "pr", "list", "--state", "open"])).toBe(true);
    expect(commandAllowed(["git", "remote", "get-url", "origin"])).toBe(true);
    expect(commandAllowed(["git", "rev-parse", "HEAD"])).toBe(true);
    expect(commandAllowed(["git", "branch", "--list"])).toBe(true);
    expect(commandAllowed(["git", "switch", "-c", "automation/issue-7-check"])).toBe(true);
    expect(commandAllowed(["gh", "pr", "create", "--draft"])).toBe(true);
  });

  it.each([
    ["default api", ["gh", "api", "repos/test831495/onyx-alpha1-transfer"]],
    ["short POST", ["gh", "api", "repos/x", "-X", "POST"]],
    ["short PATCH", ["gh", "api", "repos/x", "-X", "PATCH"]],
    ["short PUT", ["gh", "api", "repos/x", "-X", "PUT"]],
    ["short DELETE", ["gh", "api", "repos/x", "-X", "DELETE"]],
    ["long POST", ["gh", "api", "repos/x", "--method", "POST"]],
    ["long PATCH", ["gh", "api", "repos/x", "--method", "PATCH"]],
    ["long PUT", ["gh", "api", "repos/x", "--method", "PUT"]],
    ["long DELETE", ["gh", "api", "repos/x", "--method", "DELETE"]],
    ["field", ["gh", "api", "repos/x", "-f", "name=value"]],
    ["capital field", ["gh", "api", "repos/x", "-F", "name=value"]],
    ["long field", ["gh", "api", "repos/x", "--field", "name=value"]],
    ["raw field", ["gh", "api", "repos/x", "--raw-field", "name=value"]],
    ["input", ["gh", "api", "repos/x", "--input", "body.json"]],
    ["graphql mutation", ["gh", "api", "graphql", "-f", "query=mutation { deleteIssue }"]],
    ["option reordered", ["gh", "api", "-X", "POST", "repos/x"]],
  ])("rejects %s", (_label, argv) => {
    expect(commandAllowed(argv)).toBe(false);
  });

  it("executes an allowlisted command only through the supplied fake executor", async () => {
    const calls: string[][] = [];
    const executor: SafeCommandExecutor = {
      run: async argv => {
        calls.push(argv);
        return { exitCode: 0, stdout: "ok", stderr: "" };
      },
    };

    await expect(executeAllowlisted(executor, ["gh", "issue", "view", "7"])).resolves.toEqual({ exitCode: 0, stdout: "ok", stderr: "" });
    await expect(executeAllowlisted(executor, ["gh", "api", "repos/x", "-X", "POST"])).rejects.toThrow("not allowlisted");
    expect(calls).toEqual([["gh", "issue", "view", "7"]]);
  });
});