import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AcceptanceRegistryRecord, AccountRecordRepository, AuditEnvelope, AuditSink, AuthenticatedRequestContext, AuthenticationProvider, AuthorizationPolicy, EntraAdapterConfiguration, ProtectedRequest, ProtectedResponse, RateLimiter, RequestIdGenerator, ServerAuthorityCode, ServerAuthorityDecision, TokenClaims, TokenVerifier, VerificationDecision, VerifiedProof } from "./contracts";

const MAX_BODY_BYTES = 4096;
const header = { "cache-control": "no-store", "content-type": "application/json", "x-content-type-options": "nosniff" } as const;
const deny = (code: ServerAuthorityCode): VerificationDecision => Object.freeze({ allowed: false, code });
const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string): string | undefined => { try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return undefined; } };
const digest = (key: string, value: string) => createHmac("sha256", key).update(value).digest("base64url");
const hash = (value: string) => createHmac("sha256", "account-authority-audit-v1").update(value).digest("hex");
const requestIdPattern = /^request_[A-Za-z0-9_-]{1,96}$/;
export const cryptoRequestIdGenerator: RequestIdGenerator = Object.freeze({ next: () => `request_${randomUUID()}` });

interface JwtHeader { readonly alg?: string; readonly kid?: string; }

export class SyntheticHmacTokenVerifier implements TokenVerifier {
  public constructor(private readonly issuer: string, private readonly audience: string, private readonly keyById: Readonly<Record<string, string>>, private readonly allowedAlgorithms: readonly string[] = ["HS256"], private readonly clockSkewSeconds = 30) {}
  public verify(proof: string, nowSeconds: number): ServerAuthorityDecision & { readonly proof?: VerifiedProof } {
    const parts = proof.split(".");
    if (parts.length !== 3) return deny("TOKEN_MALFORMED");
    const [encodedHeader, encodedClaims, encodedSignature] = parts as [string, string, string];
    const headerText = decode(encodedHeader); const claimsText = decode(encodedClaims);
    if (!headerText || !claimsText) return deny("TOKEN_MALFORMED");
    let parsedHeader: JwtHeader; let claims: TokenClaims;
    try { parsedHeader = JSON.parse(headerText) as JwtHeader; claims = JSON.parse(claimsText) as TokenClaims; } catch { return deny("TOKEN_MALFORMED"); }
    if (parsedHeader.alg !== "HS256" || !this.allowedAlgorithms.includes(parsedHeader.alg)) return deny("TOKEN_MALFORMED");
    const keyId = parsedHeader.kid;
    const signingKey = keyId ? this.keyById[keyId] : undefined;
    if (!keyId || !signingKey) return deny("TOKEN_SIGNATURE_INVALID");
    const expected = Buffer.from(digest(signingKey, `${encodedHeader}.${encodedClaims}`)); const actual = Buffer.from(encodedSignature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return deny("TOKEN_SIGNATURE_INVALID");
    if (claims.iss !== this.issuer) return deny("TOKEN_ISSUER_INVALID");
    const audiences = typeof claims.aud === "string" ? [claims.aud] : claims.aud;
    if (!audiences?.includes(this.audience)) return deny("TOKEN_AUDIENCE_INVALID");
    if (typeof claims.exp !== "number" || nowSeconds - this.clockSkewSeconds >= claims.exp) return deny("TOKEN_EXPIRED");
    if (typeof claims.nbf === "number" && nowSeconds + this.clockSkewSeconds < claims.nbf) return deny("TOKEN_NOT_YET_VALID");
    if (!claims.sub || !claims.sid || !claims.dv || typeof claims.sv !== "number" || typeof claims.rv !== "number" || !claims.assurance) return deny("UNAUTHENTICATED");
    return Object.freeze({ allowed: true, code: "AUTHENTICATED" as const, proof: Object.freeze({ claims: Object.freeze({ ...claims }), keyId }) });
  }
}

export class SyntheticAuthenticationProvider implements AuthenticationProvider {
  private readonly revokedSessions = new Set<string>(); private readonly revokedDevices = new Set<string>();
  public constructor(private readonly verifier: TokenVerifier, private readonly scopeSalt: string) {}
  public verifyProof(proof: string, nowSeconds: number) { const result = this.verifier.verify(proof, nowSeconds); if (!result.allowed || !result.proof) return result; if (this.revokedSessions.has(result.proof.claims.sid ?? "")) return deny("SESSION_REVOKED"); return this.revokedDevices.has(result.proof.claims.dv ?? "") ? deny("DEVICE_REVOKED") : result; }
  public deriveAuthenticatedContext(proof: VerifiedProof, requestId: `request_${string}`): AuthenticatedRequestContext {
    const claims = proof.claims;
    const audience = typeof claims.aud === "string" ? claims.aud : claims.aud?.[0];
    if (!claims.sub || !claims.sid || !claims.dv || !claims.iss || !audience || claims.sv === undefined || claims.rv === undefined || !claims.assurance) throw new Error("verified proof is incomplete");
    return Object.freeze({ schemaVersion: "ACCOUNT_AUTHORITY_CONTEXT_V1", opaqueAccountScope: `account-scope_${digest(this.scopeSalt, `${claims.iss}|${audience}|${claims.sub}`)}`, sessionId: `session_${claims.sid}`, sessionVersion: claims.sv, authenticationAssurance: claims.assurance, deviceReference: `device_${digest(this.scopeSalt, claims.dv)}`, issuedAt: new Date((claims.iat ?? 0) * 1000).toISOString(), expiresAt: new Date((claims.exp ?? 0) * 1000).toISOString(), policyVersion: "policy-1", revocationVersion: claims.rv, requestId, issuer: claims.iss, audience });
  }
  public invalidateSessionProjection(sessionId: string): void { this.revokedSessions.add(sessionId); }
  public invalidateDeviceProjection(deviceId: string): void { this.revokedDevices.add(deviceId); }
  public describeCapabilities(): readonly string[] { return Object.freeze(["synthetic-verification", "server-derived-opaque-scope", "session-revocation-projection"]); }
}

export const createEntraAdapterSeam = (configuration: EntraAdapterConfiguration, verifier: TokenVerifier): AuthenticationProvider => new SyntheticAuthenticationProvider(verifier, configuration.opaqueScopeSalt);
export function validateEntraConfiguration(configuration: EntraAdapterConfiguration): boolean { return configuration.issuer.startsWith("https://") && configuration.audience.length > 0 && configuration.jwksUri.startsWith("https://") && configuration.allowedAlgorithms.includes("RS256") && configuration.clockSkewSeconds >= 0 && configuration.clockSkewSeconds <= 300 && configuration.opaqueScopeSalt.length >= 16; }

export const AUTHORITY_ACCEPTANCE_REGISTRY: readonly AcceptanceRegistryRecord[] = Object.freeze([
  { id: "AUTHN-001", requirement: "valid proof verification", riskTier: "critical", implementationState: "covered", testMapping: "foundation valid token", providerDependency: "synthetic verifier", rolloutStage: 0, authorityImpact: "authentication" },
  { id: "SESSION-001", requirement: "session revocation", riskTier: "critical", implementationState: "covered", testMapping: "foundation revoked session", providerDependency: "in-memory adapter", rolloutStage: 0, authorityImpact: "session validity" },
  { id: "ACCOUNT-001", requirement: "opaque server-derived account scope", riskTier: "critical", implementationState: "covered", testMapping: "foundation account isolation", providerDependency: "none", rolloutStage: 0, authorityImpact: "account isolation" },
  { id: "DEVICE-001", requirement: "device revocation", riskTier: "high", implementationState: "covered", testMapping: "foundation revoked device", providerDependency: "in-memory adapter", rolloutStage: 0, authorityImpact: "mutation guard" },
  { id: "SERVER-AUTHORITY-001", requirement: "protected request pipeline", riskTier: "critical", implementationState: "covered", testMapping: "foundation fail-closed pipeline", providerDependency: "none", rolloutStage: 0, authorityImpact: "server authority" },
  { id: "AUDIT-001", requirement: "privacy-safe audit", riskTier: "high", implementationState: "covered", testMapping: "foundation audit redaction", providerDependency: "in-memory adapter", rolloutStage: 0, authorityImpact: "governance" },
  { id: "DEPLOY-001", requirement: "live provider deployment", riskTier: "high", implementationState: "pending", testMapping: "provider setup gate", providerDependency: "Entra and Cosmos", rolloutStage: 2, authorityImpact: "activation" }
]);

export class InMemoryAccountRecordRepository implements AccountRecordRepository {
  private readonly revocations = new Map<string, number>(); private readonly operations = new Set<string>(); readonly audits: AuditEnvelope[] = [];
  public readAccountAuthority(scope: string): number | undefined { return scope.startsWith("account-scope_") ? 1 : undefined; }
  public compareAndSetSessionRevocation(sessionId: string, expected: number, next: number): boolean { const current = this.readRevocationVersion(sessionId); if (current !== expected) return false; this.revocations.set(sessionId, next); return true; }
  public readRevocationVersion(sessionId: string): number { return this.revocations.get(sessionId) ?? 0; }
  public reserveIdempotency(operationId: string): boolean { if (this.operations.has(operationId)) return false; this.operations.add(operationId); return true; }
  public appendAudit(envelope: AuditEnvelope): void { this.audits.push(envelope); }
}
export class InMemoryAuditSink implements AuditSink { public readonly entries: AuditEnvelope[] = []; public constructor(public readonly available = true) {} public append(envelope: AuditEnvelope): void { if (this.available) this.entries.push(envelope); } }
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { epoch: number; requestIds: Set<string> }>();
  public constructor(private readonly maximumPerScope = 1, private readonly maximumScopes = 128, private readonly windowSeconds = 60, private readonly nowSeconds: () => number = () => 0) {}
  public reserve(context: AuthenticatedRequestContext, requestId: string): boolean {
    if (!context.opaqueAccountScope.startsWith("account-scope_") || !/^request_[A-Za-z0-9_-]{1,96}$/.test(requestId) || this.maximumPerScope < 1 || this.maximumScopes < 1 || this.windowSeconds < 1) return false;
    const epoch = Math.floor(this.nowSeconds() / this.windowSeconds); const existing = this.buckets.get(context.opaqueAccountScope);
    if (existing && existing.epoch !== epoch) this.buckets.delete(context.opaqueAccountScope);
    const oldestScope = this.buckets.keys().next().value;
    if (!this.buckets.has(context.opaqueAccountScope) && this.buckets.size >= this.maximumScopes && oldestScope) this.buckets.delete(oldestScope);
    const bucket = this.buckets.get(context.opaqueAccountScope) ?? { epoch, requestIds: new Set<string>() };
    if (bucket.requestIds.has(requestId) || bucket.requestIds.size >= this.maximumPerScope) return false;
    bucket.requestIds.add(requestId); this.buckets.set(context.opaqueAccountScope, bucket); return true;
  }
}
export const sameAccountPolicy = (available = true): AuthorizationPolicy => ({ available, allows: (context, targetScope) => context.opaqueAccountScope === targetScope });

export function protectRequest(request: ProtectedRequest, provider: AuthenticationProvider, policy: AuthorizationPolicy, audit: AuditSink, limiter: RateLimiter, nowSeconds: number, requestIdGenerator: RequestIdGenerator = cryptoRequestIdGenerator): ProtectedResponse {
  const response = (status: number, code: ServerAuthorityCode): ProtectedResponse => Object.freeze({ status, code, headers: header, body: JSON.stringify({ code }) });
  if (request.method !== "POST") return response(405, "INVALID_REQUEST");
  if (request.contentType !== "application/json" || !request.body || Buffer.byteLength(request.body) > MAX_BODY_BYTES) return response(400, "INVALID_REQUEST");
  const proof = request.authorization?.startsWith("Bearer ") ? request.authorization.slice(7) : "";
  const verified = provider.verifyProof(proof, nowSeconds);
  if (!verified.allowed || !verified.proof) return response(401, verified.code);
  const candidateRequestId = request.requestId ?? requestIdGenerator.next();
  if (!candidateRequestId || !requestIdPattern.test(candidateRequestId)) return response(503, "SERVICE_UNAVAILABLE");
  const requestId = candidateRequestId as `request_${string}`;
  const context = provider.deriveAuthenticatedContext(verified.proof, requestId);
  if (!request.targetScope || !policy.available) return response(403, "POLICY_UNAVAILABLE");
  if (!policy.allows(context, request.targetScope)) return response(403, "ACCOUNT_MISMATCH");
  if (request.governed && !audit.available) return response(503, "AUDIT_UNAVAILABLE");
  if (!limiter.reserve(context, requestId)) return response(429, "RATE_LIMITED");
  const envelope: AuditEnvelope = Object.freeze({ schemaVersion: "ACCOUNT_AUTHORITY_AUDIT_V1", eventId: `audit_${hash(requestId).slice(0, 24)}`, requestId, opaqueAccountScope: context.opaqueAccountScope, sessionReference: context.sessionId, deviceReference: context.deviceReference, action: request.action, targetType: "account-bound-preference", policyVersion: context.policyVersion, decision: "AUTHENTICATED", reasonCode: "ALLOW_SAME_ACCOUNT", trustedTime: new Date(nowSeconds * 1000).toISOString(), integrityHash: hash(`${context.opaqueAccountScope}:${requestId}:AUTHENTICATED`) });
  audit.append(envelope); return response(200, "AUTHENTICATED");
}