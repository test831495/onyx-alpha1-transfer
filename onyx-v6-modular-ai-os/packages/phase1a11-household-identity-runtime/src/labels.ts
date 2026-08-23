export const PRESENTATION_LABELS = {
  PRIMARY_OWNER: "Primary Owner", HOUSEHOLD_ADMINISTRATOR: "Household Administrator", STANDARD_FAMILY_MEMBER: "Family Member", SUPERVISED_MEMBER: "Supervised Member", GUEST: "Guest", DEVICE_SERVICE_IDENTITY: "Connected Device", ACCOUNT_SUSPENDED: "Account temporarily unavailable", AUTHENTICATION_ASSURANCE_REQUIRED: "Please verify your identity to continue", POLICY_DENY: "You do not have permission to view this information", DETAILED_PROJECT_HISTORY: "Detailed Project History", BASIC_PROJECT_INFORMATION: "Project Overview"
} as const;
export function friendlyLabel(identifier: keyof typeof PRESENTATION_LABELS): string { return PRESENTATION_LABELS[identifier]; }
