import type { AuthorizationInput } from "./authorization";
import { CANONICAL_OWNER_BINDING, CURRENT_PERMISSION_CATALOG_VERSION, CURRENT_POLICY_VERSION, CURRENT_ROLE_VERSION, RAHUL_CANONICAL_ACCOUNT, type HouseholdAccount, type HouseholdIdentityContext, type HouseholdMembership } from "./model";

export const householdId = "household_demo" as const;
export const rahulAccount: HouseholdAccount = { accountId: RAHUL_CANONICAL_ACCOUNT, status: "active", canonicalOwnerReference: CANONICAL_OWNER_BINDING.canonicalOwnerReference, identityKind: "human" };
export const accounts = {
  rahul: rahulAccount,
  administrator: { accountId: "account_administrator", status: "active", identityKind: "human" },
  family: { accountId: "account_family", status: "active", identityKind: "human" },
  supervised: { accountId: "account_supervised", status: "active", identityKind: "human" },
  guest: { accountId: "account_guest", status: "active", identityKind: "human" },
  device: { accountId: "account_device", status: "active", identityKind: "device" },
  suspended: { accountId: "account_suspended", status: "suspended", identityKind: "human" },
  disabled: { accountId: "account_disabled", status: "disabled", identityKind: "human" },
  expired: { accountId: "account_expired", status: "expired", identityKind: "human" }
} satisfies Record<string, HouseholdAccount>;
export function membership(account: HouseholdAccount, roleId: HouseholdMembership["roleId"], overrides: Partial<HouseholdMembership> = {}): HouseholdMembership { return { membershipId: `membership_${account.accountId.slice(8)}` as HouseholdMembership["membershipId"], householdId, accountId: account.accountId, roleId, status: "active", roleVersion: CURRENT_ROLE_VERSION, ...overrides }; }
export const identities = { rahul: { householdId, account: rahulAccount, membership: membership(rahulAccount, "PRIMARY_OWNER") }, administrator: { householdId, account: accounts.administrator, membership: membership(accounts.administrator, "HOUSEHOLD_ADMINISTRATOR") }, family: { householdId, account: accounts.family, membership: membership(accounts.family, "STANDARD_FAMILY_MEMBER") }, guest: { householdId, account: accounts.guest, membership: membership(accounts.guest, "GUEST") }, device: { householdId, account: accounts.device, membership: membership(accounts.device, "DEVICE_SERVICE_IDENTITY") } } satisfies Record<string, HouseholdIdentityContext>;
export const baseAuthorizationInput: AuthorizationInput = { identity: identities.rahul, requestedPermission: "OWN_PROFILE_READ", assignedPermissions: ["OWN_PROFILE_READ"], targetHouseholdId: householdId, resourceClassification: "profile", purpose: "self_service", policyVersion: CURRENT_POLICY_VERSION, roleVersion: CURRENT_ROLE_VERSION, permissionCatalogVersion: CURRENT_PERMISSION_CATALOG_VERSION, currentTime: "2026-08-23T12:00:00.000Z", sessionValidity: "valid", authenticationAssurance: "sufficient", auditAvailable: true, characterPresentationIdentity: "ONYX" };
