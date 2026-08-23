export interface PermissionDecisionInput {
  authenticated: boolean;
  accountId?: string;
  role?: string;
  permission?: string;
  policyVersion?: string;
  sessionAssurance?: string;
  target?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  requiredPermission?: string;
}

export function denyByDefaultPermissionDecision(input: PermissionDecisionInput): PermissionDecision {
  const accountId = input.accountId?.trim();
  const role = input.role?.trim();
  const permission = input.permission?.trim();
  const policyVersion = input.policyVersion?.trim();
  const sessionAssurance = input.sessionAssurance?.trim();
  const target = input.target?.trim() || "unknown";

  if (!input.authenticated) {
    return { allowed: false, reason: "DENY_BY_DEFAULT: account is not authenticated" };
  }

  if (!accountId) {
    return { allowed: false, reason: "DENY_BY_DEFAULT: authenticated account is missing" };
  }

  if (!role) {
    return { allowed: false, reason: "DENY_BY_DEFAULT: assigned role is missing" };
  }

  if (role === "primary_owner" && accountId.toLowerCase() !== "rahul") {
    return { allowed: false, reason: "DENY_BY_DEFAULT: primary owner must be Rahul" };
  }

  if (!permission) {
    return { allowed: false, reason: "DENY_BY_DEFAULT: required permission is missing", requiredPermission: target };
  }

  if (!policyVersion || policyVersion !== "1.0.0") {
    return { allowed: false, reason: "DENY_BY_DEFAULT: policy version is absent or stale", requiredPermission: permission };
  }

  if (!sessionAssurance || sessionAssurance !== "current") {
    return { allowed: false, reason: "DENY_BY_DEFAULT: session assurance is absent or invalid", requiredPermission: permission };
  }

  return { allowed: true, reason: "EXPLICIT_PERMISSION_GRANT: request is allowed by policy", requiredPermission: permission };
}
