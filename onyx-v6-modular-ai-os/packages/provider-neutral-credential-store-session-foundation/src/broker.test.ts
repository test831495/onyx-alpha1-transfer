import { describe, expect, it } from "vitest";
import { parseEncryptionKey } from "./crypto.js";
import { TokenBroker } from "./broker.js";
import { InMemoryCredentialStore } from "./store.js";

const key = parseEncryptionKey(Buffer.alloc(32, 2).toString("base64url"), "test-v1");
const binding = { canonicalAccountRef: "account-1", providerId: "google", connectorAccountRef: "connector-1", credentialType: "oauth-refresh-token", purpose: "calendar.read", capabilityFingerprint: "cap-1" };

describe("token broker", () => {
  it("keeps access tokens inside the provider callback boundary and rotates refresh tokens with CAS", async () => {
    const store = new InMemoryCredentialStore();
    const record = store.create(binding, "refresh-token", key);
    const broker = new TokenBroker(store, key);
    const result = await broker.withAccessToken({ ...binding, recordId: record.recordId, expectedVersion: 0 }, async (refreshToken) => {
      expect(refreshToken).toBe("refresh-token");
      return { accessToken: "short-lived", refreshToken: "rotated", expiresInSeconds: 120 };
    }, async (accessToken) => {
      expect(accessToken).toBe("short-lived");
      return { value: "provider-result", expiresInSeconds: 90 };
    });
    expect(result).toEqual({ value: "provider-result", expiresInSeconds: 90 });
    expect(store.read(record.recordId, binding, key)).toBe("rotated");
  });
});