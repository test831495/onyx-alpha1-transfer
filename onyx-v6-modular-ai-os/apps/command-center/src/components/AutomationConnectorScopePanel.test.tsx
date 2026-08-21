import { describe, expect, it } from "vitest";
import type { ConnectorScopeProjection } from "../automationRuntimeContracts";
import { AutomationConnectorScopePanel } from "./AutomationConnectorScopePanel";

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

const CONNECTORS: ConnectorScopeProjection[] = [
  { connectorProvider: "Outlook", connectorAccountId: "outlook-a", connectorAccountLabel: "Work Outlook", connectorScope: "mail.metadata.read", permissionMode: "READ_ONLY", readOnly: true, actionApprovalRequired: true },
  { connectorProvider: "Gmail", connectorAccountId: "gmail-a", connectorAccountLabel: "Primary Gmail", connectorScope: "mail.metadata.read", permissionMode: "ACTION_APPROVAL_REQUIRED", readOnly: false, actionApprovalRequired: true },
];

describe("AutomationConnectorScopePanel", () => {
  it("shows connector provider, account, scope, and permission mode metadata only", () => {
    const text = renderToText(AutomationConnectorScopePanel({ connectors: CONNECTORS }));
    expect(text).toContain("Outlook");
    expect(text).toContain("Work Outlook");
    expect(text).toContain("mail.metadata.read");
    expect(text).toContain("READ_ONLY");
    expect(text).toContain("Gmail");
  });

  it("states that connector content is never read, no action is executed, and no credential is stored", () => {
    const text = renderToText(AutomationConnectorScopePanel({ connectors: CONNECTORS }));
    expect(text).toContain("Connector content is never read here");
    expect(text).toContain("no connector action is executed");
    expect(text).toContain("no connector credential is");
    expect(text).toContain("stored");
  });

  it("keeps every connector account isolated by provider and account identifier", () => {
    const text = renderToText(AutomationConnectorScopePanel({ connectors: CONNECTORS }));
    expect(text).toContain("outlook-a");
    expect(text).toContain("gmail-a");
    const accountKeys = CONNECTORS.map((connector) => `${connector.connectorProvider}:${connector.connectorAccountId}`);
    expect(new Set(accountKeys).size).toBe(CONNECTORS.length);
  });

  it("renders an explicit empty state when no connector is scoped", () => {
    const text = renderToText(AutomationConnectorScopePanel({ connectors: [] }));
    expect(text).toContain("No connector is scoped to this runtime.");
  });
});
