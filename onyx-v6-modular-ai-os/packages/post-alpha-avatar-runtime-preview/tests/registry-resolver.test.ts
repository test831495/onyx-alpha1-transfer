import { describe, it, expect } from "vitest";
import { createAvatarRegistryFixture, validateRegistryFixture, resolveRegistryFixture } from "../src/registry-fixture";

describe("Registry Resolver", () => {
  it("should create a valid registry fixture for ONYX", () => {
    const fixture = createAvatarRegistryFixture(
      "test-onyx-001",
      "ONYX",
      "ACTIVE",
      "CANONICAL"
    );
    expect(fixture.character).toBe("ONYX");
    expect(fixture.lifecycle).toBe("ACTIVE");
    expect(fixture.classification).toBe("CANONICAL");
  });

  it("should create a valid registry fixture for NOVA", () => {
    const fixture = createAvatarRegistryFixture(
      "test-nova-001",
      "NOVA",
      "REGISTERED",
      "ACCOUNT_SELECTED"
    );
    expect(fixture.character).toBe("NOVA");
    expect(fixture.lifecycle).toBe("REGISTERED");
  });

  it("should validate integrity hash equivalence", () => {
    const fixture = createAvatarRegistryFixture("test-001", "ONYX", "ACTIVE");
    expect(fixture.canonicalIntegrityHash).toBe(fixture.variantIntegrityHash);
    expect(validateRegistryFixture(fixture)).toBe(true);
  });

  it("should reject invalid character", () => {
    expect(() => {
      // @ts-ignore - intentionally passing invalid character for test
      createAvatarRegistryFixture("test-001", "INVALID", "ACTIVE");
    }).toThrow("Invalid character");
  });

  it("should resolve fixture by character binding", () => {
    const onyxFixture = createAvatarRegistryFixture("onyx-001", "ONYX", "ACTIVE");
    const resolved = resolveRegistryFixture(onyxFixture, { character: "ONYX" });
    expect(resolved).not.toBeNull();
    expect(resolved?.character).toBe("ONYX");
  });

  it("should return null when character does not match", () => {
    const onyxFixture = createAvatarRegistryFixture("onyx-001", "ONYX", "ACTIVE");
    const resolved = resolveRegistryFixture(onyxFixture, { character: "NOVA" });
    expect(resolved).toBeNull();
  });

  it("should enforce ACTIVE lifecycle for Bundle 1", () => {
    const registeredFixture = createAvatarRegistryFixture(
      "registered-001",
      "ONYX",
      "REGISTERED"
    );
    const resolved = resolveRegistryFixture(registeredFixture, {
      character: "ONYX",
    });
    expect(resolved).toBeNull(); // Default allows ACTIVE only
  });

});
