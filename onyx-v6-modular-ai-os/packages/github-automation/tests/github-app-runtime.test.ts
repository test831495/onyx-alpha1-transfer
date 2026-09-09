import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EphemeralSecretHandle,
  GITHUB_APP_RUNTIME,
  GitHubAppRuntimeLifecycle,
  GitHubInstallationTokenExchanger,
  GitHubReadOnlyInstallationClient,
  createGitHubAppJwtClaims,
  createInstallationTokenRequest,
  githubAppPrivateKeyReference,
  retrieveGitHubAppPrivateKey,
  signGitHubAppJwt,
  validateInstallationToken,
} from "../src/github-app-runtime";

describe("GitHub App read-only runtime", () => {
  it("binds the exact vault secret reference and rejects alternate names", async () => {
    expect(githubAppPrivateKeyReference()).toMatchObject({ vaultUri: GITHUB_APP_RUNTIME.vaultUri, secretName: "github-app-private-key" });
    await expect(retrieveGitHubAppPrivateKey({ getSecret: async () => "bad" })).rejects.toThrow();
    expect(() => githubAppPrivateKeyReference("other-secret")).toThrow();
  });

  it("creates a client-id RS256 JWT with bounded claims", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const nowSeconds = 1_700_000_000;
    const jwt = signGitHubAppJwt(privateKey.export({ type: "pkcs8", format: "pem" }).toString(), { nowSeconds });
    const [encodedHeader, encodedClaims, encodedSignature] = jwt.split(".");
    if (!encodedHeader || !encodedClaims || !encodedSignature) throw new Error("JWT did not have three segments.");
    const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString()) as { iat: number; exp: number; iss: string };
    expect(JSON.parse(Buffer.from(encodedHeader, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(claims).toMatchObject({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: GITHUB_APP_RUNTIME.clientId });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${encodedHeader}.${encodedClaims}`);
    expect(verifier.verify(publicKey, encodedSignature, "base64url")).toBe(true);
    expect(() => createGitHubAppJwtClaims({ nowSeconds, ttlSeconds: 601 })).toThrow();
  });

  it("restricts token exchange to one repository and one attempt", async () => {
    const request = createInstallationTokenRequest(123, { metadata: "read", issues: "read", contents: "read" });
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    const exchanger = new GitHubInstallationTokenExchanger(async (input) => {
      calls.push(input);
      return { status: 201, headers: {}, body: { token: "opaque", expires_at: "2099-01-01T00:00:00Z", permissions: { metadata: "read" }, repository_selection: "selected", repositories: [123] } };
    });
    await exchanger.exchange("jwt", request);
    await expect(exchanger.exchange("jwt", request)).rejects.toThrow("single-use");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", url: `${GITHUB_APP_RUNTIME.apiBase}/app/installations/160258443/access_tokens` });
    expect(() => createInstallationTokenRequest(123, { issues: "write" })).toThrow();
  });

  it("accepts only bounded GET smoke endpoints and drops credentials on disable", async () => {
    const handle = new EphemeralSecretHandle("opaque-token");
    const calls: string[] = [];
    const client = new GitHubReadOnlyInstallationClient(async (input) => {
      calls.push(input.method);
      return { status: 200, headers: {}, body: { items: [] } };
    }, handle);
    await client.get("/repos/test831495/onyx-alpha1-transfer/issues?state=all&per_page=10&page=1", "issues");
    await expect(client.get("/repos/test831495/onyx-alpha1-transfer/contents/README.md", "contents")).rejects.toThrow();
    expect(calls).toEqual(["GET"]);
    const lifecycle = new GitHubAppRuntimeLifecycle(undefined, handle);
    lifecycle.disable();
    expect(lifecycle.state).toBe("DISABLED");
    expect(handle.available).toBe(false);
    await expect(client.get("/repos/test831495/onyx-alpha1-transfer/issues", "issues")).rejects.toThrow();
  });

  it("rejects expired or write-bearing token responses", () => {
    expect(() => validateInstallationToken({ token: "opaque", expiresAt: "2000-01-01T00:00:00Z", permissions: { metadata: "read" } })).toThrow();
    expect(() => validateInstallationToken({ token: "opaque", expiresAt: "2099-01-01T00:00:00Z", permissions: { contents: "write" } })).toThrow();
  });
});
