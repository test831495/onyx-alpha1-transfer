import { describe, expect, it } from "vitest";
import { parseEncryptionKey } from "./crypto.js";
import { InMemoryOAuthPendingStore } from "./oauth.js";

const key = parseEncryptionKey(Buffer.alloc(32, 3).toString("base64url"), "test-v1");
const binding = { providerId: "google", canonicalAccountRef: "account-1", sessionRef: "session-1", purpose: "calendar.connect", capabilityFingerprint: "cap-1", redirectUriFingerprint: "redirect-1" };

describe("pending OAuth transactions", () => {
  it("encrypts the verifier and allows exactly one bound consume", () => {
    const store = new InMemoryOAuthPendingStore();
    const created = store.create(binding, key);
    expect(created.state).not.toBe(created.transaction.stateDigest);
    expect(store.consume(created.state, binding, key)).toBe(created.codeVerifier);
    expect(() => store.consume(created.state, binding, key)).toThrow();
  });
});