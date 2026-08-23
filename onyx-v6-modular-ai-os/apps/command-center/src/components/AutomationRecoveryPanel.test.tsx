import { describe, expect, it } from "vitest";
import { GOVERNED_REPOSITORY, buildRuntimeSnapshot, type RuntimeSnapshotInput } from "@onyx/phase1a6-workflow-runtime";
import { AutomationRecoveryPanel, buildRecoveryPanelViewModel } from "./AutomationRecoveryPanel";

function renderToText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToText).join("");
  if (typeof node === "object" && "type" in (node as Record<string, unknown>)) {
    const element = node as { type: unknown; props?: { children?: unknown } };
    if (typeof element.type === "function") {
      return renderToText((element.type as (props: unknown) => unknown)(element.props));
    }
    return renderToText(element.props?.children);
  }
  return "";
}

function baseInput(overrides: Partial<RuntimeSnapshotInput> = {}): RuntimeSnapshotInput {
  return {
    runtimeId: "p16rt-test",
    workflowId: "wf-test",
    contractVersion: "1.0.0",
    repository: GOVERNED_REPOSITORY,
    scopeHash: "scope-hash",
    approvalDigest: "approval-digest",
    currentWorkflowState: "VALIDATION_IN_PROGRESS",
    completedCapabilities: ["CREATE_GITHUB_ISSUE", "CREATE_ISOLATED_BRANCH"],
    checkpointCount: 4,
    latestCheckpointDigest: "checkpoint-4",
    evidenceCount: 2,
    latestEvidenceSequence: 2,
    recoveryAvailable: true,
    reconciliationRequired: false,
    pauseAvailable: true,
    cancelAvailable: true,
    laneLimit: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AutomationRecoveryPanel", () => {
  it("derives the last trusted checkpoint, target state, and first incomplete capability", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    const recovery = buildRecoveryPanelViewModel(snapshot, {
      scopeVerified: true,
      approvalVerified: true,
      checkpointChainVerified: true,
      repositoryVerified: true,
    });
    expect(recovery.lastTrustedCheckpointDigest).toBe("checkpoint-4");
    expect(recovery.targetState).toBe("VALIDATION_IN_PROGRESS");
    expect(recovery.firstIncompleteCapability).toBe("PUSH_ISOLATED_BRANCH");
    expect(recovery.recoveryAvailable).toBe(true);
  });

  it("rejects recovery availability when reconciliation is required, regardless of trust verification", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ currentWorkflowState: "WORKFLOW_RECONCILIATION_REQUIRED", reconciliationRequired: true, recoveryAvailable: false }));
    const recovery = buildRecoveryPanelViewModel(snapshot, {
      scopeVerified: true,
      approvalVerified: true,
      checkpointChainVerified: true,
      repositoryVerified: true,
    });
    expect(recovery.recoveryAvailable).toBe(false);
    expect(recovery.blockedReason).toContain("Reconciliation is required");
  });

  it("blocks recovery when any trust check fails verification", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    const recovery = buildRecoveryPanelViewModel(snapshot, {
      scopeVerified: true,
      approvalVerified: false,
      checkpointChainVerified: true,
      repositoryVerified: true,
    });
    expect(recovery.recoveryAvailable).toBe(false);
    expect(recovery.blockedReason).toContain("trust checks failed");
  });

  it("never performs remote repair and renders every verification result", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    const recovery = buildRecoveryPanelViewModel(snapshot, {
      scopeVerified: true,
      approvalVerified: true,
      checkpointChainVerified: true,
      repositoryVerified: true,
    });
    const text = renderToText(AutomationRecoveryPanel({ recovery }));
    expect(text).toContain("never repairs a remote resource");
    expect(text).toContain("Recovery Option Available");
    expect(text).toContain(String(recovery.checkpointCount));
  });
});
