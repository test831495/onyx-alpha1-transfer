import { AUTOMATION_CENTER_V2_CONTRACT_VERSION } from "../shared/versions";
import { assertRiskClass, RISK_CLASSES, type RiskClass } from "../shared/risk-classes";

export const AUTOMATION_CENTER_SCREEN_IDS = [
  "DASHBOARD",
  "INTAKE",
  "PLANS",
  "APPROVALS",
  "WORKFLOWS",
  "AGENT_ACTIVITY",
  "VALIDATION_CENTER",
  "EVIDENCE_VIEWER",
  "CONTEXT_EXPLORER",
  "RECOVERY_CENTER",
  "COST_CENTER",
  "SETTINGS",
] as const;
export type AutomationCenterScreenId = (typeof AUTOMATION_CENTER_SCREEN_IDS)[number];

export interface AutomationCenterScreenContract {
  screenId: AutomationCenterScreenId;
  routeId: string;
  displayOrder: number;
  requiredPermissions: string[];
  requiredDataContracts: string[];
  readOnlyCapabilities: string[];
  governedActionCapabilities: string[];
  accessibilityGateIds: string[];
  riskVisibilityRequired: boolean;
  recoveryVisibilityRequired: boolean;
  evidenceVisibilityRequired: boolean;
  costVisibilityRequired: boolean;
  connectorAttributionRequired: boolean;
  contractVersion: string;
}

export interface AutomationCenterScreenRegistry {
  screens: AutomationCenterScreenContract[];
  contractVersion: string;
}

export const CORE_ACCESSIBILITY_GATES = [
  "KEYBOARD_NAVIGATION",
  "SCREEN_READER_SEMANTICS",
  "FOCUS_MANAGEMENT",
  "RESPONSIVE_REFLOW",
  "WCAG_AA_CONTRAST",
  "REDUCED_MOTION",
  "CLEAR_ERROR_IDENTIFICATION",
  "STATUS_ANNOUNCEMENTS",
] as const;

export function assertKnownAutomationCenterScreen(screenId: string): asserts screenId is AutomationCenterScreenId {
  if (!(AUTOMATION_CENTER_SCREEN_IDS as readonly string[]).includes(screenId)) {
    throw new Error(`Unknown Automation Center screen: ${screenId}`);
  }
}

export { createApprovalCard } from "./approval-inbox-contracts";
export type { ApprovalCardContract, ApprovalInboxProjection } from "./approval-inbox-contracts";
export { createAgentActivityContract } from "./agent-activity-contracts";
export type { AgentActivityContract } from "./agent-activity-contracts";
export { createEvidenceViewerContract, assertEvidencePackageComplete } from "./evidence-package-contracts";
export type { EvidenceViewerContract } from "./evidence-package-contracts";
export { createRecoveryCenterProjection } from "./recovery-center-contracts";
export type { RecoveryCenterProjection, RecoveryOperationProjection } from "./recovery-center-contracts";

export function createAutomationCenterScreenRegistry(
  screens: readonly Partial<AutomationCenterScreenContract>[] = DEFAULT_AUTOMATION_CENTER_SCREENS,
): AutomationCenterScreenRegistry {
  const normalized = screens.map((screen, index) => {
    const contract = screen as AutomationCenterScreenContract;
    assertKnownAutomationCenterScreen(contract.screenId);
    if (contract.accessibilityGateIds.length === 0) {
      throw new Error(`Screen ${contract.screenId} must declare accessibility gates.`);
    }
    if (contract.routeId.trim().length === 0) {
      throw new Error(`Screen ${contract.screenId} must declare a route.`);
    }
    return {
      ...contract,
      requiredPermissions: [...(contract.requiredPermissions ?? [])],
      requiredDataContracts: [...(contract.requiredDataContracts ?? [])],
      readOnlyCapabilities: [...(contract.readOnlyCapabilities ?? [])],
      governedActionCapabilities: [...(contract.governedActionCapabilities ?? [])],
      accessibilityGateIds: [...(contract.accessibilityGateIds ?? [])],
      displayOrder: contract.displayOrder ?? index + 1,
      contractVersion: contract.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
    } as AutomationCenterScreenContract;
  });

  const seenIds = new Set<string>();
  const seenRoutes = new Set<string>();
  for (const screen of normalized) {
    if (seenIds.has(screen.screenId)) throw new Error(`Duplicate screen ID: ${screen.screenId}`);
    if (seenRoutes.has(screen.routeId)) throw new Error(`Duplicate route ID: ${screen.routeId}`);
    seenIds.add(screen.screenId);
    seenRoutes.add(screen.routeId);
  }

  const ordered = [...normalized].sort((a, b) => a.displayOrder - b.displayOrder || a.screenId.localeCompare(b.screenId));
  for (const screen of ordered) {
    if (screen.screenId === "APPROVALS" && !screen.accessibilityGateIds.includes("ACCESSIBLE_APPROVAL_RISK")) {
      throw new Error("Approval screen must include accessible approval risk gate.");
    }
    if (screen.screenId === "RECOVERY_CENTER" && !screen.accessibilityGateIds.includes("ACCESSIBLE_RECOVERY_CONTROLS")) {
      throw new Error("Recovery screen must include accessible recovery controls gate.");
    }
  }

  return {
    screens: ordered,
    contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export function assertAutomationCenterScreenRegistry(registry: AutomationCenterScreenRegistry): void {
  const ids = registry.screens.map((screen) => screen.screenId);
  if (ids.length !== AUTOMATION_CENTER_SCREEN_IDS.length) {
    throw new Error("Automation Center registry must declare all allowed screens.");
  }
  for (const screenId of AUTOMATION_CENTER_SCREEN_IDS) {
    if (!ids.includes(screenId)) {
      throw new Error(`Missing required screen: ${screenId}`);
    }
  }
  for (const screen of registry.screens) {
    assertKnownAutomationCenterScreen(screen.screenId);
    if (screen.accessibilityGateIds.length === 0) {
      throw new Error(`Screen ${screen.screenId} must have accessibility gate IDs.`);
    }
  }
}

export const DEFAULT_AUTOMATION_CENTER_SCREENS: readonly Partial<AutomationCenterScreenContract>[] = [
  { screenId: "DASHBOARD", routeId: "dashboard", displayOrder: 1, requiredPermissions: ["read:workflow"], requiredDataContracts: ["workflow-summary"], readOnlyCapabilities: ["view-dashboard"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "INTAKE", routeId: "intake", displayOrder: 2, requiredPermissions: ["read:intake"], requiredDataContracts: ["intake"], readOnlyCapabilities: ["view-intake"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "PLANS", routeId: "plans", displayOrder: 3, requiredPermissions: ["read:plan"], requiredDataContracts: ["plan"], readOnlyCapabilities: ["view-plan"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "APPROVALS", routeId: "approvals", displayOrder: 4, requiredPermissions: ["read:approval"], requiredDataContracts: ["approval"], readOnlyCapabilities: ["view-approval"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES, "ACCESSIBLE_APPROVAL_RISK"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "WORKFLOWS", routeId: "workflows", displayOrder: 5, requiredPermissions: ["read:workflow"], requiredDataContracts: ["workflow"], readOnlyCapabilities: ["view-workflow"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "AGENT_ACTIVITY", routeId: "agent-activity", displayOrder: 6, requiredPermissions: ["read:agent"], requiredDataContracts: ["agent-activity"], readOnlyCapabilities: ["view-agent-activity"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "VALIDATION_CENTER", routeId: "validation-center", displayOrder: 7, requiredPermissions: ["read:validation"], requiredDataContracts: ["validation"], readOnlyCapabilities: ["view-validation"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "EVIDENCE_VIEWER", routeId: "evidence-viewer", displayOrder: 8, requiredPermissions: ["read:evidence"], requiredDataContracts: ["evidence"], readOnlyCapabilities: ["view-evidence"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "CONTEXT_EXPLORER", routeId: "context-explorer", displayOrder: 9, requiredPermissions: ["read:context"], requiredDataContracts: ["context"], readOnlyCapabilities: ["view-context"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "RECOVERY_CENTER", routeId: "recovery-center", displayOrder: 10, requiredPermissions: ["read:recovery"], requiredDataContracts: ["recovery"], readOnlyCapabilities: ["view-recovery"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES, "ACCESSIBLE_RECOVERY_CONTROLS"], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "COST_CENTER", routeId: "cost-center", displayOrder: 11, requiredPermissions: ["read:cost"], requiredDataContracts: ["cost"], readOnlyCapabilities: ["view-cost"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
  { screenId: "SETTINGS", routeId: "settings", displayOrder: 12, requiredPermissions: ["read:settings"], requiredDataContracts: ["settings"], readOnlyCapabilities: ["view-settings"], governedActionCapabilities: [], accessibilityGateIds: [...CORE_ACCESSIBILITY_GATES], riskVisibilityRequired: true, recoveryVisibilityRequired: true, evidenceVisibilityRequired: true, costVisibilityRequired: true, connectorAttributionRequired: true, contractVersion: AUTOMATION_CENTER_V2_CONTRACT_VERSION },
] as const;

export interface CrossScreenCorrelationContract {
  correlationId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  approvalId: string;
  checkpointDigest: string;
  evidencePackageId: string;
  contextPackageId: string;
  recoveryCaseId: string;
  budgetId: string;
  connectorScopeIds: string[];
  updatedAt: string;
  contractVersion: string;
}

export function createCrossScreenCorrelation(input: Partial<CrossScreenCorrelationContract> & {
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  approvalId: string;
  checkpointDigest: string;
  evidencePackageId: string;
  contextPackageId: string;
  recoveryCaseId: string;
  budgetId: string;
  connectorScopeIds?: string[];
  updatedAt?: string;
  contractVersion?: string;
}): CrossScreenCorrelationContract {
  const credentialPattern = /(^sk-|^gh[pousr]_|^xox[baprs]-|^AKIA|^ASIA|^AIza|secret|token|key|credential)/i;
  if (input.connectorScopeIds && input.connectorScopeIds.some((value) => credentialPattern.test(value))) {
    throw new Error("Cross-screen correlation must not include credential material.");
  }
  const correlationId = `${input.workflowId}:${input.taskId}:${input.runtimeId}`;
  return {
    correlationId,
    workflowId: input.workflowId,
    runtimeId: input.runtimeId,
    runtimeSessionId: input.runtimeSessionId,
    taskId: input.taskId,
    agentId: input.agentId,
    leaseId: input.leaseId,
    approvalId: input.approvalId,
    checkpointDigest: input.checkpointDigest,
    evidencePackageId: input.evidencePackageId,
    contextPackageId: input.contextPackageId,
    recoveryCaseId: input.recoveryCaseId,
    budgetId: input.budgetId,
    connectorScopeIds: input.connectorScopeIds ?? [],
    updatedAt: input.updatedAt ?? "2026-01-01T00:00:00.000Z",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export function assertCrossScreenCorrelation(correlation: CrossScreenCorrelationContract): void {
  if (!correlation.correlationId || !correlation.workflowId || !correlation.runtimeId || !correlation.taskId || !correlation.agentId) {
    throw new Error("Cross-screen correlation is incomplete.");
  }
  const credentialPattern = /(^sk-|^gh[pousr]_|^xox[baprs]-|^AKIA|^ASIA|^AIza|secret|token|key|credential)/i;
  for (const scopeId of correlation.connectorScopeIds) {
    if (credentialPattern.test(scopeId)) {
      throw new Error("Cross-screen correlation must use references only.");
    }
  }
}

export interface DashboardProjection {
  workflowSummary: string;
  runtimeSummary: string;
  approvalStatus: string;
  agentActivitySummary: string;
  validationSummary: string;
  evidenceSummary: string;
  contextSummary: string;
  recoverySummary: string;
  costSummary: string;
  connectorScopeSummary: string;
  safetyFlags: string[];
  laneLimit: number;
  approvalExpiryStatus: string;
  reconciliationRequired: boolean;
  contractVersion: string;
}

export function createDashboardProjection(input: Partial<DashboardProjection> & { workflowSummary?: string; runtimeSummary?: string; approvalStatus?: string; agentActivitySummary?: string; validationSummary?: string; evidenceSummary?: string; contextSummary?: string; recoverySummary?: string; costSummary?: string; connectorScopeSummary?: string; safetyFlags?: string[]; laneLimit?: number; approvalExpiryStatus?: string; reconciliationRequired?: boolean; contractVersion?: string }): DashboardProjection {
  return {
    workflowSummary: input.workflowSummary ?? "workflow-summary",
    runtimeSummary: input.runtimeSummary ?? "runtime-summary",
    approvalStatus: input.approvalStatus ?? "APPROVAL_PENDING",
    agentActivitySummary: input.agentActivitySummary ?? "agent-summary",
    validationSummary: input.validationSummary ?? "validation-summary",
    evidenceSummary: input.evidenceSummary ?? "evidence-summary",
    contextSummary: input.contextSummary ?? "context-summary",
    recoverySummary: input.recoverySummary ?? "recovery-summary",
    costSummary: input.costSummary ?? "cost-summary",
    connectorScopeSummary: input.connectorScopeSummary ?? "connector-summary",
    safetyFlags: input.safetyFlags ?? ["P0_PROTECTED", "SAFE_MODE"],
    laneLimit: input.laneLimit ?? 1,
    approvalExpiryStatus: input.approvalExpiryStatus ?? "VALID",
    reconciliationRequired: input.reconciliationRequired ?? false,
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface IntakeProjection {
  objective: string;
  requestClassification: string;
  domainClassification: string;
  repository: string;
  branch: string;
  scopeHash: string;
  riskClass: RiskClass;
  requestedActions: string[];
  requestedTools: string[];
  connectorScopes: string[];
  memoryScopes: string[];
  tokenBudget: string;
  costBudget: string;
  savedDraftState: string;
  contextPackageRequirement: string;
  approvalRequirement: string;
  contractVersion: string;
}

export function createIntakeProjection(input: Partial<IntakeProjection> & { objective?: string; requestClassification?: string; domainClassification?: string; repository?: string; branch?: string; scopeHash?: string; riskClass?: RiskClass; requestedActions?: string[]; requestedTools?: string[]; connectorScopes?: string[]; memoryScopes?: string[]; tokenBudget?: string; costBudget?: string; savedDraftState?: string; contextPackageRequirement?: string; approvalRequirement?: string; contractVersion?: string }): IntakeProjection {
  const riskClass = input.riskClass ?? "R2";
  assertRiskClass(riskClass);
  return {
    objective: input.objective ?? "objective",
    requestClassification: input.requestClassification ?? "change-request",
    domainClassification: input.domainClassification ?? "engineering",
    repository: input.repository ?? "repo",
    branch: input.branch ?? "feature/demo",
    scopeHash: input.scopeHash ?? "scope-hash",
    riskClass,
    requestedActions: input.requestedActions ?? ["read"],
    requestedTools: input.requestedTools ?? ["git"],
    connectorScopes: input.connectorScopes ?? ["github"],
    memoryScopes: input.memoryScopes ?? ["workspace"],
    tokenBudget: input.tokenBudget ?? "1000",
    costBudget: input.costBudget ?? "25.00",
    savedDraftState: input.savedDraftState ?? "DRAFT_READY",
    contextPackageRequirement: input.contextPackageRequirement ?? "REQUIRED",
    approvalRequirement: input.approvalRequirement ?? "REQUIRED",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface PlansProjection {
  planId: string;
  draftId: string;
  version: string;
  orderedTasks: string[];
  dependencyGraphReference: string;
  riskClasses: RiskClass[];
  parallelSafetyClasses: string[];
  validationPlan: string;
  evidencePlan: string;
  recoveryPlan: string;
  rollbackPlan: string;
  budgetSummary: string;
  scopeComparison: string;
  approvalStatus: string;
  disagreementRecord: string;
  unresolvedQuestions: string[];
  contractVersion: string;
}

export function createPlansProjection(input: Partial<PlansProjection> & { planId?: string; draftId?: string; version?: string; orderedTasks?: string[]; dependencyGraphReference?: string; riskClasses?: RiskClass[]; parallelSafetyClasses?: string[]; validationPlan?: string; evidencePlan?: string; recoveryPlan?: string; rollbackPlan?: string; budgetSummary?: string; scopeComparison?: string; approvalStatus?: string; disagreementRecord?: string; unresolvedQuestions?: string[]; contractVersion?: string }): PlansProjection {
  const riskClasses = input.riskClasses ?? ["R2"];
  for (const riskClass of riskClasses) {
    assertRiskClass(riskClass);
  }
  return {
    planId: input.planId ?? "plan-1",
    draftId: input.draftId ?? "draft-1",
    version: input.version ?? "v1",
    orderedTasks: input.orderedTasks ?? ["task-1"],
    dependencyGraphReference: input.dependencyGraphReference ?? "dependency-graph",
    riskClasses,
    parallelSafetyClasses: input.parallelSafetyClasses ?? ["SAFE"],
    validationPlan: input.validationPlan ?? "validator-plan",
    evidencePlan: input.evidencePlan ?? "evidence-plan",
    recoveryPlan: input.recoveryPlan ?? "recovery-plan",
    rollbackPlan: input.rollbackPlan ?? "rollback-plan",
    budgetSummary: input.budgetSummary ?? "budget-summary",
    scopeComparison: input.scopeComparison ?? "scope-comparison",
    approvalStatus: input.approvalStatus ?? "PENDING",
    disagreementRecord: input.disagreementRecord ?? "No unresolved disagreement.",
    unresolvedQuestions: input.unresolvedQuestions ?? [],
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface WorkflowProjection {
  workflowId: string;
  runtimeId: string;
  currentWorkflowState: string;
  currentTask: string;
  taskDependencies: string[];
  leaseState: string;
  checkpointState: string;
  evidenceState: string;
  approvalState: string;
  recoveryState: string;
  reconciliationState: string;
  budgetState: string;
  connectorScope: string;
  laneClassification: string;
  promotionEligibility: string;
  contractVersion: string;
}

export function createWorkflowProjection(input: Partial<WorkflowProjection> & { workflowId?: string; runtimeId?: string; currentWorkflowState?: string; currentTask?: string; taskDependencies?: string[]; leaseState?: string; checkpointState?: string; evidenceState?: string; approvalState?: string; recoveryState?: string; reconciliationState?: string; budgetState?: string; connectorScope?: string; laneClassification?: string; promotionEligibility?: string; contractVersion?: string }): WorkflowProjection {
  return {
    workflowId: input.workflowId ?? "wf-1",
    runtimeId: input.runtimeId ?? "rt-1",
    currentWorkflowState: input.currentWorkflowState ?? "WORKFLOW_CREATED",
    currentTask: input.currentTask ?? "task-1",
    taskDependencies: input.taskDependencies ?? [],
    leaseState: input.leaseState ?? "ACTIVE",
    checkpointState: input.checkpointState ?? "SYNCED",
    evidenceState: input.evidenceState ?? "ATTACHED",
    approvalState: input.approvalState ?? "PENDING",
    recoveryState: input.recoveryState ?? "READY",
    reconciliationState: input.reconciliationState ?? "NOT_REQUIRED",
    budgetState: input.budgetState ?? "WITHIN_BUDGET",
    connectorScope: input.connectorScope ?? "github",
    laneClassification: input.laneClassification ?? "PRIMARY",
    promotionEligibility: input.promotionEligibility ?? "ELIGIBLE",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface AboutToFailValidationTotals { passed: number; failed: number; skipped: number; }

export interface ValidationCenterProjection {
  validationRunId: string;
  workflowId: string;
  taskId: string;
  validationCategory: string;
  validatorId: string;
  startTime: string;
  completionTime: string;
  result: string;
  testTotals: AboutToFailValidationTotals;
  failureReferences: string[];
  securityFindings: string[];
  accessibilityFindings: string[];
  evidenceReferences: string[];
  retryEligibility: string;
  contractVersion: string;
}

const APPROVED_VALIDATORS = ["approved-validator-a", "approved-validator-b", "approved-validator-c"] as const;
export function createValidationCenterProjection(input: Partial<ValidationCenterProjection> & { validationRunId?: string; workflowId?: string; taskId?: string; validationCategory?: string; validatorId?: string; startTime?: string; completionTime?: string; result?: string; testTotals?: AboutToFailValidationTotals; failureReferences?: string[]; securityFindings?: string[]; accessibilityFindings?: string[]; evidenceReferences?: string[]; retryEligibility?: string; contractVersion?: string }): ValidationCenterProjection {
  const validatorId = input.validatorId ?? APPROVED_VALIDATORS[0];
  if (!(APPROVED_VALIDATORS as readonly string[]).includes(validatorId)) {
    throw new Error(`Validator ${validatorId} is not an approved validator identifier.`);
  }
  return {
    validationRunId: input.validationRunId ?? "vr-1",
    workflowId: input.workflowId ?? "wf-1",
    taskId: input.taskId ?? "task-1",
    validationCategory: input.validationCategory ?? "unit",
    validatorId,
    startTime: input.startTime ?? "2026-01-01T00:00:00.000Z",
    completionTime: input.completionTime ?? "2026-01-01T00:00:05.000Z",
    result: input.result ?? "PASS",
    testTotals: input.testTotals ?? { passed: 1, failed: 0, skipped: 0 },
    failureReferences: input.failureReferences ?? [],
    securityFindings: input.securityFindings ?? [],
    accessibilityFindings: input.accessibilityFindings ?? [],
    evidenceReferences: input.evidenceReferences ?? [],
    retryEligibility: input.retryEligibility ?? "NOT_ELIGIBLE",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export const RISK_CLASS_VALUES = [...RISK_CLASSES];
export const AUTONOMY_SAFETY_FLAGS = ["P0_PROTECTED", "SAFE_MODE", "APPROVAL_REQUIRED", "RECONCILIATION_REQUIRED"] as const;

export interface ContextExplorerProjection {
  contextPackageId: string;
  version: string;
  sourceReferences: string[];
  sourcePrecedence: string[];
  trustClassifications: string[];
  authorityClasses: string[];
  freshnessDecisions: string[];
  permissionDecisions: string[];
  rankingDecisions: string[];
  deduplicationDecisions: string[];
  redactionDecisions: string[];
  memoryTierReferences: string[];
  connectorScopes: string[];
  tokenBudget: string;
  costBudget: string;
  modelRoutingClass: string;
  cacheDecision: string;
  provenanceAudit: string;
  quarantineStatus: string;
  tombstoneStatus: string;
  contractVersion: string;
}

export function createContextExplorerProjection(input: Partial<ContextExplorerProjection> & { contextPackageId?: string; version?: string; sourceReferences?: string[]; sourcePrecedence?: string[]; trustClassifications?: string[]; authorityClasses?: string[]; freshnessDecisions?: string[]; permissionDecisions?: string[]; rankingDecisions?: string[]; deduplicationDecisions?: string[]; redactionDecisions?: string[]; memoryTierReferences?: string[]; connectorScopes?: string[]; tokenBudget?: string; costBudget?: string; modelRoutingClass?: string; cacheDecision?: string; provenanceAudit?: string; quarantineStatus?: string; tombstoneStatus?: string; contractVersion?: string }): ContextExplorerProjection {
  return {
    contextPackageId: input.contextPackageId ?? "ctx-1",
    version: input.version ?? "v1",
    sourceReferences: input.sourceReferences ?? ["source-1"],
    sourcePrecedence: input.sourcePrecedence ?? ["user_instruction"],
    trustClassifications: input.trustClassifications ?? ["TRUSTED"],
    authorityClasses: input.authorityClasses ?? ["AUTHORIZED"],
    freshnessDecisions: input.freshnessDecisions ?? ["FRESH"],
    permissionDecisions: input.permissionDecisions ?? ["ALLOW"],
    rankingDecisions: input.rankingDecisions ?? ["RANKED"],
    deduplicationDecisions: input.deduplicationDecisions ?? ["DEDUPED"],
    redactionDecisions: input.redactionDecisions ?? ["REDACTED"],
    memoryTierReferences: input.memoryTierReferences ?? ["M2"],
    connectorScopes: input.connectorScopes ?? ["github"],
    tokenBudget: input.tokenBudget ?? "1000",
    costBudget: input.costBudget ?? "10.00",
    modelRoutingClass: input.modelRoutingClass ?? "STANDARD",
    cacheDecision: input.cacheDecision ?? "CACHEABLE",
    provenanceAudit: input.provenanceAudit ?? "VERIFIED",
    quarantineStatus: input.quarantineStatus ?? "CLEAR",
    tombstoneStatus: input.tombstoneStatus ?? "NOT_TOMBSTONED",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface CostCenterProjection {
  workflowTokenBudget: string;
  workflowCostBudget: string;
  agentAllocations: Array<{ agentId: string; allocation: string }>;
  taskAllocations: Array<{ taskId: string; allocation: string }>;
  reservedAmount: string;
  consumedAmount: string;
  remainingAmount: string;
  warningThreshold: string;
  hardLimit: string;
  modelRoutingClass: string;
  cacheStatus: string;
  premiumApprovalRequirement: string;
  paidActionApprovalRequirement: string;
  budgetStatus: string;
  contractVersion: string;
}

export function createCostCenterProjection(input: Partial<CostCenterProjection> & { workflowTokenBudget?: string; workflowCostBudget?: string; agentAllocations?: Array<{ agentId: string; allocation: string }>; taskAllocations?: Array<{ taskId: string; allocation: string }>; reservedAmount?: string; consumedAmount?: string; remainingAmount?: string; warningThreshold?: string; hardLimit?: string; modelRoutingClass?: string; cacheStatus?: string; premiumApprovalRequirement?: string; paidActionApprovalRequirement?: string; budgetStatus?: string; contractVersion?: string }): CostCenterProjection {
  return {
    workflowTokenBudget: input.workflowTokenBudget ?? "1000",
    workflowCostBudget: input.workflowCostBudget ?? "25.00",
    agentAllocations: input.agentAllocations ?? [],
    taskAllocations: input.taskAllocations ?? [],
    reservedAmount: input.reservedAmount ?? "0",
    consumedAmount: input.consumedAmount ?? "0",
    remainingAmount: input.remainingAmount ?? "1000",
    warningThreshold: input.warningThreshold ?? "0.75",
    hardLimit: input.hardLimit ?? "1.00",
    modelRoutingClass: input.modelRoutingClass ?? "STANDARD",
    cacheStatus: input.cacheStatus ?? "HIT",
    premiumApprovalRequirement: input.premiumApprovalRequirement ?? "NONE",
    paidActionApprovalRequirement: input.paidActionApprovalRequirement ?? "NONE",
    budgetStatus: input.budgetStatus ?? "WITHIN_LIMIT",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface SettingsProjection {
  permissionProfiles: string[];
  connectorScopes: string[];
  memoryAccessProfiles: string[];
  modelRoutingProfiles: string[];
  tokenBudgets: string[];
  costBudgets: string[];
  accessibilityPreferences: string[];
  reducedMotionPreference: string;
  notificationPreferences: string[];
  agentVisibility: string;
  evidenceRetentionPolicy: string;
  contractVersion: string;
}

export function createSettingsProjection(input: Partial<SettingsProjection> & { permissionProfiles?: string[]; connectorScopes?: string[]; memoryAccessProfiles?: string[]; modelRoutingProfiles?: string[]; tokenBudgets?: string[]; costBudgets?: string[]; accessibilityPreferences?: string[]; reducedMotionPreference?: string; notificationPreferences?: string[]; agentVisibility?: string; evidenceRetentionPolicy?: string; contractVersion?: string }): SettingsProjection {
  return {
    permissionProfiles: input.permissionProfiles ?? ["default"],
    connectorScopes: input.connectorScopes ?? ["github"],
    memoryAccessProfiles: input.memoryAccessProfiles ?? ["default"],
    modelRoutingProfiles: input.modelRoutingProfiles ?? ["standard"],
    tokenBudgets: input.tokenBudgets ?? ["1000"],
    costBudgets: input.costBudgets ?? ["25.00"],
    accessibilityPreferences: input.accessibilityPreferences ?? ["reduce-motion"],
    reducedMotionPreference: input.reducedMotionPreference ?? "REDUCE",
    notificationPreferences: input.notificationPreferences ?? ["email"],
    agentVisibility: input.agentVisibility ?? "VISIBLE",
    evidenceRetentionPolicy: input.evidenceRetentionPolicy ?? "30D",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}
