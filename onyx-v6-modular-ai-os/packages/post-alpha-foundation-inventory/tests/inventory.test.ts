import { describe, it, expect } from "vitest";
import { ACCEPTANCE_FAMILIES } from "../src/acceptance-families";

describe("Inventory Structure Tests", () => {
  it("should map PA-INVENTORY to Package A", () => {
    expect(ACCEPTANCE_FAMILIES.PA_INVENTORY.owningPackage).toBe(
      "@onyx/post-alpha-foundation-inventory"
    );
  });

  it("should map preview families to Package B", () => {
    expect(ACCEPTANCE_FAMILIES.PA_AVATAR_REGISTRY_PREVIEW.owningPackage).toBe(
      "@onyx/post-alpha-avatar-runtime-preview"
    );
    expect(ACCEPTANCE_FAMILIES.PA_AVATAR_RESOLVER.owningPackage).toBe(
      "@onyx/post-alpha-avatar-runtime-preview"
    );
  });

  it("should have correct family counts totaling 100", () => {
    const total = Object.values(ACCEPTANCE_FAMILIES).reduce(
      (sum, fam) => sum + fam.totalIds,
      0
    );
    expect(total).toBe(100);
  });
});
