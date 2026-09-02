import { describe, it, expect } from "vitest";
import {
  SEALED_POST_ALPHA_FOUNDATIONS,
  LEGACY_OWNERSHIP,
  BASELINE_REPOSITORY_STATE,
  GOVERNANCE_MARKERS,
  getFoundationInventory,
} from "../src/sealed-packages";

describe("Sealed Packages Inventory", () => {
  it("should provide five sealed Post-Alpha foundations", () => {
    expect(SEALED_POST_ALPHA_FOUNDATIONS).toHaveLength(5);
    expect(SEALED_POST_ALPHA_FOUNDATIONS[0].name).toBe(
      "@onyx/post-alpha-governance-foundation"
    );
  });

  it("should provide legacy ownership record", () => {
    expect(LEGACY_OWNERSHIP.name).toBe("@onyx/avatar-runtime");
    expect(LEGACY_OWNERSHIP.bridgeDefault).toBe("NO_BRIDGE");
  });

  it("should provide baseline repository state", () => {
    expect(BASELINE_REPOSITORY_STATE.baselineSha).toBe(
      "0eebbc38011ca1559895059a229c0bdbc0462cad"
    );
    expect(BASELINE_REPOSITORY_STATE.branch).toBe("main");
  });

  it("should provide governance markers with classification", () => {
    expect(GOVERNANCE_MARKERS.sealedPredecessor.classification).toBe(
      "GOVERNANCE_SESSION_EVIDENCE"
    );
  });

  it("should return a deeply frozen immutable inventory projection", () => {
    const inventory = getFoundationInventory();
    expect(Object.isFrozen(inventory)).toBe(true);
    expect(Object.isFrozen(inventory.sealed)).toBe(true);
    expect(inventory.sealed.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(inventory.legacy)).toBe(true);
    expect(Object.isFrozen(inventory.baseline)).toBe(true);
    expect(Object.isFrozen(inventory.markers)).toBe(true);
    expect(Object.values(inventory.markers).every(Object.isFrozen)).toBe(true);
    expect(() => {
      (inventory.sealed as Array<{ name: string }>).push({ name: "unexpected" });
    }).toThrow();
    expect(inventory.sealed).toHaveLength(5);
    expect(getFoundationInventory()).toEqual(inventory);
  });
});
