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