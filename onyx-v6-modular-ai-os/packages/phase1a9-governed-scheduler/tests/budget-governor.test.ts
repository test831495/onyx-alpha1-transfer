import { describe, expect, it } from "vitest";
import { aggregateBudgetDecisions, evaluateBudgetMeasure, projectBudgetConsumption, projectBudgetExhaustion, projectBudgetRelease, projectBudgetReservation, type BudgetMeasure } from "../src/budgets";
const measure = (overrides: Partial<BudgetMeasure> = {}): BudgetMeasure => ({ budgetType: "TOKENS", budgetId: "tokens-1", unit: "tokens", consumed: 0, reserved: 0, estimated: 10, warningThreshold: 8, hardLimit: 20, ...overrides });
describe("Wave 3B budget governor", () => { it("validates numeric values and produces warning", () => { expect(evaluateBudgetMeasure(measure(), ["evidence-1"]).decision).toBe("WITHIN_BUDGET_WITH_WARNING"); expect(() => evaluateBudgetMeasure(measure({ estimated: -1 }), ["evidence-1"])).toThrow(); expect(() => evaluateBudgetMeasure(measure({ warningThreshold: 21 }), ["evidence-1"])).toThrow(); }); it("hard stops at the limit", () => { expect(evaluateBudgetMeasure(measure({ consumed: 20, estimated: 0 }), ["evidence-1"]).hardStop).toBe(true); }); it("keeps reservation and consumption projection-only", () => { const reservation = projectBudgetReservation({ budgetReservationDecisionId: "r-1", budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", budgetIds: ["b-1"], requestedReservations: [3], existingReservations: [0], remainingBefore: [10], reservationDecision: "RESERVATION_ELIGIBLE_AS_PROJECTION", expiryReference: "expiry-1", releaseRequirement: "terminal", approvalId: "", scopeHash: "scope-1", evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", }); expect(reservation.remainingAfterProjection).toEqual([7]); const consumption = projectBudgetConsumption({ budgetConsumptionDecisionId: "c-1", budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", budgetIds: ["b-1"], reservedAmounts: [3], reportedConsumption: [4], remainingBefore: [10], overageDetected: false, hardStopTriggered: false, reconciliationRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", }); expect(consumption.consumptionDecision).toBe("REQUIRES_RECONCILIATION"); }); it("prohibits automatic retry after exhaustion or uncertain remote effects", () => { const result = projectBudgetExhaustion({ budgetExhaustionDecisionId: "x-1", schedulerTaskReferenceId: "task-1", budgetDecisionId: "d-1", exhaustedBudgetIds: ["attempt-1"], warningBudgetIds: [], lastTrustedCheckpointDigest: "checkpoint-1", leaseId: "lease-1", leaseGeneration: 1, lockIds: [], remoteSideEffectStatus: "UNCERTAIN", providerOutcome: "UNKNOWN", idempotencyKey: "", approvalId: "approval-1", scopeHash: "scope-1", reconciliationRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", }); expect(result.recommendedDisposition).toBe("CHECKPOINT_AND_STOP"); expect(result.automaticRetryPermitted).toBe(false); }); });
describe("Wave 3B budget governor focused boundaries", () => {
	it("rejects non-finite, fractional, negative, and over-limit projections", () => {
		for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
			expect(() => evaluateBudgetMeasure(measure({ estimated: value }), ["e-1"])).toThrow();
		}
		expect(() => evaluateBudgetMeasure(measure({ reserved: 21 }), ["e-1"])).toThrow();
		expect(() => evaluateBudgetMeasure(measure({ consumed: 20, reserved: 1 }), ["e-1"])).toThrow();
		expect(() => evaluateBudgetMeasure(measure({ estimated: 11, reserved: 10 }), ["e-1"])).toThrow();
		expect(() => evaluateBudgetMeasure(measure({ unit: "" }), ["e-1"])).toThrow();
		for (const budgetType of ["API_CALLS", "ATTEMPTS", "LANE_CAPACITY"] as const) {
			expect(() => evaluateBudgetMeasure(measure({ budgetType, estimated: 1.5 }), ["e-1"])).toThrow();
		}
	});

	it("evaluates time, call, and monetary warning and hard-stop boundaries deterministically", () => {
		expect(evaluateBudgetMeasure(measure({ budgetType: "TIME", unit: "milliseconds", estimated: 1, warningThreshold: 5, hardLimit: 10 }), ["e-1"]).decision).toBe("WITHIN_BUDGET");
		expect(evaluateBudgetMeasure(measure({ budgetType: "TIME", unit: "milliseconds", consumed: 5, estimated: 0, warningThreshold: 5, hardLimit: 10 }), ["e-1"]).warning).toBe(true);
		expect(evaluateBudgetMeasure(measure({ budgetType: "TIME", unit: "milliseconds", consumed: 10, estimated: 0, warningThreshold: 5, hardLimit: 10 }), ["e-1"]).decision).toBe("HARD_STOP");
		expect(evaluateBudgetMeasure(measure({ budgetType: "API_CALLS", unit: "calls", estimated: 0, warningThreshold: 1, hardLimit: 2 }), ["e-1"]).warning).toBe(false);
		expect(evaluateBudgetMeasure(measure({ budgetType: "API_CALLS", unit: "calls", consumed: 2, estimated: 0, warningThreshold: 1, hardLimit: 2 }), ["e-1"]).hardStop).toBe(true);
		expect(evaluateBudgetMeasure(measure({ budgetType: "MONEY", unit: "smallest-currency-unit", estimated: 1, warningThreshold: 1, hardLimit: 2 }), ["e-1"]).warning).toBe(true);
		expect(evaluateBudgetMeasure(measure({ budgetType: "MONEY", unit: "smallest-currency-unit", consumed: 2, estimated: 0, warningThreshold: 1, hardLimit: 2 }), ["e-1"]).hardStop).toBe(true);
	});

	it("preserves deterministic reservation denial and remaining projections", () => {
		expect(() => projectBudgetReservation({ budgetReservationDecisionId: "r-2", budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", budgetIds: ["b-1"], requestedReservations: [11], existingReservations: [0], remainingBefore: [10], reservationDecision: "RESERVATION_ELIGIBLE_AS_PROJECTION", expiryReference: "expiry-1", releaseRequirement: "terminal", approvalId: "", scopeHash: "scope-1", evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed" })).toThrow();
		for (const reservationDecision of ["DENIED_APPROVAL", "DENIED_SCOPE", "DENIED_PERMISSION", "DENIED_MEMORY_SCOPE", "DENIED_CONNECTOR_SCOPE"] as const) {
			const result = projectBudgetReservation({ budgetReservationDecisionId: `r-${reservationDecision}`, budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", budgetIds: ["b-1"], requestedReservations: [2], existingReservations: [1], remainingBefore: [10], reservationDecision, expiryReference: "expiry-1", releaseRequirement: "terminal", approvalId: "", scopeHash: "scope-1", evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed" });
			expect(result.reservationDecision).toBe(reservationDecision);
			expect(result.remainingAfterProjection).toEqual([8]);
		}
	});

	it("keeps consumption, release, and aggregation projection-only", () => {
		const consumed = projectBudgetConsumption({ budgetConsumptionDecisionId: "c-2", budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", budgetIds: ["b-1"], reservedAmounts: [3], reportedConsumption: [2], remainingBefore: [10], overageDetected: false, hardStopTriggered: false, reconciliationRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed" });
		expect(consumed.consumptionDecision).toBe("CONSUMPTION_ELIGIBLE_AS_PROJECTION");
		expect(consumed.remainingAfterProjection).toEqual([8]);
		expect(projectBudgetConsumption({ ...consumed, reportedConsumption: [11] }).consumptionDecision).toBe("HARD_STOP");
		const release = projectBudgetRelease({ releaseDecisionId: "rel-1", budgetDecisionId: "d-1", schedulerTaskReferenceId: "task-1", workflowId: "workflow-1", budgetIds: ["b-1"], reservationDecisionId: "r-1", releasedAmounts: [2], terminalDisposition: "GOVERNED_CANCELLATION", consumedEvidenceArtifactIds: ["e-1"], scopeHash: "scope-1", evaluatedAt: "fixed" });
		expect(release.eligible).toBe(true);
		const first = evaluateBudgetMeasure(measure({ budgetId: "z-token", consumed: 1, reserved: 1, estimated: 0, warningThreshold: 1, hardLimit: 5 }), ["e-1"]);
		const second = evaluateBudgetMeasure(measure({ budgetId: "a-token", consumed: 2, reserved: 0, estimated: 0, warningThreshold: 1, hardLimit: 5 }), ["e-1"]);
		const aggregation = aggregateBudgetDecisions("workflow-1", "agent-1", "LOCAL_SMALL", ["task-2", "task-1"], [first, second]);
		expect(aggregation.byType.TOKENS!.budgetIds).toEqual(["a-token", "z-token"]);
		expect(aggregation.failedTaskIds).toEqual(["task-1", "task-2"]);
		expect(aggregation.byType.TOKENS!.units).toEqual(["tokens", "tokens"]);
	});

	it("keeps exhaustion dispositions and retry prohibition deterministic", () => {
		const base = { budgetExhaustionDecisionId: "x-2", schedulerTaskReferenceId: "task-1", budgetDecisionId: "d-1", exhaustedBudgetIds: [], warningBudgetIds: ["tokens-1"], lastTrustedCheckpointDigest: "checkpoint-1", leaseId: "lease-1", leaseGeneration: 1, lockIds: [], remoteSideEffectStatus: "NONE" as const, providerOutcome: "SUCCESS" as const, idempotencyKey: "key-1", approvalId: "approval-1", scopeHash: "scope-1", reconciliationRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed" };
		expect(projectBudgetExhaustion(base).automaticRetryPermitted).toBe(true);
		expect(projectBudgetExhaustion({ ...base, providerOutcome: "UNKNOWN" }).automaticRetryPermitted).toBe(false);
		expect(projectBudgetExhaustion({ ...base, remoteSideEffectStatus: "UNCERTAIN" }).recommendedDisposition).toBe("RECONCILE_REMOTE_EFFECT");
		expect(projectBudgetExhaustion({ ...base, exhaustedBudgetIds: ["attempt-1"] }).recommendedDisposition).toBe("CHECKPOINT_AND_STOP");
		expect(projectBudgetExhaustion({ ...base, approvalId: "" }).automaticRetryPermitted).toBe(false);
		expect(projectBudgetExhaustion({ ...base, scopeHash: "" }).automaticRetryPermitted).toBe(false);
	});
});
