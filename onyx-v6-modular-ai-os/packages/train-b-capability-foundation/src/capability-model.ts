export const CAPABILITY_OPERATIONS = ["READ", "WRITE", "PROPOSAL", "EXECUTION"] as const;
export type CapabilityOperation = (typeof CAPABILITY_OPERATIONS)[number];

export const CAPABILITY_RISK_CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type CapabilityRiskClass = (typeof CAPABILITY_RISK_CLASSES)[number];

export const CAPABILITY_LIFECYCLE_STATES = ["ACTIVE", "DISABLED", "DEPRECATED", "REMOVED"] as const;
export type CapabilityLifecycleState = (typeof CAPABILITY_LIFECYCLE_STATES)[number];

export const CAPABILITY_COST_CLASSES = ["LOW", "MEDIUM", "HIGH"] as const;
export type CapabilityCostClass = (typeof CAPABILITY_COST_CLASSES)[number];

export const CAPABILITY_FRESHNESS_REQUIREMENTS = ["CURRENT", "STALE_OK", "NOT_ASSESSABLE"] as const;
export type CapabilityFreshnessRequirement = (typeof CAPABILITY_FRESHNESS_REQUIREMENTS)[number];

export const CAPABILITY_DATA_CLASSES = [
  "CALENDAR_EVENT",
  "EMAIL_MESSAGE",
  "FILE",
  "TASK",
  "MESSAGE",
  "REPOSITORY",
  "DEPLOYMENT",
  "APPLICATION",
  "UNKNOWN",
] as const;
export type CapabilityDataClass = (typeof CAPABILITY_DATA_CLASSES)[number];

export const CAPABILITY_DOMAINS = [
  "calendar",
  "mail",
  "files",
  "repositories",
  "deployments",
  "tasks",
  "applications",
  "search",
] as const;
export type CapabilityDomain = (typeof CAPABILITY_DOMAINS)[number];

export interface CapabilityDefinition {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly description: string;
  readonly domain: CapabilityDomain | string;
  readonly operations: readonly CapabilityOperation[];
  readonly riskClass: CapabilityRiskClass;
  readonly inputContractIds: readonly string[];
  readonly outputContractIds: readonly string[];
  readonly dataClasses: readonly CapabilityDataClass[] | readonly string[];
  readonly freshnessRequirement: CapabilityFreshnessRequirement | string;
  readonly sourceAttributionRequired: boolean;
  readonly costClass: CapabilityCostClass;
  readonly dependencies: readonly string[];
  readonly conflicts: readonly string[];
  readonly lifecycleState: CapabilityLifecycleState;
  readonly runtimeEnabled: boolean;
  readonly owner: string;
  readonly purpose: string;
  readonly providerNeutralImplementation: boolean;
}

export interface CapabilityRegistration extends CapabilityDefinition {}

export interface CapabilityRegistrySnapshot {
  readonly entries: readonly CapabilityDefinition[];
  readonly byId: Readonly<Record<string, CapabilityDefinition>>;
  readonly ids: readonly string[];
}

export interface CapabilityRegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly normalized?: CapabilityDefinition;
}
