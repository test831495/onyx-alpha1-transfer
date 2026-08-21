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
    expect(text).toContain("NO LIVE GITHUB WORKFLOW IS EXECUTING");
  });

  it("shows all four safety flags as unavailable", () => {
    const projection = buildRuntimeFixtures().RUNNING_ISSUE_STEP;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Merge allowed: NO");
    expect(text).toContain("Production deploy allowed: NO");
    expect(text).toContain("Force push allowed: NO");
    expect(text).toContain("Branch deletion allowed: NO");
  });

  it("shows the execution lane limit of one", () => {
    const projection = buildRuntimeFixtures().FUTURE_LANE_PROJECTION;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Lane limit: 1");
  });

  it("shows completed and pending capability progress", () => {
    const projection = buildRuntimeFixtures().RUNNING_BRANCH_STEP;
    const text = renderToText(AutomationRuntimeDashboard({ projection }));
    expect(text).toContain("Completed: CREATE_GITHUB_ISSUE");
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
});
