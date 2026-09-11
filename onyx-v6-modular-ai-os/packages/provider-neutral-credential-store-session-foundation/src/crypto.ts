import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const ENVELOPE_VERSION = 1;
export const ALGORITHM = "AES-256-GCM";

export type CredentialEncryptionKey = {
  readonly version: string;
  readonly bytes: Uint8Array;
};

export type CredentialEnvelope = {
  readonly envelopeVersion: 1;
  readonly keyVersion: string;
  readonly algorithm: "AES-256-GCM";
  readonly ciphertext: string;
  readonly nonce: string;
  readonly tag: string;
};

export type CredentialAad = {
  readonly recordId: string;
  readonly canonicalAccountRef: string;
  readonly providerId: string;
  readonly connectorAccountRef: string;
  readonly credentialType: string;
  readonly purpose: string;
  readonly capabilityFingerprint: string;
  readonly recordVersion: number;
};

const encode = (value: Uint8Array): string => Buffer.from(value).toString("base64url");

const decode = (value: string): Buffer => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Malformed encoded value");
  return Buffer.from(value, "base64url");
};

export function parseEncryptionKey(encoded: string | undefined, version: string | undefined): CredentialEncryptionKey {
  if (!encoded || !version) throw new Error("Credential encryption key and version are required");
  const bytes = decode(encoded);
  if (bytes.length !== 32) throw new Error("Credential encryption key must decode to 32 bytes");
  return { version, bytes };
}

function serializeAad(aad: CredentialAad): Buffer {
  return Buffer.from(JSON.stringify([
    aad.recordId,
    aad.canonicalAccountRef,
    aad.providerId,
    aad.connectorAccountRef,
    aad.credentialType,
    aad.purpose,
    aad.capabilityFingerprint,
    aad.recordVersion,
    ENVELOPE_VERSION,
  ]));
}

export function encryptCredential(plaintext: string, aad: CredentialAad, key: CredentialEncryptionKey): CredentialEnvelope {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key.bytes, nonce);
  cipher.setAAD(serializeAad(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    envelopeVersion: ENVELOPE_VERSION,
    keyVersion: key.version,
    algorithm: ALGORITHM,
    ciphertext: encode(ciphertext),
    nonce: encode(nonce),
    tag: encode(cipher.getAuthTag()),
  };
}

export function decryptCredential(envelope: CredentialEnvelope, aad: CredentialAad, key: CredentialEncryptionKey): string {
  if (envelope.envelopeVersion !== ENVELOPE_VERSION || envelope.algorithm !== ALGORITHM || envelope.keyVersion !== key.version) {
    throw new Error("Unsupported credential envelope");
  }
  const nonce = decode(envelope.nonce);
  const tag = decode(envelope.tag);
  if (nonce.length !== 12 || tag.length !== 16) throw new Error("Malformed credential envelope");
  const decipher = createDecipheriv("aes-256-gcm", key.bytes, nonce);
  decipher.setAAD(serializeAad(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(decode(envelope.ciphertext)), decipher.final()]).toString("utf8");
}