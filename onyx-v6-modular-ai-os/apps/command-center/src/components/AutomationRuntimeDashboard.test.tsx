import { describe, expect, it } from "vitest";
import { buildRuntimeFixtures, RUNTIME_FIXTURE_IDS } from "../automationRuntimeFixtures";
import { AutomationRuntimeDashboard, buildApprovalReadOnlyProjection } from "./AutomationRuntimeDashboard";

/** Resolves a stateless function-component element tree into plain text, without a DOM. */
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

interface RenderedElement {
  type: unknown;
  props: { children?: unknown; disabled?: boolean; [key: string]: unknown };
}

function isElement(node: unknown): node is RenderedElement {
  return Boolean(node) && typeof node === "object" && "type" in (node as Record<string, unknown>) && "props" in (node as Record<string, unknown>);
}

/** Recursively finds every rendered element matching a predicate, resolving stateless function components. */
function findAll(node: unknown, predicate: (element: RenderedElement) => boolean, out: RenderedElement[] = []): RenderedElement[] {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  if (!isElement(node)) return out;
  if (predicate(node)) out.push(node);
  if (typeof node.type === "function") {
    findAll((node.type as (props: unknown) => unknown)(node.props), predicate, out);
  } else {
    findAll(node.props.children, predicate, out);
  }
  return out;
}

describe("AutomationRuntimeDashboard", () => {
  it("renders every deterministic Phase 1A.7 fixture without throwing", () => {
    const fixtures = buildRuntimeFixtures();
    for (const id of RUNTIME_FIXTURE_IDS) {
      const projection = fixtures[id];
      expect(() => renderToText(AutomationRuntimeDashboard({ projection }))).not.toThrow();
    }
  });

  it("states clearly that no live GitHub workflow is executing", () => {
    const projection = buildRuntimeFixtures().READY;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("No live GitHub workflow is executing");
  });

  it("shows all four safety flags as unavailable", () => {
    const projection = buildRuntimeFixtures().RUNNING_ISSUE_STEP;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Merge allowed: No");
    expect(text).toContain("Production deploy allowed: No");
    expect(text).toContain("Force push allowed: No");
    expect(text).toContain("Branch deletion allowed: No");
  });

  it("shows the execution lane limit of one", () => {
    const projection = buildRuntimeFixtures().FUTURE_LANE_PROJECTION;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Lane limit: 1");
  });

  it("shows completed and pending capability progress", () => {
    const projection = buildRuntimeFixtures().RUNNING_BRANCH_STEP;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Completed: Create GitHub Work Item");
    expect(text).toContain("Pending:");
  });

  it("shows checkpoint and evidence counts", () => {
    const projection = buildRuntimeFixtures().EVIDENCE_READY;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain(String(projection.checkpointCount));
    expect(text).toContain(String(projection.evidenceCount));
  });

  it("only enables pause, resume, cancel, and recover when both available and wired", () => {
    const projection = buildRuntimeFixtures().PAUSED;
    const withHandlers = AutomationRuntimeDashboard({
      projection,
      onPause: () => undefined,
      onResume: () => undefined,
      onCancel: () => undefined,
      onRecover: () => undefined,
    });
    const buttons = findAll(withHandlers, (element) => element.type === "button");
    const resumeButton = buttons.find((button) => button.props.children === "Resume");
    const pauseButton = buttons.find((button) => button.props.children === "Pause");
    expect(resumeButton?.props.disabled).toBe(false);
    expect(pauseButton?.props.disabled).toBe(true);
  });

  it("reuses the Phase 1A.5 approval package fields read-only, without submission", () => {
    const approval = buildApprovalReadOnlyProjection({
      approver: "Rahul Kumar",
      scopeHash: "scope-hash",
      orderedCapabilities: ["CREATE_GITHUB_ISSUE", "CREATE_ISOLATED_BRANCH"],
      digest: "approval-digest",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:15:00.000Z",
      consumed: false,
    });
    expect(approval.orderedCapabilityCount).toBe(2);
    const projection = buildRuntimeFixtures().READY;
    const text = renderToText(AutomationRuntimeDashboard({ projection, approval }));
    expect(text).toContain("READ-ONLY, NO SUBMISSION");
    expect(text).toContain("Consumed: NO");
  });

  it("exposes identity, connector scope, and budget panels by stable aria-label", () => {
    const projection = buildRuntimeFixtures().CONNECTOR_ISOLATED_PROJECTION;
    const element = AutomationRuntimeDashboard({ projection });
    const labels = [
      "Automation runtime identity panel",
      "Automation runtime connector scope panel",
      "Automation runtime budget panel",
      "Automation runtime reconciliation panel",
    ];
    for (const label of labels) {
      expect(findAll(element, (item) => item.props["aria-label"] === label)).toHaveLength(1);
    }
  });

  it("exposes recovery content only when a recovery view model is supplied", () => {
    const projection = buildRuntimeFixtures().RUNNING_BRANCH_STEP;
    const withoutRecovery = AutomationRuntimeDashboard({ projection });
    expect(findAll(withoutRecovery, (item) => item.props["aria-label"] === "Automation runtime recovery panel")).toHaveLength(0);

    const recovery = {
      lastTrustedCheckpointDigest: projection.latestCheckpointDigest,
      checkpointCount: projection.checkpointCount,
      targetState: projection.currentState,
      firstIncompleteCapability: projection.pendingCapabilities[0] ?? null,
      recoveryAvailable: projection.recoveryAvailable,
      blockedReason: null,
      scopeVerified: true,
      approvalVerified: true,
      checkpointChainVerified: true,
      repositoryVerified: true,
    };
    const withRecovery = AutomationRuntimeDashboard({ projection, recovery });
    expect(findAll(withRecovery, (item) => item.props["aria-label"] === "Automation runtime recovery panel")).toHaveLength(1);
  });

  it("exposes an evidence timeline only when evidence entries are supplied", () => {
    const projection = buildRuntimeFixtures().EVIDENCE_READY;
    const withoutEvidence = AutomationRuntimeDashboard({ projection });
    expect(findAll(withoutEvidence, (item) => item.props["aria-label"] === "Automation runtime evidence timeline")).toHaveLength(0);

    const evidenceEntries = [
      {
        sequence: projection.latestEvidenceSequence ?? 1,
        stateTransition: projection.currentState,
        stepId: projection.currentCapability ?? "GENERATE_EVIDENCE",
        providerClassification: "DETERMINISTIC_SUCCESS",
        resourceReferences: [],
        checkpointDigest: projection.latestCheckpointDigest ?? "",
        redactedDetail: "Deterministic local-simulation evidence summary.",
        timestamp: projection.updatedAt,
      },
    ];
    const withEvidence = AutomationRuntimeDashboard({ projection, evidenceEntries });
    expect(findAll(withEvidence, (item) => item.props["aria-label"] === "Automation runtime evidence timeline")).toHaveLength(1);
  });

  it("renders distinct ONYX, NOVA, and ONYX_NOVA_COUNCIL presence-mode fixtures", () => {
    const fixtures = buildRuntimeFixtures();
    expect(renderToText(AutomationRuntimeDashboard({ projection: fixtures.ONYX_INITIATED }))).toContain("ONYX");
    expect(renderToText(AutomationRuntimeDashboard({ projection: fixtures.NOVA_INITIATED }))).toContain("NOVA");
    expect(renderToText(AutomationRuntimeDashboard({ projection: fixtures.COUNCIL_INITIATED }))).toContain("ONYX_NOVA_COUNCIL");
  });

  it("exposes no live GitHub, connector, or paid-service action and no scheduler control", () => {
    const projection = buildRuntimeFixtures().FUTURE_LANE_PROJECTION;
    const element = AutomationRuntimeDashboard({ projection }) as unknown as Record<string, unknown>;
    expect(element).not.toHaveProperty("scheduleTask");
    expect(element).not.toHaveProperty("leaseTask");
    const buttons = findAll(element, (item) => item.type === "button");
    const buttonLabels = buttons.map((button) => button.props.children);
    expect(buttonLabels).toEqual(["Pause", "Resume", "Cancel", "Recover"]);
  });
});
