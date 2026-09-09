import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../../../.github/workflows/github-app-readonly-smoke.yml", import.meta.url), "utf8");

describe("GitHub Actions read-only smoke workflow", () => {
  it("is manually dispatched with contents read permission", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("permissions:\n  contents: read");
  });

  it("uses only the approved GitHub Actions inputs", () => {
    expect(workflow).toContain("secrets.APP_PRIVATE_KEY_GITHUB");
    expect(workflow).toContain("secrets.APP_ID_GITHUB");
    expect(workflow).toContain("vars.APP_INSTALLATION_ID_GITHUB");
    expect(workflow).not.toContain("az ");
    expect(workflow).not.toContain("AZURE");
    expect(workflow).not.toContain("id-token: write");
  });

  it("contains one credential exchange and exactly four repository GET classes", () => {
    expect(workflow.match(/request\('POST'/g)).toHaveLength(1);
    expect(workflow).toContain("repository.metadata");
    expect(workflow).toContain("repository.pull_requests");
    expect(workflow).toContain("repository.issues");
    expect(workflow).toContain("repository.actions_runs");
    expect(workflow).not.toMatch(/\/comments|\/merge|workflow_dispatch[^:]/);
    expect(workflow).not.toMatch(/graphql|deployments|PUT|PATCH|DELETE/);
  });

  it("writes only sanitized evidence and uploads it as an artifact", () => {
    expect(workflow).toContain("GITHUB_ACTIONS_READONLY_SMOKE");
    expect(workflow).toContain("credentialsDropped: true");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("retention-days: 7");
    expect(workflow).toContain("PRIVATE KEY|Bearer|Authorization|ghs_");
  });

  it("wraps CommonJS require() with an async IIFE instead of unwrapped top-level await", () => {
    const inlineScript = workflow.slice(workflow.indexOf("node <<'NODE'"), workflow.indexOf("\n          NODE"));
    expect(inlineScript).toMatch(/const crypto = require\('node:crypto'\);/);
    expect(inlineScript).toMatch(/const fs = require\('node:fs'\);/);
    expect(inlineScript.match(/\(async \(\) => \{/g)).toHaveLength(1);
    expect(inlineScript.match(/\}\)\(\)\.catch\(\(error\) => \{/g)).toHaveLength(1);
    expect(inlineScript).toContain("process.exitCode = 1;");

    const requireLines = inlineScript.split("\n").filter((line) => line.includes("require("));
    const lastRequireLine = requireLines[requireLines.length - 1];
    if (!lastRequireLine) throw new Error("Expected at least one require() declaration.");

    const iifeStart = inlineScript.indexOf("(async () => {");
    const iifeEnd = inlineScript.indexOf("})().catch((error) => {");
    if (iifeStart < 0 || iifeEnd < 0) throw new Error("Expected an async IIFE boundary.");
    const iifeBody = inlineScript.slice(iifeStart, iifeEnd);
    for (const statement of ["const app = await request('GET', '/app', jwt);", "const exchange = await request('POST'", "for (const path of allowed) await request('GET', path, token);"]) {
      expect(iifeBody).toContain(statement);
    }

    const beforeIife = inlineScript.slice(0, iifeStart).replace(/async function request[\s\S]*?\n {10}\}\n/, "");
    const topLevelAwaits = beforeIife.match(/(?<!\S)await\s/g) || [];
    expect(topLevelAwaits).toHaveLength(0);

    const catchBody = inlineScript.slice(inlineScript.indexOf(".catch((error) => {"));
    expect(catchBody).not.toMatch(/error\.stack|console\.(error|log)\(error\)/);
  });
});
