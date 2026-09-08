import { describe, expect, it } from "vitest";
import { ACCEPTANCE_IDS, ACCEPTANCE_MAPPINGS, validateAcceptanceRegistry } from "../src/index";

const familyCounts = { REG: 12, ACCOUNT: 10, BIND: 10, HEALTH: 12, STATE: 10, VAULT: 8, ATTR: 8, COST: 8, RECOVERY: 10, SCOPE: 12 } as const;

describe("acceptance and scope assurance", () => {
  it("contains exactly 100 IDs", () => expect(ACCEPTANCE_IDS).toHaveLength(100));
  it("contains exactly 100 mappings", () => expect(ACCEPTANCE_MAPPINGS).toHaveLength(100));
  it("has exact frozen family counts", () => { for (const [family, count] of Object.entries(familyCounts)) expect(ACCEPTANCE_IDS.filter((id) => id.startsWith(`TB-CON-${family}-`))).toHaveLength(count); });
  it("has no duplicate IDs", () => expect(new Set(ACCEPTANCE_IDS).size).toBe(100));
  it("has no missing numeric IDs", () => { for (const [family, count] of Object.entries(familyCounts)) for (let index = 1; index <= count; index += 1) expect(ACCEPTANCE_IDS).toContain(`TB-CON-${family}-${String(index).padStart(3, "0")}`); });
  it("maps every ID to an implementation and test path", () => {
    const valid = ACCEPTANCE_MAPPINGS.every((mapping) => mapping.implementation.startsWith("src/") && mapping.test.startsWith("tests/"));
    expect(valid).toBe(true);
  });
  it("returns a deterministic immutable registry result", () => { const first = validateAcceptanceRegistry(); const second = validateAcceptanceRegistry(); expect(first).toEqual(second); expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first.ids)).toBe(true); });
  it("does not claim activation or authority", () => {
    const valid = ACCEPTANCE_MAPPINGS.every((mapping) => !/activate|authorize|deploy|merge/i.test(mapping.implementation + mapping.test));
    expect(valid).toBe(true);
  });
  it("contains no provider adapter or OAuth evidence paths", () => {
    const valid = ACCEPTANCE_MAPPINGS.every((mapping) => !/microsoft|google|github|netlify|oauth|adapter/i.test(mapping.implementation + mapping.test));
    expect(valid).toBe(true);
  });
  it("validates the complete registry", () => expect(validateAcceptanceRegistry()).toMatchObject({ valid: true, count: 100 }));
});
