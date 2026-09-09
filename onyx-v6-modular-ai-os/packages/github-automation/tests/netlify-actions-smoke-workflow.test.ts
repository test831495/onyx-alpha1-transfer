import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../../../.github/workflows/netlify-readonly-smoke.yml", import.meta.url), "utf8");

function extractInlineScript(): string {
  const heredocMatches = [...workflow.matchAll(/node <<'NODE'\n([\s\S]*?)\n {10}NODE(?:\n|$)/g)];
  expect(heredocMatches).toHaveLength(1);
  const heredocMatch = heredocMatches[0];
  if (!heredocMatch || !heredocMatch[1]) throw new Error("Expected exactly one non-empty inline Node heredoc.");
  return heredocMatch[1];
}

describe("Netlify read-only smoke workflow", () => {
  it("is manually dispatched with contents read permission and cannot run on push or pull_request", () => {
    expect(workflow).toContain("name: Netlify Read-Only Smoke");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toMatch(/^on:\n(?:.*\n)*?\s*(push|pull_request):/m);
  });

  it("uses only the approved GitHub Actions inputs", () => {
    expect(workflow).toContain("secrets.NETLIFY_PAT");
    expect(workflow).toContain("vars.NETLIFY_SITE_ID");
    expect(workflow).toContain("vars.NETLIFY_SITE_NAME");
    expect(workflow).not.toMatch(/secrets\.NETLIFY_SITE_ID|secrets\.NETLIFY_SITE_NAME/);
    expect(workflow).not.toMatch(/vars\.NETLIFY_PAT/);
  });

  it("defines exact frozen expected site identity constants", () => {
    expect(workflow).toContain("const EXPECTED_NETLIFY_SITE_ID = 'eb638a6a-82b0-4769-a45a-072234f30fd1';");
    expect(workflow).toContain("const EXPECTED_NETLIFY_SITE_NAME = 'onyx-alpha0';");
  });

  it("checks configured identity against frozen constants before the first live network call in the IIFE", () => {
    const inlineScript = extractInlineScript();
    const iifeStart = inlineScript.indexOf("(async () => {");
    const iifeEnd = inlineScript.indexOf("})().catch((error) => {");
    expect(iifeStart).toBeGreaterThan(-1);
    expect(iifeEnd).toBeGreaterThan(iifeStart);
    const iifeBody = inlineScript.slice(iifeStart, iifeEnd);

    const configCheckIndex = iifeBody.indexOf("if (siteId !== EXPECTED_NETLIFY_SITE_ID || siteName !== EXPECTED_NETLIFY_SITE_NAME) throw new Error('Configured Netlify sandbox identity mismatch.');");
    const firstRequestCallIndex = iifeBody.indexOf("await request(");
    expect(configCheckIndex).toBeGreaterThan(-1);
    expect(firstRequestCallIndex).toBeGreaterThan(-1);
    expect(configCheckIndex).toBeLessThan(firstRequestCallIndex);
  });

  it("also validates the live API response against the frozen expected identity", () => {
    expect(workflow).toContain("if (site.id !== siteId || site.id !== EXPECTED_NETLIFY_SITE_ID) throw new Error('Site ID mismatch.');");
    expect(workflow).toContain("if (site.name !== siteName || site.name !== EXPECTED_NETLIFY_SITE_NAME) throw new Error('Site name mismatch.');");
  });

  it("removes /accounts entirely and exposes exactly two GET endpoint classes", () => {
    expect(workflow).not.toContain("/accounts");
    expect(workflow).not.toContain("accounts.metadata");
    expect(workflow).toContain("'site.metadata'");
    expect(workflow).toContain("'site.deploys'");

    const classifyMatch = workflow.match(/function classifyEndpoint\(path\) \{([\s\S]*?)\n {10}\}\n/);
    expect(classifyMatch).not.toBeNull();
    if (!classifyMatch || !classifyMatch[1]) throw new Error("Expected a classifyEndpoint function body.");
    for (const [returnValue, count] of [
      ["'site.metadata'", 1],
      ["'site.deploys'", 1],
    ] as const) {
      const occurrences = classifyMatch[1].split(`return ${returnValue};`).length - 1;
      expect(occurrences).toBe(count);
    }
  });

  it("issues exactly the two approved live requests: site metadata then site deploys", () => {
    expect(workflow).toContain("const site = await request(`/sites/${siteId}`);");
    expect(workflow).toContain("const deploys = await request(`/sites/${siteId}/deploys?per_page=10&page=1`);");

    const inlineScript = extractInlineScript();
    const siteRequestIndex = inlineScript.indexOf("const site = await request(`/sites/${siteId}`);");
    const deploysRequestIndex = inlineScript.indexOf("const deploys = await request(`/sites/${siteId}/deploys?per_page=10&page=1`);");
    expect(siteRequestIndex).toBeGreaterThan(-1);
    expect(deploysRequestIndex).toBeGreaterThan(siteRequestIndex);

    expect(workflow.match(/await request\(/g)).toHaveLength(2);
  });

  it("permits only GET on the two approved paths", () => {
    expect(workflow).toContain("async function request(path) {");
    expect(workflow).toContain("if (!allowedGetPaths.has(path)) throw new Error('Non-allowlisted path.');");
    expect(workflow).toContain("method: 'GET',");
    expect(workflow).not.toMatch(/method:\s*'(POST|PUT|PATCH|DELETE)'/);
    expect(workflow).not.toMatch(/\bgraphql\b/i);
    expect(workflow).not.toMatch(/\/builds\b|\/env\b|deploy_key|site_settings/);
  });

  it("requires deployment history to exist and latest deployment metadata to be present", () => {
    expect(workflow).toContain("if (!Array.isArray(deploys) || deploys.length === 0) throw new Error('Deployment history missing.');");
    expect(workflow).toContain("const latestDeploy = deploys[0];");
    expect(workflow).toContain("if (!latestDeploy?.id) throw new Error('Latest deployment metadata missing.');");
  });

  it("writes only sanitized evidence, free of PAT, Authorization, Bearer, and response bodies or headers", () => {
    expect(workflow).toContain("NETLIFY_ACTIONS_READONLY_SMOKE");
    expect(workflow).toContain("credentialsDropped: true");
    expect(workflow).toContain("zeroWriteClaim: true");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("retention-days: 7");
    expect(workflow).toContain("if (/Bearer|Authorization/.test(serialized) || serialized.includes(token)) throw new Error('Evidence failed secret scan.');");
    expect(workflow).not.toMatch(/evidence\.push\(\{[^}]*\b(body|headers|token)\b/);
    expect(workflow).not.toMatch(/sanitized\s*=\s*\{[^}]*\btoken\b/);
  });

  it("sanitizes and bounds the terminal catch handler's logged error message", () => {
    expect(workflow).toContain("function sanitizeErrorMessage(error)");
    expect(workflow).toContain("const safeMessage = sanitizeErrorMessage(error);");
    expect(workflow).not.toMatch(/console\.error\(`NETLIFY_ACTIONS_READONLY_SMOKE=FAIL REASON=\$\{error\.message\}`\)/);
    expect(workflow).toContain(".slice(0, 500)");
    expect(workflow).not.toMatch(/error\.stack/);
  });

  it("wraps the inline script in an async IIFE with no unwrapped top-level await", () => {
    const inlineScript = extractInlineScript();
    expect(inlineScript).toMatch(/const fs = require\('node:fs'\);/);
    expect(inlineScript.match(/\(async \(\) => \{/g)).toHaveLength(1);
    expect(inlineScript.match(/\}\)\(\)\.catch\(\(error\) => \{/g)).toHaveLength(1);
    expect(inlineScript).toContain("process.exitCode = 1;");
  });

  it("keeps provider flags and deployment/write operations absent", () => {
    expect(workflow).not.toMatch(/deploy_key|build_hook|createDeploy|triggerBuild/i);
    expect(workflow).not.toMatch(/env_var|environment_variable/i);
    expect(workflow).not.toMatch(/site_settings|update_site|delete_site/i);
  });
});

describe("Netlify read-only smoke workflow inline script syntax", () => {
  it("passes node --check on the extracted heredoc body", () => {
    const inlineScript = extractInlineScript();
    const dedented = inlineScript
      .split("\n")
      .map((line) => line.replace(/^ {10}/, ""))
      .join("\n");
    expect(() => new Function(dedented.replace(/require\(/g, "globalThis.require ?? require("))).not.toThrow(SyntaxError);
  });
});
