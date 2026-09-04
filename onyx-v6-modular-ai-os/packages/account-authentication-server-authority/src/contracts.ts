export type AuthenticationAssurance = "low" | "standard" | "strong";
export type ServerAuthorityCode = "AUTHENTICATED" | "UNAUTHENTICATED" | "TOKEN_MALFORMED" | "TOKEN_SIGNATURE_INVALID" | "TOKEN_ISSUER_INVALID" | "TOKEN_AUDIENCE_INVALID" | "TOKEN_EXPIRED" | "TOKEN_NOT_YET_VALID" | "SESSION_EXPIRED" | "SESSION_REVOKED" | "DEVICE_REVOKED" | "ACCOUNT_MISMATCH" | "POLICY_UNAVAILABLE" | "AUDIT_UNAVAILABLE" | "RATE_LIMITED" | "INVALID_REQUEST" | "SERVICE_UNAVAILABLE" | "NOT_ASSESSABLE";

export interface AuthenticatedRequestContext {
  readonly schemaVersion: "ACCOUNT_AUTHORITY_CONTEXT_V1";
  readonly opaqueAccountScope: `account-scope_${string}`;
  readonly sessionId: `session_${string}`;
  readonly sessionVersion: number;
  readonly authenticationAssurance: AuthenticationAssurance;
  readonly deviceReference: `device_${string}`;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly policyVersion: string;
  readonly revocationVersion: number;
  readonly requestId: `request_${string}`;
  readonly issuer: string;
  readonly audience: string;
}

export interface ServerAuthorityDecision {
  readonly allowed: boolean;
  readonly code: ServerAuthorityCode;
  readonly context?: AuthenticatedRequestContext;
}

export type VerificationDecision = ServerAuthorityDecision & { readonly proof?: VerifiedProof };

export interface TokenClaims {
  readonly sub?: string;
  readonly sid?: string;
  readonly sv?: number;
  readonly dv?: string;
  readonly rv?: number;
  readonly assurance?: AuthenticationAssurance;
  readonly iss?: string;
  readonly aud?: string | readonly string[];
  readonly iat?: number;
  readonly exp?: number;
  readonly nbf?: number;
}

export interface VerifiedProof { readonly claims: TokenClaims; readonly keyId: string; }
export interface TokenVerifier { verify(proof: string, nowSeconds: number): VerificationDecision; }
export interface AuthenticationProvider {
  verifyProof(proof: string, nowSeconds: number): VerificationDecision;
  deriveAuthenticatedContext(proof: VerifiedProof, requestId: `request_${string}`): AuthenticatedRequestContext;
  invalidateSessionProjection(sessionId: string): void;
  invalidateDeviceProjection(deviceId: string): void;
  describeCapabilities(): readonly string[];
}

export interface AuthorizationPolicy { readonly available: boolean; allows(context: AuthenticatedRequestContext, targetScope: string): boolean; }
export interface AuditEnvelope { readonly schemaVersion: "ACCOUNT_AUTHORITY_AUDIT_V1"; readonly eventId: `audit_${string}`; readonly requestId: string; readonly opaqueAccountScope: string; readonly sessionReference: string; readonly deviceReference: string; readonly action: string; readonly targetType: string; readonly policyVersion: string; readonly decision: ServerAuthorityCode; readonly reasonCode: string; readonly trustedTime: string; readonly integrityHash: string; }
export interface AuditSink { readonly available: boolean; append(envelope: AuditEnvelope): void; }
export interface RateLimiter { reserve(context: AuthenticatedRequestContext, requestId: string): boolean; }
export interface RequestIdGenerator { next(): string | undefined; }
export interface AccountRecordRepository { readAccountAuthority(scope: string): number | undefined; compareAndSetSessionRevocation(sessionId: string, expected: number, next: number): boolean; readRevocationVersion(sessionId: string): number; reserveIdempotency(operationId: string): boolean; appendAudit(envelope: AuditEnvelope): void; }

export interface ProtectedRequest { readonly method: string; readonly contentType?: string; readonly body?: string; readonly authorization?: string; readonly requestId?: string; readonly targetScope?: string; readonly action: string; readonly governed: boolean; }
export interface ProtectedResponse { readonly status: number; readonly code: ServerAuthorityCode; readonly headers: Readonly<Record<string, string>>; readonly body: string; }
export interface EntraAdapterConfiguration { readonly issuer: string; readonly audience: string; readonly jwksUri: string; readonly allowedAlgorithms: readonly string[]; readonly clockSkewSeconds: number; readonly opaqueScopeSalt: string; readonly claimMappingVersion: "ENTRA_EXTERNAL_ID_V1"; }

export interface AcceptanceRegistryRecord { readonly id: string; readonly requirement: string; readonly riskTier: "critical" | "high" | "medium"; readonly implementationState: "covered" | "pending"; readonly testMapping: string; readonly providerDependency: string; readonly rolloutStage: number; readonly authorityImpact: string; }