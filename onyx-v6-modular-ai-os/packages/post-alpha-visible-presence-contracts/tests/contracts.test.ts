import { describe, expect, it } from "vitest";
import {
  CANONICAL_CONTRACT_NAMES,
  CONTRACT_INVENTORY,
  compatibilityFingerprint,
  validateContractInventory,
} from "../src/index.js";

describe("visible presence contract inventory", () => {
  it("locks exactly the canonical 35 contracts in bytewise order", () => {
    expect(CANONICAL_CONTRACT_NAMES).toHaveLength(35);
    expect(CANONICAL_CONTRACT_NAMES).toEqual([...CANONICAL_CONTRACT_NAMES].sort());
    expect(CONTRACT_INVENTORY.map((contract) => contract.name)).toEqual(CANONICAL_CONTRACT_NAMES);
    expect(validateContractInventory(CONTRACT_INVENTORY)).toEqual([]);
  });

  it("produces a deterministic complete compatibility fingerprint", () => {
    expect(compatibilityFingerprint(CONTRACT_INVENTORY)).toMatch(/^[a-f0-9]{64}$/);
    expect(compatibilityFingerprint(CONTRACT_INVENTORY)).toBe(compatibilityFingerprint(CONTRACT_INVENTORY));
  });
});