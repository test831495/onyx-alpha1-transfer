import { describe, expect, it } from "vitest";
import { GOVERNED_REPOSITORY, buildRuntimeSnapshot, type RuntimeSnapshotInput } from "@onyx/phase1a6-workflow-runtime";
import {
  AUTOMATION_RUNTIME_UI_CONTRACT_VERSION,
  P17_ACCEPTANCE_IDS,
  PARALLEL_SAFE_OPERATIONS,
  PRESENCE_MODES,
  SEQUENTIAL_ONLY_OPERATIONS,
} from "./automationRuntimeContracts";
import { buildAutomationRuntimeProjection, redactSharedTaskReferences } from "./automationRuntimeProjection";
import { buildRuntimeFixtures, RUNTIME_FIXTURE_IDS } from "./automationRuntimeFixtures";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

function baseSnapshotInput(overrides: Partial<RuntimeSnapshotInput> = {}): RuntimeSnapshotInput {
  return {
    runtimeId: "p16rt-test",
    workflowId: "wf-test",
    contractVersion: "1.0.0",
    repository: GOVERNED_REPOSITORY,
    scopeHash: "scope-hash",
    approvalDigest: "approval-digest",
    currentWorkflowState: "WORKFLOW_APPROVED",
    completedCapabilities: [],
    checkpointCount: 0,
    latestCheckpointDigest: null,
    evidenceCount: 0,
    latestEvidenceSequence: null,
    recoveryAvailable: false,
    reconciliationRequired: false,
    pauseAvailable: false,
    cancelAvailable: true,
    laneLimit: 1,
    updatedAt: FIXED_NOW.toISOString(),
    ...overrides,
  };
}

describe("Phase 1A.7 UI contract", () => {
  it("pins the exact contract version identifiers", () => {
    expect(AUTOMATION_RUNTIME_UI_CONTRACT_VERSION).toBe("1.0.0");
    expect(P17_ACCEPTANCE_IDS).toContain("P17-CONTRACT");
    expect(P17_ACCEPTANCE_IDS).toHaveLength(13);
  });

  it("declares parallel-safe and sequential-only operation classifications", () => {
    expect(PARALLEL_SAFE_OPERATIONS).toContain("dashboard reads");
    expect(SEQUENTIAL_ONLY_OPERATIONS).toContain("runtime mutation");
    expect(new Set(PARALLEL_SAFE_OPERATIONS).size).toBe(PARALLEL_SAFE_OPERATIONS.length);
  });

  it("declares every allowed presence mode", () => {
    expect(PRESENCE_MODES).toEqual(["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"]);
  });
});

describe("Phase 1A.7 runtime projection", () => {
  it("reuses the Phase 1A.6 RuntimeSnapshot fields without redefining workflow state or status", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const projection = buildAutomationRuntimeProjection({
      snapshot,
      identity: {
        runtimeId: snapshot.runtimeId,
        runtimeSessionId: "p16sess-test",
        workflowId: snapshot.workflowId,
        supervisingUserId: "Rahul Kumar",
        initiatingPresenceMode: "SYSTEM",
        laneCount: 1,
        promotionLaneActive: false,
      },
    });

    expect(projection.currentState).toBe(snapshot.currentWorkflowState);
    expect(projection.runtimeStatus).toBe(snapshot.currentStatus);
    expect(projection.repository).toBe(GOVERNED_REPOSITORY);
    expect(projection.mergeAllowed).toBe(false);
    expect(projection.productionDeployAllowed).toBe(false);
    expect(projection.forcePushAllowed).toBe(false);
    expect(projection.branchDeletionAllowed).toBe(false);
    expect(projection.noLiveWorkflowExecuting).toBe(true);
    expect(projection.executionLaneLimit).toBe(1);
  });

  it("is deterministic and immutable", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const identity = {
      runtimeId: snapshot.runtimeId,
      runtimeSessionId: "p16sess-test",
      workflowId: snapshot.workflowId,
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "SYSTEM" as const,
      laneCount: 1,
      promotionLaneActive: false,
    };
    const first = buildAutomationRuntimeProjection({ snapshot, identity });
    const second = buildAutomationRuntimeProjection({ snapshot, identity });
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => {
      (first as { currentState: string }).currentState = "WORKFLOW_CANCELLED";
    }).toThrow();
  });

  it("derives resumeAvailable only from a paused runtime status", () => {
    const pausedSnapshot = buildRuntimeSnapshot(baseSnapshotInput({ currentWorkflowState: "WORKFLOW_PAUSED", pauseAvailable: false }));
    const readySnapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const identity = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "SYSTEM" as const,
      laneCount: 1,
      promotionLaneActive: false,
    };
    expect(buildAutomationRuntimeProjection({ snapshot: pausedSnapshot, identity }).resumeAvailable).toBe(true);
    expect(buildAutomationRuntimeProjection({ snapshot: readySnapshot, identity }).resumeAvailable).toBe(false);
  });

  it("rejects an unsupported presence mode", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    expect(() =>
      buildAutomationRuntimeProjection({
        snapshot,
        identity: {
          runtimeId: "p16rt-test",
          runtimeSessionId: "p16sess-test",
          workflowId: "wf-test",
          supervisingUserId: "Rahul Kumar",
          initiatingPresenceMode: "UNKNOWN_MODE" as never,
          laneCount: 1,
          promotionLaneActive: false,
        },
      }),
    ).toThrow();
  });

  it("grants no authority from character, agent, or lane identity fields", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const projection = buildAutomationRuntimeProjection({
      snapshot,
      identity: {
        runtimeId: "p16rt-test",
        runtimeSessionId: "p16sess-test",
        workflowId: "wf-test",
        supervisingUserId: "Rahul Kumar",
        initiatingCharacterId: "onyx",
        initiatingPresenceMode: "ONYX",
        activeAgentId: "onyx-agent-primary",
        laneCount: 1,
        promotionLaneActive: false,
      },
    });
    const identityKeys = Object.keys(projection.identity);
    expect(identityKeys).not.toContain("approvalGranted");
    expect(identityKeys).not.toContain("authorityLevel");
    expect(projection).not.toHaveProperty("identity.approvalGranted");
  });

  it("redacts every shared-task reference lacking an explicit permission grant", () => {
    const redacted = redactSharedTaskReferences([
      { taskId: "task-a", permissionGranted: true, redactedSummary: "ok" },
      { taskId: "task-b", permissionGranted: false, redactedSummary: "should be dropped" },
    ]);
    expect(redacted).toHaveLength(1);
    expect(redacted[0]?.taskId).toBe("task-a");
  });

  it("never projects character-private or personality-memory content", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const projection = buildAutomationRuntimeProjection({
      snapshot,
      identity: {
        runtimeId: "p16rt-test",
        runtimeSessionId: "p16sess-test",
        workflowId: "wf-test",
        supervisingUserId: "Rahul Kumar",
        initiatingPresenceMode: "ONYX_NOVA_COUNCIL",
        laneCount: 1,
        promotionLaneActive: false,
        sharedTaskReferences: [{ taskId: "task-private", permissionGranted: false, redactedSummary: "private memory content" }],
      },
    });
    expect(projection.identity.sharedTaskReferences).toEqual([]);
  });

  it("keeps connector-account identities isolated and rejects merged duplicates", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const identity = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "SYSTEM" as const,
      laneCount: 1,
      promotionLaneActive: false,
    };
    expect(() =>
      buildAutomationRuntimeProjection({
        snapshot,
        identity,
        connectors: [
          { connectorProvider: "Outlook", connectorAccountId: "a1", connectorAccountLabel: "A", connectorScope: "x", permissionMode: "READ_ONLY", readOnly: true, actionApprovalRequired: true },
          { connectorProvider: "Outlook", connectorAccountId: "a1", connectorAccountLabel: "A duplicate", connectorScope: "x", permissionMode: "READ_ONLY", readOnly: true, actionApprovalRequired: true },
        ],
      }),
    ).toThrow();
  });

  it("rejects an unsupported connector provider", () => {
    const snapshot = buildRuntimeSnapshot(baseSnapshotInput());
    const identity = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "SYSTEM" as const,
      laneCount: 1,
      promotionLaneActive: false,
    };
    expect(() =>
      buildAutomationRuntimeProjection({
        snapshot,
        identity,
        connectors: [
          { connectorProvider: "Dropbox" as never, connectorAccountId: "a1", connectorAccountLabel: "A", connectorScope: "x", permissionMode: "READ_ONLY", readOnly: true, actionApprovalRequired: true },
        ],
      }),
    ).toThrow();
  });

  it("keeps execution lane limit at one for every fixture", () => {
    const fixtures = buildRuntimeFixtures();
    for (const id of RUNTIME_FIXTURE_IDS) {
      expect(fixtures[id].executionLaneLimit).toBe(1);
    }
  });
});

describe("Phase 1A.7 deterministic fixtures", () => {
  it("renders every required fixture without throwing and without using the current clock", () => {
    const fixtures = buildRuntimeFixtures();
    expect(Object.keys(fixtures).sort()).toEqual([...RUNTIME_FIXTURE_IDS].sort());
    for (const id of RUNTIME_FIXTURE_IDS) {
      expect(fixtures[id].updatedAt).toBe("2026-01-01T00:00:00.000Z");
    }
  });

  it("keeps future agent and lane fields optional and additive", () => {
    const fixtures = buildRuntimeFixtures();
    expect(fixtures.FUTURE_LANE_PROJECTION.identity.laneCount).toBe(4);
    expect(fixtures.FUTURE_LANE_PROJECTION.executionLaneLimit).toBe(1);
    expect(fixtures.UNASSIGNED_AGENT.identity.activeAgentId).toBeUndefined();
  });

  it("does not assume a single permanent agent owner", () => {
    const fixtures = buildRuntimeFixtures();
    expect(fixtures.COUNCIL_INITIATED.identity.assignedAgentIds).toEqual(["onyx-agent-primary", "nova-agent-primary"]);
  });

  it("projects isolated connector accounts without merging identities", () => {
    const fixtures = buildRuntimeFixtures();
    const connectors = fixtures.CONNECTOR_ISOLATED_PROJECTION.connectors;
    expect(connectors).toHaveLength(3);
    const accountIds = connectors.map((connector) => `${connector.connectorProvider}:${connector.connectorAccountId}`);
    expect(new Set(accountIds).size).toBe(connectors.length);
  });

  it("projects deterministic mock-only budget values", () => {
    const fixtures = buildRuntimeFixtures();
    expect(fixtures.BUDGET_PROJECTION.budget.budgetStatus).toBe("UNDER_BUDGET");
    expect(fixtures.BUDGET_PROJECTION.budget.tokenBudget).toBe(200000);
  });

  it("marks reconciliation as never permitting automatic retry", () => {
    const fixtures = buildRuntimeFixtures();
    expect(fixtures.RECONCILIATION_REQUIRED.reconciliationRequired).toBe(true);
    expect(fixtures.RECONCILIATION_REQUIRED.recoveryAvailable).toBe(false);
  });

  it("preserves the 32-state contract by reusing WorkflowState values verbatim", () => {
    const fixtures = buildRuntimeFixtures();
    expect(fixtures.WORKFLOW_CREATED.currentState).toBe("WORKFLOW_CREATED");
    expect(fixtures.COMPLETED.currentState).toBe("WORKFLOW_COMPLETED");
    expect(fixtures.CANCELLED.currentState).toBe("WORKFLOW_CANCELLED");
  });
});
