import { describe, expect, it } from "vitest";
import { evaluateCostEvidence, createRecoveryPlan } from "../src/index";

const cost = (disposition: "WITHIN_BUDGET" | "REQUIRES_APPROVAL" | "BUDGET_EXCEEDED" | "COST_UNKNOWN" | "COST_EVIDENCE_EXPIRED" | "NOT_APPLICABLE", freshnessState: "CURRENT" | "EXPIRED" | "UNKNOWN" = "CURRENT") => ({ connectorId: "connector.cost", unitReference: "unit.cost", budgetScopeReference: "budget.cost", freshnessState, disposition });
const plan = (overrides: Record<string, unknown> = {}) => ({ connectorId: "connector.recovery", steps: ["inspect"], gaps: [], externalEffectsUnknown: false, disposition: "ROLLBACK_READY" as const, ...overrides });

describe("cost and recovery assurance", () => {
  it("accepts within-budget evidence", () => expect(evaluateCostEvidence(cost("WITHIN_BUDGET")).disposition).toBe("WITHIN_BUDGET"));
  it("retains approval-required evidence", () => expect(evaluateCostEvidence(cost("REQUIRES_APPROVAL")).disposition).toBe("REQUIRES_APPROVAL"));
  it("retains budget-exceeded evidence", () => expect(evaluateCostEvidence(cost("BUDGET_EXCEEDED")).disposition).toBe("BUDGET_EXCEEDED"));
  it("fails closed for unknown cost when required", () => expect(() => evaluateCostEvidence(cost("COST_UNKNOWN", "UNKNOWN"))).toThrow());
  it("retains expired cost evidence", () => expect(evaluateCostEvidence(cost("COST_EVIDENCE_EXPIRED", "EXPIRED")).freshnessState).toBe("EXPIRED"));
  it("requires an explicit local policy for not-applicable cost", () => expect(evaluateCostEvidence(cost("NOT_APPLICABLE"), false).disposition).toBe("NOT_APPLICABLE"));
  it("does not authorize a call from cost evidence", () => expect(evaluateCostEvidence(cost("WITHIN_BUDGET"))).not.toHaveProperty("authorize"));
  it("accepts rollback-ready recovery plans", () => expect(createRecoveryPlan(plan()).disposition).toBe("ROLLBACK_READY"));
  it("retains revoked and residual recovery obligations", () => { const result = createRecoveryPlan(plan({ disposition: "REVOCATION_REQUIRED", gaps: ["residual credential obligation"] })); expect(result).toMatchObject({ disposition: "REVOCATION_REQUIRED", gaps: ["residual credential obligation"] }); });
  it("keeps disabled and removed states distinct and unknown effects visible", () => { expect(createRecoveryPlan(plan({ connectorId: "connector.disabled", disposition: "ROLLBACK_BLOCKED" })).connectorId).toBe("connector.disabled"); expect(createRecoveryPlan(plan({ connectorId: "connector.removed", disposition: "NOT_ASSESSABLE", externalEffectsUnknown: true })).externalEffectsUnknown).toBe(true); });
  it("accepts recovery maximums and rejects over-maximum steps and gaps", () => { expect(createRecoveryPlan(plan({ steps: Array.from({ length: 64 }, (_, index) => `step.${index}`), gaps: Array.from({ length: 64 }, (_, index) => `gap.${index}`) }))).toBeDefined(); expect(() => createRecoveryPlan(plan({ steps: Array.from({ length: 65 }, (_, index) => `step.${index}`) }))).toThrow(); expect(() => createRecoveryPlan(plan({ gaps: Array.from({ length: 65 }, (_, index) => `gap.${index}`) }))).toThrow(); });
  it("keeps recovery output proposal-only and immutable", () => { const result = createRecoveryPlan(plan()); expect(Object.isFrozen(result)).toBe(true); expect(result).not.toHaveProperty("execute"); });
});
