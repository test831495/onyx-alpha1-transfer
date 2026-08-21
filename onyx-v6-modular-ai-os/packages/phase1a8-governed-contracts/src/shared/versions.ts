import {
  WORKFLOW_CONTRACT_VERSION,
  WORKFLOW_STATES,
  EXECUTION_LANE_LIMIT,
  type WorkflowState,
} from "@onyx/phase1a5-workflow-engine";
import { RUNTIME_CONTRACT_VERSION, RUNTIME_EXECUTION_LANE_LIMIT } from "@onyx/phase1a6-workflow-runtime";

/** Phase 1A.8 binds to, and never forks, the frozen Phase 1A.5/1A.6/1A.7 contract versions. */
export const COMPATIBLE_WORKFLOW_CONTRACT_VERSION = "1.0.0" as const;
export const COMPATIBLE_RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
// apps/command-center is an app, not a workspace package, so this literal is verified by
// tests/compatibility.test.ts reading the source file directly instead of a reverse app->package import.
export const COMPATIBLE_UI_CONTRACT_VERSION = "1.0.0" as const;

if (COMPATIBLE_WORKFLOW_CONTRACT_VERSION !== WORKFLOW_CONTRACT_VERSION) {
  throw new Error("Phase 1A.8 is bound to an unsupported Phase 1A.5 workflow contract version.");
}
if (COMPATIBLE_RUNTIME_CONTRACT_VERSION !== RUNTIME_CONTRACT_VERSION) {
  throw new Error("Phase 1A.8 is bound to an unsupported Phase 1A.6 runtime contract version.");
}

export { WORKFLOW_CONTRACT_VERSION, WORKFLOW_STATES, EXECUTION_LANE_LIMIT, RUNTIME_CONTRACT_VERSION };
export type { WorkflowState };

/** Reused by reference from Phase 1A.6 (itself reused from Phase 1A.5); never redefined independently. */
export const ACTIVE_PHASE1A8_RUNTIME_LIMIT = RUNTIME_EXECUTION_LANE_LIMIT;
if (ACTIVE_PHASE1A8_RUNTIME_LIMIT !== 1) {
  throw new Error("Phase 1A.8 active runtime lane limit must remain 1.");
}

export const AGENT_COORDINATION_CONTRACT_VERSION = "1.0.0" as const;
export const APPROVAL_RISK_CONTRACT_VERSION = "1.0.0" as const;
export const AGENT_PERMISSION_CONTRACT_VERSION = "1.0.0" as const;
export const CONNECTOR_SCOPE_CONTRACT_VERSION = "1.0.0" as const;
export const BUDGET_CONTRACT_VERSION = "1.0.0" as const;
export const MEMORY_CONTRACT_VERSION = "1.0.0" as const;
export const CONTEXT_CONTRACT_VERSION = "1.0.0" as const;
export const PERSONA_PROTECTION_CONTRACT_VERSION = "1.0.0" as const;
export const COUNCIL_MODE_CONTRACT_VERSION = "1.0.0" as const;
export const SAVED_DRAFT_CONTRACT_VERSION = "1.0.0" as const;
export const AUTOMATION_CENTER_V2_CONTRACT_VERSION = "1.0.0" as const;
export const ACCESSIBILITY_GATE_CONTRACT_VERSION = "1.0.0" as const;

export const P18_ACCEPTANCE_IDS = [
  "P18-CONTRACT",
  "P18-AGENT",
  "P18-CAPABILITY",
  "P18-TASK",
  "P18-LEASE",
  "P18-HEARTBEAT",
  "P18-RECOVERY",
  "P18-DEPENDENCY",
  "P18-LOCK",
  "P18-CAS",
  "P18-EVIDENCE",
  "P18-CANCELLATION",
  "P18-JOIN",
  "P18-AGGREGATION",
  "P18-APPROVAL",
  "P18-PERMISSION",
  "P18-CONNECTOR",
  "P18-BUDGET",
  "P18-MEMORY",
  "P18-PERSONA",
  "P18-CONTEXT",
  "P18-POISONING",
  "P18-COUNCIL",
  "P18-DRAFT",
  "P18-PROMOTION",
  "P18-UX-CONTRACT",
  "P18-ACCESSIBILITY",
  "P18-SECURITY",
  "P18-SIMULATION",
] as const;
export type P18AcceptanceId = (typeof P18_ACCEPTANCE_IDS)[number];

export interface P18AcceptanceRequirement {
  id: P18AcceptanceId;
  implementationIdentifiers: string[];
  testFiles: string[];
  validationMethod: string;
  acceptanceStatus: "accepted" | "pending";
}
