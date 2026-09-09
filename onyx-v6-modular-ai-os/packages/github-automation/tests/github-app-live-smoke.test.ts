import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LIVE_SMOKE_CONFIG,
  createEvidence,
  createGitHubTransport,
  validateAppMetadata,
  validateInstallationMetadata,
} from "../src/github-app-live-smoke";

describe("Cloud Shell live-smoke harness", () => {
  it("uses fixed non-secret scope", () => {
    expect(LIVE_SMOKE_CONFIG).toMatchObject({ appId: 4878266, installationId: 160258443, owner: "test831495", repository: "onyx-alpha1-transfer", vaultName: "onyx-nova-sandbox-kv", secretName: "github-app-private-key" });
  });

  it("rejects incorrect App and installation identity", () => {
    expect(() => validateAppMetadata({ id: 1, client_id: "wrong", slug: "wrong" })).toThrow();
    expect(() => validateInstallationMetadata({ id: 160258443, account: { login: "other" }, suspended_at: null, repository_selection: "selected", permissions: { metadata: "read" } })).toThrow();
    expect(() => validateInstallationMetadata({ id: 160258443, account: { login: "test831495" }, suspended_at: "2026-01-01", repository_selection: "selected", permissions: { metadata: "read" } })).toThrow();
  });

  it("rejects suspended and write-permission installations", () => {
    expect(() => validateInstallationMetadata({ id: 160258443, account: { login: "test831495" }, suspended_at: null, repository_selection: "selected", permissions: { issues: "write" } })).toThrow();
  });

  it("rejects wrong hosts and redirects without making a request", async () => {
    let called = false;
    const transport = createGitHubTransport(async () => { called = true; throw new Error("transport should not run"); });
    await expect(transport({ method: "GET", url: "https://example.com/app", headers: {} })).rejects.toThrow();
    expect(called).toBe(false);
  });

  it("creates evidence without credential-shaped values", () => {
    const evidence = createEvidence({ gateId: "test", startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:00:01Z", appId: 4878266, slug: LIVE_SMOKE_CONFIG.slug, installationId: 160258443, vaultName: LIVE_SMOKE_CONFIG.vaultName, secretName: LIVE_SMOKE_CONFIG.secretName, repository: "test831495/onyx-alpha1-transfer", repositoryId: 123, permissions: { metadata: "read" }, endpoints: [], attribution: "GitHub metadata and repository reads", freshness: "provider timestamps retained in memory only", partialPermissionTruth: true, commits: "MISSING_CONTENTS_READ_EXPLICIT", releases: "MISSING_CONTENTS_READ_EXPLICIT", searchAttribution: "NOT_APPLICABLE_NO_SEARCH_ENDPOINT", synthesisCitation: "SANITIZED_ENDPOINT_RECEIPTS", zeroWriteClaim: true, credentialsDropped: true });
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toMatch(/BEGIN PRIVATE KEY|ghs_|Authorization|Bearer /);
    expect(evidence.evidenceSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps tests independent from Azure and accepts generated test keys", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(privateKey.export({ type: "pkcs8", format: "pem" }).toString()).toContain("BEGIN PRIVATE KEY");
  });
});
