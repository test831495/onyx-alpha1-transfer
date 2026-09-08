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

export function validateCapabilityDefinition(definition: CapabilityDefinition | unknown): CapabilityRegistryValidationResult {
  const errors: string[] = [];
  if (!definition || typeof definition !== "object") {
    return { valid: false, errors: Object.freeze(["capability definition must be an object"]) };
  }

  const candidate = definition as Partial<CapabilityDefinition>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const version = typeof candidate.version === "string" ? candidate.version : "";
  const label = typeof candidate.label === "string" ? candidate.label : "";
  const description = typeof candidate.description === "string" ? candidate.description : "";
  const domain = typeof candidate.domain === "string" ? candidate.domain : "";
  const operations = Array.isArray(candidate.operations) ? candidate.operations : [];
  const owner = typeof candidate.owner === "string" ? candidate.owner : "";
  const purpose = typeof candidate.purpose === "string" ? candidate.purpose : "";
  const providerNeutralImplementation = candidate.providerNeutralImplementation === true;
  const inputContractIds = Array.isArray(candidate.inputContractIds) ? candidate.inputContractIds : [];
  const outputContractIds = Array.isArray(candidate.outputContractIds) ? candidate.outputContractIds : [];
  const dataClasses = Array.isArray(candidate.dataClasses) ? candidate.dataClasses : [];
  const dependencies = Array.isArray(candidate.dependencies) ? candidate.dependencies : [];
  const conflicts = Array.isArray(candidate.conflicts) ? candidate.conflicts : [];
  const lifecycleState = candidate.lifecycleState;

  if (!isSafeString(id, "id")) errors.push("capability id must be a non-empty string without provider branding");
  if (typeof id === "string" && !/^[a-z0-9._\-]+$/.test(id)) errors.push("capability id must contain only lowercase letters, numbers, dots, underscores, and hyphens");
  if (!isSafeString(version, "version")) errors.push("capability version must be a non-empty string");
  if (!isSafeString(label, "label")) errors.push("label must be a non-empty string");
  if (!isSafeString(description, "description")) errors.push("description must be a non-empty string");
  if (!isSafeString(domain, "domain")) errors.push("domain must be a non-empty string");
  if (!isBoundedArray(operations) || operations.length === 0) {
    errors.push("operations must be a bounded non-empty array");
  } else if (operations.some((operation) => !["READ", "WRITE", "PROPOSAL", "EXECUTION"].includes(String(operation)))) {
    errors.push("operations contain an unknown capability operation");
  }
  if (operations.includes("WRITE") && typeof id === "string" && id.toLowerCase().includes(".read")) {
    errors.push("write semantics cannot be disguised as a read capability");
  }
  if (!isSafeString(owner, "owner")) errors.push("owner must be a non-empty string");
  if (!isSafeString(purpose, "purpose")) errors.push("purpose must be a non-empty string");
  if (!providerNeutralImplementation) errors.push("provider-neutral implementation must be explicitly true");
  if (!isBoundedArray(inputContractIds)) errors.push("inputContractIds must be a bounded array");
  if (!isBoundedArray(outputContractIds)) errors.push("outputContractIds must be a bounded array");
  if (!isBoundedArray(dataClasses)) errors.push("dataClasses must be a bounded array");
  if (!isBoundedArray(dependencies)) errors.push("dependencies must be a bounded array");
  if (!isBoundedArray(conflicts)) errors.push("conflicts must be a bounded array");
  if (lifecycleState && !["ACTIVE", "DISABLED", "DEPRECATED", "REMOVED"].includes(String(lifecycleState))) {
    errors.push("lifecycleState is not in the allowed vocabulary");
  }
  if (candidate.runtimeEnabled === false && lifecycleState === "ACTIVE") {
    errors.push("runtimeEnabled cannot be false while lifecycleState is ACTIVE");
  }
  if (candidate.sourceAttributionRequired === false && operations.includes("READ")) {
    errors.push("read operations require source attribution by default");
  }

  const normalized = Object.freeze({
    ...(candidate as CapabilityDefinition),
    id,
    version,
    label,
    description,
    domain,
    operations: Object.freeze([...operations]),
    inputContractIds: Object.freeze([...inputContractIds]),
    outputContractIds: Object.freeze([...outputContractIds]),
    dataClasses: Object.freeze([...dataClasses]),
    dependencies: Object.freeze([...dependencies]),
    conflicts: Object.freeze([...conflicts]),
  } as CapabilityDefinition);

  return {
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    normalized: errors.length === 0 ? normalized : undefined,
  };
}

export function assertCapabilityDefinition(definition: CapabilityDefinition): CapabilityDefinition {
  const result = validateCapabilityDefinition(definition);
  if (!result.valid) {
    throw new TypeError(`Invalid capability definition: ${result.errors.join("; ")}`);
  }
  return result.normalized as CapabilityDefinition;
}
