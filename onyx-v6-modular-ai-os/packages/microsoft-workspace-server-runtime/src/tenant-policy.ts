export const MICROSOFT_ACCOUNT_KINDS = ["ORGANIZATIONAL", "PERSONAL", "GUEST", "UNKNOWN"] as const;
export type MicrosoftAccountKind = (typeof MICROSOFT_ACCOUNT_KINDS)[number];

export const MICROSOFT_TENANT_ELIGIBILITY_STATES = [
  "ELIGIBLE",
  "TENANT_MISMATCH",
  "TENANT_UNKNOWN",
  "TENANT_REQUIRED_MISSING",
] as const;
export type MicrosoftTenantEligibility = (typeof MICROSOFT_TENANT_ELIGIBILITY_STATES)[number];

export type MicrosoftTenantPolicyInput = {
  readonly requiredTenantId?: string;
  readonly accountTenantId?: string;
  readonly accountKind: MicrosoftAccountKind;
};

// Authority selectors (not concrete tenant IDs) that MSAL/Entra accept in the authority URL.
const MICROSOFT_AUTHORITY_SELECTORS = new Set(["common", "organizations", "consumers"]);

// `common`/`organizations`/`consumers` only select the sign-in authority surface; they are
// never treated as proof that a specific tenant is authorized. Authority selection and
// tenant eligibility are evaluated independently.
export function classifyMicrosoftTenantEligibility(input: MicrosoftTenantPolicyInput): MicrosoftTenantEligibility {
  if (input.accountKind === "UNKNOWN") return "TENANT_UNKNOWN";
  if (input.requiredTenantId) {
    if (!input.accountTenantId) return "TENANT_REQUIRED_MISSING";
    return input.accountTenantId === input.requiredTenantId ? "ELIGIBLE" : "TENANT_MISMATCH";
  }
  if (!input.accountTenantId) return "TENANT_UNKNOWN";
  return "ELIGIBLE";
}

export function deriveMicrosoftAccountKind(claims: { readonly acct?: unknown; readonly tid?: unknown; readonly isGuest?: unknown }, homeTenantId?: string): MicrosoftAccountKind {
  const acct = claims.acct;
  const isPersonal = acct === 0 || acct === "0" || claims.tid === "consumers";
  if (isPersonal) return "PERSONAL";
  if (claims.isGuest === true) return "GUEST";
  const isOrganizational = acct === 1 || acct === "1" || typeof claims.tid === "string";
  if (isOrganizational) {
    if (homeTenantId && !MICROSOFT_AUTHORITY_SELECTORS.has(homeTenantId) && typeof claims.tid === "string" && claims.tid !== homeTenantId) return "GUEST";
    return "ORGANIZATIONAL";
  }
  return "UNKNOWN";
}

export type MicrosoftSharePointPolicyProjection =
  | "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT"
  | "SHAREPOINT_GUEST_SITE_AVAILABLE"
  | "SHAREPOINT_ORGANIZATIONAL_ELIGIBLE"
  | "SHAREPOINT_POLICY_BLOCKED";

// SharePoint is never available to personal-account contexts regardless of scope grant;
// tenant name and email domain are never used to infer eligibility.
export function projectMicrosoftSharePointPolicy(accountKind: MicrosoftAccountKind, tenantEligibility: MicrosoftTenantEligibility): MicrosoftSharePointPolicyProjection {
  if (accountKind === "PERSONAL") return "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT";
  if (tenantEligibility !== "ELIGIBLE") return "SHAREPOINT_POLICY_BLOCKED";
  if (accountKind === "GUEST") return "SHAREPOINT_GUEST_SITE_AVAILABLE";
  return "SHAREPOINT_ORGANIZATIONAL_ELIGIBLE";
}
