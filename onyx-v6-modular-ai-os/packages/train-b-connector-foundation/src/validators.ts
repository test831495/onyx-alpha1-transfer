import { CONNECTOR_LIFECYCLE_STATES, type ConnectorRegistration, type VaultReferenceMetadata } from "./model";

const SECRET_KEYS = /token|secret|password|apikey|api_key|privatekey|private_key|cookie|authorizationcode|authorization_code/i;
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 256;
export function assertConnectorRegistration(value: unknown): ConnectorRegistration {
  if (!value || typeof value !== "object" || Object.keys(value).some((key) => SECRET_KEYS.test(key))) throw new Error("Invalid connector registration");
  const candidate = value as ConnectorRegistration;
  if (!text(candidate.id) || !/^connector\.[a-z0-9._-]+$/.test(candidate.id) || !text(candidate.type) || !text(candidate.adapterReference) || !(CONNECTOR_LIFECYCLE_STATES as readonly string[]).includes(candidate.lifecycleState)) throw new Error("Invalid connector registration");
  return Object.freeze({ ...candidate, bindings: Object.freeze([...(candidate.bindings ?? [])]) });
}
export function assertVaultReference(value: unknown): VaultReferenceMetadata {
  if (!value || typeof value !== "object" || Object.keys(value).some((key) => SECRET_KEYS.test(key))) throw new Error("Raw credential material is prohibited");
  const candidate = value as VaultReferenceMetadata;
  if (!text(candidate.id) || !text(candidate.purpose) || !text(candidate.credentialClass) || !text(candidate.lifecycleState)) throw new Error("Invalid vault reference");
  return Object.freeze({ ...candidate });
}
export function freezeSnapshot<T extends object>(value: T): T { return Object.freeze(value); }