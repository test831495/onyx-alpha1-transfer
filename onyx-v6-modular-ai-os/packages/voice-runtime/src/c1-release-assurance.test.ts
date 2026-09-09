import { describe, expect, it } from "vitest";
import { C1_PERFORMANCE_BUDGETS, C1_SEMANTIC_STATES, classifyC1Language, createC1AssuranceReceipt, createC1HeroBriefing } from "./c1-release-assurance";

describe("C1 release assurance", () => {
  it("keeps eight canonical semantic states and bounded language behavior", () => {
    expect(C1_SEMANTIC_STATES).toHaveLength(8);
    expect(classifyC1Language("Hey Onyx, kya update hai today?", "English")).toBe("Hinglish");
    expect(classifyC1Language("Aaj kya badla hai?", "English")).toBe("Hindi");
    expect(classifyC1Language("What changed today?", "Hindi")).toBe("English");
  });

  it("keeps the synthetic B1 hero briefing attributed and authorization-consistent across languages", () => {
    for (const language of ["English", "Hindi", "Hinglish"] as const) {
      expect(createC1HeroBriefing(language)).toMatchObject({ source: "B1_SYNTHETIC", language, authorization: "SERVER_AUTHORITATIVE_DENY_BY_DEFAULT", citations: ["synthetic:b1:briefing"] });
    }
  });

  it("labels performance evidence synthetic and fails recovery closed while providers remain disabled", () => {
    expect(C1_PERFORMANCE_BUDGETS.every((budget) => budget.synthetic && budget.maxMs > 0)).toBe(true);
    expect(createC1AssuranceReceipt({ requestId: "request-1", providerFailure: true, cancelled: false })).toMatchObject({ fallback: true, providerActivation: false, retryCount: 0, nonAuthorizing: true });
    expect(createC1AssuranceReceipt({ requestId: "request-1", providerFailure: false, cancelled: true })).toMatchObject({ cancelled: true, recoveryReactivatesProvider: false });
  });
});