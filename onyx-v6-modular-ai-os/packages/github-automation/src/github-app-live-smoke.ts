import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import {
  EphemeralSecretHandle,
  GITHUB_APP_RUNTIME,
  GitHubAppRuntimeLifecycle,
  GitHubInstallationTokenExchanger,
  GitHubReadOnlyInstallationClient,
  HttpResponse,
  HttpTransport,
  createGitHubAppJwtClaims,
  createInstallationTokenRequest,
  signGitHubAppJwt,
  validateInstallationToken,
} from "./github-app-runtime";

const execFileAsync = promisify(execFile);
const MAX_SECRET_BYTES = 32_768;
const MAX_RESPONSE_BYTES = 1_000_000;
const EVIDENCE_DIR = process.env.ONYX_SMOKE_EVIDENCE_DIR || "/home/rahul/onyx-track-a-smoke-evidence";

export const LIVE_SMOKE_CONFIG = Object.freeze({
  appId: 4_878_266,
  clientId: "Iv23liZxVNlsOm47JmDM",
  slug: "onyx-nova-github-sandbox-readonly",
  installationId: 160_258_443,
  owner: "test831495",
  repository: "onyx-alpha1-transfer",
  vaultName: "onyx-nova-sandbox-kv",
  secretName: "github-app-private-key",
} as const);

export interface SanitizedEndpointEvidence {
  readonly endpointClass: string;
  readonly status: number;
  readonly latencyMs: number;
  readonly itemCount?: number;
  readonly rateLimit?: { readonly limit?: number; readonly remaining?: number; readonly reset?: number };
}

export interface LiveSmokeEvidence {
  readonly gateId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly appId: number;
  readonly slug: string;
  readonly installationId: number;
  readonly vaultName: string;
  readonly secretName: string;
  readonly repository: string;
  readonly repositoryId: number;
  readonly permissions: Readonly<Record<string, string>>;
  readonly endpoints: readonly SanitizedEndpointEvidence[];
  readonly attribution: "GitHub metadata and repository reads";
  readonly freshness: "provider timestamps retained in memory only";
  readonly partialPermissionTruth: boolean;
  readonly commits: string;
  readonly releases: string;
  readonly searchAttribution: "NOT_APPLICABLE_NO_SEARCH_ENDPOINT";
  readonly synthesisCitation: "SANITIZED_ENDPOINT_RECEIPTS";
  readonly zeroWriteClaim: true;
  readonly credentialsDropped: true;
  readonly evidenceSha256: string;
}

function fail(message: string): never { throw new Error(message); }
function assertString(value: unknown, label: string): string { return typeof value === "string" && value ? value : fail(`${label} validation failed.`); }
function assertNumber(value: unknown, label: string): number { return typeof value === "number" && Number.isSafeInteger(value) ? value : fail(`${label} validation failed.`); }
function redactResponse(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_RESPONSE_BYTES) return Promise.reject(new Error("GitHub response exceeded the bounded size."));
  return response.text().then((text) => {
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error("GitHub response exceeded the bounded size.");
    return text ? JSON.parse(text) : null;
  });
}

export async function runAzureCli(args: readonly string[], timeout = 15_000): Promise<string> {
  if (args.some((arg) => arg.includes("BEGIN") || arg.includes("Bearer") || arg.startsWith("ghs_"))) throw new Error("Secret-bearing Azure arguments are prohibited.");
  try {
    const result = await execFileAsync("az", [...args], { shell: false, timeout, maxBuffer: MAX_SECRET_BYTES, windowsHide: true });
    if (result.stderr.trim()) throw new Error("Azure CLI returned stderr.");
    return result.stdout;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    throw new Error(`Azure CLI operation failed (${code}).`);
  }
}

export async function readKeyVaultSecret(): Promise<string> {
  const value = await runAzureCli(["keyvault", "secret", "show", "--vault-name", LIVE_SMOKE_CONFIG.vaultName, "--name", LIVE_SMOKE_CONFIG.secretName, "--query", "value", "--output", "tsv"]);
  const secret = value.trim();
  if (!secret || Buffer.byteLength(secret) > MAX_SECRET_BYTES || (!secret.includes("BEGIN RSA PRIVATE KEY") && !secret.includes("BEGIN PRIVATE KEY"))) throw new Error("Key Vault secret is empty, oversized, or malformed.");
  return secret;
}

export async function verifyAzurePrerequisites(): Promise<void> {
  await runAzureCli(["account", "show", "--query", "id", "--output", "tsv"]);
  const enabled = (await runAzureCli(["keyvault", "secret", "show", "--vault-name", LIVE_SMOKE_CONFIG.vaultName, "--name", LIVE_SMOKE_CONFIG.secretName, "--query", "attributes.enabled", "--output", "tsv"])).trim();
  if (enabled !== "true") throw new Error("Key Vault secret is not enabled.");
}

export function validateAppMetadata(body: Record<string, unknown>): void {
  if (assertNumber(body.id, "App ID") !== LIVE_SMOKE_CONFIG.appId || assertString(body.client_id, "Client ID") !== LIVE_SMOKE_CONFIG.clientId || assertString(body.slug, "App slug") !== LIVE_SMOKE_CONFIG.slug) throw new Error("GitHub App identity mismatch.");
}

export function validateInstallationMetadata(body: Record<string, unknown>): Readonly<Record<string, string>> {
  if (assertNumber(body.id, "Installation ID") !== LIVE_SMOKE_CONFIG.installationId) throw new Error("GitHub installation identity mismatch.");
  const account = body.account as Record<string, unknown> | undefined;
  if (assertString(account?.login, "Installation account") !== LIVE_SMOKE_CONFIG.owner) throw new Error("GitHub installation account mismatch.");
  if (body.suspended_at !== null && body.suspended_at !== undefined) throw new Error("GitHub installation is suspended.");
  if (body.repository_selection !== "selected") throw new Error("GitHub installation is not selected-repository scoped.");
  const permissions = (body.permissions || {}) as Record<string, string>;
  for (const [name, level] of Object.entries(permissions)) if (level !== "read") throw new Error(`Unexpected ${name} permission level.`);
  return Object.freeze({ ...permissions });
}

function endpointEvidence(endpointClass: string, response: HttpResponse, started: number): SanitizedEndpointEvidence {
  const body = response.body as Record<string, unknown>;
  const items = Array.isArray(body) ? body.length : Array.isArray(body?.items) ? body.items.length : undefined;
  const headers = response.headers;
  const numberHeader = (name: string): number | undefined => headers[name] ? Number(headers[name]) : undefined;
  return Object.freeze({ endpointClass, status: response.status, latencyMs: Date.now() - started, itemCount: items, rateLimit: { limit: numberHeader("x-ratelimit-limit"), remaining: numberHeader("x-ratelimit-remaining"), reset: numberHeader("x-ratelimit-reset") } });
}

export function createGitHubTransport(fetcher: typeof fetch = fetch): HttpTransport {
  return async (request) => {
    const url = new URL(request.url);
    if (url.origin !== GITHUB_APP_RUNTIME.apiBase) throw new Error("GitHub transport rejected host or scheme.");
    const response = await fetcher(url, { method: request.method, headers: request.headers, body: request.body ? JSON.stringify(request.body) : undefined, redirect: "error", signal: request.signal });
    const body = await redactResponse(response);
    const headers: Record<string, string> = {};
    for (const name of ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) { const value = response.headers.get(name); if (value) headers[name] = value; }
    return { status: response.status, headers, body };
  };
}

export function createEvidence(payload: Omit<LiveSmokeEvidence, "evidenceSha256">): LiveSmokeEvidence {
  const canonical = JSON.stringify(payload);
  return Object.freeze({ ...payload, evidenceSha256: createHash("sha256").update(canonical).digest("hex") });
}

async function getJson(transport: HttpTransport, method: "GET", path: string, jwt: string): Promise<HttpResponse> {
  return transport({ method, url: `${GITHUB_APP_RUNTIME.apiBase}${path}`, headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${jwt}` } });
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const transport = createGitHubTransport();
  let privateKey: string | undefined;
  let jwtHandle: EphemeralSecretHandle | undefined;
  let tokenHandle: EphemeralSecretHandle | undefined;
  try {
    await verifyAzurePrerequisites();
    privateKey = await readKeyVaultSecret();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const jwt = signGitHubAppJwt(privateKey, { nowSeconds, ttlSeconds: 540, clockSkewSeconds: 60, issuer: "client_id" });
    privateKey = undefined;
    jwtHandle = new EphemeralSecretHandle(jwt);
    const appResponse = await jwtHandle.use((value) => getJson(transport, "GET", "/app", value));
    if (appResponse.status !== 200) throw new Error(`App metadata GET failed with status ${appResponse.status}.`);
    validateAppMetadata(appResponse.body as Record<string, unknown>);
    const installationResponse = await jwtHandle.use((value) => getJson(transport, "GET", `/app/installations/${LIVE_SMOKE_CONFIG.installationId}`, value));
    if (installationResponse.status !== 200) throw new Error(`Installation metadata GET failed with status ${installationResponse.status}.`);
    const permissions = validateInstallationMetadata(installationResponse.body as Record<string, unknown>);
    const repositories = ((installationResponse.body as { repositories?: Array<Record<string, unknown>> }).repositories || []);
    const repository = repositories.find((item) => item.full_name === `${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}`);
    const repositoryId = assertNumber(repository?.id, "Repository ID");
    if (repositories.length !== 1 || repositories.some((item) => item.full_name !== `${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}`)) throw new Error("Installation includes an unexpected repository.");
    const request = createInstallationTokenRequest(repositoryId, permissions);
    const exchanger = new GitHubInstallationTokenExchanger(transport);
    const token = await jwtHandle.use((value) => exchanger.exchange(value, request));
    jwtHandle.drop();
    jwtHandle = undefined;
    tokenHandle = new EphemeralSecretHandle(token.token);
    const client = new GitHubReadOnlyInstallationClient(transport, tokenHandle);
    const endpointResults: SanitizedEndpointEvidence[] = [];
    const read = async (path: string, endpointClass: string): Promise<Record<string, unknown> | unknown[]> => { const started = Date.now(); const result = await client.get(path, endpointClass); endpointResults.push(endpointEvidence(endpointClass, { status: result.receipt.status, headers: {}, body: result.body }, started)); return result.body as Record<string, unknown> | unknown[]; };
    const installationRepositories = await tokenHandle.use((value) => getJson(transport, "GET", "/installation/repositories?per_page=10&page=1", value));
    if (installationRepositories.status !== 200) throw new Error(`Installation repositories GET failed with status ${installationRepositories.status}.`);
    endpointResults.push(endpointEvidence("installation.repositories", installationRepositories, Date.now()));
    await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}`, "repository.metadata");
    await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}/issues?state=all&per_page=10&page=1`, "repository.issues");
    await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}/pulls?state=all&per_page=10&page=1`, "repository.pull_requests");
    await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}/actions/runs?per_page=10&page=1`, "repository.actions_runs");
    const hasContents = permissions.contents === "read";
    if (hasContents) { await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}/commits?per_page=10&page=1`, "repository.commits"); await read(`/repos/${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}/releases?per_page=10&page=1`, "repository.releases"); }
    tokenHandle.drop();
    tokenHandle = undefined;
    const evidence = createEvidence({ gateId: "TRACK_A_CLOUD_SHELL_SECRET_SAFE_LIVE_SMOKE", startedAt, finishedAt: new Date().toISOString(), appId: LIVE_SMOKE_CONFIG.appId, slug: LIVE_SMOKE_CONFIG.slug, installationId: LIVE_SMOKE_CONFIG.installationId, vaultName: LIVE_SMOKE_CONFIG.vaultName, secretName: LIVE_SMOKE_CONFIG.secretName, repository: `${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository}`, repositoryId, permissions, endpoints: endpointResults, attribution: "GitHub metadata and repository reads", freshness: "provider timestamps retained in memory only", partialPermissionTruth: !hasContents, commits: hasContents ? "PASS" : "MISSING_CONTENTS_READ_EXPLICIT", releases: hasContents ? "PASS" : "MISSING_CONTENTS_READ_EXPLICIT", searchAttribution: "NOT_APPLICABLE_NO_SEARCH_ENDPOINT", synthesisCitation: "SANITIZED_ENDPOINT_RECEIPTS", zeroWriteClaim: true, credentialsDropped: true });
    await mkdir(EVIDENCE_DIR, { recursive: true });
    const evidencePath = `${EVIDENCE_DIR}/track-a-live-smoke-${Date.now()}.json`;
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(`VERDICT=CLOUD_SHELL_LIVE_SMOKE_COMPLETE APP_ID=${LIVE_SMOKE_CONFIG.appId} SLUG=${LIVE_SMOKE_CONFIG.slug} INSTALLATION_ID=${LIVE_SMOKE_CONFIG.installationId} REPOSITORY=${LIVE_SMOKE_CONFIG.owner}/${LIVE_SMOKE_CONFIG.repository} REPOSITORY_ID=${repositoryId} EVIDENCE_PATH=${evidencePath} EVIDENCE_SHA256=${evidence.evidenceSha256} CREDENTIALS_DROPPED=true`);
  } finally {
    privateKey = undefined;
    jwtHandle?.drop();
    tokenHandle?.drop();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error: unknown) => { console.error(`VERDICT=CLOUD_SHELL_LIVE_SMOKE_FAILED REASON=${error instanceof Error ? error.message : "sanitized failure"}`); process.exitCode = 1; });
