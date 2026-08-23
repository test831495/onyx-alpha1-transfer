export type RoleName =
  | "primary_owner"
  | "household_administrator"
  | "standard_family_member"
  | "supervised_member"
  | "guest"
  | "device_service_identity";

export interface RoleDefinition {
  name: RoleName;
  label: string;
  inheritsFrom?: RoleName;
  canAccessOwnerHistory: boolean;
  canApproveSensitiveAction: boolean;
  canCreateConnectorGrant: boolean;
}

export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
  primary_owner: {
    name: "primary_owner",
    label: "Primary Owner",
    canAccessOwnerHistory: true,
    canApproveSensitiveAction: true,
    canCreateConnectorGrant: true,
  },
  household_administrator: {
    name: "household_administrator",
    label: "Household Administrator",
    canAccessOwnerHistory: false,
    canApproveSensitiveAction: false,
    canCreateConnectorGrant: false,
  },
  standard_family_member: {
    name: "standard_family_member",
    label: "Family Member",
    canAccessOwnerHistory: false,
    canApproveSensitiveAction: false,
    canCreateConnectorGrant: false,
  },
  supervised_member: {
    name: "supervised_member",
    label: "Supervised Member",
    canAccessOwnerHistory: false,
    canApproveSensitiveAction: false,
    canCreateConnectorGrant: false,
  },
  guest: {
    name: "guest",
    label: "Guest",
    canAccessOwnerHistory: false,
    canApproveSensitiveAction: false,
    canCreateConnectorGrant: false,
  },
  device_service_identity: {
    name: "device_service_identity",
    label: "Connected Device",
    canAccessOwnerHistory: false,
    canApproveSensitiveAction: false,
    canCreateConnectorGrant: false,
  },
};
