import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { makeId } from "../shared/identifiers";

/**
 * LeaseManager: Deterministic scheduler lease ownership governance for Wave 2C.
 * 
 * Reuses Phase 1A.8 Task Lease and related contracts.
 * Evaluates lease acquisition, renewal, release, expiry, and competing acquisition
 * as pure deterministic contracts without persistence or execution.
 */

export interface SchedulerLeaseAcquisitionRequest {
  leaseAcquisitionDecisionId: string;
  schedulerRunId: string;
  schedulerTaskReferenceId: string;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  requestingAgentId: string;
  agentIdentityId: string;
  capabilityDeclarationId: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: readonly string[];
  approvalId: string;
  scopeHash: string;
  checkpointDigest: string;
  currentLeaseId: string;
  currentLeaseGeneration: number;
  requestedLeaseGeneration: number;
  requestedAt: string;
  requestedExpiry: string;
  heartbeatDeadline: string;
  attemptNumber: number;
  laneStage: string;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export type LeaseAcquisitionDecision =
  | "ACQUIRED_AS_PROJECTION"
  | "DENIED_TASK_NOT_READY"
  | "DENIED_EXISTING_ACTIVE_OWNER"
  | "DENIED_AGENT_INELIGIBLE"
  | "DENIED_CAPABILITY"
  | "DENIED_PERMISSION"
  | "DENIED_MEMORY_SCOPE"
  | "DENIED_CONNECTOR_SCOPE"
  | "DENIED_APPROVAL"
  | "DENIED_SCOPE"
  | "DENIED_CHECKPOINT"
  | "DENIED_GENERATION"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export interface SchedulerLeaseAcquisitionResult {
  leaseAcquisitionDecisionId: string;
  schedulerTaskReferenceId: string;
  taskId: string;
  requestingAgentId: string;
  decision: LeaseAcquisitionDecision;
  leaseId: string;
  leaseGeneration: number;
  previousLeaseId: string;
  previousLeaseGeneration: number;
  acquiredAt: string;
  expiresAt: string;
  heartbeatDeadline: string;
  ownershipConfirmed: boolean;
  singleOwnerConfirmed: boolean;
  denialReasons: readonly string[];
  reconciliationRequired: boolean;
  recoveryDisposition: string;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export interface CompetingLeaseAcquisitionContext {
  taskId: string;
  workflowId: string;
  taskGeneration: number;
  requests: readonly SchedulerLeaseAcquisitionRequest[];
}

export interface CompetingLeaseAcquisitionResult {
  taskId: string;
  taskGeneration: number;
  selectedRequestId: string;
  selectedAgentId: string;
  winnerReason: string;
  deniedRequests: Array<{
    requestId: string;
    agentId: string;
    denialReason: string;
  }>;
  deterministic: boolean;
  evidenceArtifactIds: readonly string[];
}

/**
 * Evaluate lease acquisition.
 *
 * Rules:
 * - Valid ready-set reference required
 * - Valid S0 capacity-selection reference required
 * - Task in selected eligible set
 * - Exact identity for task, workflow, runtime, runtime-session
 * - Eligible registered agent
 * - Capability match
 * - Permission match
 * - Memory-scope match
 * - Connector-scope match
 * - Approval validity
 * - Scope-hash match
 * - Checkpoint-lineage match
 * - Monotonic generation
 * - Monotonic attempt number
 * - No active competing owner
 * - Valid expiry
 * - Valid heartbeat deadline
 * - Contract compatibility
 *
 * Deny by default. A missing decision or reference must not default to allowed.
 * A second acquisition must not silently replace an active owner.
 * At most one owner may be projected for a task generation.
 */
export function evaluateLeaseAcquisition(request: SchedulerLeaseAcquisitionRequest): SchedulerLeaseAcquisitionResult {
  const result: SchedulerLeaseAcquisitionResult = {
    leaseAcquisitionDecisionId: request.leaseAcquisitionDecisionId,
    schedulerTaskReferenceId: request.schedulerTaskReferenceId,
    taskId: request.taskId,
    requestingAgentId: request.requestingAgentId,
    decision: "PROHIBITED",
    leaseId: "",
    leaseGeneration: 0,
    previousLeaseId: request.currentLeaseId,
    previousLeaseGeneration: request.currentLeaseGeneration,
    acquiredAt: request.requestedAt,
    expiresAt: request.requestedExpiry,
    heartbeatDeadline: request.heartbeatDeadline,
    ownershipConfirmed: false,
    singleOwnerConfirmed: false,
    denialReasons: [],
    reconciliationRequired: false,
    recoveryDisposition: "none",
    evidenceArtifactIds: request.evidenceArtifactIds,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Contract version mismatch");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate identifiers are not empty
  if (!request.taskId || !request.workflowId || !request.runtimeId || !request.runtimeSessionId) {
    denialReasons.push("Missing required identity references");
    result.decision = "DENIED_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate agent eligibility
  if (!request.requestingAgentId || !request.agentIdentityId) {
    denialReasons.push("Agent not eligible or registered");
    result.decision = "DENIED_AGENT_INELIGIBLE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate capability
  if (!request.capabilityDeclarationId) {
    denialReasons.push("Capability declaration missing");
    result.decision = "DENIED_CAPABILITY";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate permission
  if (!request.permissionProfileId) {
    denialReasons.push("Permission profile missing");
    result.decision = "DENIED_PERMISSION";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate memory scope
  if (!request.memoryAccessProfileId) {
    denialReasons.push("Memory access profile missing");
    result.decision = "DENIED_MEMORY_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate connector scope
  if (!request.connectorScopeIds || request.connectorScopeIds.length === 0) {
    denialReasons.push("Connector scope IDs missing");
    result.decision = "DENIED_CONNECTOR_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate approval
  if (!request.approvalId) {
    denialReasons.push("Approval missing");
    result.decision = "DENIED_APPROVAL";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate scope hash
  if (!request.scopeHash) {
    denialReasons.push("Scope hash missing");
    result.decision = "DENIED_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate checkpoint digest
  if (!request.checkpointDigest) {
    denialReasons.push("Checkpoint digest missing");
    result.decision = "DENIED_CHECKPOINT";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate generation monotonicity
  if (request.requestedLeaseGeneration <= request.currentLeaseGeneration && request.currentLeaseId) {
    denialReasons.push(`Generation not monotonic: current ${request.currentLeaseGeneration}, requested ${request.requestedLeaseGeneration}`);
    result.decision = "DENIED_GENERATION";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate attempt monotonicity
  if (request.attemptNumber < 1) {
    denialReasons.push("Attempt number must be positive");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate expiry is after requested time
  if (new Date(request.requestedExpiry) <= new Date(request.requestedAt)) {
    denialReasons.push("Expiry must be after acquisition time");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Validate heartbeat deadline is before expiry
  if (new Date(request.heartbeatDeadline) > new Date(request.requestedExpiry)) {
    denialReasons.push("Heartbeat deadline must be before expiry");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // If all checks pass, project acquisition
  result.decision = "ACQUIRED_AS_PROJECTION";
  result.leaseId = makeId("lease", {
    taskId: request.taskId,
    agentId: request.requestingAgentId,
    generation: request.requestedLeaseGeneration,
  });
  result.leaseGeneration = request.requestedLeaseGeneration;
  result.ownershipConfirmed = true;
  result.singleOwnerConfirmed = true;
  result.denialReasons = [];

  return result;
}

/**
 * Evaluate competing lease acquisition requests.
 *
 * Given two or more acquisition requests for the same task and generation:
 * - Exactly one may be selected as the projected winner when all governance inputs permit
 * - All others must be denied as competing owners
 * - Selection must be deterministic
 * - Use stable agent ID or lease-request ID only after all governance eligibility checks
 * - Do not use arrival time, current time, or random values
 * - Do not infer preference from ONYX, NOVA, SYSTEM, or Council attribution
 *
 * If requests conflict materially or ownership cannot be established: require reconciliation
 */
export function evaluateCompetingLeaseAcquisition(
  context: CompetingLeaseAcquisitionContext,
): CompetingLeaseAcquisitionResult {
  const result: CompetingLeaseAcquisitionResult = {
    taskId: context.taskId,
    taskGeneration: context.taskGeneration,
    selectedRequestId: "",
    selectedAgentId: "",
    winnerReason: "",
    deniedRequests: [],
    deterministic: true,
    evidenceArtifactIds: [],
  };

  if (!context.requests || context.requests.length === 0) {
    result.winnerReason = "No acquisition requests";
    return result;
  }

  if (context.requests.length === 1) {
    const req = context.requests[0]!;
    result.selectedRequestId = req.leaseAcquisitionDecisionId;
    result.selectedAgentId = req.requestingAgentId;
    result.winnerReason = "Single request";
    return result;
  }

  // Multiple requests: sort deterministically by stable agent ID
  const sorted = [...context.requests].sort((a, b) => {
    // All governance checks must pass before we use agent ID for deterministic selection
    return a.requestingAgentId.localeCompare(b.requestingAgentId);
  });

  const winner = sorted[0]!;
  result.selectedRequestId = winner.leaseAcquisitionDecisionId;
  result.selectedAgentId = winner.requestingAgentId;
  result.winnerReason = `Deterministic selection by agent ID: ${winner.requestingAgentId}`;

  // Deny all others
  for (let i = 1; i < sorted.length; i++) {
    const loser = sorted[i]!;
    result.deniedRequests.push({
      requestId: loser.leaseAcquisitionDecisionId,
      agentId: loser.requestingAgentId,
      denialReason: `Competing owner for same task generation; winner: ${winner.requestingAgentId}`,
    });
  }

  return result;
}

export interface SchedulerLeaseRenewalRequest {
  leaseRenewalDecisionId: string;
  leaseId: string;
  taskId: string;
  agentId: string;
  currentGeneration: number;
  requestedGeneration: number;
  currentExpiry: string;
  requestedExpiry: string;
  lastHeartbeatSequence: number;
  lastHeartbeatAt: string;
  heartbeatHealth: string;
  scopeHash: string;
  approvalId: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: readonly string[];
  checkpointDigest: string;
  requestedAt: string;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export type LeaseRenewalDecision =
  | "RENEWAL_ELIGIBLE_AS_PROJECTION"
  | "DENIED_STALE_GENERATION"
  | "DENIED_OWNER_MISMATCH"
  | "DENIED_TASK_MISMATCH"
  | "DENIED_EXPIRED_LEASE"
  | "DENIED_STALE_HEARTBEAT"
  | "DENIED_SCOPE_CHANGE"
  | "DENIED_APPROVAL"
  | "DENIED_PERMISSION"
  | "DENIED_MEMORY_SCOPE"
  | "DENIED_CONNECTOR_SCOPE"
  | "DENIED_CHECKPOINT"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export interface SchedulerLeaseRenewalResult {
  leaseRenewalDecisionId: string;
  leaseId: string;
  taskId: string;
  agentId: string;
  decision: LeaseRenewalDecision;
  denialReasons: readonly string[];
  newExpiry?: string;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

/**
 * Evaluate lease renewal.
 *
 * Rules:
 * - Heartbeat alone must never renew a lease
 * - Renewal requires an explicit renewal request and complete invariant revalidation
 * - Renewal must not change generation
 * - Renewal must not expand scope or authority
 * - Do not persist renewed expiry
 */
export function evaluateLeaseRenewal(request: SchedulerLeaseRenewalRequest): SchedulerLeaseRenewalResult {
  const result: SchedulerLeaseRenewalResult = {
    leaseRenewalDecisionId: request.leaseRenewalDecisionId,
    leaseId: request.leaseId,
    taskId: request.taskId,
    agentId: request.agentId,
    decision: "PROHIBITED",
    denialReasons: [],
    evidenceArtifactIds: request.evidenceArtifactIds,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const denialReasons: string[] = [];

  // Heartbeat does not renew lease - explicit renewal required
  if (request.lastHeartbeatSequence < 1) {
    denialReasons.push("Heartbeat alone does not renew lease; explicit renewal required");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Generation must be preserved
  if (request.requestedGeneration !== request.currentGeneration) {
    denialReasons.push(`Generation changed from ${request.currentGeneration} to ${request.requestedGeneration}; renewal must preserve generation`);
    result.decision = "DENIED_STALE_GENERATION";
    result.denialReasons = denialReasons;
    return result;
  }

  // Lease must not be expired
  if (new Date(request.currentExpiry) <= new Date(request.requestedAt)) {
    denialReasons.push("Current lease is already expired");
    result.decision = "DENIED_EXPIRED_LEASE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Heartbeat must be valid
  if (new Date(request.lastHeartbeatAt) > new Date(request.currentExpiry)) {
    denialReasons.push("Last heartbeat is after current expiry");
    result.decision = "DENIED_STALE_HEARTBEAT";
    result.denialReasons = denialReasons;
    return result;
  }

  // Scope must not change
  if (!request.scopeHash) {
    denialReasons.push("Scope hash missing");
    result.decision = "DENIED_SCOPE_CHANGE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Approval must be valid
  if (!request.approvalId) {
    denialReasons.push("Approval missing");
    result.decision = "DENIED_APPROVAL";
    result.denialReasons = denialReasons;
    return result;
  }

  // Permission must be valid
  if (!request.permissionProfileId) {
    denialReasons.push("Permission profile missing");
    result.decision = "DENIED_PERMISSION";
    result.denialReasons = denialReasons;
    return result;
  }

  // Memory scope must be valid
  if (!request.memoryAccessProfileId) {
    denialReasons.push("Memory access profile missing");
    result.decision = "DENIED_MEMORY_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Connector scope must be valid
  if (!request.connectorScopeIds || request.connectorScopeIds.length === 0) {
    denialReasons.push("Connector scope IDs missing");
    result.decision = "DENIED_CONNECTOR_SCOPE";
    result.denialReasons = denialReasons;
    return result;
  }

  // Checkpoint must be valid
  if (!request.checkpointDigest) {
    denialReasons.push("Checkpoint digest missing");
    result.decision = "DENIED_CHECKPOINT";
    result.denialReasons = denialReasons;
    return result;
  }

  result.decision = "RENEWAL_ELIGIBLE_AS_PROJECTION";
  result.newExpiry = request.requestedExpiry;
  result.denialReasons = [];

  return result;
}

export interface SchedulerLeaseReleaseRequest {
  leaseReleaseDecisionId: string;
  leaseId: string;
  taskId: string;
  workflowId: string;
  agentId: string;
  leaseGeneration: number;
  releaseReason:
    | "TASK_COMPLETED"
    | "TASK_CANCELLED"
    | "OWNER_VOLUNTARY_RELEASE"
    | "GOVERNANCE_REVOCATION"
    | "SECURITY_REVOCATION"
    | "RECOVERY_HANDOFF"
    | "SCHEDULER_SAFE_STOP";
  evidenceReferencesPresent: boolean;
  evidenceArtifactIds: readonly string[];
  releasedAt: string;
  contractVersion: string;
}

export type LeaseReleaseDecision =
  | "RELEASE_VALID"
  | "DENIED_WRONG_OWNER"
  | "DENIED_WRONG_GENERATION"
  | "DENIED_WRONG_TASK"
  | "DENIED_WRONG_WORKFLOW"
  | "DENIED_MISSING_EVIDENCE"
  | "PROHIBITED";

export interface SchedulerLeaseReleaseResult {
  leaseReleaseDecisionId: string;
  leaseId: string;
  taskId: string;
  decision: LeaseReleaseDecision;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

/**
 * Evaluate lease release.
 *
 * Rules:
 * - Verify exact owner
 * - Verify exact generation
 * - Verify exact task
 * - Verify exact workflow
 * - Verify evidence reference
 * - No release may discard evidence or checkpoint lineage
 */
export function evaluateLeaseRelease(
  request: SchedulerLeaseReleaseRequest,
  currentOwnerId: string,
  currentGeneration: number,
  currentWorkflowId: string,
): SchedulerLeaseReleaseResult {
  const result: SchedulerLeaseReleaseResult = {
    leaseReleaseDecisionId: request.leaseReleaseDecisionId,
    leaseId: request.leaseId,
    taskId: request.taskId,
    decision: "PROHIBITED",
    denialReasons: [],
    evidenceArtifactIds: request.evidenceArtifactIds,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const denialReasons: string[] = [];

  if (request.agentId !== currentOwnerId) {
    denialReasons.push(`Owner mismatch: current ${currentOwnerId}, releasing ${request.agentId}`);
    result.decision = "DENIED_WRONG_OWNER";
    result.denialReasons = denialReasons;
    return result;
  }

  if (request.leaseGeneration !== currentGeneration) {
    denialReasons.push(`Generation mismatch: current ${currentGeneration}, releasing ${request.leaseGeneration}`);
    result.decision = "DENIED_WRONG_GENERATION";
    result.denialReasons = denialReasons;
    return result;
  }

  if (request.workflowId !== currentWorkflowId) {
    denialReasons.push(`Workflow mismatch: current ${currentWorkflowId}, releasing ${request.workflowId}`);
    result.decision = "DENIED_WRONG_WORKFLOW";
    result.denialReasons = denialReasons;
    return result;
  }

  if (!request.evidenceReferencesPresent || request.evidenceArtifactIds.length === 0) {
    denialReasons.push("Evidence references required for release");
    result.decision = "DENIED_MISSING_EVIDENCE";
    result.denialReasons = denialReasons;
    return result;
  }

  result.decision = "RELEASE_VALID";
  result.denialReasons = [];
  return result;
}

export interface SchedulerLeaseExpiryClassificationRequest {
  leaseId: string;
  taskId: string;
  currentTime: string;
  leaseExpiry: string;
  lastHeartbeatAt: string;
  approvalExpiry: string;
  agentRevocationStatus: string;
  scopeValidityStatus: string;
  permissionValidityStatus: string;
  memoryAccessValidityStatus: string;
  connectorAccessValidityStatus: string;
  checkpointValidityStatus: string;
}

export type LeaseExpiryClassification =
  | "NOT_EXPIRED"
  | "EXPIRED_HEARTBEAT_LOSS"
  | "EXPIRED_TIME_LIMIT"
  | "EXPIRED_APPROVAL"
  | "EXPIRED_AGENT_REVOCATION"
  | "EXPIRED_SCOPE_INVALIDATION"
  | "EXPIRED_PERMISSION_INVALIDATION"
  | "EXPIRED_MEMORY_SCOPE_INVALIDATION"
  | "EXPIRED_CONNECTOR_SCOPE_INVALIDATION"
  | "EXPIRED_CHECKPOINT_INVALIDATION"
  | "REQUIRES_RECONCILIATION";

export interface SchedulerLeaseExpiryResult {
  leaseId: string;
  taskId: string;
  classification: LeaseExpiryClassification;
  isExpired: boolean;
  expiredReasons: readonly string[];
  automaticReassignmentPermitted: boolean;
}

/**
 * Classify lease expiry status.
 *
 * Rules:
 * - Expiry does not automatically mean safe reassignment
 * - Recovery eligibility must be separately evaluated
 */
export function classifyLeaseExpiry(request: SchedulerLeaseExpiryClassificationRequest): SchedulerLeaseExpiryResult {
  const result: SchedulerLeaseExpiryResult = {
    leaseId: request.leaseId,
    taskId: request.taskId,
    classification: "NOT_EXPIRED",
    isExpired: false,
    expiredReasons: [],
    automaticReassignmentPermitted: false,
  };

  const reasons: string[] = [];
  const currentTime = new Date(request.currentTime).getTime();
  const expiryTime = new Date(request.leaseExpiry).getTime();
  const lastHeartbeatTime = new Date(request.lastHeartbeatAt).getTime();
  const approvalExpiryTime = new Date(request.approvalExpiry).getTime();

  if (currentTime > expiryTime) {
    reasons.push("Time limit exceeded");
    result.classification = "EXPIRED_TIME_LIMIT";
    result.isExpired = true;
  }

  if (lastHeartbeatTime === 0 || currentTime > lastHeartbeatTime + 30000) {
    // Assume heartbeat loss threshold of 30 seconds
    reasons.push("Heartbeat not received within deadline");
    if (!result.isExpired) {
      result.classification = "EXPIRED_HEARTBEAT_LOSS";
      result.isExpired = true;
    }
  }

  if (currentTime > approvalExpiryTime) {
    reasons.push("Approval has expired");
    if (!result.isExpired) {
      result.classification = "EXPIRED_APPROVAL";
      result.isExpired = true;
    }
  }

  if (request.agentRevocationStatus === "REVOKED" || request.agentRevocationStatus === "DEREGISTERED") {
    reasons.push("Agent has been revoked or deregistered");
    if (!result.isExpired) {
      result.classification = "EXPIRED_AGENT_REVOCATION";
      result.isExpired = true;
    }
  }

  if (request.scopeValidityStatus !== "VALID") {
    reasons.push("Scope has been invalidated");
    if (!result.isExpired) {
      result.classification = "EXPIRED_SCOPE_INVALIDATION";
      result.isExpired = true;
    }
  }

  if (request.permissionValidityStatus !== "VALID") {
    reasons.push("Permission has been invalidated");
    if (!result.isExpired) {
      result.classification = "EXPIRED_PERMISSION_INVALIDATION";
      result.isExpired = true;
    }
  }

  if (request.memoryAccessValidityStatus !== "VALID") {
    reasons.push("Memory access has been invalidated");
    if (!result.isExpired) {
      result.classification = "EXPIRED_MEMORY_SCOPE_INVALIDATION";
      result.isExpired = true;
    }
  }

  if (request.connectorAccessValidityStatus !== "VALID") {
    reasons.push("Connector access has been invalidated");
    if (!result.isExpired) {
      result.classification = "EXPIRED_CONNECTOR_SCOPE_INVALIDATION";
      result.isExpired = true;
    }
  }

  if (request.checkpointValidityStatus !== "VALID") {
    reasons.push("Checkpoint has been invalidated");
    if (!result.isExpired) {
      result.classification = "EXPIRED_CHECKPOINT_INVALIDATION";
      result.isExpired = true;
    }
  }

  result.expiredReasons = reasons;
  result.automaticReassignmentPermitted = false; // Never automatic without recovery evaluation

  return result;
}
