import { describe, expect, it } from "vitest";
import {
  aggregateWorkflowBudget,
  evaluateApprovalBoundary,
  evaluateEvidenceStoragePressure,
} from "../src/budgets";

describe("Wave 3B contract gaps", () => {
  it("rejects approval boundary failures deterministically", () => {
    expect(
      evaluateApprovalBoundary({
        approvalId: "",
        approvalStatus: "PENDING",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-01-01T00:00:00.000Z",
        evaluatedAt: "2026-01-02T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_MISSING_APPROVAL");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-1",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-b",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_SCOPE_MISMATCH");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-2",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "CLOUD_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_MODEL_CLASS");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-3",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 60,
        requestedTokenMaximum: 80,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_TOKEN_BOUNDARY");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-4",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 15,
        requestedCostMaximum: 20,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_COST_BOUNDARY");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-5",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v2",
        materialChangeDetected: false,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_POLICY_VERSION");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-6",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: true,
        riskClass: "R2",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_MATERIAL_CHANGE");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-7",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R4",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("DENIED_RISK_CLASS");

    expect(
      evaluateApprovalBoundary({
        approvalId: "ap-8",
        approvalStatus: "APPROVED",
        approvedScopeHash: "scope-a",
        currentScopeHash: "scope-a",
        approvedModelClasses: ["LOCAL_SMALL"],
        requestedModelClass: "LOCAL_SMALL",
        approvedTokenMaximum: 80,
        requestedTokenMaximum: 40,
        approvedCostMaximum: 20,
        requestedCostMaximum: 10,
        approvalExpiresAt: "2026-03-01T00:00:00.000Z",
        evaluatedAt: "2026-02-01T00:00:00.000Z",
        approvalPolicyVersion: "v1",
        currentPolicyVersion: "v1",
        materialChangeDetected: false,
        riskClass: "R5",
        paidActionRequested: false,
        evidenceArtifactIds: ["e-1"],
      }).decision,
    ).toBe("PROHIBITED");
  });

  it("evaluates evidence storage pressure and aggregation deterministically", () => {
    expect(
      evaluateEvidenceStoragePressure({
        mandatoryEvidenceBytes: 60,
        optionalEvidenceBytes: 40,
        duplicateOptionalEvidenceBytes: 10,
        reservedEvidenceBytes: 20,
        consumedEvidenceBytes: 30,
        hardLimitBytes: 220,
        warningThresholdBytes: 150,
        requiredEvidenceArtifactIds: ["required-a"],
        optionalEvidenceArtifactIds: ["optional-a"],
        provenanceReferenceIds: ["prov-1"],
        auditReferenceIds: ["audit-1"],
        redactionDecisionIds: ["redact-1"],
        evaluatedAt: "fixed",
      }).decision,
    ).toBe("WARNING");

    expect(
      evaluateEvidenceStoragePressure({
        mandatoryEvidenceBytes: 170,
        optionalEvidenceBytes: 30,
        duplicateOptionalEvidenceBytes: 10,
        reservedEvidenceBytes: 10,
        consumedEvidenceBytes: 10,
        hardLimitBytes: 220,
        warningThresholdBytes: 180,
        requiredEvidenceArtifactIds: ["required-a"],
        optionalEvidenceArtifactIds: ["optional-a"],
        provenanceReferenceIds: ["prov-1"],
        auditReferenceIds: ["audit-1"],
        redactionDecisionIds: ["redact-1"],
        evaluatedAt: "fixed",
      }).decision,
    ).toBe("MANDATORY_EVIDENCE_OVERFLOW");

    expect(
      evaluateEvidenceStoragePressure({
        mandatoryEvidenceBytes: 260,
        optionalEvidenceBytes: 10,
        duplicateOptionalEvidenceBytes: 10,
        reservedEvidenceBytes: 20,
        consumedEvidenceBytes: 30,
        hardLimitBytes: 220,
        warningThresholdBytes: 180,
        requiredEvidenceArtifactIds: ["required-a"],
        optionalEvidenceArtifactIds: ["optional-a"],
        provenanceReferenceIds: ["prov-1"],
        auditReferenceIds: ["audit-1"],
        redactionDecisionIds: ["redact-1"],
        evaluatedAt: "fixed",
      }).decision,
    ).toBe("COMPLETION_BLOCKED");

    const evidence = evaluateEvidenceStoragePressure({
      mandatoryEvidenceBytes: 100,
      optionalEvidenceBytes: 40,
      duplicateOptionalEvidenceBytes: 10,
      reservedEvidenceBytes: 20,
      consumedEvidenceBytes: 30,
      hardLimitBytes: 220,
      warningThresholdBytes: 180,
      requiredEvidenceArtifactIds: ["required-a"],
      optionalEvidenceArtifactIds: ["optional-a"],
      provenanceReferenceIds: ["prov-1"],
      auditReferenceIds: ["audit-1"],
      redactionDecisionIds: ["redact-1"],
      evaluatedAt: "fixed",
    });
    expect(evidence.provenanceReferenceIds).toEqual(["prov-1"]);
    expect(evidence.auditReferenceIds).toEqual(["audit-1"]);
    expect(evidence.noMutationOccurred).toBe(true);

    const aggregation = aggregateWorkflowBudget(
      "workflow-1",
      "agent-1",
      "LOCAL_SMALL",
      ["task-1", "task-2"],
      [
        {
          budgetType: "TOKENS",
          budgetId: "token-1",
          unit: "tokens",
          consumed: 20,
          reserved: 10,
          estimated: 30,
          remaining: 40,
          warning: false,
          hardStop: false,
          decision: "WITHIN_BUDGET",
          reason: "ok",
          evidenceArtifactIds: ["e-1"],
        },
        {
          budgetType: "API_CALLS",
          budgetId: "api-1",
          unit: "calls",
          consumed: 1,
          reserved: 0,
          estimated: 3,
          remaining: 6,
          warning: true,
          hardStop: false,
          decision: "WITHIN_BUDGET_WITH_WARNING",
          reason: "warning",
          evidenceArtifactIds: ["e-2"],
        },
        {
          budgetType: "LANE_CAPACITY",
          budgetId: "lane-1",
          unit: "lanes",
          consumed: 0,
          reserved: 0,
          estimated: 1,
          remaining: 0,
          warning: false,
          hardStop: true,
          decision: "HARD_STOP",
          reason: "lane-limit",
          evidenceArtifactIds: ["e-3"],
        },
      ],
    );
    expect(aggregation.workflowBudgetSummary.length).toBe(3);
    expect(aggregation.warningBudgetIds).toContain("api-1");
    expect(aggregation.hardStopBudgetIds).toContain("lane-1");
    expect(aggregation.aggregateDigest).toBeTruthy();
  });
});
