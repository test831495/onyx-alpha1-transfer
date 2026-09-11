import { describe, expect, it } from "vitest";
import { parseCredentialKeyRing } from "./config.js";
import { createDatabaseRuntimePolicy, readDatabaseRuntimeContext } from "./database.js";

const key = Buffer.alloc(32, 7).toString("base64url");

describe("credential configuration and runtime isolation", () => {
  it("requires a strict 32-byte production key and version", () => {
    expect(parseCredentialKeyRing({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" }, "production").active?.version).toBe("v1");
    expect(() => parseCredentialKeyRing({}, "production")).toThrow("required");
    expect(() => parseCredentialKeyRing({ ONYX_CREDENTIAL_ENCRYPTION_KEY: `${key}=`, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" }, "production")).toThrow("encoded");
    expect(() => parseCredentialKeyRing({ ONYX_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(31).toString("base64url"), ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" }, "production")).toThrow("32 bytes");
  });

  it("rejects production material outside production and unknown contexts", () => {
    expect(() => parseCredentialKeyRing({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" }, "deploy-preview")).toThrow("outside production");
    expect(() => createDatabaseRuntimePolicy("unknown", false)).toThrow("Unknown");
    expect(readDatabaseRuntimeContext({ CONTEXT: "deploy-preview" })).toBe("deploy-preview");
    expect(readDatabaseRuntimeContext({})).toBe("unknown");
  });

  it("allows explicit connection injection only for test context", () => {
    expect(() => createDatabaseRuntimePolicy("deploy-preview", false, true)).toThrow("connection");
    expect(() => createDatabaseRuntimePolicy("local", false, true)).toThrow("connection");
    expect(createDatabaseRuntimePolicy("test", false, true)).toMatchObject({ databaseAccessEnabled: true });
  });
});