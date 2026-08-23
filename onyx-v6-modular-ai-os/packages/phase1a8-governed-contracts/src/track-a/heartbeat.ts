import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import { makeId } from "../shared/identifiers";
import type { AgentIdentity } from "./agent-identity";
import type { Task } from "./task";
import type { TaskLease } from "./lease";

export const HEARTBEAT_STATUSES = ["UNKNOWN", "HEALTHY", "DEGRADED", "STALE", "EXPIRED", "REVOKED"] as const;
export type HeartbeatStatus = (typeof HEARTBEAT_STATUSES)[number];

export const HEARTBEAT_RENEWAL_POLICY = ["EXPLICIT_RENEWAL_REQUIRED"] as const;
export type HeartbeatRenewalPolicy = (typeof HEARTBEAT_RENEWAL_POLICY)[number];

export interface Heartbeat {
  heartbeatId: string;
  leaseId: string;
  taskId: string;
  agentId: string;
  runtimeId: string;
  runtimeSessionId: string;
  sequence: number;
  reportedAt: string;
  leaseExpiry: string;
  checkpointDigest: string;
  progressDigest: string;
  healthStatus: HeartbeatStatus;
  currentOperationClass: string;
  tokenUsage: number;
  costUsage: number;
  evidenceSequence: number;
  renewalPolicy: HeartbeatRenewalPolicy;
  contractVersion: string;
}

const HEARTBEAT_TRANSITIONS: Record<HeartbeatStatus, readonly HeartbeatStatus[]> = {
  UNKNOWN: ["HEALTHY"],
  HEALTHY: ["DEGRADED", "REVOKED"],
  DEGRADED: ["HEALTHY", "STALE", "REVOKED"],
  STALE: ["DEGRADED", "EXPIRED", "REVOKED"],
  EXPIRED: [],
  REVOKED: [],
};

export const HEARTBEAT_TRANSITION_AUTHORITY: Record<string, readonly string[]> = {
  "UNKNOWN->HEALTHY": ["FIRST_VALID_HEARTBEAT"],
  "HEALTHY->DEGRADED": ["CADENCE_MISSED"],
  "DEGRADED->HEALTHY": ["HEALTHY_RESUMED"],
  "DEGRADED->STALE": ["STALE_THRESHOLD_REACHED"],
  "STALE->DEGRADED": ["LATE_HEARTBEAT_RECEIVED"],
  "STALE->EXPIRED": ["LEASE_EXPIRED"],
  "HEALTHY->REVOKED": ["GOVERNANCE_REVOCATION", "SECURITY_REVOCATION"],
  "DEGRADED->REVOKED": ["GOVERNANCE_REVOCATION", "SECURITY_REVOCATION"],
  "STALE->REVOKED": ["GOVERNANCE_REVOCATION", "SECURITY_REVOCATION"],
};

export function canTransitionHeartbeatStatus(from: HeartbeatStatus, to: HeartbeatStatus): boolean {
  return HEARTBEAT_TRANSITIONS[from].includes(to);
}

export function assertLegalHeartbeatTransition(from: HeartbeatStatus, to: HeartbeatStatus): void {
  if (!canTransitionHeartbeatStatus(from, to)) {
    throw new Error(`Illegal heartbeat transition: ${from} -> ${to}`);
  }
}

export function transitionHeartbeatStatus(heartbeat: Heartbeat, nextStatus: HeartbeatStatus, authority?: string): Heartbeat {
  assertLegalHeartbeatTransition(heartbeat.healthStatus, nextStatus);
  const key = `${heartbeat.healthStatus}->${nextStatus}`;
  if (authority) {
    const allowed = HEARTBEAT_TRANSITION_AUTHORITY[key] ?? [];
    if (allowed.length > 0 && !allowed.includes(authority)) {
      throw new Error(`Heartbeat transition ${key} requires one of: ${allowed.join(", ")}.`);
    }
  }
  return { ...heartbeat, healthStatus: nextStatus };
}

export function assertValidHeartbeat(
  heartbeat: Heartbeat,
  lease: TaskLease,
  task: Task,
  agent: AgentIdentity,
  runtimeId: string,
  runtimeSessionId: string,
): void {
  if (!heartbeat || !lease || !task || !agent) {
    throw new Error("Heartbeat validation requires lease, task, and agent data.");
  }
  if (heartbeat.leaseId !== lease.leaseId) throw new Error("Heartbeat lease ID does not match the lease.");
  if (heartbeat.taskId !== task.taskId) throw new Error("Heartbeat task ID does not match the task.");
  if (heartbeat.agentId !== agent.agentId) throw new Error("Heartbeat agent ID does not match the agent.");
  if (heartbeat.runtimeId !== runtimeId || heartbeat.runtimeId !== lease.runtimeId) throw new Error("Heartbeat runtime ID is invalid.");
  if (heartbeat.runtimeSessionId !== runtimeSessionId || heartbeat.runtimeSessionId !== lease.runtimeSessionId) throw new Error("Heartbeat runtime-session ID is invalid.");
  if (!Number.isInteger(heartbeat.sequence) || heartbeat.sequence <= 0) throw new Error("Heartbeat sequence must be a positive integer.");
  if (heartbeat.sequence < 1) throw new Error("Heartbeat sequence must be monotonic and positive.");
  if (heartbeat.checkpointDigest !== lease.checkpointDigest) throw new Error("Heartbeat checkpoint digest is stale and does not match the current lease checkpoint.");
  if (heartbeat.progressDigest.includes("token=") || heartbeat.progressDigest.includes("secret=") || heartbeat.progressDigest.includes("password=") || heartbeat.progressDigest.toLowerCase().includes("authorization") || heartbeat.progressDigest.includes("Bearer ")) {
    throw new Error("Heartbeat progress digest must not contain secrets or raw authorization metadata.");
  }
  if (/\s/.test(heartbeat.progressDigest)) {
    throw new Error("Heartbeat must use progressDigest, not unrestricted progress text.");
  }
  if (heartbeat.tokenUsage < 0 || !Number.isFinite(heartbeat.tokenUsage)) throw new Error("Heartbeat token usage must be a valid non-negative number.");
  if (heartbeat.costUsage < 0 || !Number.isFinite(heartbeat.costUsage)) throw new Error("Heartbeat cost usage must be a valid non-negative number.");
  if (lease.status === "RELEASED" || lease.status === "REVOKED" || lease.status === "ABANDONED" || lease.status === "EXPIRED" || lease.status === "RECONCILIATION_REQUIRED") {
    throw new Error("Heartbeat is rejected after the lease enters a terminal or reconciliation-required state.");
  }
  if (agent.status === "REVOKED" || agent.status === "DEREGISTERED") {
    throw new Error("Heartbeat is rejected after agent revocation.");
  }
  if (new Date(heartbeat.reportedAt).getTime() > new Date(heartbeat.leaseExpiry).getTime()) {
    throw new Error("Heartbeat cannot be accepted after lease expiration.");
  }
  if (heartbeat.renewalPolicy !== "EXPLICIT_RENEWAL_REQUIRED") {
    throw new Error("Heartbeat renewal policy must be EXPLICIT_RENEWAL_REQUIRED.");
  }
}

export interface HeartbeatInput extends Partial<Heartbeat> {
  lease: TaskLease;
  task: Task;
  agent: AgentIdentity;
  runtimeId?: string;
  runtimeSessionId?: string;
  sequence?: number;
  healthStatus?: HeartbeatStatus;
  renewalPolicy?: HeartbeatRenewalPolicy;
}

export function createHeartbeat(input: HeartbeatInput): Heartbeat {
  const { lease, task, agent, runtimeId, runtimeSessionId, sequence, healthStatus, renewalPolicy, ...rest } = input;
  const nextSequence = sequence ?? 1;
  const heartbeat: Heartbeat = {
    heartbeatId: rest.heartbeatId ?? makeId("heartbeat", { leaseId: lease.leaseId, taskId: task.taskId, sequence: nextSequence }),
    leaseId: lease.leaseId,
    taskId: task.taskId,
    agentId: agent.agentId,
    runtimeId: runtimeId ?? lease.runtimeId,
    runtimeSessionId: runtimeSessionId ?? lease.runtimeSessionId,
    sequence: nextSequence,
    reportedAt: rest.reportedAt ?? new Date("2026-08-21T00:00:30.000Z").toISOString(),
    leaseExpiry: rest.leaseExpiry ?? lease.expiresAt,
    checkpointDigest: rest.checkpointDigest ?? lease.checkpointDigest,
    progressDigest: rest.progressDigest ?? "progress-digest-1",
    healthStatus: healthStatus ?? "HEALTHY",
    currentOperationClass: rest.currentOperationClass ?? task.operationClass,
    tokenUsage: rest.tokenUsage ?? 0,
    costUsage: rest.costUsage ?? 0,
    evidenceSequence: rest.evidenceSequence ?? 1,
    renewalPolicy: renewalPolicy ?? "EXPLICIT_RENEWAL_REQUIRED",
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
  };
  assertValidHeartbeat(heartbeat, lease, task, agent, heartbeat.runtimeId, heartbeat.runtimeSessionId);
  return heartbeat;
}
