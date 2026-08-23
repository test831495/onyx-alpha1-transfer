/**
 * Phase 1A.9 Wave 5A: Fault Injection Contracts
 *
 * Defines deterministic fault injection for testing scheduler recovery and resilience.
 * Faults are injected deterministically into scenarios without executing real effects.
 */

import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

/**
 * Fault Classes for Phase 1A.9
 *
 * These are the authorized fault injection classes, each targeting specific
 * scheduler components and recovery paths.
 */
export const FAULT_CLASSES = {
  // Dependency Faults
  CYCLE: "cycle",
  UNKNOWN_DEPENDENCY: "unknown-dependency",

  // Lease Faults
  LEASE_RACE: "lease-race",
  STALE_LEASE_GENERATION: "stale-lease-generation",

  // Heartbeat Faults
  HEARTBEAT_LOSS: "heartbeat-loss",
  CLOCK_SKEW: "clock-skew",

  // Lock Faults
  LOCK_CONFLICT: "lock-conflict",
  LOCK_OWNER_LOSS: "lock-owner-loss",
  CAS_CONFLICT: "cas-conflict",

  // Checkpoint Faults
  CHECKPOINT_CORRUPTION: "checkpoint-corruption",
  SCHEMA_MISMATCH: "schema-mismatch",

  // Cancellation Faults
  CANCELLATION_UNCERTAINTY: "cancellation-uncertainty",

  // Join Faults
  JOIN_TIMEOUT: "join-timeout",

  // Budget Faults
  BUDGET_WARNING: "budget-warning",
  BUDGET_HARD_STOP: "budget-hard-stop",
  ATTEMPT_EXHAUSTION: "attempt-exhaustion",

  // Evidence Faults
  EVIDENCE_FAILURE: "evidence-failure",

  // External State Faults
  UNKNOWN_EXTERNAL_WRITE: "unknown-external-write",
  RUNTIME_DIVERGENCE: "runtime-divergence",
  WORKFLOW_DIVERGENCE: "workflow-divergence",

  // Approval and Permission Faults
  APPROVAL_INVALIDATION: "approval-invalidation",
  PERMISSION_INVALIDATION: "permission-invalidation",

  // Memory Faults
  MEMORY_TOMBSTONE: "memory-tombstone",
  MEMORY_POISONING: "memory-poisoning",
  CONTEXT_QUARANTINE: "context-quarantine",

  // Council Faults
  COUNCIL_DISAGREEMENT: "council-disagreement",

  // Draft Faults
  DRAFT_APPROVAL_INVALIDATION: "draft-approval-invalidation",

  // Connector Faults
  CONNECTOR_ACCOUNT_CONFLICT: "connector-account-conflict",
  CONNECTOR_REMOTE_UNCERTAINTY: "connector-remote-uncertainty",

  // Promotion Faults
  PROMOTION_FAILURE: "promotion-failure",
  EVIDENCE_CAUSAL_CYCLE: "evidence-causal-cycle",
  MISSING_MANDATORY_EVIDENCE: "missing-mandatory-evidence",
} as const;

/**
 * Fault Activation Point
 *
 * Specifies when during the scheduler execution the fault is triggered.
 */
export type FaultActivationPoint =
  | "before-acquisition"
  | "during-acquisition"
  | "during-execution"
  | "after-execution"
  | "after-completion"
  | "before-lane-transition"
  | "during-monitoring"
  | "during-decision"
  | "during-recovery";

/**
 * Fault Injection Definition
 */
export interface FaultInjectionDefinition {
  faultId: string;
  faultClass: string; // Value from FAULT_CLASSES
  targetReference: string; // Entity ID (task, lease, lock, etc.)
  activationPoint: FaultActivationPoint;
  expectedDisposition: string;
  expectedEvidenceClasses: string[];
  expectedSafetyState: Record<string, boolean>;
}

/**
 * Fault Injection Configuration
 */
export interface FaultInjectionConfig {
  enabled: boolean;
  faults: FaultInjectionDefinition[];
}

/**
 * Fault Injection Registry
 *
 * Manages fault injection templates that can be used in scenarios.
 */
export class FaultInjectionRegistry {
  private templates: Map<string, FaultInjectionDefinition> = new Map();

  register(fault: FaultInjectionDefinition): void {
    if (this.templates.has(fault.faultId)) {
      throw new Error(`Fault ID already registered: ${fault.faultId}`);
    }
    if (!Object.values(FAULT_CLASSES).includes(fault.faultClass as any)) {
      throw new Error(`Unknown fault class: ${fault.faultClass}`);
    }
    this.templates.set(fault.faultId, fault);
  }

  resolve(faultId: string): FaultInjectionDefinition {
    const fault = this.templates.get(faultId);
    if (!fault) {
      throw new Error(`Unknown fault ID: ${faultId}`);
    }
    return fault;
  }

  getAll(): FaultInjectionDefinition[] {
    return Array.from(this.templates.values());
  }
}

/**
 * Standard Fault Injection Templates
 */
export const STANDARD_FAULT_INJECTIONS: FaultInjectionDefinition[] = [
  // Dependency Faults
  {
    faultId: "fault-cycle-1",
    faultClass: FAULT_CLASSES.CYCLE,
    targetReference: "cycle-detection",
    activationPoint: "before-acquisition",
    expectedDisposition: "CYCLE_DETECTED",
    expectedEvidenceClasses: ["cycle-detection"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-unknown-dep",
    faultClass: FAULT_CLASSES.UNKNOWN_DEPENDENCY,
    targetReference: "unknown-task-reference",
    activationPoint: "before-acquisition",
    expectedDisposition: "UNKNOWN_REFERENCE_REJECTED",
    expectedEvidenceClasses: ["reference-validation"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Lease Faults
  {
    faultId: "fault-lease-race",
    faultClass: FAULT_CLASSES.LEASE_RACE,
    targetReference: "lease-acquisition",
    activationPoint: "during-acquisition",
    expectedDisposition: "SINGLE_WINNER_DETERMINED",
    expectedEvidenceClasses: ["lease-generation", "lease-acquisition"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-stale-lease-gen",
    faultClass: FAULT_CLASSES.STALE_LEASE_GENERATION,
    targetReference: "stale-lease",
    activationPoint: "during-acquisition",
    expectedDisposition: "STALE_GENERATION_REJECTED",
    expectedEvidenceClasses: ["lease-generation", "stale-result"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Heartbeat Faults
  {
    faultId: "fault-hb-loss",
    faultClass: FAULT_CLASSES.HEARTBEAT_LOSS,
    targetReference: "heartbeat-monitor",
    activationPoint: "during-monitoring",
    expectedDisposition: "HEARTBEAT_LOSS_DETECTED",
    expectedEvidenceClasses: ["heartbeat-loss", "recovery-projection"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-clock-skew",
    faultClass: FAULT_CLASSES.CLOCK_SKEW,
    targetReference: "heartbeat-monitor",
    activationPoint: "during-monitoring",
    expectedDisposition: "CLOCK_SKEW_DETECTED",
    expectedEvidenceClasses: ["clock-skew"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Lock Faults
  {
    faultId: "fault-lock-conflict",
    faultClass: FAULT_CLASSES.LOCK_CONFLICT,
    targetReference: "lock-acquisition",
    activationPoint: "during-acquisition",
    expectedDisposition: "LOCK_CONFLICT_DETECTED",
    expectedEvidenceClasses: ["lock-conflict"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-lock-owner-loss",
    faultClass: FAULT_CLASSES.LOCK_OWNER_LOSS,
    targetReference: "lock-monitor",
    activationPoint: "during-monitoring",
    expectedDisposition: "LOCK_OWNER_LOSS_DETECTED",
    expectedEvidenceClasses: ["lock-owner-loss"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-cas-conflict",
    faultClass: FAULT_CLASSES.CAS_CONFLICT,
    targetReference: "checkpoint-update",
    activationPoint: "during-execution",
    expectedDisposition: "CAS_CONFLICT_DETECTED",
    expectedEvidenceClasses: ["checkpoint-cas"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Checkpoint Faults
  {
    faultId: "fault-checkpoint-corruption",
    faultClass: FAULT_CLASSES.CHECKPOINT_CORRUPTION,
    targetReference: "checkpoint-integrity",
    activationPoint: "after-completion",
    expectedDisposition: "CHECKPOINT_CORRUPTED",
    expectedEvidenceClasses: ["checkpoint-integrity"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-schema-mismatch",
    faultClass: FAULT_CLASSES.SCHEMA_MISMATCH,
    targetReference: "checkpoint-schema",
    activationPoint: "after-completion",
    expectedDisposition: "SCHEMA_INCOMPATIBLE",
    expectedEvidenceClasses: ["schema-compatibility"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Cancellation Faults
  {
    faultId: "fault-cancel-uncertainty",
    faultClass: FAULT_CLASSES.CANCELLATION_UNCERTAINTY,
    targetReference: "cancellation-state",
    activationPoint: "during-decision",
    expectedDisposition: "UNCERTAIN_CANCELLATION",
    expectedEvidenceClasses: ["cancellation-uncertainty"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Join Faults
  {
    faultId: "fault-join-timeout",
    faultClass: FAULT_CLASSES.JOIN_TIMEOUT,
    targetReference: "join-coordinator",
    activationPoint: "during-monitoring",
    expectedDisposition: "JOIN_TIMEOUT_EXCEEDED",
    expectedEvidenceClasses: ["join-timeout"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Budget Faults
  {
    faultId: "fault-budget-warning",
    faultClass: FAULT_CLASSES.BUDGET_WARNING,
    targetReference: "budget-monitor",
    activationPoint: "during-execution",
    expectedDisposition: "BUDGET_WARNING",
    expectedEvidenceClasses: ["budget-decision"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-budget-hard-stop",
    faultClass: FAULT_CLASSES.BUDGET_HARD_STOP,
    targetReference: "budget-monitor",
    activationPoint: "during-execution",
    expectedDisposition: "BUDGET_HARD_LIMIT_EXCEEDED",
    expectedEvidenceClasses: ["budget-decision"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-attempt-exhaustion",
    faultClass: FAULT_CLASSES.ATTEMPT_EXHAUSTION,
    targetReference: "retry-budget",
    activationPoint: "during-recovery",
    expectedDisposition: "ATTEMPTS_EXHAUSTED",
    expectedEvidenceClasses: ["budget-exhaustion"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Evidence Faults
  {
    faultId: "fault-evidence-failure",
    faultClass: FAULT_CLASSES.EVIDENCE_FAILURE,
    targetReference: "evidence-store",
    activationPoint: "after-completion",
    expectedDisposition: "EVIDENCE_GATING_FAILED",
    expectedEvidenceClasses: ["evidence-gating"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // External State Faults
  {
    faultId: "fault-unknown-external-write",
    faultClass: FAULT_CLASSES.UNKNOWN_EXTERNAL_WRITE,
    targetReference: "state-monitor",
    activationPoint: "during-monitoring",
    expectedDisposition: "UNKNOWN_EXTERNAL_EFFECT",
    expectedEvidenceClasses: ["state-divergence"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-runtime-divergence",
    faultClass: FAULT_CLASSES.RUNTIME_DIVERGENCE,
    targetReference: "runtime-state",
    activationPoint: "during-decision",
    expectedDisposition: "RUNTIME_DIVERGENCE_DETECTED",
    expectedEvidenceClasses: ["divergence-classification"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-workflow-divergence",
    faultClass: FAULT_CLASSES.WORKFLOW_DIVERGENCE,
    targetReference: "workflow-state",
    activationPoint: "during-decision",
    expectedDisposition: "WORKFLOW_DIVERGENCE_DETECTED",
    expectedEvidenceClasses: ["divergence-classification"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Approval and Permission Faults
  {
    faultId: "fault-approval-invalidation",
    faultClass: FAULT_CLASSES.APPROVAL_INVALIDATION,
    targetReference: "approval-cache",
    activationPoint: "before-lane-transition",
    expectedDisposition: "APPROVAL_INVALIDATED",
    expectedEvidenceClasses: ["approval-validation"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-permission-invalidation",
    faultClass: FAULT_CLASSES.PERMISSION_INVALIDATION,
    targetReference: "permission-cache",
    activationPoint: "before-lane-transition",
    expectedDisposition: "PERMISSION_INVALIDATED",
    expectedEvidenceClasses: ["permission-validation"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Memory Faults
  {
    faultId: "fault-memory-tombstone",
    faultClass: FAULT_CLASSES.MEMORY_TOMBSTONE,
    targetReference: "memory-store",
    activationPoint: "during-recovery",
    expectedDisposition: "TOMBSTONED_MEMORY_BLOCKED",
    expectedEvidenceClasses: ["memory-revalidation"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-memory-poisoning",
    faultClass: FAULT_CLASSES.MEMORY_POISONING,
    targetReference: "memory-store",
    activationPoint: "during-execution",
    expectedDisposition: "POISONED_MEMORY_BLOCKED",
    expectedEvidenceClasses: ["memory-boundary"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-context-quarantine",
    faultClass: FAULT_CLASSES.CONTEXT_QUARANTINE,
    targetReference: "context-cache",
    activationPoint: "during-execution",
    expectedDisposition: "CONTEXT_QUARANTINED",
    expectedEvidenceClasses: ["context-protection"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Council Faults
  {
    faultId: "fault-council-disagreement",
    faultClass: FAULT_CLASSES.COUNCIL_DISAGREEMENT,
    targetReference: "council-binding",
    activationPoint: "during-decision",
    expectedDisposition: "COUNCIL_DISAGREEMENT",
    expectedEvidenceClasses: ["council-binding"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Draft Faults
  {
    faultId: "fault-draft-approval-invalid",
    faultClass: FAULT_CLASSES.DRAFT_APPROVAL_INVALIDATION,
    targetReference: "draft-store",
    activationPoint: "before-lane-transition",
    expectedDisposition: "DRAFT_APPROVAL_INVALIDATED",
    expectedEvidenceClasses: ["draft-versioning"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Connector Faults
  {
    faultId: "fault-connector-account-conflict",
    faultClass: FAULT_CLASSES.CONNECTOR_ACCOUNT_CONFLICT,
    targetReference: "connector-binding",
    activationPoint: "during-execution",
    expectedDisposition: "CONNECTOR_ACCOUNT_CONFLICT",
    expectedEvidenceClasses: ["connector-isolation"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-connector-remote-uncertainty",
    faultClass: FAULT_CLASSES.CONNECTOR_REMOTE_UNCERTAINTY,
    targetReference: "connector-binding",
    activationPoint: "after-execution",
    expectedDisposition: "CONNECTOR_REMOTE_UNCERTAINTY",
    expectedEvidenceClasses: ["connector-uncertainty"],
    expectedSafetyState: { schedulerEnabled: false },
  },

  // Promotion Faults
  {
    faultId: "fault-promotion-failure",
    faultClass: FAULT_CLASSES.PROMOTION_FAILURE,
    targetReference: "promotion-lane",
    activationPoint: "during-decision",
    expectedDisposition: "PROMOTION_FAILED",
    expectedEvidenceClasses: ["promotion-failure"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-evidence-causal-cycle",
    faultClass: FAULT_CLASSES.EVIDENCE_CAUSAL_CYCLE,
    targetReference: "evidence-store",
    activationPoint: "after-completion",
    expectedDisposition: "EVIDENCE_CAUSAL_CYCLE",
    expectedEvidenceClasses: ["evidence-gating"],
    expectedSafetyState: { schedulerEnabled: false },
  },
  {
    faultId: "fault-missing-mandatory-evidence",
    faultClass: FAULT_CLASSES.MISSING_MANDATORY_EVIDENCE,
    targetReference: "evidence-store",
    activationPoint: "after-completion",
    expectedDisposition: "MANDATORY_EVIDENCE_MISSING",
    expectedEvidenceClasses: ["evidence-gating"],
    expectedSafetyState: { schedulerEnabled: false },
  },
];

/**
 * Create and return the standard fault injection registry
 */
export function createFaultInjectionRegistry(): FaultInjectionRegistry {
  const registry = new FaultInjectionRegistry();
  for (const fault of STANDARD_FAULT_INJECTIONS) {
    registry.register(fault);
  }
  return registry;
}

/**
 * Validate Fault Injection Configuration
 */
export function validateFaultInjectionConfig(config: FaultInjectionConfig): void {
  const seenIds = new Set<string>();
  for (const fault of config.faults) {
    if (seenIds.has(fault.faultId)) {
      throw new Error(`Duplicate fault ID: ${fault.faultId}`);
    }
    seenIds.add(fault.faultId);

    if (!Object.values(FAULT_CLASSES).includes(fault.faultClass as any)) {
      throw new Error(`Unknown fault class: ${fault.faultClass}`);
    }
  }
}
