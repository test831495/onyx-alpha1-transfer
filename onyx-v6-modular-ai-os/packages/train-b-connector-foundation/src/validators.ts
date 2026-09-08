import { CONNECTOR_LIFECYCLE_STATES, MAX_VALIDATION_ARRAY_ELEMENTS, MAX_VALIDATION_DEPTH, MAX_VALIDATION_KEYS, type ConnectorRegistration, type VaultReferenceMetadata } from "./model";

const SECRET_KEYS = new Set(["accesstoken", "refreshtoken", "apikey", "password", "privatekey", "clientsecret", "authorizationcode", "cookie", "credential", "secret", "token"]);
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 256;
const isObject = (value: unknown): value is object => value !== null && typeof value === "object";
const normalizedKey = (key: string) => key.replace(/[_-]/g, "").toLowerCase();

function ownDataEntries(value: object): readonly [string, unknown][] {
  try {
    const keys = Object.keys(value);
    if (keys.length > MAX_VALIDATION_KEYS) throw new Error("Validation bounds exceeded");
    return keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) throw new Error("Accessor properties are prohibited");
      return [key, descriptor.value] as const;
    });
  } catch {
    throw new Error("Input cannot be safely inspected");
  }
}

function scanSecrets(value: unknown, depth = 0, seen = new WeakSet<object>(), state = { keys: 0, arrayElements: 0 }): void {
  if (!isObject(value)) return;
  if (depth > MAX_VALIDATION_DEPTH) throw new Error("Validation depth exceeded");
  if (seen.has(value)) throw new Error("Circular input is prohibited");
  seen.add(value);
  const entries = ownDataEntries(value);
  for (const [key, nested] of entries) {
    state.keys += 1;
    if (state.keys > MAX_VALIDATION_KEYS || SECRET_KEYS.has(normalizedKey(key))) throw new Error("Secret-like fields are prohibited");
    if (Array.isArray(value)) {
      state.arrayElements += 1;
      if (state.arrayElements > MAX_VALIDATION_ARRAY_ELEMENTS) throw new Error("Validation bounds exceeded");
    }
    scanSecrets(nested, depth + 1, seen, state);
  }
}

function closedRecord(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) throw new Error("Expected a record");
  const entries = ownDataEntries(value);
  if (entries.some(([key]) => !allowed.includes(key))) throw new Error("Unknown fields are prohibited");
  scanSecrets(value);
  return Object.fromEntries(entries);
}
export function assertConnectorRegistration(value: unknown): ConnectorRegistration {
  const record = closedRecord(value, ["id", "type", "lifecycleState", "adapterReference", "requiresAccount", "requiresCredential", "bindings", "maxAccounts"]);
  if (!Array.isArray(record.bindings) || record.bindings.length > MAX_VALIDATION_ARRAY_ELEMENTS) throw new Error("Invalid connector bindings");
  for (const binding of record.bindings) closedRecord(binding, ["capabilityId", "operations", "permissionReferences", "attributionRequired", "freshnessRequirement", "costClass"]);
  const candidate = record as unknown as ConnectorRegistration;
  if (!text(candidate.id) || !/^connector\.[a-z0-9._-]+$/.test(candidate.id) || !text(candidate.type) || !text(candidate.adapterReference) || !(CONNECTOR_LIFECYCLE_STATES as readonly string[]).includes(candidate.lifecycleState)) throw new Error("Invalid connector registration");
  if (typeof candidate.requiresAccount !== "boolean" || typeof candidate.requiresCredential !== "boolean") throw new Error("Invalid connector registration");
  return Object.freeze({ ...candidate, bindings: Object.freeze(candidate.bindings.map((binding) => Object.freeze({ ...binding, operations: Object.freeze([...binding.operations]), permissionReferences: Object.freeze([...binding.permissionReferences]) }))) });
}
export function assertVaultReference(value: unknown): VaultReferenceMetadata {
  const record = closedRecord(value, ["id", "purpose", "credentialClass", "accountReference", "connectorReference", "createdTimeReference", "rotatedTimeReference", "expiryTimeReference", "lifecycleState", "scopeReference", "evidenceReference"]);
  const candidate = record as unknown as VaultReferenceMetadata;
  if (!text(candidate.id) || !text(candidate.purpose) || !text(candidate.credentialClass) || !text(candidate.lifecycleState)) throw new Error("Invalid vault reference");
  return Object.freeze({ ...candidate });
}
export function assertSafeRecord(value: unknown, allowed: readonly string[]): Record<string, unknown> { return closedRecord(value, allowed); }
export function freezeSnapshot<T extends object>(value: T): T { return Object.freeze(value); }