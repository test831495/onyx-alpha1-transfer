import type { PermissionId, RoleId } from "./model";

export interface PermissionDefinition { id: PermissionId; label: string; ownerOnly?: boolean; sensitive?: boolean; }
export interface RoleDefinition { id: RoleId; label: string; description: string; allowedPermissions: PermissionId[]; prohibitedPermissions: PermissionId[]; technicalInformationEligible: boolean; projectJourneyEligibility: "detailed" | "basic" | "none"; risk: "critical" | "high" | "moderate" | "low"; }

const PERMISSION_ENTRIES = [
  ["OWN_PROFILE_READ", "View your profile"] as const,
  ["OWN_PROFILE_UPDATE", "Update your profile"] as const,
  ["OWN_CHARACTER_PREFERENCES", "Manage your character preferences"] as const,
  ["OWN_CONVERSATION_ACCESS", "View your conversations"] as const,
  ["OWN_MEMORY_ACCESS", "View your memory"] as const,
  ["OWN_APPROVED_CONNECTOR_METADATA", "View approved connector details"] as const,
  ["SHARED_HOUSEHOLD_RESOURCE_READ", "View shared household resources"] as const,
  ["ROUTINE_HOUSEHOLD_SUPPORT", "Provide routine household support"] as const,
  ["HOUSEHOLD_SETTINGS_MANAGEMENT", "Manage household settings"] as const,
  ["DETAILED_PROJECT_JOURNEY_ACCESS", "View Detailed Project History"] as const,
  ["BASIC_PROJECT_INFORMATION_ACCESS", "View Project Overview"] as const,
  ["TECHNICAL_INFORMATION_ACCESS", "View Technical Information"] as const,
  ["COUNCIL_CONTRIBUTION_REQUEST", "Request a Council contribution"] as const,
  ["COUNCIL_CONTRIBUTION_RESPONSE", "Respond to a Council contribution"] as const,
  ["OWNER_OVERSIGHT_METADATA", "View owner oversight metadata"] as const,
  ["PROTECTED_OWNER_INSPECTION", "Inspect protected owner information"] as const,
  ["BREAK_GLASS_REQUEST", "Request emergency review"] as const,
  ["ROLE_ASSIGNMENT", "Assign roles"] as const,
  ["PERMISSION_ASSIGNMENT", "Assign permissions"] as const,
  ["AUDIT_METADATA_ACCESS", "View audit metadata"] as const,
] satisfies ReadonlyArray<readonly [PermissionId, string]>;

export const PERMISSIONS: PermissionDefinition[] = PERMISSION_ENTRIES.map(([id, label]) => ({ id, label }));
export const PERMISSION_IDS = new Set(PERMISSIONS.map((permission) => permission.id));
const own: PermissionId[] = ["OWN_PROFILE_READ", "OWN_PROFILE_UPDATE", "OWN_CHARACTER_PREFERENCES", "OWN_CONVERSATION_ACCESS", "OWN_MEMORY_ACCESS", "OWN_APPROVED_CONNECTOR_METADATA", "SHARED_HOUSEHOLD_RESOURCE_READ", "ROUTINE_HOUSEHOLD_SUPPORT", "BASIC_PROJECT_INFORMATION_ACCESS", "COUNCIL_CONTRIBUTION_REQUEST", "COUNCIL_CONTRIBUTION_RESPONSE"];
const owner: PermissionId[] = [...own, "HOUSEHOLD_SETTINGS_MANAGEMENT", "DETAILED_PROJECT_JOURNEY_ACCESS", "TECHNICAL_INFORMATION_ACCESS", "OWNER_OVERSIGHT_METADATA", "PROTECTED_OWNER_INSPECTION", "BREAK_GLASS_REQUEST", "ROLE_ASSIGNMENT", "PERMISSION_ASSIGNMENT", "AUDIT_METADATA_ACCESS"];
const noHuman: PermissionId[] = ["DETAILED_PROJECT_JOURNEY_ACCESS", "TECHNICAL_INFORMATION_ACCESS", "OWNER_OVERSIGHT_METADATA", "PROTECTED_OWNER_INSPECTION", "ROLE_ASSIGNMENT", "PERMISSION_ASSIGNMENT"];
export const ROLE_CATALOG: Record<RoleId, RoleDefinition> = {
  PRIMARY_OWNER: { id: "PRIMARY_OWNER", label: "Primary Owner", description: "Rahul's canonical account with superior household authority.", allowedPermissions: owner, prohibitedPermissions: [], technicalInformationEligible: true, projectJourneyEligibility: "detailed", risk: "critical" },
  HOUSEHOLD_ADMINISTRATOR: { id: "HOUSEHOLD_ADMINISTRATOR", label: "Household Administrator", description: "Manages routine household settings below the Primary Owner.", allowedPermissions: [...own, "HOUSEHOLD_SETTINGS_MANAGEMENT"], prohibitedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS", "PROTECTED_OWNER_INSPECTION", "ROLE_ASSIGNMENT", "PERMISSION_ASSIGNMENT"], technicalInformationEligible: false, projectJourneyEligibility: "basic", risk: "high" },
  STANDARD_FAMILY_MEMBER: { id: "STANDARD_FAMILY_MEMBER", label: "Family Member", description: "A household member with isolated personal information.", allowedPermissions: own, prohibitedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS", "TECHNICAL_INFORMATION_ACCESS", "ROLE_ASSIGNMENT", "PERMISSION_ASSIGNMENT"], technicalInformationEligible: false, projectJourneyEligibility: "basic", risk: "moderate" },
  SUPERVISED_MEMBER: { id: "SUPERVISED_MEMBER", label: "Supervised Member", description: "A member with additional safeguards for high-risk actions.", allowedPermissions: own, prohibitedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS", "TECHNICAL_INFORMATION_ACCESS", "OWNER_OVERSIGHT_METADATA", "PROTECTED_OWNER_INSPECTION", "ROLE_ASSIGNMENT", "PERMISSION_ASSIGNMENT"], technicalInformationEligible: false, projectJourneyEligibility: "basic", risk: "high" },
  GUEST: { id: "GUEST", label: "Guest", description: "A temporary household visitor.", allowedPermissions: ["SHARED_HOUSEHOLD_RESOURCE_READ", "ROUTINE_HOUSEHOLD_SUPPORT", "BASIC_PROJECT_INFORMATION_ACCESS"], prohibitedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS", "TECHNICAL_INFORMATION_ACCESS", "OWNER_OVERSIGHT_METADATA", "PROTECTED_OWNER_INSPECTION"], technicalInformationEligible: false, projectJourneyEligibility: "basic", risk: "low" },
  DEVICE_SERVICE_IDENTITY: { id: "DEVICE_SERVICE_IDENTITY", label: "Connected Device", description: "A non-human identity limited to one declared purpose.", allowedPermissions: ["ROUTINE_HOUSEHOLD_SUPPORT", "SHARED_HOUSEHOLD_RESOURCE_READ"], prohibitedPermissions: noHuman, technicalInformationEligible: false, projectJourneyEligibility: "none", risk: "moderate" }
};
