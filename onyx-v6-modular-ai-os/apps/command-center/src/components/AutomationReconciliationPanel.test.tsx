import { describe, expect, it } from "vitest";
import type { ReconciliationHandoff } from "@onyx/phase1a6-workflow-runtime";
import { AutomationReconciliationPanel } from "./AutomationReconciliationPanel";

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

const HANDOFF: ReconciliationHandoff = {
  workflowId: "wf-test",
  runtimeId: "p16rt-test",
  repository: "test831495/onyx-alpha1-transfer",
  currentState: "WORKFLOW_RECONCILIATION_REQUIRED",
  currentStep: "PUSH_ISOLATED_BRANCH",
  lastTrustedCheckpoint: "checkpoint-3",
  uncertainOperation: { capability: "PUSH_ISOLATED_BRANCH", idempotencyKey: "wf-test:PUSH_ISOLATED_BRANCH:hash", detail: "uncertain remote outcome" },
  idempotencyKey: "wf-test:PUSH_ISOLATED_BRANCH:hash",
  resourceReferences: ["push-resource"],
  evidenceReferences: ["checkpoint-3"],
  recommendedReadOnlyReconciliationChecks: ["Confirm whether PUSH_ISOLATED_BRANCH actually completed on the remote provider."],
  automaticRetryPermitted: false,
  remoteDeletionPermitted: false,
  forcePushPermitted: false,
  mergePermitted: false,
  productionPermitted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("AutomationReconciliationPanel", () => {
  it("shows a read-only empty state when no uncertain operation exists", () => {
    const text = renderToText(AutomationReconciliationPanel({ handoff: null }));
    expect(text).toContain("No uncertain operation currently requires reconciliation.");
  });

  it("displays the uncertain operation, state, capability, and idempotency key", () => {
    const text = renderToText(AutomationReconciliationPanel({ handoff: HANDOFF }));
    expect(text).toContain("Workflow Reconciliation Required");
    expect(text).toContain("PUSH_ISOLATED_BRANCH");
    expect(text).toContain("wf-test:PUSH_ISOLATED_BRANCH:hash");
  });

  it("displays resource references, evidence references, and recommended read-only checks", () => {
    const text = renderToText(AutomationReconciliationPanel({ handoff: HANDOFF }));
    expect(text).toContain("push-resource");
    expect(text).toContain("checkpoint-3");
    expect(text).toContain("Confirm whether PUSH_ISOLATED_BRANCH actually completed on the remote provider.");
  });

  it("proves every mutation permission is false", () => {
    expect(HANDOFF.automaticRetryPermitted).toBe(false);
    expect(HANDOFF.remoteDeletionPermitted).toBe(false);
    expect(HANDOFF.forcePushPermitted).toBe(false);
    expect(HANDOFF.mergePermitted).toBe(false);
    expect(HANDOFF.productionPermitted).toBe(false);
    const text = renderToText(AutomationReconciliationPanel({ handoff: HANDOFF }));
    expect(text).toContain("Automatic retry, remote deletion, force push, merge, and production action are all unavailable");
  });
});
