import { describe, it, expect } from "vitest";
import { createAvatarRegistryFixture, validateRegistryFixture } from "../src/registry-fixture";
import { CANONICAL_CHARACTERS } from "@onyx/post-alpha-avatar-foundation";

describe("Character Binding", () => {
  it("should bind fixture to ONYX character", () => {
    const fixture = createAvatarRegistryFixture("char-onyx", "ONYX", "ACTIVE");
    expect(fixture.character).toBe("ONYX");
    expect(Object.keys(CANONICAL_CHARACTERS)).toContain(fixture.character);
  });

  it("should bind fixture to NOVA character", () => {
    const fixture = createAvatarRegistryFixture("char-nova", "NOVA", "ACTIVE");
    expect(fixture.character).toBe("NOVA");
    expect(Object.keys(CANONICAL_CHARACTERS)).toContain(fixture.character);
  });

  it("should validate canonical character set", () => {
    const canonicalChars = Object.keys(CANONICAL_CHARACTERS);
    expect(canonicalChars).toContain("ONYX");
    expect(canonicalChars).toContain("NOVA");
    expect(canonicalChars.length).toBe(2);
  });
});
