import { createSign } from "node:crypto";

export const GITHUB_APP_RUNTIME = Object.freeze({
  appId: 4878266,
  clientId: "Iv23liZxVNlsOm47JmDM",
  installationId: 160258443,
  repository: "test831495/onyx-alpha1-transfer",
  owner: "test831495",
  apiBase: "https://api.github.com",
  vaultUri: "https://onyx-nova-sandbox-kv.vault.azure.net/",
  secretName: "github-app-private-key",
} as const);

export type ReadOnlyGitHubPermission = "metadata" | "issues" | "pull_requests" | "actions" | "statuses" | "contents";
export const READ_ONLY_GITHUB_PERMISSIONS = Object.freeze(["metadata", "issues", "pull_requests", "actions", "statuses", "contents"] as const);
const WRITE_LEVELS = new Set(["write", "admin"]);

export interface AzureKeyVaultSecretReference {
  readonly vaultUri: string;
  readonly secretName: string;
  readonly purpose: "GITHUB_APP_PRIVATE_KEY";
}
export interface AzureKeyVaultSecretReader {
  getSecret(reference: AzureKeyVaultSecretReference, options?: { signal?: AbortSignal; deadline?: number }): Promise<string>;
}
export function githubAppPrivateKeyReference(secretName: string = GITHUB_APP_RUNTIME.secretName): AzureKeyVaultSecretReference {
  if (secretName !== GITHUB_APP_RUNTIME.secretName) throw new Error("Unexpected GitHub App secret reference.");
  return Object.freeze({ vaultUri: GITHUB_APP_RUNTIME.vaultUri, secretName, purpose: "GITHUB_APP_PRIVATE_KEY" });
}
export async function retrieveGitHubAppPrivateKey(reader: AzureKeyVaultSecretReader, secretName = GITHUB_APP_RUNTIME.secretName, options?: { signal?: AbortSignal; deadline?: number }): Promise<string> {
  const value = await reader.getSecret(githubAppPrivateKeyReference(secretName), options);
  if (!value.trim() || (!value.includes("BEGIN RSA PRIVATE KEY") && !value.includes("BEGIN PRIVATE KEY"))) throw new Error("GitHub App private key is invalid.");
  return value;
}

export class EphemeralSecretHandle {
  private value?: string;
  constructor(value: string) { if (!value) throw new Error("Secret handle cannot be empty."); this.value = value; }
  use<T>(callback: (value: string) => T): T { if (!this.value) throw new Error("Secret handle is no longer available."); return callback(this.value); }
  drop(): void { this.value = undefined; }
  get available(): boolean { return this.value !== undefined; }
}

export interface GitHubAppJwtClaims { readonly iat: number; readonly exp: number; readonly iss: string | number; }
export interface GitHubAppJwtOptions { readonly nowSeconds: number; readonly ttlSeconds?: number; readonly clockSkewSeconds?: number; readonly issuer?: "client_id" | "app_id"; readonly signal?: AbortSignal; }
function assertNotAborted(signal?: AbortSignal): void { if (signal?.aborted) throw new Error("GitHub App operation cancelled."); }
export function createGitHubAppJwtClaims(options: GitHubAppJwtOptions): GitHubAppJwtClaims {
  const ttl = options.ttlSeconds ?? 540;
  const skew = options.clockSkewSeconds ?? 60;
  if (!Number.isInteger(options.nowSeconds) || options.nowSeconds <= 0 || !Number.isInteger(ttl) || ttl <= 0 || ttl > 600 || !Number.isInteger(skew) || skew < 0 || skew > 120) throw new Error("Invalid JWT clock window.");
  assertNotAborted(options.signal);
  return Object.freeze({ iat: options.nowSeconds - skew, exp: options.nowSeconds + ttl, iss: options.issuer === "app_id" ? GITHUB_APP_RUNTIME.appId : GITHUB_APP_RUNTIME.clientId });
}
function base64Url(value: string): string { return Buffer.from(value).toString("base64url"); }
export function signGitHubAppJwt(privateKey: string, options: GitHubAppJwtOptions): string {
  assertNotAborted(options.signal);
  const claims = createGitHubAppJwtClaims(options);
  const encoded = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify(claims))}`;
  try { const signer = createSign("RSA-SHA256"); signer.update(encoded); return `${encoded}.${signer.sign(privateKey, "base64url")}`; } catch { throw new Error("GitHub App JWT signing failed."); }
}

export interface HttpResponse { readonly status: number; readonly headers: Readonly<Record<string, string>>; readonly body: unknown; }
export type HttpTransport = (request: { method: string; url: string; headers: Readonly<Record<string, string>>; body?: unknown; signal?: AbortSignal }) => Promise<HttpResponse>;
export interface InstallationToken { readonly token: string; readonly expiresAt: string; readonly permissions: Readonly<Record<string, string>>; readonly repositoryIds?: readonly number[]; }
export interface InstallationTokenRequest { readonly method: "POST"; readonly path: `/app/installations/${number}/access_tokens`; readonly repositoryIds: readonly number[]; readonly permissions: Readonly<Record<string, "read">>; }
export function createInstallationTokenRequest(repositoryId: number, grantedPermissions: Readonly<Record<string, string>>): InstallationTokenRequest {
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) throw new Error("Repository ID is invalid.");
  for (const level of Object.values(grantedPermissions)) if (WRITE_LEVELS.has(level)) throw new Error("GitHub App has unexpected write permission.");
  const permissions: Record<string, "read"> = {};
  for (const permission of READ_ONLY_GITHUB_PERMISSIONS) if (grantedPermissions[permission] === "read") permissions[permission] = "read";
  return Object.freeze({ method: "POST", path: `/app/installations/${GITHUB_APP_RUNTIME.installationId}/access_tokens`, repositoryIds: [repositoryId], permissions: Object.freeze(permissions) });
}
export function validateInstallationToken(token: InstallationToken, now = new Date(), expectedRepositoryId?: number): InstallationToken {
  if (!token.token.trim() || !token.expiresAt || !Object.keys(token.permissions).length) throw new Error("Installation token response is incomplete.");
  const expiresAt = new Date(token.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) throw new Error("Installation token is expired.");
  if (expectedRepositoryId !== undefined && (!token.repositoryIds || token.repositoryIds.length !== 1 || token.repositoryIds[0] !== expectedRepositoryId)) throw new Error("Installation token repository scope is invalid.");
  for (const [permission, level] of Object.entries(token.permissions)) if (!READ_ONLY_GITHUB_PERMISSIONS.includes(permission as ReadOnlyGitHubPermission) || level !== "read") throw new Error("Installation token has non-read-only permissions.");
  return Object.freeze({ ...token, permissions: Object.freeze({ ...token.permissions }), repositoryIds: token.repositoryIds && Object.freeze([...token.repositoryIds]) });
}
export class GitHubInstallationTokenExchanger {
  private exchanged = false;
  constructor(private readonly transport: HttpTransport) {}
  async exchange(jwt: string, request: InstallationTokenRequest, signal?: AbortSignal): Promise<InstallationToken> {
    if (this.exchanged) throw new Error("Installation token exchange is single-use.");
    this.exchanged = true;
    assertNotAborted(signal);
    const response = await this.transport({ method: "POST", url: `${GITHUB_APP_RUNTIME.apiBase}${request.path}`, headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${jwt}` }, body: { repositories: request.repositoryIds, permissions: request.permissions }, signal });
    if (response.status !== 201) throw new Error(`GitHub installation token exchange failed with status ${response.status}.`);
    const body = response.body as Record<string, unknown>;
    return validateInstallationToken({ token: String(body.token ?? ""), expiresAt: String(body.expires_at ?? ""), permissions: (body.permissions ?? {}) as Record<string, string>, repositoryIds: body.repository_selection === "selected" ? (body.repositories as number[] | undefined) : undefined });
  }
}

const smokePaths = ["/installation/repositories", `/repos/${GITHUB_APP_RUNTIME.repository}`, `/repos/${GITHUB_APP_RUNTIME.repository}/issues`, `/repos/${GITHUB_APP_RUNTIME.repository}/pulls`, `/repos/${GITHUB_APP_RUNTIME.repository}/actions/runs`, `/repos/${GITHUB_APP_RUNTIME.repository}/commits`, `/repos/${GITHUB_APP_RUNTIME.repository}/releases`] as const;
function allowedPath(path: string): boolean {
  const parsed = new URL(path, GITHUB_APP_RUNTIME.apiBase);
  if (parsed.origin !== GITHUB_APP_RUNTIME.apiBase || parsed.pathname === "/graphql") return false;
  for (const key of parsed.searchParams.keys()) if (!["per_page", "page", "state", "branch"].includes(key)) return false;
  return smokePaths.some((allowed) => parsed.pathname === allowed);
}
export interface ReadReceipt { readonly endpointClass: string; readonly status: number; readonly fetchedAt: string; readonly latencyMs: number; readonly itemCount?: number; }
export class GitHubReadOnlyInstallationClient {
  constructor(private readonly transport: HttpTransport, private readonly token: EphemeralSecretHandle) {}
  async get(path: string, endpointClass: string, signal?: AbortSignal): Promise<{ readonly body: unknown; readonly receipt: ReadReceipt }> {
    if (!allowedPath(path)) throw new Error("GitHub installation client rejected endpoint.");
    const started = Date.now();
    const response = await this.token.use((token) => this.transport({ method: "GET", url: `${GITHUB_APP_RUNTIME.apiBase}${path}`, headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${token}` }, signal }));
    const body = response.body as { items?: unknown[] };
    return { body, receipt: Object.freeze({ endpointClass, status: response.status, fetchedAt: new Date().toISOString(), latencyMs: Date.now() - started, itemCount: Array.isArray(body?.items) ? body.items.length : undefined }) };
  }
}

export type RuntimeLifecycleState = "DECLARED" | "VAULT_READY" | "JWT_READY" | "TOKEN_READY" | "SMOKE_RUNNING" | "READ_ONLY_VALIDATED" | "DISABLED" | "REVOKED" | "ERROR";
export class GitHubAppRuntimeLifecycle {
  private _state: RuntimeLifecycleState = "DECLARED";
  constructor(private readonly jwt?: EphemeralSecretHandle, private readonly token?: EphemeralSecretHandle) {}
  get state(): RuntimeLifecycleState { return this._state; }
  transition(state: RuntimeLifecycleState): void { if (this._state === "DISABLED" || this._state === "REVOKED") throw new Error("GitHub App runtime is disabled."); this._state = state; }
  disable(): void { this.jwt?.drop(); this.token?.drop(); this._state = "DISABLED"; }
  revoke(): void { this.jwt?.drop(); this.token?.drop(); this._state = "REVOKED"; }
}
export const READ_ONLY_SMOKE_TEST_PLAN = Object.freeze(["Verify App and installation identity with JWT-authenticated GETs.", "Exchange exactly one repository-restricted installation token.", "Execute only bounded GET requests against api.github.com.", "Record sanitized receipts without response bodies or credentials.", "Drop all credential handles and leave provider flags disabled."] as const);
