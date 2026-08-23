export const PRIMARY_OWNER_ACCOUNT_ID = "rahul" as const;
export const PRIMARY_OWNER_ROLE = "primary_owner" as const;

export type HouseholdRole =
  | "primary_owner"
  | "household_administrator"
  | "standard_family_member"
  | "supervised_member"
  | "guest"
  | "device_service_identity";

export interface HouseholdMembership {
  householdId: string;
  accountId: string;
  role: HouseholdRole;
  permissions: string[];
  inheritedFrom?: string;
}

export interface HouseholdAccount {
  accountId: string;
  householdId: string;
  label: string;
  role: HouseholdRole;
  isPrimaryOwner: boolean;
}

export const HOUSEHOLD_ROLE_LABELS: Record<HouseholdRole, string> = {
  primary_owner: "Primary Owner",
  household_administrator: "Household Administrator",
  standard_family_member: "Family Member",
  supervised_member: "Supervised Member",
  guest: "Guest",
  device_service_identity: "Connected Device",
};

export function isPrimaryOwnerBound(accountId: string | null | undefined): boolean {
  return accountId !== undefined && accountId !== null && accountId.toLowerCase() === PRIMARY_OWNER_ACCOUNT_ID;
}
