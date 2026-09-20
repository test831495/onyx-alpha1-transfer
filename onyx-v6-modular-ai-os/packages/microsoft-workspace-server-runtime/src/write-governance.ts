export type MicrosoftWriteApprovalRecord = {
  readonly approvalId: string;
  readonly canonicalAccountRef: string;
  readonly tenantId: string;
  readonly sessionRef: string;
  readonly targetFingerprint: string;
  readonly requestFingerprint: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly consumedAt?: string;
};

export type MicrosoftWriteExecutionRequest = {
  readonly canonicalAccountRef: string;
  readonly tenantId: string;
  readonly sessionRef: string;
  readonly targetFingerprint: string;
  readonly requestFingerprint: string;
  readonly oauthScopeGranted: boolean;
  readonly capabilityEligible: boolean;
  readonly auditAvailable: boolean;
  readonly policyAvailable: boolean;
  readonly now: number;
};

export type MicrosoftWriteDenialReason =
  | "OAUTH_SCOPE_NOT_GRANTED"
  | "CAPABILITY_NOT_ELIGIBLE"
  | "APPROVAL_ABSENT"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_REPLAYED"
  | "APPROVAL_ACCOUNT_MISMATCH"
  | "APPROVAL_TENANT_MISMATCH"
  | "APPROVAL_SESSION_MISMATCH"
  | "APPROVAL_TARGET_MISMATCH"
  | "APPROVAL_REQUEST_CHANGED"
  | "AUDIT_UNAVAILABLE"
  | "POLICY_UNAVAILABLE";

export type MicrosoftWriteExecutionDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: MicrosoftWriteDenialReason };

// WRITE_EXECUTION_ALLOWED = OAUTH_SCOPE_GRANTED AND CAPABILITY_ELIGIBLE AND VALID_EXPLICIT_APPROVAL
//   AND ACCOUNT_MATCH AND TENANT_MATCH AND SESSION_MATCH AND AUDIT_AVAILABLE AND POLICY_AVAILABLE.
// Every unmet condition fails closed; there is no default-allow path.
export function evaluateMicrosoftWriteExecution(request: MicrosoftWriteExecutionRequest, approval: MicrosoftWriteApprovalRecord | undefined): MicrosoftWriteExecutionDecision {
  if (!request.oauthScopeGranted) return { allowed: false, reason: "OAUTH_SCOPE_NOT_GRANTED" };
  if (!request.capabilityEligible) return { allowed: false, reason: "CAPABILITY_NOT_ELIGIBLE" };
  if (!request.auditAvailable) return { allowed: false, reason: "AUDIT_UNAVAILABLE" };
  if (!request.policyAvailable) return { allowed: false, reason: "POLICY_UNAVAILABLE" };
  if (!approval) return { allowed: false, reason: "APPROVAL_ABSENT" };
  if (approval.consumedAt) return { allowed: false, reason: "APPROVAL_REPLAYED" };
  if (new Date(approval.expiresAt).getTime() <= request.now) return { allowed: false, reason: "APPROVAL_EXPIRED" };
  if (approval.canonicalAccountRef !== request.canonicalAccountRef) return { allowed: false, reason: "APPROVAL_ACCOUNT_MISMATCH" };
  if (approval.tenantId !== request.tenantId) return { allowed: false, reason: "APPROVAL_TENANT_MISMATCH" };
  if (approval.sessionRef !== request.sessionRef) return { allowed: false, reason: "APPROVAL_SESSION_MISMATCH" };
  if (approval.targetFingerprint !== request.targetFingerprint) return { allowed: false, reason: "APPROVAL_TARGET_MISMATCH" };
  if (approval.requestFingerprint !== request.requestFingerprint) return { allowed: false, reason: "APPROVAL_REQUEST_CHANGED" };
  return { allowed: true };
}

// Synthetic write-validation proposals are evaluated by the same invariant but never execute;
// callers must not route a synthetic-valid decision into any general mutation path.
export function evaluateMicrosoftSyntheticWriteValidation(request: MicrosoftWriteExecutionRequest, approval: MicrosoftWriteApprovalRecord | undefined): MicrosoftWriteExecutionDecision {
  return evaluateMicrosoftWriteExecution(request, approval);
}
