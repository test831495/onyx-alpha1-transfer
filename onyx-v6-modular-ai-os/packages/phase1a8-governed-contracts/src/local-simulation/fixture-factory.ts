import type { ConnectorProvider, ConnectorScope } from "../shared/connector-scope";
import type { RiskClass } from "../shared/risk-classes";

export const SIMULATION_FIXTURE_IDS = {
  supervisingUser: "fixture-supervising-user",
  onyxAgent: "fixture-agent-onyx",
  novaAgent: "fixture-agent-nova",
  systemAgent: "fixture-agent-system",
  validationAgent: "fixture-agent-validation",
  securityReviewAgent: "fixture-agent-security-review",
  documentationAgent: "fixture-agent-documentation",
  promotionLaneAgent: "fixture-agent-promotion-lane",
  workflow: "fixture-workflow",
  runtime: "fixture-runtime",
  runtimeSession: "fixture-runtime-session",
  task: "fixture-task",
  capabilityDeclaration: "fixture-capability-declaration",
  permissionProfile: "fixture-permission-profile",
  memoryAccessProfile: "fixture-memory-access-profile",
  connectorScope: "fixture-connector-scope",
  tokenBudget: "fixture-token-budget",
  costBudget: "fixture-cost-budget",
  approval: "fixture-approval",
  lease: "fixture-lease",
  heartbeat: "fixture-heartbeat",
  dependencyGraph: "fixture-dependency-graph",
  lock: "fixture-lock",
  checkpoint: "fixture-checkpoint",
  checkpointCasRequest: "fixture-checkpoint-cas-request",
  evidenceEvent: "fixture-evidence-event",
  cancellationRequest: "fixture-cancellation-request",
  joinBarrier: "fixture-join-barrier",
  aggregationRequest: "fixture-aggregation-request",
  promotionLaneRequest: "fixture-promotion-lane-request",
  memoryRecords: "fixture-memory-records",
  p0OnyxMetadata: "fixture-p0-onyx-metadata",
  p0NovaMetadata: "fixture-p0-nova-metadata",
  sourceTrustEvaluation: "fixture-source-trust-evaluation",
  quarantineRecord: "fixture-quarantine-record",
  tombstone: "fixture-tombstone",
  deletionPropagationTargets: "fixture-deletion-propagation-targets",
  contextPackage: "fixture-context-package",
  modelRoutingProfile: "fixture-model-routing-profile",
  savedDraft: "fixture-saved-draft",
  councilSession: "fixture-council-session",
  automationCenterScreenRegistry: "fixture-automation-center-screen-registry",
  accessibilityGates: "fixture-accessibility-gates",
} as const;

export interface SimulationFixtureSet {
  supervisingUser: { userId: string; displayName: string; role: string; accountScope: string; };
  ONYX: { agentId: string; personaId: string; accountScope: string; role: string; };
  NOVA: { agentId: string; personaId: string; accountScope: string; role: string; };
  SYSTEM: { agentId: string; personaId: string; accountScope: string; role: string; };
  validationAgent: { agentId: string; personaId: string; accountScope: string; role: string; };
  securityReviewAgent: { agentId: string; personaId: string; accountScope: string; role: string; };
  documentationAgent: { agentId: string; personaId: string; accountScope: string; role: string; };
  promotionLaneAgent: { agentId: string; personaId: string; accountScope: string; role: string; };
  workflow: { workflowId: string; state: string; approvalId: string; approvedAt: string; contractVersion: string; };
  runtime: { runtimeId: string; laneLimit: number; activeLaneLimit: number; contractVersion: string; };
  runtimeSession: { runtimeSessionId: string; workflowId: string; agentId: string; createdAt: string; };
  task: { taskId: string; workflowId: string; capabilityId: string; status: string; riskClass: RiskClass; dependencyTaskIds: string[]; requiredConnectorScopes: string[]; requiredMemoryScopes: string[]; operationClass: string; parallelSafetyClass: string; promotionRequired: boolean; };
  capabilityDeclaration: { capabilityId: string; agentId: string; operationClass: string; scopeHash: string; allowedRiskClasses: RiskClass[]; laneLimit: number; contractVersion: string; };
  permissionProfile: { permissionProfileId: string; subjectAgentId: string; permissions: string[]; memoryScopes: string[]; connectorScopes: string[]; contractVersion: string; };
  memoryAccessProfile: { memoryAccessProfileId: string; subjectAgentId: string; allowedTiers: string[]; readOnly: boolean; contractVersion: string; };
  connectorScope: ConnectorScope;
  tokenBudget: { budgetId: string; scopeHash: string; limit: number; remaining: number; contractVersion: string; };
  costBudget: { budgetId: string; scopeHash: string; limit: number; remaining: number; contractVersion: string; };
  approval: { approvalId: string; workflowId: string; approverId: string; riskClass: RiskClass; issuedAt: string; expiresAt: string; consumedState: string; isFresh: boolean; contractVersion: string; };
  lease: { leaseId: string; taskId: string; agentId: string; status: string; acquiredAt: string; expiresAt: string; contractVersion: string; };
  heartbeat: { heartbeatId: string; leaseId: string; status: string; observedAt: string; contractVersion: string; };
  dependencyGraph: { graphId: string; workflowId: string; taskIds: string[]; edges: Array<{ edgeId: string; fromTaskId: string; toTaskId: string; edgeType: string; required: boolean; }> };
  lock: { lockId: string; workflowId: string; scopeHash: string; mode: string; state: string; contractVersion: string; };
  checkpoint: { checkpointId: string; workflowId: string; digest: string; parentCheckpointId: string | null; stateHash: string; contractVersion: string; };
  checkpointCasRequest: { requestId: string; checkpointId: string; expectedDigest: string; proposedDigest: string; writerAgentId: string; contractVersion: string; };
  evidenceEvent: { evidenceId: string; taskId: string; provider: string; decision: string; observedAt: string; digest: string; };
  cancellationRequest: { cancellationId: string; taskId: string; requestedBy: string; status: string; riskClass: RiskClass; contractVersion: string; };
  joinBarrier: { joinBarrierId: string; taskIds: string[]; state: string; ready: boolean; contractVersion: string; };
  aggregationRequest: { aggregationId: string; taskId: string; inputDigests: string[]; resultDigest: string; contractVersion: string; };
  promotionLaneRequest: { promotionId: string; laneLimit: number; approvalId: string; riskClass: RiskClass; state: string; contractVersion: string; };
  memoryRecords: { m0: Record<string, unknown>; m1: Record<string, unknown>; m2: Record<string, unknown>; m3: Record<string, unknown>; m4: Record<string, unknown>; m5: Record<string, unknown>; p0: Record<string, unknown>; };
  p0ONYXMetadata: { personaId: string; source: string; memoryTier: string; canonical: boolean; };
  p0NOVAMetadata: { personaId: string; source: string; memoryTier: string; canonical: boolean; };
  sourceTrustEvaluation: { sourceId: string; sourceType: string; trustClassification: string; authorityClass: string; memoryTier: string; };
  quarantineRecord: { quarantineId: string; sourceId: string; reason: string; quarantinedAt: string; status: string; };
  tombstone: { tombstoneId: string; memoryId: string; deletedAt: string; reason: string; status: string; };
  deletionPropagationTargets: { targets: string[]; reason: string; };
  contextPackage: { packageId: string; workflowId: string; version: number; sourceIds: string[]; provenanceStatus: string; immutabilityHash: string; };
  modelRoutingProfile: { profileId: string; requestClass: string; localFirst: boolean; budgetMode: string; premiumRouteAllowed: boolean; contractVersion: string; };
  savedDraft: { draftId: string; draftLineageId: string; version: number; scopeHash: string; approvalVersion: number; status: string; };
  councilSession: { councilId: string; participants: string[]; recommendedAction: string; recommendationDigest: string; rahulApprovalRequired: boolean; status: string; };
  automationCenterScreenRegistry: { screenIds: string[]; routeIds: string[]; displayOrder: number[]; contractVersion: string; };
  accessibilityGates: { screenId: string; mandatoryGates: string[]; result: string; contractVersion: string; };
}

export function buildSimulationFixtureSet(): SimulationFixtureSet {
  const fixedIso = "2026-08-21T00:00:00.000Z";
  const base = {
    supervisingUser: { userId: "user-supervising", displayName: "Supervising User", role: "owner", accountScope: "user:supervising" },
    ONYX: { agentId: "agent-onyx", personaId: "persona-onyx", accountScope: "account:professional", role: "lead-agent" },
    NOVA: { agentId: "agent-nova", personaId: "persona-nova", accountScope: "account:personal", role: "assistant-agent" },
    SYSTEM: { agentId: "agent-system", personaId: "persona-system", accountScope: "account:system", role: "orchestrator" },
    validationAgent: { agentId: "agent-validation", personaId: "persona-validation", accountScope: "account:validation", role: "validator" },
    securityReviewAgent: { agentId: "agent-security-review", personaId: "persona-security-review", accountScope: "account:security-review", role: "auditor" },
    documentationAgent: { agentId: "agent-documentation", personaId: "persona-documentation", accountScope: "account:documentation", role: "writer" },
    promotionLaneAgent: { agentId: "agent-promotion-lane", personaId: "persona-promotion-lane", accountScope: "account:promotion", role: "promoter" },
    workflow: { workflowId: "workflow-phase1a8", state: "WORKFLOW_APPROVED", approvalId: "approval-r4-phase1a8", approvedAt: fixedIso, contractVersion: "1.0.0" },
    runtime: { runtimeId: "runtime-phase1a8", laneLimit: 1, activeLaneLimit: 1, contractVersion: "1.0.0" },
    runtimeSession: { runtimeSessionId: "runtime-session-phase1a8", workflowId: "workflow-phase1a8", agentId: "agent-onyx", createdAt: fixedIso },
    task: {
      taskId: "task-phase1a8-001",
      workflowId: "workflow-phase1a8",
      capabilityId: "capability-internal-review",
      status: "READY",
      riskClass: "R2" as RiskClass,
      dependencyTaskIds: ["task-phase1a8-000"],
      requiredConnectorScopes: ["scope:outlook-professional"],
      requiredMemoryScopes: ["memory:project"],
      operationClass: "READ_ONLY_ANALYSIS",
      parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
      promotionRequired: false,
    },
    capabilityDeclaration: {
      capabilityId: "capability-internal-review",
      agentId: "agent-onyx",
      operationClass: "READ_ONLY_ANALYSIS",
      scopeHash: "capability-scope-hash",
      allowedRiskClasses: ["R1", "R2"] as RiskClass[],
      laneLimit: 1,
      contractVersion: "1.0.0",
    },
    permissionProfile: { permissionProfileId: "permission-profile-phase1a8", subjectAgentId: "agent-onyx", permissions: ["read:repo", "read:memory"], memoryScopes: ["memory:project"], connectorScopes: ["scope:outlook-professional"], contractVersion: "1.0.0" },
    memoryAccessProfile: { memoryAccessProfileId: "memory-access-profile-phase1a8", subjectAgentId: "agent-onyx", allowedTiers: ["M0", "M1", "M2"], readOnly: true, contractVersion: "1.0.0" },
    connectorScope: {
      connectorScopeId: "scope:outlook-professional",
      provider: "Outlook" as const,
      accountId: "acct-professional@example.com",
      accountLabel: "Professional Outlook",
      accountType: "professional",
      permissionMode: "READ_ONLY" as const,
      readScope: ["mail", "calendar"],
      writeScope: [],
      approvalRequirement: "none",
      sourceAttribution: "Professional Outlook account scope",
      ownerScope: "owner:supervising",
      projectScope: "project:phase1a8",
      memoryWriteEligibility: false,
      parallelReadEligibility: true,
      mutationClassification: "SEQUENTIAL_CONNECTOR_MUTATION" as const,
      contractVersion: "1.0.0",
    },
    tokenBudget: { budgetId: "token-budget-phase1a8", scopeHash: "token-scope-hash", limit: 1000, remaining: 1000, contractVersion: "1.0.0" },
    costBudget: { budgetId: "cost-budget-phase1a8", scopeHash: "cost-scope-hash", limit: 100, remaining: 100, contractVersion: "1.0.0" },
    approval: { approvalId: "approval-r4-phase1a8", workflowId: "workflow-phase1a8", approverId: "rahul", riskClass: "R4" as RiskClass, issuedAt: fixedIso, expiresAt: "2026-08-22T00:00:00.000Z", consumedState: "UNCONSUMED", isFresh: true, contractVersion: "1.0.0" },
    lease: { leaseId: "lease-phase1a8-001", taskId: "task-phase1a8-001", agentId: "agent-onyx", status: "ACTIVE", acquiredAt: fixedIso, expiresAt: "2026-08-21T00:30:00.000Z", contractVersion: "1.0.0" },
    heartbeat: { heartbeatId: "heartbeat-phase1a8-001", leaseId: "lease-phase1a8-001", status: "HEALTHY", observedAt: fixedIso, contractVersion: "1.0.0" },
    dependencyGraph: { graphId: "graph-phase1a8", workflowId: "workflow-phase1a8", taskIds: ["task-phase1a8-000", "task-phase1a8-001"], edges: [{ edgeId: "dep-000", fromTaskId: "task-phase1a8-000", toTaskId: "task-phase1a8-001", edgeType: "REQUIRES_COMPLETION", required: true }] },
    lock: { lockId: "lock-phase1a8-001", workflowId: "workflow-phase1a8", scopeHash: "workflow-scope-hash", mode: "EXCLUSIVE", state: "ACTIVE", contractVersion: "1.0.0" },
    checkpoint: { checkpointId: "checkpoint-phase1a8-001", workflowId: "workflow-phase1a8", digest: "checkpoint-digest-001", parentCheckpointId: null, stateHash: "state-hash-001", contractVersion: "1.0.0" },
    checkpointCasRequest: { requestId: "checkpoint-cas-request-001", checkpointId: "checkpoint-phase1a8-001", expectedDigest: "checkpoint-digest-001", proposedDigest: "checkpoint-digest-002", writerAgentId: "agent-nova", contractVersion: "1.0.0" },
    evidenceEvent: { evidenceId: "evidence-phase1a8-001", taskId: "task-phase1a8-001", provider: "VALIDATION", decision: "APPROVED", observedAt: fixedIso, digest: "evidence-digest-001" },
    cancellationRequest: { cancellationId: "cancellation-phase1a8-001", taskId: "task-phase1a8-001", requestedBy: "agent-nova", status: "REQUESTED", riskClass: "R2" as RiskClass, contractVersion: "1.0.0" },
    joinBarrier: { joinBarrierId: "join-barrier-phase1a8-001", taskIds: ["task-phase1a8-001"], state: "WAITING", ready: false, contractVersion: "1.0.0" },
    aggregationRequest: { aggregationId: "aggregation-phase1a8-001", taskId: "task-phase1a8-001", inputDigests: ["digest-a", "digest-b"], resultDigest: "aggregate-digest-001", contractVersion: "1.0.0" },
    promotionLaneRequest: { promotionId: "promotion-phase1a8-001", laneLimit: 1, approvalId: "approval-r4-phase1a8", riskClass: "R4" as RiskClass, state: "BLOCKED", contractVersion: "1.0.0" },
    memoryRecords: {
      m0: { memoryId: "memory-m0-001", tier: "M0", isCanonical: false },
      m1: { memoryId: "memory-m1-001", tier: "M1", isCanonical: false },
      m2: { memoryId: "memory-m2-001", tier: "M2", isCanonical: false },
      m3: { memoryId: "memory-m3-001", tier: "M3", isCanonical: false },
      m4: { memoryId: "memory-m4-001", tier: "M4", isCanonical: false },
      m5: { memoryId: "memory-m5-001", tier: "M5", isCanonical: false },
      p0: { memoryId: "memory-p0-onyx", tier: "P0", personaId: "persona-onyx", isCanonical: true },
    },
    p0ONYXMetadata: { personaId: "persona-onyx", source: "baseline", memoryTier: "P0", canonical: true },
    p0NOVAMetadata: { personaId: "persona-nova", source: "baseline", memoryTier: "P0", canonical: true },
    sourceTrustEvaluation: { sourceId: "source-001", sourceType: "REPOSITORY", trustClassification: "CANONICAL_REPOSITORY", authorityClass: "AUTHORITATIVE_SOURCE", memoryTier: "M2" },
    quarantineRecord: { quarantineId: "quarantine-001", sourceId: "source-001", reason: "poisoning-detected", quarantinedAt: fixedIso, status: "QUARANTINED" },
    tombstone: { tombstoneId: "tombstone-001", memoryId: "memory-m2-001", deletedAt: fixedIso, reason: "retention-expired", status: "ACTIVE" },
    deletionPropagationTargets: { targets: ["memory-m2-001", "summary-legacy-01"], reason: "retention-policy" },
    contextPackage: { packageId: "context-package-default", workflowId: "workflow-phase1a8", version: 1, sourceIds: ["source-001"], provenanceStatus: "VALID", immutabilityHash: "context-hash-001" },
    modelRoutingProfile: { profileId: "model-routing-profile-default", requestClass: "READ_ONLY_QUERY", localFirst: true, budgetMode: "LOCAL_FIRST", premiumRouteAllowed: false, contractVersion: "1.0.0" },
    savedDraft: { draftId: "draft-phase1a8-001", draftLineageId: "draft-lineage-phase1a8-001", version: 1, scopeHash: "draft-scope-hash-001", approvalVersion: 1, status: "DRAFT" },
    councilSession: { councilId: "council-session-phase1a8", participants: ["agent-onyx", "agent-nova"], recommendedAction: "PROCEED_WITH_RECONCILIATION", recommendationDigest: "recommendation-digest-001", rahulApprovalRequired: true, status: "AGREEMENT" },
    automationCenterScreenRegistry: { screenIds: ["DASHBOARD", "INTAKE", "PLANS", "APPROVALS", "WORKFLOWS", "AGENT_ACTIVITY", "VALIDATION_CENTER", "EVIDENCE_VIEWER", "CONTEXT_EXPLORER", "RECOVERY_CENTER", "COST_CENTER", "SETTINGS"], routeIds: ["route-dashboard", "route-intake", "route-plans", "route-approvals", "route-workflows", "route-agent-activity", "route-validation-center", "route-evidence-viewer", "route-context-explorer", "route-recovery-center", "route-cost-center", "route-settings"], displayOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], contractVersion: "1.0.0" },
    accessibilityGates: { screenId: "APPROVALS", mandatoryGates: ["ACCESSIBLE_APPROVAL_RISK", "ACCESSIBLE_RECOVERY_CONTROLS"], result: "PASS", contractVersion: "1.0.0" },
  };
  return base;
}
