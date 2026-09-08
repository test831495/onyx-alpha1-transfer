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

  it("blocks account-scope conflicts in a fail-closed manner", () => {
    const result = evaluateConflicts([{ id: "acct-1", kind: "ACCOUNT_SCOPE_CONFLICT", severity: "BLOCKING", title: "Account scope conflict", detail: "Private account cannot mix with shared room", evidenceIds: ["ev-1"], resolution: "BLOCKED", nonAuthorizing: true }]);
    expect(result.disposition).toBe("BLOCKED");
    expect(result.conflicts[0]?.kind).toBe("ACCOUNT_SCOPE_CONFLICT");
  });

  it("blocks data-class conflicts in a fail-closed manner", () => {
    const result = evaluateConflicts([{ id: "dc-1", kind: "DATA_CLASS_CONFLICT", severity: "BLOCKING", title: "Data class conflict", detail: "Sensitive data class cannot mix with public query scope", evidenceIds: ["ev-2"], resolution: "BLOCKED", nonAuthorizing: true }]);
    expect(result.disposition).toBe("BLOCKED");
    expect(result.suggestions[0]).toContain("review dc-1");
  });

  it("fails closed on unknown blocking conflicts and preserves immutability", () => {
    const result = evaluateConflicts([{ id: "u-1", kind: "UNKNOWN_CONFLICT", severity: "BLOCKING", title: "Unknown blocking conflict", detail: "Unrecognized but blocking", evidenceIds: ["ev-3"], resolution: "BLOCKED", nonAuthorizing: true }]);
    expect(result.disposition).toBe("BLOCKED");
    expect(Object.isFrozen(result)).toBe(true);
  });
});
