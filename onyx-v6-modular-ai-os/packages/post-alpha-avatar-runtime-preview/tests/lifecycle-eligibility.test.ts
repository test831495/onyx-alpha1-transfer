import { describe, it, expect } from "vitest";
import {
  createAvatarRegistryFixture,
  getLifecycleEligibilityReason,
  resolveRegistryFixture,
} from "../src/registry-fixture";
import { AvatarLifecycleState } from "@onyx/post-alpha-avatar-foundation";

describe("Lifecycle Eligibility", () => {
  it("should accept ACTIVE lifecycle", () => {
    const fixture = createAvatarRegistryFixture("lifecycle-active", "ONYX", "ACTIVE");
    const resolved = resolveRegistryFixture(fixture, { character: "ONYX" });
    expect(resolved).not.toBeNull();
  });

  it("should reject REGISTERED lifecycle for Bundle 1", () => {
    const fixture = createAvatarRegistryFixture(
      "lifecycle-registered",
      "ONYX",
      "REGISTERED"
    );
    const resolved = resolveRegistryFixture(fixture, { character: "ONYX" });
    expect(resolved).toBeNull();
  });

  it("should reject DRAFT lifecycle", () => {
    const fixture = createAvatarRegistryFixture("lifecycle-draft", "ONYX", "DRAFT");
    const resolved = resolveRegistryFixture(fixture, { character: "ONYX" });
    expect(resolved).toBeNull();
  });

  it("should reject SUPERSEDED lifecycle", () => {
    const fixture = createAvatarRegistryFixture(
      "lifecycle-superseded",
      "ONYX",
      "SUPERSEDED"
    );
    const resolved = resolveRegistryFixture(fixture, { character: "ONYX" });
    expect(resolved).toBeNull();
  });

  const ineligibleStates: AvatarLifecycleState[] = [
    "REGISTERED",
    "ACCEPTED",
    "DRAFT",
    "SUPERSEDED",
    "REVOKED",
    "REJECTED",
    "ROLLED_BACK",
  ];

  for (const state of ineligibleStates) {
    it(`should fail-closed for ${state} lifecycle`, () => {
      const fixture = createAvatarRegistryFixture(
        `lifecycle-${state.toLowerCase()}`,
        "ONYX",
        state
      );
      const resolved = resolveRegistryFixture(fixture, { character: "ONYX" });
      expect(resolved).toBeNull();
      expect(getLifecycleEligibilityReason(state)).toBe(
        `LIFECYCLE_${state}_NOT_ELIGIBLE`
      );
    });
  }
});
