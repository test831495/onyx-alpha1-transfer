export interface FreshAuthenticationEvidence {
  authenticatedAccountId: string;
  freshAt: string;
  assurance: "current" | "stale" | "revoked" | "not_verified";
  evidenceReference: string;
}

export interface OversightRequest {
  requestId: string;
  accountId: string;
  reason: string;
  purpose: string;
  resourceScope: string[];
  durationMinutes: number;
  createdAt: string;
}

export interface OversightMetadataView {
  requestId: string;
  accountId: string;
  reason: string;
  purpose: string;
  resourceScope: string[];
  expiry: string;
  visiblePrivilegedAccessState: "read_only" | "denied" | "expired";
}

export interface ProtectedInspectionRequest extends OversightRequest {
  requiresFreshAuthentication: true;
  accessMode: "read_only";
}

export interface BreakGlassRequest {
  requestId: string;
  accountId: string;
  reason: string;
  purpose: string;
  resourceScope: string[];
  durationMinutes: number;
  freshAuthentication: FreshAuthenticationEvidence;
  auditAvailable: boolean;
}

export interface BreakGlassDecision {
  granted: boolean;
  reason: string;
  grantId?: string;
  readOnly: true;
  expiresAt?: string;
}

export interface BreakGlassGrant {
  grantId: string;
  requestId: string;
  accountId: string;
  resourceScope: string[];
  expiresAt: string;
  readOnly: true;
  nonTransferable: true;
  auditReference: string;
}

export interface BreakGlassExpiration {
  grantId: string;
  expiresAt: string;
  autoRevoked: boolean;
}

export interface BreakGlassRevocation {
  grantId: string;
  revokedAt: string;
  reason: string;
}

export interface PrivilegedAccessState {
  state: "granted" | "denied" | "expired" | "revoked";
  readOnly: boolean;
  accountId: string;
  auditReference: string;
}

export interface OversightEvidenceReference {
  auditReference: string;
  requestId: string;
  resourceScope: string[];
  evidenceStatus: "available" | "blocked" | "not_verified";
}

export function isBreakGlassAllowed(request: BreakGlassRequest): boolean {
  return (
    request.freshAuthentication.assurance === "current" &&
    request.reason.length > 0 &&
    request.purpose.length > 0 &&
    request.resourceScope.length > 0 &&
    request.durationMinutes > 0 &&
    request.auditAvailable === true
  );
}
