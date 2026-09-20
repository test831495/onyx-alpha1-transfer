import { parseEncryptionKey, type CredentialEncryptionKey } from "./crypto.js";

export type CredentialKeyRing = {
  readonly active?: CredentialEncryptionKey;
  readonly previous: readonly CredentialEncryptionKey[];
};

type Environment = Record<string, string | undefined>;

const isStrictBase64Url = (value: string): boolean => {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return false;
  return Buffer.from(value, "base64url").toString("base64url") === value;
};

const parseKey = (encoded: string | undefined, version: string | undefined): CredentialEncryptionKey => {
  if (!encoded) throw new Error("Credential encryption key is required");
  if (!isStrictBase64Url(encoded)) throw new Error("Credential encryption key must be strict base64url encoded");
  if (!version?.trim()) throw new Error("Credential encryption key version is required");
  return parseEncryptionKey(encoded, version);
};

const parsePrevious = (environment: Environment): CredentialEncryptionKey[] => {
  const raw = environment.ONYX_CREDENTIAL_PREVIOUS_KEY_RING;
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as unknown;
    if (!Array.isArray(entries)) throw new Error();
    return entries.map((entry) => {
      if (!entry || typeof entry !== "object") throw new Error();
      const value = entry as { key?: unknown; version?: unknown };
      if (typeof value.key !== "string" || typeof value.version !== "string") throw new Error();
      return parseKey(value.key, value.version);
    });
  } catch {
    throw new Error("Credential previous key ring is invalid");
  }
};

export type CredentialKeyClassification =
  | "CREDENTIAL_KEY_MISSING"
  | "CREDENTIAL_KEY_VERSION_MISSING"
  | "CREDENTIAL_KEY_NOT_STRICT_BASE64URL"
  | "CREDENTIAL_KEY_WRONG_DECODED_LENGTH"
  | "PREVIEW_KEY_FORBIDDEN_IN_PRODUCTION"
  | "PREVIOUS_KEY_RING_INVALID_JSON"
  | "PREVIOUS_KEY_RING_INVALID_ENTRY"
  | "PREVIOUS_KEY_RING_INVALID_KEY"
  | "DUPLICATE_KEY_VERSION"
  | "CREDENTIAL_KEY_CONFIGURATION_VALID";

const isValidKeyMaterial = (encoded: string): boolean => isStrictBase64Url(encoded) && Buffer.from(encoded, "base64url").length === 32;

// Bounded, non-throwing classification of the production credential key configuration. Never logs the key,
// version, previous-ring contents, decoded bytes, or any prefix/suffix/length derived from secret material.
export function classifyCredentialKeyConfiguration(environment: Environment): CredentialKeyClassification {
  const productionKey = environment.ONYX_CREDENTIAL_ENCRYPTION_KEY;
  const productionVersion = environment.ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION;
  const previewKey = environment.ONYX_CREDENTIAL_PREVIEW_ENCRYPTION_KEY;

  if (previewKey) return "PREVIEW_KEY_FORBIDDEN_IN_PRODUCTION";
  if (!productionKey) return "CREDENTIAL_KEY_MISSING";
  if (!isStrictBase64Url(productionKey)) return "CREDENTIAL_KEY_NOT_STRICT_BASE64URL";
  if (Buffer.from(productionKey, "base64url").length !== 32) return "CREDENTIAL_KEY_WRONG_DECODED_LENGTH";
  if (!productionVersion?.trim()) return "CREDENTIAL_KEY_VERSION_MISSING";

  const raw = environment.ONYX_CREDENTIAL_PREVIOUS_KEY_RING;
  const previousVersions: string[] = [];
  if (raw) {
    let entries: unknown;
    try {
      entries = JSON.parse(raw);
    } catch {
      return "PREVIOUS_KEY_RING_INVALID_JSON";
    }
    if (!Array.isArray(entries)) return "PREVIOUS_KEY_RING_INVALID_ENTRY";
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") return "PREVIOUS_KEY_RING_INVALID_ENTRY";
      const value = entry as { key?: unknown; version?: unknown };
      // Match parseKey's `!version?.trim()` rejection so a blank or whitespace-only previous version is never classified as valid.
      if (typeof value.key !== "string" || typeof value.version !== "string" || !value.version.trim()) return "PREVIOUS_KEY_RING_INVALID_ENTRY";
      if (!isValidKeyMaterial(value.key)) return "PREVIOUS_KEY_RING_INVALID_KEY";
      previousVersions.push(value.version);
    }
  }

  if (new Set([productionVersion, ...previousVersions]).size !== previousVersions.length + 1) return "DUPLICATE_KEY_VERSION";

  return "CREDENTIAL_KEY_CONFIGURATION_VALID";
}

export function parseCredentialKeyRing(environment: Environment, context: "production" | "deploy-preview" | "branch-deploy" | "local" | "test" | "unknown"): CredentialKeyRing {
  if (context === "unknown") throw new Error("Unknown credential runtime context");
  const productionKey = environment.ONYX_CREDENTIAL_ENCRYPTION_KEY;
  const productionVersion = environment.ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION;
  const previewKey = environment.ONYX_CREDENTIAL_PREVIEW_ENCRYPTION_KEY;
  const previewVersion = environment.ONYX_CREDENTIAL_PREVIEW_ENCRYPTION_KEY_VERSION;
  if (context === "production") {
    if (previewKey) throw new Error("Preview credential key is forbidden in production");
    const active = parseKey(productionKey, productionVersion);
    const previous = parsePrevious(environment);
    if (new Set([active.version, ...previous.map((key) => key.version)]).size !== previous.length + 1) throw new Error("Credential key versions must be unique");
    return { active, previous };
  }
  if (productionKey || productionVersion) throw new Error("Production credential key is forbidden outside production");
  if (!previewKey) return { previous: [] };
  return { active: parseKey(previewKey, previewVersion ?? "preview-v1"), previous: [] };
}