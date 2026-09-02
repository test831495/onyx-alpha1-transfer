import { describe, expect, it } from "vitest";
import {
  CANONICAL_CONTRACT_NAMES,
  CONTRACT_INVENTORY,
  compatibilityFingerprint,
  validateContractInventory,
} from "../src/index.js";
import { buildContractValidationResult } from "../scripts/generate-evidence.js";

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

  it("keeps count and canonical-list drift checks independent", () => {
    expect(validateContractInventory(CONTRACT_INVENTORY.slice(1))).toContain("contract count must be 35");
    expect(validateContractInventory([...CONTRACT_INVENTORY.slice(1), CONTRACT_INVENTORY[0]!])).toContain("contract names must be canonical and complete");
  });

  it("derives failed validation evidence from contract validation errors", () => {
    const result = buildContractValidationResult(CONTRACT_INVENTORY.slice(1));
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.result).toBe("FAIL");
    expect(result.exitCode).not.toBe(0);
    expect(result.summary).toContain("FAIL");
  });

  it("keeps successful validation payload, summary, and exit code aligned", () => {
    const result = buildContractValidationResult(CONTRACT_INVENTORY);
    expect(result).toMatchObject({ result: "PASS", exitCode: 0, validationErrors: [] });
    expect(result.summary).toBe("PASS: 0 validation errors");
  });
});