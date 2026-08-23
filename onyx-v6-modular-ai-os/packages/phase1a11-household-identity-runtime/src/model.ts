import type { RoleName } from "@onyx/phase1a11-household-foundation-contracts";

export type HouseholdId = `household_${string}`;
export type AccountId = `account_${string}`;
export type MembershipId = `membership_${string}`;
export type RoleId = Uppercase<RoleName>;
export type PermissionId =
  | "OWN_PROFILE_READ" | "OWN_PROFILE_UPDATE" | "OWN_CHARACTER_PREFERENCES"
  | "OWN_CONVERSATION_ACCESS" | "OWN_MEMORY_ACCESS" | "OWN_APPROVED_CONNECTOR_METADATA"
  | "SHARED_HOUSEHOLD_RESOURCE_READ" | "ROUTINE_HOUSEHOLD_SUPPORT" | "HOUSEHOLD_SETTINGS_MANAGEMENT"
  | "DETAILED_PROJECT_JOURNEY_ACCESS" | "BASIC_PROJECT_INFORMATION_ACCESS" | "TECHNICAL_INFORMATION_ACCESS"
  | "COUNCIL_CONTRIBUTION_REQUEST" | "COUNCIL_CONTRIBUTION_RESPONSE" | "OWNER_OVERSIGHT_METADATA"
  | "PROTECTED_OWNER_INSPECTION" | "BREAK_GLASS_REQUEST" | "ROLE_ASSIGNMENT" | "PERMISSION_ASSIGNMENT" | "AUDIT_METADATA_ACCESS";
export type PolicyVersion = `policy-${string}`;
export type RoleVersion = `role-${string}`;
export type PermissionCatalogVersion = `permission-catalog-${string}`;
export type AccountStatus = "active" | "pending" | "suspended" | "disabled" | "expired";
export type MembershipStatus = "active" | "inactive" | "expired";
export type ResourceClassification = "profile" | "private" | "shared_household" | "project_basic" | "project_detailed" | "technical" | "owner_protected";
export type RequestPurpose = "self_service" | "household_support" | "project_information" | "technical_review" | "owner_oversight";
export type PresentationIdentity = "ONYX" | "NOVA" | "ALIAS";

export const CURRENT_POLICY_VERSION: PolicyVersion = "policy-1";
export const CURRENT_ROLE_VERSION: RoleVersion = "role-1";
export const CURRENT_PERMISSION_CATALOG_VERSION: PermissionCatalogVersion = "permission-catalog-1";
export const RAHUL_CANONICAL_ACCOUNT: AccountId = "account_rahul_canonical";

export interface HouseholdAccount { accountId: AccountId; status: AccountStatus; canonicalOwnerReference?: string; identityKind: "human" | "device" | "service" | "character"; }
export interface HouseholdMembership { membershipId: MembershipId; householdId: HouseholdId; accountId: AccountId; roleId: RoleId; status: MembershipStatus; expiresAt?: string; roleVersion: RoleVersion; }
export interface HouseholdIdentityContext { householdId: HouseholdId; account: HouseholdAccount; membership: HouseholdMembership; }
export interface CanonicalOwnerBinding { accountId: AccountId; roleId: RoleId; canonicalOwnerReference: string; }
export interface IdentityValidationResult { valid: boolean; reason: string; technicalReason: string; }

export const CANONICAL_OWNER_BINDING: CanonicalOwnerBinding = {
  accountId: RAHUL_CANONICAL_ACCOUNT, roleId: "PRIMARY_OWNER", canonicalOwnerReference: "rahul-canonical-owner-reference"
};

const knownRoles = new Set<RoleId>(["PRIMARY_OWNER", "HOUSEHOLD_ADMINISTRATOR", "STANDARD_FAMILY_MEMBER", "SUPERVISED_MEMBER", "GUEST", "DEVICE_SERVICE_IDENTITY"]);
function invalid(reason: string, technicalReason: string): IdentityValidationResult { return { valid: false, reason, technicalReason }; }

export function validateIdentity(context: HouseholdIdentityContext, now: string): IdentityValidationResult {
  if (!context?.householdId || !context.account?.accountId || !context.membership?.membershipId) return invalid("Identity information is incomplete.", "MALFORMED_IDENTITY_INPUT");
  const { account, membership } = context;
  if (membership.householdId !== context.householdId) return invalid("This identity is not a member of the requested household.", "HOUSEHOLD_MISMATCH");
  if (membership.accountId !== account.accountId) return invalid("This membership does not belong to the account.", "ACCOUNT_MISMATCH");
  if (!knownRoles.has(membership.roleId) || !["active", "pending", "suspended", "disabled", "expired"].includes(account.status)) return invalid("This identity cannot be verified.", "UNKNOWN_IDENTITY_STATE");
  if (account.status !== "active") return invalid("This account is temporarily unavailable.", `ACCOUNT_${account.status.toUpperCase()}`);
  if (membership.status !== "active") return invalid("This membership is not active.", `MEMBERSHIP_${membership.status.toUpperCase()}`);
  const currentTimeMs = new Date(now).getTime();
  if (Number.isNaN(currentTimeMs)) return invalid("This identity cannot be verified.", "INVALID_VALIDATION_TIME");
  if (membership.expiresAt) {
    const expirationMs = new Date(membership.expiresAt).getTime();
    if (Number.isNaN(expirationMs)) return invalid("This membership has expired.", "INVALID_MEMBERSHIP_EXPIRATION");
    if (expirationMs <= currentTimeMs) return invalid("This membership has expired.", "MEMBERSHIP_EXPIRED");
  }
  if (membership.roleVersion !== CURRENT_ROLE_VERSION) return invalid("This identity uses an outdated role definition.", "STALE_ROLE_VERSION");
  return { valid: true, reason: "Identity is active.", technicalReason: "IDENTITY_VALID" };
}

export function validateCanonicalOwner(bindings: CanonicalOwnerBinding[]): IdentityValidationResult {
  if (bindings.length !== 1) return invalid("The household must have exactly one Primary Owner.", bindings.length === 0 ? "MISSING_CANONICAL_OWNER" : "DUPLICATE_PRIMARY_OWNER");
  const [binding] = bindings;
  if (!binding || binding.accountId !== RAHUL_CANONICAL_ACCOUNT || binding.roleId !== "PRIMARY_OWNER" || binding.canonicalOwnerReference !== CANONICAL_OWNER_BINDING.canonicalOwnerReference) return invalid("The Primary Owner binding is not valid.", "NON_CANONICAL_OWNER_BINDING");
  return { valid: true, reason: "The canonical Primary Owner is valid.", technicalReason: "CANONICAL_OWNER_VALID" };
}

export function validateRoleAssignment(account: HouseholdAccount, roleId: RoleId): IdentityValidationResult {
  if (!knownRoles.has(roleId)) return invalid("This role is not recognized.", "UNKNOWN_ROLE");
  if (roleId === "PRIMARY_OWNER" && (account.accountId !== RAHUL_CANONICAL_ACCOUNT || account.identityKind !== "human")) return invalid("Only the canonical owner account may hold this role.", "OWNER_ASSIGNMENT_PROHIBITED");
  if (account.identityKind !== "human" && roleId !== "DEVICE_SERVICE_IDENTITY") return invalid("Connected identities cannot receive human roles.", "NON_HUMAN_ROLE_ASSIGNMENT");
  return { valid: true, reason: "Role assignment is valid.", technicalReason: "ROLE_ASSIGNMENT_VALID" };
}
