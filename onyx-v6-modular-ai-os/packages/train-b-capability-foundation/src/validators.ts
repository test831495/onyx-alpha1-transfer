import type {
  CapabilityDefinition,
  CapabilityRegistryValidationResult,
} from "./capability-model";

const PROVIDER_TOKENS = [
  "microsoft",
  "google",
  "github",
  "netlify",
  "outlook",
  "gmail",
  "onedrive",
  "drive",
  "oauth",
  "oidc",
];

const STRING_LIMIT = 128;
const ARRAY_LIMIT = 24;

export function containsProviderReference(value: string): boolean {
  const lower = value.toLowerCase();
  return PROVIDER_TOKENS.some((token) => lower.includes(token));
}

function isSafeString(value: unknown, label: string): boolean {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > STRING_LIMIT) {
    return false;
  }
  if (label === "id" && containsProviderReference(value)) {
    return false;
  }
  return true;
}

function isBoundedArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length <= ARRAY_LIMIT && value.every((entry) => typeof entry === "string" && entry.length > 0 && entry.length <= STRING_LIMIT);
}

export function validateCapabilityDefinition(definition: CapabilityDefinition): CapabilityRegistryValidationResult {
  const errors: string[] = [];

  if (!isSafeString(definition.id, "id")) errors.push("capability id must be a non-empty string without provider branding");
  if (!/^[a-z0-9.\-]+$/.test(definition.id ?? "")) errors.push("capability id must contain only lowercase letters, numbers, dots, and hyphens");
  if (!isSafeString(definition.version, "version")) errors.push("capability version must be a non-empty string");
  if (!isSafeString(definition.label, "label")) errors.push("label must be a non-empty string");
  if (!isSafeString(definition.description, "description")) errors.push("description must be a non-empty string");
  if (!isSafeString(definition.domain, "domain")) errors.push("domain must be a non-empty string");
  if (!isBoundedArray(definition.operations) || definition.operations.length === 0) {
    errors.push("operations must be a bounded non-empty array");
  } else if (definition.operations.some((operation) => !["READ", "WRITE", "PROPOSAL", "EXECUTION"].includes(operation))) {
    errors.push("operations contain an unknown capability operation");
  }
  if (definition.operations.includes("WRITE") && definition.id.toLowerCase().includes(".read")) {
    errors.push("write semantics cannot be disguised as a read capability");
  }
  if (!isSafeString(definition.owner, "owner")) errors.push("owner must be a non-empty string");
  if (!isSafeString(definition.purpose, "purpose")) errors.push("purpose must be a non-empty string");
  if (definition.providerNeutralImplementation !== true) errors.push("provider-neutral implementation must be explicitly true");
  if (!isBoundedArray(definition.inputContractIds)) errors.push("inputContractIds must be a bounded array");
  if (!isBoundedArray(definition.outputContractIds)) errors.push("outputContractIds must be a bounded array");
  if (!isBoundedArray(definition.dataClasses)) errors.push("dataClasses must be a bounded array");
  if (!isBoundedArray(definition.dependencies)) errors.push("dependencies must be a bounded array");
  if (!isBoundedArray(definition.conflicts)) errors.push("conflicts must be a bounded array");
  if (definition.lifecycleState && !["ACTIVE", "DISABLED", "DEPRECATED", "REMOVED"].includes(definition.lifecycleState)) {
    errors.push("lifecycleState is not in the allowed vocabulary");
  }
  if (!definition.runtimeEnabled && definition.lifecycleState === "ACTIVE") {
    errors.push("runtimeEnabled cannot be false while lifecycleState is ACTIVE");
  }
  if (!definition.sourceAttributionRequired && definition.operations.includes("READ")) {
    errors.push("read operations require source attribution by default");
  }

  const normalized: CapabilityDefinition = Object.freeze({
    ...definition,
    operations: Object.freeze([...definition.operations]),
    inputContractIds: Object.freeze([...definition.inputContractIds]),
    outputContractIds: Object.freeze([...definition.outputContractIds]),
    dataClasses: Object.freeze([...definition.dataClasses]),
    dependencies: Object.freeze([...definition.dependencies]),
    conflicts: Object.freeze([...definition.conflicts]),
  });

  return {
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    normalized,
  };
}

export function assertCapabilityDefinition(definition: CapabilityDefinition): CapabilityDefinition {
  const result = validateCapabilityDefinition(definition);
  if (!result.valid) {
    throw new TypeError(`Invalid capability definition: ${result.errors.join("; ")}`);
  }
  return result.normalized as CapabilityDefinition;
}
