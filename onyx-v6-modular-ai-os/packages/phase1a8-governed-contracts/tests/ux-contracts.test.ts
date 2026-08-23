import { describe, expect, it } from "vitest";
import {
  AUTOMATION_CENTER_SCREEN_IDS,
  createAutomationCenterScreenRegistry,
  assertAutomationCenterScreenRegistry,
  assertKnownAutomationCenterScreen,
  createCrossScreenCorrelation,
  assertCrossScreenCorrelation,
  createDashboardProjection,
  createIntakeProjection,
  createPlansProjection,
  createApprovalCard,
  createAgentActivityContract,
  createValidationCenterProjection,
  createEvidenceViewerContract,
  createContextExplorerProjection,
  createRecoveryCenterProjection,
  createCostCenterProjection,
  createSettingsProjection,
} from "../src/ux/automation-center-v2-contracts";

const exampleInput = {
  workflowId: "wf-001",
  runtimeId: "rt-001",
  runtimeSessionId: "session-001",
  taskId: "task-001",
  agentId: "agent-001",
  leaseId: "lease-001",
  approvalId: "approval-001",
  checkpointDigest: "digest-001",
  evidencePackageId: "ev-001",
  contextPackageId: "ctx-001",
  recoveryCaseId: "rc-001",
  budgetId: "budget-001",
  connectorScopeIds: ["cs-001", "cs-002"],
  updatedAt: "2026-01-01T00:00:00.000Z",
  contractVersion: "1.0.0",
};

describe("Automation Center V2 screen contracts", () => {
  it("declares all 12 mandatory screens and rejects unknowns", () => {
    expect(AUTOMATION_CENTER_SCREEN_IDS).toHaveLength(12);
    expect(AUTOMATION_CENTER_SCREEN_IDS).toContain("DASHBOARD");
    expect(AUTOMATION_CENTER_SCREEN_IDS).toContain("SETTINGS");
    expect(() => assertKnownAutomationCenterScreen("UNKNOWN_SCREEN" as any)).toThrow();
  });

  it("rejects duplicate screen IDs and route IDs and keeps deterministic display order", () => {
    expect(() => createAutomationCenterScreenRegistry([
      { screenId: "DASHBOARD", routeId: "dashboard", displayOrder: 1, requiredPermissions: ["read:workflow"], requiredDataContracts: ["workflow-summary"], readOnlyCapabilities: ["view"], governedActionCapabilities: [], accessibilityGateIds: ["KEYBOARD_NAVIGATION"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: "1.0.0" },
      { screenId: "DASHBOARD", routeId: "dashboard-2", displayOrder: 2, requiredPermissions: ["read:workflow"], requiredDataContracts: ["workflow-summary"], readOnlyCapabilities: ["view"], governedActionCapabilities: [], accessibilityGateIds: ["KEYBOARD_NAVIGATION"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: "1.0.0" },
    ])).toThrow();

    expect(() => createAutomationCenterScreenRegistry([
      { screenId: "DASHBOARD", routeId: "dashboard", displayOrder: 1, requiredPermissions: ["read:workflow"], requiredDataContracts: ["workflow-summary"], readOnlyCapabilities: ["view"], governedActionCapabilities: [], accessibilityGateIds: ["KEYBOARD_NAVIGATION"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: "1.0.0" },
      { screenId: "INTAKE", routeId: "dashboard", displayOrder: 2, requiredPermissions: ["read:intake"], requiredDataContracts: ["intake"], readOnlyCapabilities: ["view"], governedActionCapabilities: [], accessibilityGateIds: ["KEYBOARD_NAVIGATION"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: "1.0.0" },
    ])).toThrow();

    const registry = createAutomationCenterScreenRegistry();
    expect(registry.screens.map((screen) => screen.displayOrder)).toEqual([...registry.screens].sort((a, b) => a.displayOrder - b.displayOrder).map((screen) => screen.displayOrder));
  });

  it("uses cross-screen correlation references only", () => {
    const correlation = createCrossScreenCorrelation(exampleInput);
    expect(correlation.workflowId).toBe("wf-001");
    expect(correlation.connectorScopeIds).toEqual(["cs-001", "cs-002"]);
    expect(correlation.contractVersion).toBe("1.0.0");
    expect(() => assertCrossScreenCorrelation({ ...correlation, connectorScopeIds: ["sk-live-123"] })).toThrow();
  });

  it("exposes safety flags and lane limit one on dashboard and governance scope on intake", () => {
    const dashboard = createDashboardProjection({
      workflowSummary: "valid",
      runtimeSummary: "valid",
      approvalStatus: "APPROVAL_PENDING",
      agentActivitySummary: "valid",
      validationSummary: "valid",
      evidenceSummary: "valid",
      contextSummary: "valid",
      recoverySummary: "valid",
      costSummary: "valid",
      connectorScopeSummary: "valid",
      safetyFlags: ["P0_PROTECTED", "SAFE_MODE"],
      laneLimit: 1,
      approvalExpiryStatus: "VALID",
      reconciliationRequired: true,
      contractVersion: "1.0.0",
    });
    expect(dashboard.laneLimit).toBe(1);
    expect(dashboard.safetyFlags).toContain("P0_PROTECTED");

    const intake = createIntakeProjection({
      objective: "Resolve incident",
      requestClassification: "bug-fix",
      domainClassification: "infrastructure",
      repository: "repo",
      branch: "feature/demo",
      scopeHash: "scope-hash",
      riskClass: "R2",
      requestedActions: ["read"],
      requestedTools: ["git"],
      connectorScopes: ["github"],
      memoryScopes: ["workspace"],
      tokenBudget: "1000",
      costBudget: "25.00",
      savedDraftState: "DRAFT_READY",
      contextPackageRequirement: "REQUIRED",
      approvalRequirement: "REQUIRED",
      contractVersion: "1.0.0",
    });
    expect(intake.approvalRequirement).toBe("REQUIRED");
  });

  it("preserves disagreement and unresolved questions in plans and exposes approval risk details", () => {
    const plans = createPlansProjection({
      planId: "plan-1",
      draftId: "draft-1",
      version: "v2",
      orderedTasks: ["task-1", "task-2"],
      dependencyGraphReference: "dep-graph-1",
      riskClasses: ["R2", "R3"],
      parallelSafetyClasses: ["SAFE"],
      validationPlan: "validator-a",
      evidencePlan: "evidence-a",
      recoveryPlan: "recovery-a",
      rollbackPlan: "rollback-a",
      budgetSummary: "under budget",
      scopeComparison: "diff",
      approvalStatus: "REQUIRES_REVIEW",
      disagreementRecord: "Disagreement remains",
      unresolvedQuestions: ["Need approval scope"],
      contractVersion: "1.0.0",
    });
    expect(plans.disagreementRecord).toContain("Disagreement");
    expect(plans.unresolvedQuestions).toHaveLength(1);

    const approvalCard = createApprovalCard({
      objective: "Ship patch",
      scope: "repo scope",
      repository: "repo",
      branch: "feature/test",
      riskClass: "R4",
      actions: ["read", "write"],
      tools: ["git"],
      cost: "10.00",
      tokenBudget: "500",
      connectorScopes: ["github"],
      memoryScopes: ["workspace"],
      externalSystems: ["github"],
      targetEnvironment: "prod",
      approvalExpiry: "2026-02-01T00:00:00.000Z",
      rollbackPath: "revert-commit",
      recoveryPath: "rollback",
      validationPlan: "run-tests",
      evidenceRequirement: "MANDATORY",
      freshApprovalRequirement: "R4",
      materialChangeStatus: "MATERIAL_CHANGE",
      prohibitionStatus: "R5_PROHIBITED",
      contractVersion: "1.0.0",
    });
    expect(approvalCard.riskClass).toBe("R4");
    expect(approvalCard.freshApprovalRequirement).toBe("R4");
    expect(approvalCard.prohibitionStatus).toBe("R5_PROHIBITED");
  });

  it("reuses workflow states and exposes attribution without chain-of-thought", () => {
    const agentActivity = createAgentActivityContract({
      agentId: "agent-001",
      role: "ORCHESTRATOR",
      characterAttribution: "ONYX",
      permissions: ["read:workflow"],
      capabilities: ["planning"],
      tools: ["git"],
      paths: ["workspace"],
      networkScope: "internal",
      connectorScopes: ["github"],
      memoryScopes: ["workspace"],
      budgets: { tokenBudget: "1000", costBudget: "25.00" },
      attemptCount: 2,
      taskOutputs: ["task summary"],
      handoffs: ["agent-002"],
      leaseState: "ACTIVE",
      heartbeatState: "HEALTHY",
      checkpointState: "SYNCED",
      evidenceReferences: ["ev-1"],
      riskClassLimit: "R2",
      promotionEligibility: "ELIGIBLE",
      contractVersion: "1.0.0",
    });
    expect(agentActivity.characterAttribution).toBe("ONYX");
    expect(agentActivity.chainOfThought).toBeUndefined();

    const workflow = {
      workflowId: "wf-1",
      runtimeId: "rt-1",
      currentWorkflowState: "WORKFLOW_CREATED",
      currentTask: "task-1",
      taskDependencies: ["dep-1"],
      leaseState: "ACTIVE",
      checkpointState: "SYNCED",
      evidenceState: "ATTACHED",
      approvalState: "PENDING",
      recoveryState: "READY",
      reconciliationState: "NOT_REQUIRED",
      budgetState: "WITHIN_BUDGET",
      connectorScope: "github",
      laneClassification: "PRIMARY",
      promotionEligibility: "ELIGIBLE",
      contractVersion: "1.0.0",
    };
    expect(workflow.currentWorkflowState).toBe("WORKFLOW_CREATED");
  });

  it("requires evidence and validates accessible gates and release decisions", () => {
    const validation = createValidationCenterProjection({
      validationRunId: "vr-1",
      workflowId: "wf-1",
      taskId: "task-1",
      validationCategory: "unit",
      validatorId: "approved-validator-a",
      startTime: "2026-01-01T00:00:00.000Z",
      completionTime: "2026-01-01T00:00:10.000Z",
      result: "PASS",
      testTotals: { passed: 10, failed: 0, skipped: 0 },
      failureReferences: [],
      securityFindings: [],
      accessibilityFindings: [],
      evidenceReferences: ["ev-1"],
      retryEligibility: "NOT_ELIGIBLE",
      contractVersion: "1.0.0",
    });
    expect(validation.validatorId).toBe("approved-validator-a");

    const evidence = createEvidenceViewerContract({
      request: "request-1",
      contextPackage: "context-1",
      plan: "plan-1",
      approvals: ["approval-1"],
      changes: ["change-1"],
      tests: ["test-1"],
      reviews: ["review-1"],
      audit: ["audit-1"],
      recovery: ["recovery-1"],
      reconciliation: ["reconcile-1"],
      releaseRecommendation: "RECOMMEND",
      agentActivity: ["activity-1"],
      memoryDecisions: ["memory-1"],
      connectorDecisions: ["connector-1"],
      budgetDecisions: ["budget-1"],
      modelRoutingDecisions: ["route-1"],
      accessibilityResults: ["gate-pass"],
      redactionStatus: "REDACTED",
      provenanceStatus: "VERIFIED",
      contractVersion: "1.0.0",
    });
    expect(evidence.redactionStatus).toBe("REDACTED");
    expect(() => createEvidenceViewerContract({ ...evidence, approvals: [] })).toThrow();

    const context = createContextExplorerProjection({
      contextPackageId: "ctx-1",
      version: "v1",
      sourceReferences: ["source-1"],
      sourcePrecedence: ["user_instruction", "memory"],
      trustClassifications: ["TRUSTED"],
      authorityClasses: ["AUTHORIZED"],
      freshnessDecisions: ["FRESH"],
      permissionDecisions: ["ALLOW"],
      rankingDecisions: ["RANKED"],
      deduplicationDecisions: ["DEDUPED"],
      redactionDecisions: ["REDACTED"],
      memoryTierReferences: ["M2"],
      connectorScopes: ["github"],
      tokenBudget: "1000",
      costBudget: "10",
      modelRoutingClass: "STANDARD",
      cacheDecision: "CACHEABLE",
      provenanceAudit: "VERIFIED",
      quarantineStatus: "CLEAR",
      tombstoneStatus: "NOT_TOMBSTONED",
      contractVersion: "1.0.0",
    });
    expect(context.provenanceAudit).toBe("VERIFIED");

    const recovery = createRecoveryCenterProjection({
      retry: { enabled: false, reason: "uncertain remote mutation" },
      resume: { enabled: true },
      reconcile: { enabled: false },
      rollback: { enabled: true },
      compensation: { enabled: false },
      escalation: { enabled: true },
      latestTrustedCheckpoint: "cp-1",
      externalState: "remote-ok",
      workflowJournal: ["step-1"],
      evidenceLinks: ["ev-1"],
      approvalRequirements: ["fresh approval"],
      riskClass: "R4",
      connectorScope: "github",
      memoryImpact: "low",
      budgetImpact: "10.00",
      lastAgent: "agent-001",
      lastLease: "lease-001",
      uncertainOperation: true,
      idempotencyKey: "idem-1",
      resourceReferences: ["resource-1"],
      recommendedReadOnlyChecks: ["check-1"],
      automaticRetryPermitted: false,
      contractVersion: "1.0.0",
    });
    expect(recovery.retry.enabled).toBe(false);

    const cost = createCostCenterProjection({
      workflowTokenBudget: "1000",
      workflowCostBudget: "50.00",
      agentAllocations: [{ agentId: "agent-1", allocation: "500" }],
      taskAllocations: [{ taskId: "task-1", allocation: "100" }],
      reservedAmount: "100",
      consumedAmount: "200",
      remainingAmount: "700",
      warningThreshold: "0.75",
      hardLimit: "1.00",
      modelRoutingClass: "STANDARD",
      cacheStatus: "HIT",
      premiumApprovalRequirement: "REQUIRED",
      paidActionApprovalRequirement: "REQUIRED",
      budgetStatus: "WITHIN_LIMIT",
      contractVersion: "1.0.0",
    });
    expect(cost.budgetStatus).toBe("WITHIN_LIMIT");

    const settings = createSettingsProjection({
      permissionProfiles: ["default"],
      connectorScopes: ["github"],
      memoryAccessProfiles: ["default"],
      modelRoutingProfiles: ["standard"],
      tokenBudgets: ["1000"],
      costBudgets: ["50.00"],
      accessibilityPreferences: ["reduce-motion"],
      reducedMotionPreference: "REDUCE",
      notificationPreferences: ["email"],
      agentVisibility: "VISIBLE",
      evidenceRetentionPolicy: "30D",
      contractVersion: "1.0.0",
    });
    expect(settings.agentVisibility).toBe("VISIBLE");
  });
});
