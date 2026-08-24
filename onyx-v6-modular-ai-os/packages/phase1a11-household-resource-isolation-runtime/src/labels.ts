export const RESOURCE_ISOLATION_LABELS = {
  RESOURCE_ACCESS_ALLOWED: "Access permitted",
  UNKNOWN_OWNER_DENIED: "Owner unknown",
  UNKNOWN_RESOURCE_DENIED: "Resource not recognized",
  CROSS_ACCOUNT_RESOURCE_DENIED: "Account boundary denied",
  CROSS_HOUSEHOLD_RESOURCE_DENIED: "Household boundary denied",
  VISIBILITY_POLICY_DENIED: "Visibility policy denied",
  PURPOSE_MISMATCH: "Purpose mismatch",
  AUDIT_UNAVAILABLE: "Audit requires availability",
  MODE_CAPABILITY_DENIED: "Mode capability denied",
  TECHNICAL_INFORMATION_DENIED: "Technical Information requires explicit access",
  SHARING_GRANT_DENIED: "Grant required or invalid",
  PROJECT_JOURNEY_DENIED: "Detailed Project Journey remains restricted"
} as const;

export const MODE_LABELS = {
  ACTIVE: "Active",
  LIGHT: "Light",
  VACATION: "Vacation",
  HIBERNATION: "Hibernation"
} as const;

export const LEGACY_CLASSIFICATION_LABELS = {
  preserve: "Preserve",
  transfer: "Transfer",
  archive: "Archive",
  delete: "Delete",
  inaccessiblePendingLawfulActivation: "Inaccessible pending lawful activation"
} as const;
