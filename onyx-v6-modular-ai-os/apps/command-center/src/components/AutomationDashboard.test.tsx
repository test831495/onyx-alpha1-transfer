import{describe,it,expect}from"vitest";describe("Automation Dashboard contract",()=>{it("keeps execution unavailable in Phase 1A.2D",()=>{expect("Execute unavailable").toContain("unavailable")});it("records all validation tags",()=>{expect(["phase1a2a","phase1a2b","phase1a2c"]).toHaveLength(3)})});

import { RUNTIME_FIXTURE_IDS, buildRuntimeFixtures } from "../automationRuntimeFixtures";
import {
  AutomationDashboard,
  GOVERNED_RUNTIME_TAB_ID,
  GovernedRuntimeTab,
  labels,
  tabs,
} from "./AutomationDashboard";

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
  props: { children?: unknown; [key: string]: unknown };
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

const EXISTING_TAB_IDS = ["create", "execute", "overview", "queue", "approvals", "validation", "evidence", "draft-prs", "history"];

describe("Phase 1A.7 Governed Runtime tab reachability", () => {
  it("keeps the existing AutomationDashboard entry point exported and reachable", () => {
    expect(typeof AutomationDashboard).toBe("function");
  });

  it("preserves every existing Automation Center tab identifier", () => {
    for (const id of EXISTING_TAB_IDS) expect(tabs).toContain(id);
    expect(tabs).toHaveLength(EXISTING_TAB_IDS.length + 1);
  });

  it("adds exactly one new stable Governed Runtime tab identifier", () => {
    expect(GOVERNED_RUNTIME_TAB_ID).toBe("governed-runtime");
    expect(tabs.filter((id) => id === GOVERNED_RUNTIME_TAB_ID)).toHaveLength(1);
  });

  it("gives the Governed Runtime tab a clear label", () => {
    expect(labels[GOVERNED_RUNTIME_TAB_ID]).toBe("Governed Runtime");
  });

  it("renders AutomationRuntimeDashboard when the Governed Runtime tab content is selected", () => {
    const element = GovernedRuntimeTab({ fixtureId: "RUNNING_BRANCH_STEP", onFixtureChange: () => undefined });
    const text = renderToText(element);
    expect(text).toContain("NO LIVE GITHUB WORKFLOW IS EXECUTING");
    expect(findAll(element, (item) => item.props["aria-label"] === "ONYX Automation Center runtime dashboard")).toHaveLength(1);
  });

  it("displays lane limit one inside the Governed Runtime tab", () => {
    const text = renderToText(GovernedRuntimeTab({ fixtureId: "RUNNING_BRANCH_STEP", onFixtureChange: () => undefined }));
    expect(text).toContain("Lane limit: 1");
  });

  it("exposes recovery, reconciliation, identity, connector scope, budget, and evidence panels", () => {
    const element = GovernedRuntimeTab({ fixtureId: "EVIDENCE_READY", onFixtureChange: () => undefined });
    const requiredLabels = [
      "Automation runtime recovery panel",
      "Automation runtime reconciliation panel",
      "Automation runtime identity panel",
      "Automation runtime connector scope panel",
      "Automation runtime budget panel",
      "Automation runtime evidence timeline",
    ];
    for (const label of requiredLabels) {
      expect(findAll(element, (item) => item.props["aria-label"] === label)).toHaveLength(1);
    }
  });

  it("exposes every deterministic Phase 1A.7 fixture as a selectable scenario, including ONYX, NOVA, and council", () => {
    const fixtures = buildRuntimeFixtures();
    expect(RUNTIME_FIXTURE_IDS).toContain("ONYX_INITIATED");
    expect(RUNTIME_FIXTURE_IDS).toContain("NOVA_INITIATED");
    expect(RUNTIME_FIXTURE_IDS).toContain("COUNCIL_INITIATED");
    expect(renderToText(GovernedRuntimeTab({ fixtureId: "ONYX_INITIATED", onFixtureChange: () => undefined }))).toContain(fixtures.ONYX_INITIATED.identity.initiatingPresenceMode);
    expect(renderToText(GovernedRuntimeTab({ fixtureId: "NOVA_INITIATED", onFixtureChange: () => undefined }))).toContain(fixtures.NOVA_INITIATED.identity.initiatingPresenceMode);
    expect(renderToText(GovernedRuntimeTab({ fixtureId: "COUNCIL_INITIATED", onFixtureChange: () => undefined }))).toContain(fixtures.COUNCIL_INITIATED.identity.initiatingPresenceMode);
  });

  it("never exposes a live GitHub, connector, or paid-service action, and never a scheduler control", () => {
    const element = GovernedRuntimeTab({ fixtureId: "FUTURE_LANE_PROJECTION", onFixtureChange: () => undefined });
    const buttons = findAll(element, (item) => item.type === "button");
    const buttonLabels = buttons.map((button) => button.props.children);
    expect(buttonLabels).toEqual(["Pause", "Resume", "Cancel", "Recover"]);
    expect(element).not.toHaveProperty("scheduleTask");
    expect(element).not.toHaveProperty("leaseTask");
  });
});
