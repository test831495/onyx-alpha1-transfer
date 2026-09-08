import { describe, expect, it } from "vitest";
import { evaluateConflicts } from "../src/conflict-contract";

describe("conflict contracts", () => {
  it("reports no conflict for clear inputs", () => {
    const result = evaluateConflicts([]);
    expect(result.disposition).toBe("NO_CONFLICT");
    expect(result.conflicts).toEqual([]);
  });

  it("blocks privacy conflicts and preserves non-authorizing evidence", () => {
    const result = evaluateConflicts([{ id: "c-1", kind: "PRIVACY_CONFLICT", severity: "BLOCKING", title: "Privacy conflict", detail: "Private account scope conflicts with shared room", evidenceIds: ["ev-1"], resolution: "BLOCKED", nonAuthorizing: true }]);
    expect(result.disposition).toBe("BLOCKED");
    expect(result.conflicts[0]?.nonAuthorizing).toBe(true);
  });

  it("keeps conflict ordering deterministic", () => {
    const result = evaluateConflicts([
      { id: "z-1", kind: "FRESHNESS_CONFLICT", severity: "WARNING", title: "Z", detail: "z", evidenceIds: [], resolution: "REQUIRES_CLARIFICATION", nonAuthorizing: true },
      { id: "a-1", kind: "ACCOUNT_SCOPE_CONFLICT", severity: "INFO", title: "A", detail: "a", evidenceIds: [], resolution: "REQUIRES_POLICY_DECISION", nonAuthorizing: true },
    ]);
    expect(result.conflicts.map((item) => item.id)).toEqual(["a-1", "z-1"]);
  });
});
