import { describe, expect, it } from "vitest";
import { classifyCredentialKeyConfiguration, parseCredentialKeyRing } from "./config.js";
import { classifyDatabaseConfiguration, createDatabaseRuntimePolicy, readDatabaseRuntimeContext } from "./database.js";

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

  it("recognizes production via the explicit ONYX_RUNTIME_CONTEXT override when CONTEXT is unavailable to Functions", () => {
    // Reproduces production evidence: Netlify Functions runtime does not expose the build-scope CONTEXT variable.
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "production" })).toBe("production");
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "deploy-preview" })).toBe("deploy-preview");
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "branch-deploy" })).toBe("branch-deploy");
    expect(readDatabaseRuntimeContext({ CONTEXT: undefined, NODE_ENV: "production" })).toBe("unknown");
  });

  it("prefers ONYX_RUNTIME_CONTEXT over CONTEXT and still rejects unknown/unsupported values", () => {
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "production", CONTEXT: "deploy-preview" })).toBe("production");
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "production", CONTEXT: "bogus" })).toBe("production");
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "bogus", CONTEXT: "production" })).toBe("unknown");
    expect(readDatabaseRuntimeContext({ ONYX_RUNTIME_CONTEXT: "bogus" })).toBe("unknown");
    expect(() => createDatabaseRuntimePolicy(readDatabaseRuntimeContext({}), false)).toThrow("Unknown");
  });

  it("allows explicit connection injection only for test context", () => {
    expect(() => createDatabaseRuntimePolicy("deploy-preview", false, true)).toThrow("connection");
    expect(() => createDatabaseRuntimePolicy("local", false, true)).toThrow("connection");
    expect(createDatabaseRuntimePolicy("test", false, true)).toMatchObject({ databaseAccessEnabled: true });
  });

  it("rejects duplicate active and previous key versions", () => {
    expect(() => parseCredentialKeyRing({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: "v1" }]) }, "production")).toThrow("unique");
  });

  it("classifies every bounded credential key configuration outcome without ever logging secret material", () => {
    expect(classifyCredentialKeyConfiguration({})).toBe("CREDENTIAL_KEY_MISSING");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key })).toBe("CREDENTIAL_KEY_VERSION_MISSING");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "   " })).toBe("CREDENTIAL_KEY_VERSION_MISSING");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: "not-base64url!!", ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" })).toBe("CREDENTIAL_KEY_NOT_STRICT_BASE64URL");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(31).toString("base64url"), ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" })).toBe("CREDENTIAL_KEY_WRONG_DECODED_LENGTH");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIEW_ENCRYPTION_KEY: key })).toBe("PREVIEW_KEY_FORBIDDEN_IN_PRODUCTION");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: "{not json" })).toBe("PREVIOUS_KEY_RING_INVALID_JSON");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ version: "v0" }]) })).toBe("PREVIOUS_KEY_RING_INVALID_ENTRY");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key: "not-base64url!!", version: "v0" }]) })).toBe("PREVIOUS_KEY_RING_INVALID_KEY");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: "v1" }]) })).toBe("DUPLICATE_KEY_VERSION");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" })).toBe("CREDENTIAL_KEY_CONFIGURATION_VALID");
    expect(classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: "v0" }]) })).toBe("CREDENTIAL_KEY_CONFIGURATION_VALID");
  });

  it("rejects a blank, whitespace-only, or non-string previous key-ring version exactly like parseCredentialKeyRing does", () => {
    const blankVersions = ["", " ", "\t", "\n", "  \t\n  "];
    for (const version of blankVersions) {
      const environmentUnderTest = { ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version }]) };
      expect(classifyCredentialKeyConfiguration(environmentUnderTest)).toBe("PREVIOUS_KEY_RING_INVALID_ENTRY");
      expect(() => parseCredentialKeyRing(environmentUnderTest, "production")).toThrow();
    }

    const missingVersionEnvironment = { ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key }]) };
    expect(classifyCredentialKeyConfiguration(missingVersionEnvironment)).toBe("PREVIOUS_KEY_RING_INVALID_ENTRY");
    expect(() => parseCredentialKeyRing(missingVersionEnvironment, "production")).toThrow();

    const nonStringVersionEnvironment = { ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: 1 }]) };
    expect(classifyCredentialKeyConfiguration(nonStringVersionEnvironment)).toBe("PREVIOUS_KEY_RING_INVALID_ENTRY");
    expect(() => parseCredentialKeyRing(nonStringVersionEnvironment, "production")).toThrow();

    // A valid non-empty previous version is still accepted, and duplicate valid versions are still detected.
    const validPreviousEnvironment = { ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: "v0" }]) };
    expect(classifyCredentialKeyConfiguration(validPreviousEnvironment)).toBe("CREDENTIAL_KEY_CONFIGURATION_VALID");
    expect(parseCredentialKeyRing(validPreviousEnvironment, "production").previous).toHaveLength(1);

    const duplicatePreviousEnvironment = { ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version: "v1" }]) };
    expect(classifyCredentialKeyConfiguration(duplicatePreviousEnvironment)).toBe("DUPLICATE_KEY_VERSION");
    expect(() => parseCredentialKeyRing(duplicatePreviousEnvironment, "production")).toThrow("unique");

    // The classifier never returns or logs the version value itself.
    expect(JSON.stringify(blankVersions.map((version) => classifyCredentialKeyConfiguration({ ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1", ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key, version }]) })))).not.toContain(key);
  });

  it("classifies database configuration readiness without ever logging connection details", () => {
    expect(classifyDatabaseConfiguration({})).toBe("DATABASE_CONFIGURATION_UNAVAILABLE");
    expect(classifyDatabaseConfiguration({ ONYX_RUNTIME_CONTEXT: "production" })).toBe("DATABASE_CONFIGURATION_UNAVAILABLE");
    expect(classifyDatabaseConfiguration({ ONYX_RUNTIME_CONTEXT: "production", ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" })).toBe("DATABASE_CONFIGURATION_AVAILABLE");
    expect(classifyDatabaseConfiguration(
      { ONYX_RUNTIME_CONTEXT: "production", ONYX_CREDENTIAL_ENCRYPTION_KEY: key, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" },
      () => { throw new Error("connection refused"); },
    )).toBe("DATABASE_CONNECTION_INITIALIZATION_FAILED");
  });
});