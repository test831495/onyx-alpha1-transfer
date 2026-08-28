export const FACTORY_CONTRACT_VERSION = "1.0.0" as const;
export const UNKNOWN_DISPOSITIONS = ["DENIED", "QUARANTINED", "NOT_ASSESSABLE"] as const;
export type UnknownDisposition = (typeof UNKNOWN_DISPOSITIONS)[number];
export const FACTORY_CONSTITUTION = Object.freeze({
  contractVersion: FACTORY_CONTRACT_VERSION, createsAuthority: false, executesActions: false, mutatesState: false,
  readOnlyByDefault: true, localOnlyByDefault: true, networkDeniedByDefault: true,
  productionSecretsProhibited: true, productionDataProhibited: true, householdPrivateDataProhibited: true,
  gitWritesProhibited: true, remoteWritesProhibited: true, runtimeActivationProhibited: true,
  silentRepairProhibited: true, selfPromotionProhibited: true, riskAcceptanceProhibited: true, ownerPromotionRequired: true,
  unknownCapabilityDisposition: "QUARANTINED" as const, unknownPolicyDisposition: "DENIED" as const, unavailablePolicyDisposition: "QUARANTINED" as const, auditUnavailableDisposition: "DENIED" as const,
  killSwitchSupported: true, expiryRequired: true, immutableBudgetsRequired: true, exactBaselineRequired: true,
  taskEnvelopeRequired: true, pathAllowlistRequired: true, prohibitedPathPolicyRequired: true,
  evidenceProvenanceRequired: true, evidenceFreshnessRequired: true, evidenceCompletenessRequired: true,
  evidenceAuthorityStatusRequired: true, independentReviewStatusRequired: true, promptInjectionDefenseRequired: true,
  providerNeutralTraceRequired: true, disablePathRequired: true, quarantinePathRequired: true, reversibilityRequired: true,
  conflictEscalationRequired: true, aggregateConfidenceCannotAuthorize: true,
} as const);
export type FactoryConstitution = typeof FACTORY_CONSTITUTION;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);
export const MALFORMED_INPUT_KINDS = ["UNDEFINED_INPUT", "NULL_INPUT", "ARRAY_INPUT", "PRIMITIVE_INPUT", "UNSAFE_PROTOTYPE", "UNINSPECTABLE_INPUT", "DANGEROUS_KEY", "SYMBOL_KEY", "ACCESSOR_PROPERTY", "NON_ENUMERABLE_PROPERTY", "MISSING_FIELD", "UNEXPECTED_FIELD", "INVALID_VALUE"] as const;
export type MalformedInputKind = (typeof MALFORMED_INPUT_KINDS)[number];
export type RecordInspection = Readonly<{ valid: boolean; kind?: MalformedInputKind; reasonCodes: readonly string[] }>;
export type MalformedInputOwner = "TASK_ENVELOPE" | "CAPABILITY" | "CONSTITUTION" | "EVIDENCE";
export const dispositionForMalformedInput = (owner: MalformedInputOwner, _kind: MalformedInputKind): "DENIED" | "QUARANTINED" | "NOT_ASSESSABLE" => owner === "CAPABILITY" ? "QUARANTINED" : owner === "EVIDENCE" ? "NOT_ASSESSABLE" : "DENIED";

const inspection = (valid: boolean, kind?: MalformedInputKind, reasonCodes: readonly string[] = []): RecordInspection => Object.freeze({ valid, ...(kind ? { kind } : {}), reasonCodes: Object.freeze([...reasonCodes]) });
export const inspectRecord = (value: unknown, requiredKeys: readonly string[] = []): RecordInspection => {
  if (value === undefined) return inspection(false, "UNDEFINED_INPUT", ["INPUT_REQUIRED"]);
  if (value === null) return inspection(false, "NULL_INPUT", ["INPUT_REQUIRED"]);
  if (typeof value !== "object") return inspection(false, "PRIMITIVE_INPUT", ["RECORD_REQUIRED"]);
  let prototype: object | null;
  try { prototype = Object.getPrototypeOf(value); } catch { return inspection(false, "UNINSPECTABLE_INPUT", ["PROTOTYPE_INSPECTION_FAILED"]); }
  if (Array.isArray(value)) return inspection(false, "ARRAY_INPUT", ["RECORD_REQUIRED"]);
  if (prototype !== Object.prototype && prototype !== null) return inspection(false, "UNSAFE_PROTOTYPE", ["PLAIN_RECORD_REQUIRED"]);
  let ownKeys: (string | symbol)[];
  try { ownKeys = Reflect.ownKeys(value); } catch { return inspection(false, "UNINSPECTABLE_INPUT", ["KEY_ENUMERATION_FAILED"]); }
  if (ownKeys.length > 256) return inspection(false, "INVALID_VALUE", ["RECORD_KEY_LIMIT_EXCEEDED"]);
  const keys: string[] = [];
  for (const key of ownKeys) {
    if (typeof key !== "string") return inspection(false, "SYMBOL_KEY", ["STRING_KEYS_ONLY"]);
    if (DANGEROUS_KEYS.has(key)) return inspection(false, "DANGEROUS_KEY", ["DANGEROUS_KEY"]);
    let descriptor: PropertyDescriptor | undefined;
    try { descriptor = Object.getOwnPropertyDescriptor(value, key); } catch { return inspection(false, "UNINSPECTABLE_INPUT", ["DESCRIPTOR_INSPECTION_FAILED"]); }
    if (!descriptor || !("value" in descriptor)) return inspection(false, "ACCESSOR_PROPERTY", ["ACCESSOR_NOT_ALLOWED"]);
    if (descriptor.enumerable !== true) return inspection(false, "NON_ENUMERABLE_PROPERTY", ["ENUMERABLE_PROPERTIES_REQUIRED"]);
    keys.push(key);
  }
  if (requiredKeys.some((key) => !keys.includes(key))) return inspection(false, "MISSING_FIELD", ["REQUIRED_FIELD_MISSING"]);
  if (requiredKeys.length > 0 && keys.some((key) => !requiredKeys.includes(key))) return inspection(false, "UNEXPECTED_FIELD", ["CLOSED_SCHEMA"]);
  return inspection(true);
};
export const classifyMalformedInput = (input: unknown): MalformedInputKind | undefined => inspectRecord(input, ["required"]).kind;
export const isSafeRecord = (value: unknown): value is Record<string, unknown> => inspectRecord(value).valid;

const cloneLimits = { depth: 12, string: 4096, array: 256, keys: 256, nodes: 2048 } as const;
export const cloneFreeze = <T>(value: T): T => {
  const active = new WeakSet<object>();
  let nodes = 0;
  const clone = (input: unknown, depth: number): unknown => {
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "string") { if (input.length > cloneLimits.string) throw new Error("STRING_BOUND_EXCEEDED"); return input; }
    if (typeof input === "number") { if (!Number.isFinite(input)) throw new Error("NON_FINITE_NUMBER"); return input; }
    if (typeof input !== "object" || depth > cloneLimits.depth) throw new Error("UNSAFE_VALUE");
    if (active.has(input)) throw new Error("CYCLE_NOT_ALLOWED");
    active.add(input); nodes += 1;
    if (nodes > cloneLimits.nodes) throw new Error("NODE_BOUND_EXCEEDED");
    let output: unknown;
    if (Array.isArray(input)) {
      if (input.length > cloneLimits.array) throw new Error("ARRAY_BOUND_EXCEEDED");
      const array = new Array(input.length);
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) throw new Error("UNSAFE_ARRAY");
        array[index] = clone(descriptor.value, depth + 1);
      }
      for (const key of Reflect.ownKeys(input)) if (key !== "length" && (typeof key !== "string" || !/^\d+$/.test(key))) throw new Error("UNSAFE_ARRAY");
      output = array;
    } else {
      if (!isSafeRecord(input) || Object.keys(input).length > cloneLimits.keys) throw new Error("UNSAFE_RECORD");
      const record: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(input)) record[key] = clone(Object.getOwnPropertyDescriptor(input, key)!.value, depth + 1);
      output = record;
    }
    active.delete(input); return Object.freeze(output);
  };
  return clone(value, 0) as T;
};

export type BoundedNumberOptions = Readonly<{ minimum?: number; maximum?: number }>;
export type BoundedStringOptions = Readonly<{ minimumLength?: number; maximumLength?: number }>;
export type PrimitiveValidation = Readonly<{ valid: boolean; reasonCodes: readonly string[] }>;
const primitiveResult = (valid: boolean, reasonCodes: readonly string[]): PrimitiveValidation => cloneFreeze({ valid, reasonCodes });
export const validateBoundedNumber = (value: unknown, options: BoundedNumberOptions = {}): PrimitiveValidation => {
  const reasons: string[] = [];
  if (typeof value !== "number") reasons.push("NUMBER_TYPE_INVALID");
  else if (!Number.isFinite(value)) reasons.push("NUMBER_NOT_FINITE");
  else {
    if (options.minimum !== undefined && value < options.minimum) reasons.push("NUMBER_BELOW_MINIMUM");
    if (options.maximum !== undefined && value > options.maximum) reasons.push("NUMBER_ABOVE_MAXIMUM");
  }
  return primitiveResult(reasons.length === 0, reasons);
};
export const validateBoundedString = (value: unknown, options: BoundedStringOptions = {}): PrimitiveValidation => {
  if (typeof value !== "string") return primitiveResult(false, ["STRING_TYPE_INVALID"]);
  const reasons: string[] = [];
  if (value.length === 0) reasons.push("STRING_EMPTY");
  if (value.trim().length === 0) reasons.push("STRING_WHITESPACE_ONLY");
  if (/[\u0000-\u001f\u007f]/u.test(value)) reasons.push("STRING_CONTROL_CHARACTER");
  if (/[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(value)) reasons.push("STRING_INVISIBLE_CHARACTER");
  if (options.minimumLength !== undefined && value.length < options.minimumLength) reasons.push("STRING_TOO_SHORT");
  if (value.length > (options.maximumLength ?? 4096)) reasons.push("STRING_TOO_LONG");
  return primitiveResult(reasons.length === 0, reasons);
};
