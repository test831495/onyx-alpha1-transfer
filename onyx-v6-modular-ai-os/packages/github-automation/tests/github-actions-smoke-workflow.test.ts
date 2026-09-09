import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../../../.github/workflows/github-app-readonly-smoke.yml", import.meta.url), "utf8");

// Returns every line before the IIFE containing an `await` that is not nested inside an `async function` declaration.
function findTopLevelAwaitViolations(scriptBeforeIife: string): string[] {
  const violations: string[] = [];
  let nestedFunctionDepth = 0;
  let braceDepth = 0;
  for (const line of scriptBeforeIife.split("\n")) {
    if (nestedFunctionDepth === 0 && /^\s*async function \w+\(/.test(line)) nestedFunctionDepth = 1;
    if (nestedFunctionDepth > 0) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) nestedFunctionDepth = 0;
      continue;
    }
    if (/(?<!\S)await\s/.test(line)) violations.push(line);
  }
  return violations;
}

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
    const heredocMatches = [...workflow.matchAll(/node <<'NODE'\n([\s\S]*?)\n {10}NODE(?:\n|$)/g)];
    expect(heredocMatches).toHaveLength(1);
    const heredocMatch = heredocMatches[0];
    if (!heredocMatch || !heredocMatch[1]) throw new Error("Expected exactly one non-empty inline Node heredoc.");
    const inlineScript = heredocMatch[1];

    expect(inlineScript).toMatch(/const crypto = require\('node:crypto'\);/);
    expect(inlineScript).toMatch(/const fs = require\('node:fs'\);/);
    expect(inlineScript.match(/\(async \(\) => \{/g)).toHaveLength(1);
    expect(inlineScript.match(/\}\)\(\)\.catch\(\(error\) => \{/g)).toHaveLength(1);
    expect(inlineScript).toContain("process.exitCode = 1;");

    const iifeStart = inlineScript.indexOf("(async () => {");
    const iifeEnd = inlineScript.indexOf("})().catch((error) => {");
    if (iifeStart < 0 || iifeEnd < 0) throw new Error("Expected an async IIFE boundary.");
    const iifeBody = inlineScript.slice(iifeStart, iifeEnd);
    for (const statement of ["const app = await request('GET', '/app', jwt);", "const exchange = await request('POST'", "for (const path of allowed) await request('GET', path, token);"]) {
      expect(iifeBody).toContain(statement);
    }

    // Every `await` outside the IIFE must belong to a nested `async function` declaration, never a top-level statement.
    const beforeIife = inlineScript.slice(0, iifeStart);
    expect(findTopLevelAwaitViolations(beforeIife)).toHaveLength(0);

    const catchBody = inlineScript.slice(inlineScript.indexOf(".catch((error) => {"));
    expect(catchBody).not.toMatch(/error\.stack|console\.(error|log)\(error\)/);
  });

  it("tolerates harmless formatting changes when detecting top-level await", () => {
    const baseline = [
      "async function request(method, path, token, body) {",
      "  const response = await fetch(path);",
      "  return response;",
      "}",
      "",
      "const owner = 'test831495';",
    ].join("\n");
    expect(findTopLevelAwaitViolations(baseline)).toHaveLength(0);

    const changedClosingBraceIndentation = [
      "async function request(method, path, token, body) {",
      "  const response = await fetch(path);",
      "      }",
      "const owner = 'test831495';",
    ].join("\n");
    expect(findTopLevelAwaitViolations(changedClosingBraceIndentation)).toHaveLength(0);

    const withBlankLines = [
      "async function request(method, path, token, body) {",
      "",
      "  const response = await fetch(path);",
      "",
      "}",
      "",
      "const owner = 'test831495';",
    ].join("\n");
    expect(findTopLevelAwaitViolations(withBlankLines)).toHaveLength(0);

    const nestedHelperReindented = [
      "    async function request(method, path, token, body) {",
      "        const response = await fetch(path);",
      "        return response;",
      "    }",
      "const owner = 'test831495';",
    ].join("\n");
    expect(findTopLevelAwaitViolations(nestedHelperReindented)).toHaveLength(0);

    const unwrappedTopLevelAwait = [
      "async function request(method, path, token, body) {",
      "  return await fetch(path);",
      "}",
      "const app = await request('GET', '/app', jwt);",
    ].join("\n");
    expect(findTopLevelAwaitViolations(unwrappedTopLevelAwait)).toHaveLength(1);
  });

  it("sanitizes the terminal catch handler's logged error message", () => {
    expect(workflow).toContain("function sanitizeErrorMessage(error)");
    expect(workflow).toContain("const safeMessage = sanitizeErrorMessage(error);");
    expect(workflow).not.toMatch(/console\.error\(`GITHUB_ACTIONS_READONLY_SMOKE=FAIL REASON=\$\{error\.message\}`\)/);

    const sanitizeMatch = workflow.match(/function sanitizeErrorMessage\(error\) \{([\s\S]*?)\n {10}\}\n/);
    expect(sanitizeMatch).not.toBeNull();
    if (!sanitizeMatch || !sanitizeMatch[1]) throw new Error("Expected a sanitizeErrorMessage function body.");
    const sanitizerBody = sanitizeMatch[1];

    expect(sanitizerBody).toContain("privateKey");
    expect(sanitizerBody).toContain("process.env.APP_ID_GITHUB");
    expect(sanitizerBody).toContain("process.env.APP_INSTALLATION_ID_GITHUB");
    expect(sanitizerBody).toMatch(/BEGIN \[\^-\]\+-----\[\\s\\S\]\*\?-----END/);
    expect(sanitizerBody).toContain("eyJ[A-Za-z0-9_-]*");
    expect(sanitizerBody).toContain("ghs_[A-Za-z0-9._-]+");
    expect(sanitizerBody).toMatch(/Authorization\\s\*:\\s\*Bearer/i);
    expect(sanitizerBody).toMatch(/Bearer\\s\+\\S\+/i);
    expect(sanitizerBody).toContain("[\\r\\n]+");
    expect(sanitizerBody).toContain(".slice(0, 500)");
    expect(sanitizerBody).not.toMatch(/error\.stack/);
  });

  it("does not assume installation metadata contains a repositories array", () => {
    expect(workflow).not.toContain("installation.repositories\n");
    expect(workflow).not.toContain("const repositories = installation.repositories");
    expect(workflow).not.toMatch(/repositories\.find\(\(item\) => item\.full_name/);
  });

  it("preserves installation identity, suspension, selection, and read-only permission checks before token exchange", () => {
    expect(workflow).toContain("installation.id !== installationId");
    expect(workflow).toContain("installation.account?.login !== owner");
    expect(workflow).toContain("installation.suspended_at");
    expect(workflow).toContain("installation.repository_selection !== 'selected'");
    expect(workflow).toContain("for (const [permission, level] of Object.entries(installation.permissions || {})) if (level !== 'read')");
  });

  it("restricts the single token exchange by repository name, not a numeric ID", () => {
    expect(workflow.match(/request\('POST'/g)).toHaveLength(1);
    expect(workflow).toContain("{ repositories: [repo], permissions:");
    expect(workflow).not.toMatch(/repositories:\s*\[target\.id\]/);
    expect(workflow).not.toContain("repository_ids");
  });

  it("rejects an unexpected repository in the token exchange response before use", () => {
    expect(workflow).toContain("if (exchange.repositories && exchange.repositories.some((item) => item.full_name !== `${owner}/${repo}`)) throw new Error('Installation token repository scope mismatch.');");
  });

  it("validates repository scope with exactly one GET /installation/repositories call after token exchange", () => {
    expect(workflow).toContain("const installationRepositoriesPath = '/installation/repositories?per_page=10&page=1';");
    expect(workflow.match(/installationRepositoriesPath/g)?.length).toBeGreaterThanOrEqual(3);
    expect(workflow.match(/request\('GET', installationRepositoriesPath, token\)/g)).toHaveLength(1);
    expect(workflow).toContain("if (verifiedRepositories.length !== 1 || verifiedRepositories[0]?.full_name !== `${owner}/${repo}`) throw new Error('Repository scope mismatch.');");
    expect(workflow).toContain("const target = verifiedRepositories[0];");

    const tokenExchangeIndex = workflow.indexOf("request('POST'");
    const repositoriesGetIndex = workflow.indexOf("request('GET', installationRepositoriesPath, token)");
    const metadataLoopIndex = workflow.indexOf("for (const path of allowed) await request('GET', path, token);");
    expect(tokenExchangeIndex).toBeGreaterThan(-1);
    expect(repositoriesGetIndex).toBeGreaterThan(tokenExchangeIndex);
    expect(metadataLoopIndex).toBeGreaterThan(repositoriesGetIndex);
  });

  it("obtains the numeric repository ID only from the verified installation/repositories response", () => {
    const repositoryIdOccurrences = workflow.match(/repositoryId:\s*\S+/g) || [];
    expect(repositoryIdOccurrences).toHaveLength(1);
    expect(repositoryIdOccurrences[0]).toBe("repositoryId: target.id,");
  });
});
