import { describe, expect, it } from "vitest";
import { parseEncryptionKey } from "./crypto.js";
import { InMemoryCredentialStore } from "./store.js";

const key = parseEncryptionKey(Buffer.alloc(32, 1).toString("base64url"), "test-v1");
const binding = { canonicalAccountRef: "account-1", providerId: "google", connectorAccountRef: "connector-1", credentialType: "oauth-refresh-token", purpose: "calendar.read", capabilityFingerprint: "cap-1" };

describe("credential lifecycle", () => {
  it("enforces binding, CAS, revocation, deletion, and idempotence", () => {
    const store = new InMemoryCredentialStore();
    const record = store.create(binding, "refresh-token", key);
    expect(store.read(record.recordId, binding, key)).toBe("refresh-token");
    expect(() => store.create(binding, "another", key)).toThrow();
    expect(() => store.read(record.recordId, { ...binding, purpose: "calendar.write" }, key)).toThrow();
    const replaced = store.replace(record.recordId, binding, 0, "rotated-token", key);
    expect(store.read(record.recordId, binding, key)).toBe("rotated-token");
    expect(() => store.replace(record.recordId, binding, 0, "stale", key)).toThrow("version conflict");
    expect(store.revoke(record.recordId, binding).state).toBe("REVOKED");
    expect(store.revoke(record.recordId, binding).state).toBe("REVOKED");
    expect(() => store.read(record.recordId, binding, key)).toThrow();
    expect(store.delete(record.recordId, binding).state).toBe("DELETED");
    expect(store.delete(record.recordId, binding).state).toBe("DELETED");
    expect(replaced.recordVersion).toBe(1);
    expect(store.getAuditEvents().map((event) => event.event)).toContain("CREDENTIAL_VERSION_CONFLICT");
  });
});