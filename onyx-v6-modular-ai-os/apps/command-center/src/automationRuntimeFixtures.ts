import {
  CAPABILITIES,
  GOVERNED_REPOSITORY,
  RUNTIME_CONTRACT_VERSION,
  RUNTIME_EXECUTION_LANE_LIMIT,
  buildRuntimeSnapshot,
  type Capability,
  type RuntimeSnapshotInput,
  type WorkflowState,
} from "@onyx/phase1a6-workflow-runtime";
import { buildAutomationRuntimeProjection, type AutomationRuntimeProjection } from "./automationRuntimeProjection";
import type { ConnectorScopeProjection, RuntimeBudgetProjection, RuntimeIdentityProjection } from "./automationRuntimeContracts";

/** Fixed clock used by every fixture. Fixtures never read the current clock. */
const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const FIXED_TIMESTAMP = FIXED_NOW.toISOString();

export const RUNTIME_FIXTURE_IDS = [
  "WORKFLOW_CREATED",
  "WAITING_FOR_APPROVAL",
  "READY",
  "RUNNING_ISSUE_STEP",
  "RUNNING_BRANCH_STEP",
  "RUNNING_PUSH_STEP",
  "VALIDATION_RUNNING",
  "EVIDENCE_READY",
  "DRAFT_PR_COMPLETED",
  "PAUSED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "ROLLBACK_REQUIRED",
  "COMPLETED",
  "CANCELLED",
  "ONYX_INITIATED",
  "NOVA_INITIATED",
  "COUNCIL_INITIATED",
  "UNASSIGNED_AGENT",
  "FUTURE_LANE_PROJECTION",
  "CONNECTOR_ISOLATED_PROJECTION",
  "BUDGET_PROJECTION",
] as const;
export type RuntimeFixtureId = (typeof RUNTIME_FIXTURE_IDS)[number];

const FIXTURE_WORKFLOW_ID = "wf-p17-fixture-0000000000000000";
const FIXTURE_SCOPE_HASH = "p17-fixture-scope-hash";
const FIXTURE_APPROVAL_DIGEST = "p17-fixture-approval-digest";

function makeRuntimeId(suffix: string): string {
  return `p16rt-fixture-${suffix}`;
}

function makeIdentity(overrides: Partial<RuntimeIdentityProjection> = {}): RuntimeIdentityProjection {
  return {
    runtimeId: makeRuntimeId("default"),
    runtimeSessionId: "p16sess-fixture-default",
    workflowId: FIXTURE_WORKFLOW_ID,
    supervisingUserId: "Rahul Kumar",
    initiatingPresenceMode: "SYSTEM",
    laneCount: 1,
    promotionLaneActive: false,
    ...overrides,
  };
}

interface SnapshotScenario {
  state: WorkflowState;
  completed: Capability[];
  checkpointCount: number;
  latestCheckpointDigest: string | null;
  evidenceCount: number;
  latestEvidenceSequence: number | null;
  recoveryAvailable: boolean;
  reconciliationRequired: boolean;
  pauseAvailable: boolean;
  cancelAvailable: boolean;
}

function buildScenarioSnapshot(runtimeSuffix: string, scenario: SnapshotScenario) {
  const input: RuntimeSnapshotInput = {
    runtimeId: makeRuntimeId(runtimeSuffix),
    workflowId: FIXTURE_WORKFLOW_ID,
    contractVersion: RUNTIME_CONTRACT_VERSION,
    repository: GOVERNED_REPOSITORY,
    scopeHash: FIXTURE_SCOPE_HASH,
    approvalDigest: FIXTURE_APPROVAL_DIGEST,
    currentWorkflowState: scenario.state,
    completedCapabilities: scenario.completed,
    checkpointCount: scenario.checkpointCount,
    latestCheckpointDigest: scenario.latestCheckpointDigest,
    evidenceCount: scenario.evidenceCount,
    latestEvidenceSequence: scenario.latestEvidenceSequence,
    recoveryAvailable: scenario.recoveryAvailable,
    reconciliationRequired: scenario.reconciliationRequired,
    pauseAvailable: scenario.pauseAvailable,
    cancelAvailable: scenario.cancelAvailable,
    laneLimit: RUNTIME_EXECUTION_LANE_LIMIT,
    updatedAt: FIXED_TIMESTAMP,
  };
  return buildRuntimeSnapshot(input);
}

const [issue, branch, push, validation, evidence] = CAPABILITIES;

const SCENARIOS: Record<RuntimeFixtureId, SnapshotScenario> = {
  WORKFLOW_CREATED: {
    state: "WORKFLOW_CREATED",
    completed: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  WAITING_FOR_APPROVAL: {
    state: "AWAITING_WORKFLOW_APPROVAL",
    completed: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  READY: {
    state: "WORKFLOW_APPROVED",
    completed: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: true,
  },
  RUNNING_ISSUE_STEP: {
    state: "ISSUE_STEP_IN_PROGRESS",
    completed: [],
    checkpointCount: 1,
    latestCheckpointDigest: "p17-fixture-checkpoint-1",
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  RUNNING_BRANCH_STEP: {
    state: "BRANCH_STEP_IN_PROGRESS",
    completed: [issue],
    checkpointCount: 2,
    latestCheckpointDigest: "p17-fixture-checkpoint-2",
    evidenceCount: 1,
    latestEvidenceSequence: 1,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  RUNNING_PUSH_STEP: {
    state: "PUSH_STEP_IN_PROGRESS",
    completed: [issue, branch],
    checkpointCount: 4,
    latestCheckpointDigest: "p17-fixture-checkpoint-4",
    evidenceCount: 2,
    latestEvidenceSequence: 2,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  VALIDATION_RUNNING: {
    state: "VALIDATION_IN_PROGRESS",
    completed: [issue, branch, push],
    checkpointCount: 6,
    latestCheckpointDigest: "p17-fixture-checkpoint-6",
    evidenceCount: 3,
    latestEvidenceSequence: 3,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  EVIDENCE_READY: {
    state: "EVIDENCE_READY",
    completed: [issue, branch, push, validation],
    checkpointCount: 8,
    latestCheckpointDigest: "p17-fixture-checkpoint-8",
    evidenceCount: 4,
    latestEvidenceSequence: 4,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  DRAFT_PR_COMPLETED: {
    state: "DRAFT_PR_STEP_COMPLETED",
    completed: [issue, branch, push, validation, evidence],
    checkpointCount: 10,
    latestCheckpointDigest: "p17-fixture-checkpoint-10",
    evidenceCount: 5,
    latestEvidenceSequence: 5,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  PAUSED: {
    state: "WORKFLOW_PAUSED",
    completed: [issue, branch, push, validation, evidence],
    checkpointCount: 10,
    latestCheckpointDigest: "p17-fixture-checkpoint-10",
    evidenceCount: 5,
    latestEvidenceSequence: 5,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: true,
  },
  FAILED_SAFE: {
    state: "WORKFLOW_FAILED_SAFE",
    completed: [issue],
    checkpointCount: 3,
    latestCheckpointDigest: "p17-fixture-checkpoint-3-failed",
    evidenceCount: 2,
    latestEvidenceSequence: 2,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  RECONCILIATION_REQUIRED: {
    state: "WORKFLOW_RECONCILIATION_REQUIRED",
    completed: [issue, branch],
    checkpointCount: 3,
    latestCheckpointDigest: "p17-fixture-checkpoint-3-uncertain",
    evidenceCount: 3,
    latestEvidenceSequence: 3,
    recoveryAvailable: false,
    reconciliationRequired: true,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  ROLLBACK_REQUIRED: {
    state: "WORKFLOW_ROLLBACK_REQUIRED",
    completed: [issue],
    checkpointCount: 3,
    latestCheckpointDigest: "p17-fixture-checkpoint-3-rollback",
    evidenceCount: 2,
    latestEvidenceSequence: 2,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  COMPLETED: {
    state: "WORKFLOW_COMPLETED",
    completed: [...CAPABILITIES],
    checkpointCount: 12,
    latestCheckpointDigest: "p17-fixture-checkpoint-12",
    evidenceCount: 6,
    latestEvidenceSequence: 6,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  CANCELLED: {
    state: "WORKFLOW_CANCELLED",
    completed: [issue],
    checkpointCount: 2,
    latestCheckpointDigest: "p17-fixture-checkpoint-2-cancelled",
    evidenceCount: 1,
    latestEvidenceSequence: 1,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: false,
  },
  ONYX_INITIATED: {
    state: "ISSUE_STEP_IN_PROGRESS",
    completed: [],
    checkpointCount: 1,
    latestCheckpointDigest: "p17-fixture-checkpoint-onyx",
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  NOVA_INITIATED: {
    state: "ISSUE_STEP_IN_PROGRESS",
    completed: [],
    checkpointCount: 1,
    latestCheckpointDigest: "p17-fixture-checkpoint-nova",
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  COUNCIL_INITIATED: {
    state: "BRANCH_STEP_IN_PROGRESS",
    completed: [issue],
    checkpointCount: 2,
    latestCheckpointDigest: "p17-fixture-checkpoint-council",
    evidenceCount: 1,
    latestEvidenceSequence: 1,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  UNASSIGNED_AGENT: {
    state: "WORKFLOW_APPROVED",
    completed: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: true,
  },
  FUTURE_LANE_PROJECTION: {
    state: "VALIDATION_IN_PROGRESS",
    completed: [issue, branch, push],
    checkpointCount: 6,
    latestCheckpointDigest: "p17-fixture-checkpoint-future-lane",
    evidenceCount: 3,
    latestEvidenceSequence: 3,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  CONNECTOR_ISOLATED_PROJECTION: {
    state: "PUSH_STEP_IN_PROGRESS",
    completed: [issue, branch],
    checkpointCount: 4,
    latestCheckpointDigest: "p17-fixture-checkpoint-connector",
    evidenceCount: 2,
    latestEvidenceSequence: 2,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
  BUDGET_PROJECTION: {
    state: "VALIDATION_IN_PROGRESS",
    completed: [issue, branch, push],
    checkpointCount: 6,
    latestCheckpointDigest: "p17-fixture-checkpoint-budget",
    evidenceCount: 3,
    latestEvidenceSequence: 3,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
  },
};

const ISOLATED_CONNECTORS: readonly ConnectorScopeProjection[] = [
  {
    connectorProvider: "Outlook",
    connectorAccountId: "outlook-work-account",
    connectorAccountLabel: "Work Outlook",
    connectorScope: "mail.metadata.read",
    permissionMode: "READ_ONLY",
    readOnly: true,
    actionApprovalRequired: true,
  },
  {
    connectorProvider: "Outlook",
    connectorAccountId: "outlook-personal-account",
    connectorAccountLabel: "Personal Outlook",
    connectorScope: "mail.metadata.read",
    permissionMode: "READ_ONLY",
    readOnly: true,
    actionApprovalRequired: true,
  },
  {
    connectorProvider: "Gmail",
    connectorAccountId: "gmail-primary-account",
    connectorAccountLabel: "Primary Gmail",
    connectorScope: "mail.metadata.read",
    permissionMode: "ACTION_APPROVAL_REQUIRED",
    readOnly: false,
    actionApprovalRequired: true,
  },
];

const FULL_BUDGET_PROJECTION: RuntimeBudgetProjection = {
  tokenBudget: 200000,
  tokensUsed: 48213,
  estimatedCost: 1.42,
  currency: "USD",
  modelRoutingClass: "provider-neutral-standard",
  cacheHitRate: 0.37,
  contextTier: "standard",
  budgetStatus: "UNDER_BUDGET",
};

/** Builds every deterministic Phase 1A.7 fixture. Never reads the current clock. */
export function buildRuntimeFixtures(): Record<RuntimeFixtureId, AutomationRuntimeProjection> {
  const fixtures = {} as Record<RuntimeFixtureId, AutomationRuntimeProjection>;

  for (const id of RUNTIME_FIXTURE_IDS) {
    const scenario = SCENARIOS[id];
    const snapshot = buildScenarioSnapshot(id, scenario);

    let identity = makeIdentity({ runtimeId: snapshot.runtimeId, runtimeSessionId: `p16sess-fixture-${id}` });
    let connectors: readonly ConnectorScopeProjection[] = [];
    let budget: RuntimeBudgetProjection = {};

    if (id === "ONYX_INITIATED") {
      identity = makeIdentity({
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: `p16sess-fixture-${id}`,
        initiatingCharacterId: "onyx",
        initiatingPresenceMode: "ONYX",
        activeAgentId: "onyx-agent-primary",
        assignedAgentIds: ["onyx-agent-primary"],
        activeLaneId: "lane-standard-1",
      });
    } else if (id === "NOVA_INITIATED") {
      identity = makeIdentity({
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: `p16sess-fixture-${id}`,
        initiatingCharacterId: "nova",
        initiatingPresenceMode: "NOVA",
        activeAgentId: "nova-agent-primary",
        assignedAgentIds: ["nova-agent-primary"],
        activeLaneId: "lane-standard-1",
      });
    } else if (id === "COUNCIL_INITIATED") {
      identity = makeIdentity({
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: `p16sess-fixture-${id}`,
        initiatingCharacterId: "onyx-nova-council",
        initiatingPresenceMode: "ONYX_NOVA_COUNCIL",
        activeAgentId: "onyx-agent-primary",
        assignedAgentIds: ["onyx-agent-primary", "nova-agent-primary"],
        activeLaneId: "lane-standard-1",
        sharedTaskReferences: [
          { taskId: "task-council-briefing", permissionGranted: true, redactedSummary: "Shared briefing task (redacted)." },
          { taskId: "task-private-note", permissionGranted: false, redactedSummary: "Should never be displayed." },
        ],
      });
    } else if (id === "UNASSIGNED_AGENT") {
      identity = makeIdentity({
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: `p16sess-fixture-${id}`,
        initiatingPresenceMode: "UNASSIGNED",
        assignedAgentIds: [],
      });
    } else if (id === "FUTURE_LANE_PROJECTION") {
      identity = makeIdentity({
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: `p16sess-fixture-${id}`,
        initiatingPresenceMode: "SYSTEM",
        activeAgentId: "onyx-agent-primary",
        assignedAgentIds: ["onyx-agent-primary", "nova-agent-primary"],
        activeLaneId: "lane-standard-1",
        laneCount: 4,
        promotionLaneActive: true,
      });
    } else if (id === "CONNECTOR_ISOLATED_PROJECTION") {
      connectors = ISOLATED_CONNECTORS;
    } else if (id === "BUDGET_PROJECTION") {
      budget = FULL_BUDGET_PROJECTION;
    }

    fixtures[id] = buildAutomationRuntimeProjection({
      snapshot,
      identity,
      connectors,
      budget,
      modelRoutingClass: budget.modelRoutingClass,
    });
  }

  return fixtures;
}
