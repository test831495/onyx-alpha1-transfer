import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential, parseEncryptionKey } from "./crypto.js";

const key = parseEncryptionKey(Buffer.alloc(32, 7).toString("base64url"), "test-v1");
const aad = { recordId: "record-1", canonicalAccountRef: "account-1", providerId: "google", connectorAccountRef: "connector-1", credentialType: "oauth-refresh-token", purpose: "calendar.read", capabilityFingerprint: "cap-1", recordVersion: 0 };

describe("credential encryption", () => {
  it("round trips and uses a unique nonce", () => {
    const first = encryptCredential("refresh-token", aad, key);
    const second = encryptCredential("refresh-token", aad, key);
    expect(decryptCredential(first, aad, key)).toBe("refresh-token");
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("fails closed for wrong key and modified AAD", () => {
    const envelope = encryptCredential("refresh-token", aad, key);
    const otherKey = parseEncryptionKey(Buffer.alloc(32, 8).toString("base64url"), "test-v1");
    expect(() => decryptCredential(envelope, aad, otherKey)).toThrow();
    expect(() => decryptCredential(envelope, { ...aad, purpose: "calendar.write" }, key)).toThrow();
  });

  it("rejects malformed keys", () => {
    expect(() => parseEncryptionKey("bad", "test-v1")).toThrow();
    expect(() => parseEncryptionKey(undefined, "test-v1")).toThrow();
  });
});