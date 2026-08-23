import { describe, expect, it } from "vitest";
import { defaultModelRoutingProfile, MODEL_ROUTING_CLASSES, type ModelRoutingClass } from "@onyx/phase1a8-governed-contracts";
import { evaluateModelRoutingBoundary, evaluateModelFallback } from "../src/budgets";
const request = { modelRoutingBoundaryDecisionId: "route-1", schedulerTaskReferenceId: "task-1", requestId: "request-1", workflowId: "workflow-1", contextPackageId: "context-1", modelRoutingProfileId: "profile-1", allowedModelClasses: ["LOCAL_SMALL", "CLOUD_SMALL"] as const, preferredModelClass: "LOCAL_SMALL" as const, fallbackOrder: ["LOCAL_SMALL", "CLOUD_SMALL"] as const, localFirst: true, cachePreferred: true, privateMemoryPresent: false, connectorContentPresent: false, privacyRequirement: "NO_SENSITIVE_DATA" as const, dataResidencyRequirement: "LOCAL" as const, tokenBudgetDecisionId: "token-1", costBudgetDecisionId: "cost-1", apiCallBudgetDecisionId: "api-1", approvalId: "", scopeHash: "scope-1", evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", contractVersion: "1.0.0" };
describe("Wave 3B routing boundary", () => { it("prefers a compatible local class and requires cache evaluation", () => { const result = evaluateModelRoutingBoundary(request, defaultModelRoutingProfile("profile-1"), true); expect(result.selectedModelClass).toBe("LOCAL_SMALL"); expect(result.cacheEvaluationRequired).toBe(true); }); it("denies private memory without permission and preserves fallback gates", () => { expect(evaluateModelRoutingBoundary({ ...request, privateMemoryPresent: true }, defaultModelRoutingProfile("profile-1"), true).decision).toBe("DENIED_MEMORY_SCOPE"); expect(evaluateModelFallback({ fallbackDecisionId: "f-1", allowedClasses: ["LOCAL_SMALL", "CLOUD_SMALL"], fallbackOrder: ["LOCAL_SMALL", "CLOUD_SMALL"], tokenHardStop: true, costHardStop: false, apiCallHardStop: false, privacyCompatible: true, approvalRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", contractVersion: "1.0.0" }).selectedModelClass).toBeNull(); }); });
describe("Wave 3B routing focused boundaries", () => {
	it("reuses only provider-neutral classes and preserves profile fallback order", () => {
		expect(MODEL_ROUTING_CLASSES).toEqual(["LOCAL_SMALL", "LOCAL_MEDIUM", "CLOUD_SMALL", "CLOUD_MEDIUM", "CLOUD_PREMIUM"]);
		const profile = { ...defaultModelRoutingProfile("profile-1"), allowedClasses: ["LOCAL_SMALL", "LOCAL_MEDIUM"] satisfies ModelRoutingClass[], fallbackOrder: ["LOCAL_MEDIUM", "LOCAL_SMALL"] satisfies ModelRoutingClass[] };
		const result = evaluateModelRoutingBoundary({ ...request, allowedModelClasses: ["LOCAL_SMALL", "LOCAL_MEDIUM"], fallbackOrder: ["LOCAL_MEDIUM", "LOCAL_SMALL"], preferredModelClass: "LOCAL_MEDIUM" }, profile, true);
		expect(result.selectedModelClass).toBe("LOCAL_MEDIUM");
		expect(result.fallbackModelClasses).toEqual(["LOCAL_SMALL"]);
	});

	it("denies unavailable classes, missing evidence, connector scope, and budget gates", () => {
		expect(evaluateModelRoutingBoundary({ ...request, allowedModelClasses: ["CLOUD_MEDIUM"], fallbackOrder: ["CLOUD_MEDIUM"] }, defaultModelRoutingProfile("profile-1"), true).selectedModelClass).toBeNull();
		expect(evaluateModelRoutingBoundary({ ...request, evidenceArtifactIds: [] }, defaultModelRoutingProfile("profile-1"), true).decision).toBe("FAILED_SAFE");
		expect(evaluateModelRoutingBoundary({ ...request, connectorContentPresent: true }, defaultModelRoutingProfile("profile-1"), true).decision).toBe("DENIED_CONNECTOR_SCOPE");
		expect(evaluateModelRoutingBoundary(request, defaultModelRoutingProfile("profile-1"), false).decision).toBe("DENIED_TOKEN_BUDGET");
	});

	it("requires premium approval and keeps cache evaluation an evaluation requirement", () => {
		const premiumProfile = { ...defaultModelRoutingProfile("profile-1"), allowedClasses: ["CLOUD_PREMIUM"] satisfies ModelRoutingClass[], preferredClass: "CLOUD_PREMIUM" as const, fallbackOrder: [] satisfies ModelRoutingClass[] };
		const premium = evaluateModelRoutingBoundary({ ...request, allowedModelClasses: ["CLOUD_PREMIUM"], preferredModelClass: "CLOUD_PREMIUM", fallbackOrder: [], localFirst: false, cachePreferred: false }, premiumProfile, true);
		expect(premium.decision).toBe("PREMIUM_APPROVAL_REQUIRED");
		expect(premium.selectedModelClass).toBeNull();
		expect(evaluateModelRoutingBoundary(request, defaultModelRoutingProfile("profile-1"), true).cacheEvaluationRequired).toBe(true);
	});

	it("applies deterministic fallback ordering without execution", () => {
		const input = { fallbackDecisionId: "f-2", allowedClasses: ["LOCAL_SMALL", "LOCAL_MEDIUM", "CLOUD_SMALL"] as const, fallbackOrder: ["LOCAL_MEDIUM", "LOCAL_SMALL", "CLOUD_SMALL"] as const, tokenHardStop: false, costHardStop: false, apiCallHardStop: false, privacyCompatible: true, approvalRequired: false, evidenceArtifactIds: ["e-1"], evaluatedAt: "fixed", contractVersion: "1.0.0" };
		const first = evaluateModelFallback(input);
		const second = evaluateModelFallback(input);
		expect(first).toEqual(second);
		expect(first.selectedModelClass).toBe("LOCAL_MEDIUM");
		expect(first.fallbackModelClasses).toEqual(["LOCAL_SMALL", "CLOUD_SMALL"]);
		for (const gate of [{ tokenHardStop: true }, { costHardStop: true }, { apiCallHardStop: true }, { privacyCompatible: false }, { approvalRequired: true }]) {
			expect(evaluateModelFallback({ ...input, ...gate }).selectedModelClass).toBeNull();
		}
	});
});
