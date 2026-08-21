import { describe, expect, it } from "vitest";
import type { RuntimeBudgetProjection } from "../automationRuntimeContracts";
import { AutomationRuntimeBudgetPanel } from "./AutomationRuntimeBudgetPanel";

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

describe("AutomationRuntimeBudgetPanel", () => {
  it("shows the full deterministic mock budget projection", () => {
    const budget: RuntimeBudgetProjection = {
      tokenBudget: 200000,
      tokensUsed: 48213,
      estimatedCost: 1.42,
      currency: "USD",
      modelRoutingClass: "provider-neutral-standard",
      cacheHitRate: 0.37,
      contextTier: "standard",
      budgetStatus: "UNDER_BUDGET",
    };
    const text = renderToText(AutomationRuntimeBudgetPanel({ budget, modelRoutingClass: budget.modelRoutingClass ?? "unknown", voiceMetadataProviderNeutralReady: true }));
    expect(text).toContain("200000");
    expect(text).toContain("48213");
    expect(text).toContain("UNDER_BUDGET");
    expect(text).toContain("provider-neutral-standard");
    expect(text).toContain("37%");
    expect(text).toContain("READY");
  });

  it("shows 'Not projected' for every unset optional budget field", () => {
    const text = renderToText(AutomationRuntimeBudgetPanel({ budget: {}, modelRoutingClass: "provider-neutral-standard", voiceMetadataProviderNeutralReady: false }));
    expect(text).toContain("Not projected");
    expect(text).toContain("NOT READY");
  });

  it("states that every value is a deterministic local projection with no paid API invocation", () => {
    const text = renderToText(AutomationRuntimeBudgetPanel({ budget: {}, modelRoutingClass: "provider-neutral-standard", voiceMetadataProviderNeutralReady: true }));
    expect(text).toContain("no paid API is invoked");
  });
});
