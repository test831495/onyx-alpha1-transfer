import type { CSSProperties } from "react";
import type { RuntimeBudgetProjection } from "../automationRuntimeContracts";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };

/**
 * Read-only budget, cost, and model-routing projection. Uses deterministic
 * mock values only; never invokes a paid service.
 */
export function AutomationRuntimeBudgetPanel({
  budget,
  modelRoutingClass,
  voiceMetadataProviderNeutralReady,
}: {
  budget: RuntimeBudgetProjection;
  modelRoutingClass: string;
  voiceMetadataProviderNeutralReady: boolean;
}) {
  const rows: Array<[string, string]> = [
    ["Token budget", budget.tokenBudget !== undefined ? String(budget.tokenBudget) : "Not projected"],
    ["Tokens used", budget.tokensUsed !== undefined ? String(budget.tokensUsed) : "Not projected"],
    ["Estimated cost", budget.estimatedCost !== undefined ? `${budget.estimatedCost} ${budget.currency ?? ""}`.trim() : "Not projected"],
    ["Cache hit rate", budget.cacheHitRate !== undefined ? `${Math.round(budget.cacheHitRate * 100)}%` : "Not projected"],
    ["Context tier", budget.contextTier ?? "Not projected"],
    ["Budget status", budget.budgetStatus ?? "NOT_APPLICABLE"],
    ["Model routing class", modelRoutingClass],
    ["Provider-neutral voice metadata", voiceMetadataProviderNeutralReady ? "READY" : "NOT READY"],
  ];

  return (
    <div aria-label="Automation runtime budget panel" style={{ display: "grid", gap: 10 }}>
      <div>
        <small style={{ color: "#65d9ef" }}>PHASE 1A.7 · BUDGET AND ROUTING, MOCK-ONLY, NO PAID EXECUTION</small>
        <h4 style={{ margin: "4px 0" }}>Budget and model routing</h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        {rows.map(([label, value]) => (
          <article key={label} style={card}>
            <small style={{ color: "#91bdcb" }}>{label}</small>
            <p style={{ overflowWrap: "anywhere" }}>{value}</p>
          </article>
        ))}
      </div>

      <p style={{ color: "#9bc8d5" }}>Every value shown here is a deterministic local projection; no paid API is invoked.</p>
    </div>
  );
}
