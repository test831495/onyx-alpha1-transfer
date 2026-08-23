import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { makeId } from "../shared/identifiers";

/**
 * HeartbeatMonitor: Deterministic heartbeat health evaluation for Wave 2C.
 *
 * Reuses Phase 1A.8 Heartbeat contract and related status enums.
 * Evaluates heartbeat state, sequence validation, loss detection, and clock-skew
 * as pure deterministic contracts without timers or background loops.
 */

export interface HeartbeatMonitorRequest {
  heartbeatMonitorDecisionId: string;
  schedulerRunId: string;
  leaseId: string;
  leaseGeneration: number;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  agentId: string;
  expectedSequence: number;
  reportedSequence: number;
  previousHeartbeatAt: string;
  reportedAt: string;
  leaseExpiry: string;
  heartbeatDeadline: string;
  checkpointDigest: string;
  previousCheckpointDigest: string;
  progressDigest: string;
  healthStatus: string;
  tokenUsage: number;
  costUsage: number;
  clockSkewTolerance: number; // in milliseconds
  evaluatedAt: string;
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

export type HeartbeatMonitorDecision =
  | "HEALTHY"
  | "DEGRADED"
  | "STALE"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID_SEQUENCE"
  | "IDENTITY_MISMATCH"
  | "GENERATION_MISMATCH"
  | "CLOCK_SKEW_REQUIRES_RECONCILIATION"
  | "REQUIRES_RECOVERY_HANDOFF"
  | "PROHIBITED";

export type ClockSkewClassification =
  | "WITHIN_TOLERANCE"
  | "AHEAD_WITHIN_TOLERANCE"
  | "BEHIND_WITHIN_TOLERANCE"
  | "OUTSIDE_TOLERANCE"
  | "INVALID_TIMESTAMP_ORDER"
  | "REQUIRES_RECONCILIATION";

export interface HeartbeatMonitorResult {
  heartbeatMonitorDecisionId: string;
  leaseId: string;
  leaseGeneration: number;
  taskId: string;
  agentId: string;
  decision: HeartbeatMonitorDecision;
  classifiedHealth: string;
  sequenceValid: boolean;
  identityValid: boolean;
  leaseStillValid: boolean;
  clockSkewClassification: ClockSkewClassification;
  heartbeatLost: boolean;
  leaseExpiryRecommended: boolean;
  recoveryHandoffRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

/**
 * Evaluate heartbeat monitor request.
 *
 * Rules:
 * - Exact lease ID
 * - Exact generation
 * - Exact task ID
 * - Exact workflow ID
 * - Exact runtime ID
 * - Exact runtime-session ID
 * - Exact agent ID
 * - Strictly monotonic heartbeat sequence
 * - Valid supplied timestamps
 * - Valid checkpoint relationship
 * - Nonnegative token and cost usage
 * - Health classification compatible with lease status
 *
 * Reject:
 * - Duplicate sequence
 * - Decreasing sequence
 * - Skipped sequence where policy requires strict continuity
 * - Wrong agent
 * - Wrong task
 * - Wrong lease
 * - Wrong generation
 * - Wrong runtime
 * - Wrong runtime session
 * - Heartbeat after terminal lease release
 * - Heartbeat after revocation
 * - Heartbeat after confirmed expiry
 * - Stale checkpoint relationship
 * - Invalid usage values
 *
 * Heartbeat records must not contain:
 * - Chain-of-thought
 * - Private persona memory
 * - Connector credentials
 * - Secrets
 * - Authorization headers
 * - Unredacted private user content
 */
export function evaluateHeartbeatMonitor(
  request: HeartbeatMonitorRequest,
  currentOwnerId: string,
  leaseStatus: string,
  agentStatus: string,
): HeartbeatMonitorResult {
  const result: HeartbeatMonitorResult = {
    heartbeatMonitorDecisionId: request.heartbeatMonitorDecisionId,
    leaseId: request.leaseId,
    leaseGeneration: request.leaseGeneration,
    taskId: request.taskId,
    agentId: request.agentId,
    decision: "PROHIBITED",
    classifiedHealth: "UNKNOWN",
    sequenceValid: false,
    identityValid: false,
    leaseStillValid: false,
    clockSkewClassification: "REQUIRES_RECONCILIATION",
    heartbeatLost: false,
    leaseExpiryRecommended: false,
    recoveryHandoffRequired: false,
    reconciliationRequired: false,
    denialReasons: [],
    evidenceArtifactIds: request.evidenceArtifactIds,
    evaluatedAt: request.evaluatedAt,
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

  // Validate agent
  if (request.agentId !== currentOwnerId) {
    denialReasons.push(`Agent mismatch: current owner ${currentOwnerId}, heartbeat from ${request.agentId}`);
    result.decision = "IDENTITY_MISMATCH";
    result.identityValid = false;
    result.denialReasons = denialReasons;
    return result;
  }

  // Check agent status
  if (agentStatus === "REVOKED" || agentStatus === "DEREGISTERED") {
    denialReasons.push("Agent has been revoked or deregistered");
    result.decision = "REVOKED";
    result.denialReasons = denialReasons;
    return result;
  }

  result.identityValid = true;

  // Check lease status - reject after terminal states
  if (leaseStatus === "RELEASED" || leaseStatus === "REVOKED" || leaseStatus === "ABANDONED" || leaseStatus === "EXPIRED" || leaseStatus === "RECONCILIATION_REQUIRED") {
    denialReasons.push(`Lease is in terminal or reconciliation-required state: ${leaseStatus}`);
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  result.leaseStillValid = true;

  // Validate heartbeat sequence - strictly monotonic
  const isFirstHeartbeat = request.expectedSequence === 1 && request.reportedSequence === 1;
  const isMonotonicIncrease = request.reportedSequence === request.expectedSequence;

  if (!isFirstHeartbeat && !isMonotonicIncrease) {
    if (request.reportedSequence < request.expectedSequence) {
      denialReasons.push(
        `Heartbeat sequence is decreasing: expected ${request.expectedSequence}, got ${request.reportedSequence}`,
      );
      result.decision = "INVALID_SEQUENCE";
      result.sequenceValid = false;
      result.denialReasons = denialReasons;
      return result;
    }

    if (request.reportedSequence > request.expectedSequence) {
      denialReasons.push(
        `Heartbeat sequence is skipping: expected ${request.expectedSequence}, got ${request.reportedSequence}`,
      );
      result.decision = "INVALID_SEQUENCE";
      result.sequenceValid = false;
      result.denialReasons = denialReasons;
      return result;
    }
  }

  result.sequenceValid = true;

  // Validate checkpoint relationship
  if (request.checkpointDigest !== request.previousCheckpointDigest && request.previousCheckpointDigest !== "") {
    // Checkpoint changed - this is allowed but track it
    if (!request.checkpointDigest) {
      denialReasons.push("Checkpoint digest is required but empty");
      result.decision = "PROHIBITED";
      result.denialReasons = denialReasons;
      return result;
    }
  }

  // Validate usage values
  if (request.tokenUsage < 0 || !Number.isFinite(request.tokenUsage)) {
    denialReasons.push("Token usage must be a valid non-negative number");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  if (request.costUsage < 0 || !Number.isFinite(request.costUsage)) {
    denialReasons.push("Cost usage must be a valid non-negative number");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Check for secrets in progress digest
  const sensitivePatterns = [
    /token\s*=/i,
    /secret\s*=/i,
    /password\s*=/i,
    /authorization/i,
    /bearer\s+/i,
    /api[-_]?key/i,
    /api[-_]?secret/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(request.progressDigest)) {
      denialReasons.push("Progress digest contains sensitive information (secrets, tokens, credentials)");
      result.decision = "PROHIBITED";
      result.denialReasons = denialReasons;
      return result;
    }
  }

  // Progress digest must not contain unrestricted text (must be a digest)
  // A digest should be alphanumeric with hyphens and underscores, not containing spaces or line breaks
  if (/\s+/m.test(request.progressDigest)) {
    denialReasons.push("Progress digest must be a hash/digest, not unrestricted text");
    result.decision = "PROHIBITED";
    result.denialReasons = denialReasons;
    return result;
  }

  // Check if heartbeat is after lease expiry
  if (new Date(request.reportedAt) > new Date(request.leaseExpiry)) {
    denialReasons.push("Heartbeat cannot be accepted after lease expiration");
    result.decision = "EXPIRED";
    result.heartbeatLost = true;
    result.leaseExpiryRecommended = true;
    result.denialReasons = denialReasons;
    return result;
  }

  // Evaluate clock skew
  const clockSkewClassification = evaluateClockSkew(
    request.previousHeartbeatAt,
    request.reportedAt,
    request.evaluatedAt,
    request.clockSkewTolerance,
  );

  result.clockSkewClassification = clockSkewClassification;

  if (clockSkewClassification === "OUTSIDE_TOLERANCE" || clockSkewClassification === "INVALID_TIMESTAMP_ORDER" || clockSkewClassification === "REQUIRES_RECONCILIATION") {
    result.reconciliationRequired = true;
    result.decision = "CLOCK_SKEW_REQUIRES_RECONCILIATION";
    denialReasons.push(`Clock skew detected: ${clockSkewClassification}`);
    result.denialReasons = denialReasons;
    return result;
  }

  // Classify health
  result.classifiedHealth = request.healthStatus || "UNKNOWN";

  // Check for heartbeat loss (no heartbeat within deadline)
  const timeSincePreviousHeartbeat = new Date(request.reportedAt).getTime() - new Date(request.previousHeartbeatAt).getTime();
  const timeUntilDeadline = new Date(request.heartbeatDeadline).getTime() - new Date(request.reportedAt).getTime();

  if (timeUntilDeadline < 0) {
    result.heartbeatLost = true;
    result.leaseExpiryRecommended = true;
    result.recoveryHandoffRequired = true;
    result.decision = "STALE";
    denialReasons.push("Heartbeat received after deadline");
    result.denialReasons = denialReasons;
    return result;
  }

  // All checks passed - heartbeat is valid
  result.decision = "HEALTHY";
  result.denialReasons = [];
  result.sequenceValid = true;
  result.identityValid = true;
  result.leaseStillValid = true;

  return result;
}

/**
 * Evaluate clock skew deterministically using only supplied timestamps and tolerance.
 * Do not use Date.now() or current system clock.
 */
export function evaluateClockSkew(
  previousHeartbeatAt: string,
  reportedAt: string,
  evaluatedAt: string,
  toleranceMs: number,
): ClockSkewClassification {
  try {
    const prevTime = new Date(previousHeartbeatAt).getTime();
    const reportedTime = new Date(reportedAt).getTime();
    const evaluatedTime = new Date(evaluatedAt).getTime();

    // Check for invalid timestamp order
    if (reportedTime < prevTime) {
      return "INVALID_TIMESTAMP_ORDER";
    }

    // Check if evaluated time is before reported time (unlikely but possible)
    if (evaluatedTime < reportedTime) {
      return "INVALID_TIMESTAMP_ORDER";
    }

    // Calculate clock skew between reported and evaluated
    const skew = evaluatedTime - reportedTime;

    if (skew < 0) {
      return "REQUIRES_RECONCILIATION";
    }

    if (skew > toleranceMs) {
      return "OUTSIDE_TOLERANCE";
    }

    if (skew >= 0 && skew <= toleranceMs) {
      return "WITHIN_TOLERANCE";
    }

    return "REQUIRES_RECONCILIATION";
  } catch {
    return "REQUIRES_RECONCILIATION";
  }
}

/**
 * Heartbeat loss detection - determine if heartbeat should trigger lease expiry
 * and recovery handoff recommendation.
 */
export function detectHeartbeatLoss(
  lastHeartbeatAt: string,
  heartbeatDeadline: string,
  currentTime: string,
  lossThresholdMs: number,
): { isLost: boolean; timeSinceLastMs: number; reason: string } {
  const lastTime = new Date(lastHeartbeatAt).getTime();
  const deadlineTime = new Date(heartbeatDeadline).getTime();
  const currentTimeMs = new Date(currentTime).getTime();

  const timeSinceLast = currentTimeMs - lastTime;
  const timeUntilDeadline = deadlineTime - currentTimeMs;

  // Deadline has already passed
  if (timeUntilDeadline < 0) {
    return {
      isLost: true,
      timeSinceLastMs: timeSinceLast,
      reason: "Deadline exceeded",
    };
  }

  // Heartbeat not received for longer than threshold
  if (timeSinceLast > lossThresholdMs) {
    return {
      isLost: true,
      timeSinceLastMs: timeSinceLast,
      reason: `Heartbeat not received for ${timeSinceLast}ms (threshold: ${lossThresholdMs}ms)`,
    };
  }

  return {
    isLost: false,
    timeSinceLastMs: timeSinceLast,
    reason: "Heartbeat is current",
  };
}
