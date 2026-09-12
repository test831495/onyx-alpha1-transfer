import {
  REGISTRY_AVAILABILITY,
  REGISTRY_FEATURE_STATES,
  REGISTRY_ID_PREFIXES,
  REGISTRY_OWNERS,
  type RegistryAccessibilityClass,
  type RegistryPrivacyClass,
  type RegistryRecordKind,
  type RegistryId,
  type UniversalRegistry,
  type UniversalRegistryRecord,
} from "./universal-registry";

export type RegistryValidationIssue = Readonly<{
  code: "INVALID_ID" | "DUPLICATE_ID" | "INVALID_ENUM" | "INVALID_FIELD" | "AUTHORITY_METADATA";
  recordId?: string;
  field?: string;
  message: string;
}>;

export class UniversalRegistryValidationError extends Error {
  readonly issues: readonly RegistryValidationIssue[];

  constructor(issues: readonly RegistryValidationIssue[]) {
    super("Universal Registry validation failed.");
    this.name = "UniversalRegistryValidationError";
    this.issues = issues;
  }
}

export function isRegistryId(value: string): value is RegistryId {
  return REGISTRY_ID_PREFIXES.some((prefix) => value.startsWith(prefix)) &&
    /^onyx\.(app|surface|nav|conversation-target|setting|voice-provider|wake-word)\.[a-z0-9][a-z0-9._-]*$/.test(value);
}

export function validateUniversalRegistry(
  records: readonly UniversalRegistryRecord[],
): UniversalRegistry {
  const issues: RegistryValidationIssue[] = [];
  const ids = new Set<string>();

  for (const record of records) {
    if (!isRegistryId(record.id)) {
      issues.push({ code: "INVALID_ID", recordId: record.id, field: "id", message: "Registry IDs must use an approved onyx namespace." });
    }
    if (ids.has(record.id)) {
      issues.push({ code: "DUPLICATE_ID", recordId: record.id, field: "id", message: "Canonical registry IDs must be unique." });
    }
    ids.add(record.id);
    if (!record.schema || !Number.isSafeInteger(record.schemaVersion) || record.schemaVersion < 1) {
      issues.push({ code: "INVALID_FIELD", recordId: record.id, field: "schema", message: "Schema and positive integer schemaVersion are required." });
    }
    if (!record.displayKey || record.displayKey.length > 256 || record.aliases.some((alias) => !alias || alias.length > 128)) {
      issues.push({ code: "INVALID_FIELD", recordId: record.id, field: "displayKey", message: "Display keys and aliases must be bounded and non-empty." });
    }
    if (!REGISTRY_OWNERS.includes(record.owner) || !REGISTRY_AVAILABILITY.includes(record.availability) || !REGISTRY_FEATURE_STATES.includes(record.featureState) || !isRecordKind(record.recordKind) || !isPrivacyClass(record.privacyClass) || !isAccessibilityClass(record.accessibilityClass)) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "metadata", message: "Unknown registry enum value." });
    }
    // Validate discriminant-specific enum fields based on recordKind
    if (record.recordKind === "SURFACE" && !isSurfaceKind((record as any).surfaceKind ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "surfaceKind", message: "Invalid or missing surfaceKind for SURFACE record." });
    }
    if (record.recordKind === "NAVIGATION" && !isNavigationKind((record as any).navigationKind ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "navigationKind", message: "Invalid or missing navigationKind for NAVIGATION record." });
    }
    if (record.recordKind === "NAVIGATION" && record.executable !== false) {
      issues.push({ code: "AUTHORITY_METADATA", recordId: record.id, field: "executable", message: "Navigation metadata must never be executable." });
    }
    if (record.recordKind === "SETTING" && !isValueKind((record as any).valueKind ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "valueKind", message: "Invalid or missing valueKind for SETTING record." });
    }
    if (record.recordKind === "TRUTH_SOURCE" && !isTruthClass((record as any).truthClass ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "truthClass", message: "Invalid or missing truthClass for TRUTH_SOURCE record." });
    }
    if (record.recordKind === "TRUTH_SOURCE" && !isFreshness((record as any).freshness ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "freshness", message: "Invalid or missing freshness for TRUTH_SOURCE record." });
    }
    if (record.recordKind === "PRIVACY" && !isPrivacyClass((record as any).classification ?? "")) {
      issues.push({ code: "INVALID_ENUM", recordId: record.id, field: "classification", message: "Invalid or missing classification for PRIVACY record." });
    }
    if (record.recordKind === "WAKE_WORD" && record.activatesListener !== false) {
      issues.push({ code: "AUTHORITY_METADATA", recordId: record.id, field: "activatesListener", message: "Wake-word metadata must never activate a listener." });
    }
    if (record.recordKind === "VOICE" && record.characterIndependent !== true) {
      issues.push({ code: "AUTHORITY_METADATA", recordId: record.id, field: "characterIndependent", message: "Voice metadata must remain character-independent." });
    }
  }

  if (issues.length > 0) throw new UniversalRegistryValidationError(Object.freeze(issues));
  return Object.freeze(records.map((record) => freezeRecord(record)));
}

function isRecordKind(value: string): value is RegistryRecordKind {
  return ["APPLICATION", "SURFACE", "NAVIGATION", "CONVERSATION_TARGET", "SETTING", "VOICE", "WAKE_WORD", "ACCESSIBILITY", "PRIVACY", "TRUTH_SOURCE"].includes(value);
}

function isPrivacyClass(value: string): value is RegistryPrivacyClass {
  return ["PUBLIC", "LOCAL_PRIVATE", "SENSITIVE"].includes(value);
}

function isAccessibilityClass(value: string): value is RegistryAccessibilityClass {
  return ["STANDARD", "LARGE_TEXT", "HIGH_CONTRAST"].includes(value);
}

function isSurfaceKind(value: string): boolean {
  return ["PANEL", "MODAL", "DRAWER", "TOAST", "DROPDOWN", "POPOVER", "BANNER"].includes(value);
}

function isNavigationKind(value: string): boolean {
  return ["FORWARD", "BACKWARD", "REPLACE", "EXTERNAL", "INTERNAL"].includes(value);
}

function isValueKind(value: string): boolean {
  return ["BOOLEAN", "NUMBER", "STRING", "ENUM"].includes(value);
}

function isFreshness(value: string): boolean {
  return ["STATIC", "SESSION", "LIVE", "UNKNOWN"].includes(value);
}

function isTruthClass(value: string): boolean {
  return [
    "DETERMINISTIC_LOCAL",
    "VISIBLE_PORTAL_STATE",
    "LOCAL_APPLICATION",
    "LOCAL_FILE",
    "SESSION_CONTEXT",
    "GOVERNED_MEMORY",
    "CONNECTOR_GROUNDED",
    "GOVERNANCE_PROJECTION",
    "USER_SUPPLIED",
    "GENERAL_MODEL_KNOWLEDGE",
    "UNAVAILABLE",
    "UNKNOWN",
  ].includes(value);
}

function freezeRecord(record: UniversalRegistryRecord): UniversalRegistryRecord {
  const copy = { ...record, aliases: Object.freeze([...record.aliases]) } as UniversalRegistryRecord;
  if (record.recordKind === "CONVERSATION_TARGET") {
    return Object.freeze({ ...copy, commandAliases: Object.freeze([...record.commandAliases]) });
  }
  if (record.recordKind === "VOICE") return Object.freeze({ ...copy, locales: Object.freeze([...record.locales]) });
  return Object.freeze(copy);
}