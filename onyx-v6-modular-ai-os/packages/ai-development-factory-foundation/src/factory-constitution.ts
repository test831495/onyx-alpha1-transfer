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
export const isSafeRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || DANGEROUS_KEYS.has(key)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return false;
    if (descriptor.enumerable !== true) return false;
  }
  for (const key of Object.keys(value)) {
    if (Object.prototype.propertyIsEnumerable.call(Object.getPrototypeOf(value) ?? {}, key)) return false;
  }
  return true;
};

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
