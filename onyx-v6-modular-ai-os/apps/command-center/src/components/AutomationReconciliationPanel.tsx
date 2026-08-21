import type { CSSProperties } from "react";
import type { ReconciliationHandoff } from "@onyx/phase1a6-workflow-runtime";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };
const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 76,
  minHeight: 28,
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,170,170,.3)",
  background: "rgba(255,143,143,.16)",
  color: "#ffaaaa",
  fontWeight: 800,
};

/**
 * Read-only reconciliation panel. This never executes reconciliation; it only
 * displays the deterministic Phase 1A.6 reconciliation handoff package and
 * proves every mutation permission is false.
 */
export function AutomationReconciliationPanel({ handoff }: { handoff: ReconciliationHandoff | null }) {
  if (!handoff) {
    return (
      <div aria-label="Automation runtime reconciliation panel" style={card}>
        <small style={{ color: "#65d9ef" }}>PHASE 1A.7 · RECONCILIATION, READ-ONLY</small>
        <p style={{ color: "#9bc8d5" }}>No uncertain operation currently requires reconciliation.</p>
      </div>
    );
  }

  return (
    <div aria-label="Automation runtime reconciliation panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#65d9ef" }}>PHASE 1A.7 · RECONCILIATION, READ-ONLY, NO AUTOMATIC RETRY</small>
          <h4 style={{ margin: "4px 0" }}>Reconciliation required</h4>
        </div>
        <span style={pill}>RECONCILIATION REQUIRED</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Uncertain operation</small>
          <p style={{ overflowWrap: "anywhere" }}>{handoff.uncertainOperation.detail}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Current state</small>
          <p>{handoff.currentState}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Current capability</small>
          <p>{handoff.currentStep}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Idempotency key</small>
          <p style={{ overflowWrap: "anywhere" }}>{handoff.idempotencyKey}</p>
        </article>
      </div>

      <article style={card}>
        <small style={{ color: "#91bdcb" }}>Resource references</small>
        {handoff.resourceReferences.length ? (
          <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
            {handoff.resourceReferences.map((reference) => (
              <li key={reference} style={{ overflowWrap: "anywhere" }}>{reference}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#9bc8d5" }}>None recorded</p>
        )}
      </article>

      <article style={card}>
        <small style={{ color: "#91bdcb" }}>Evidence references</small>
        {handoff.evidenceReferences.length ? (
          <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
            {handoff.evidenceReferences.map((reference) => (
              <li key={reference} style={{ overflowWrap: "anywhere" }}>{reference}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#9bc8d5" }}>None recorded</p>
        )}
      </article>

      <article style={card}>
        <small style={{ color: "#91bdcb" }}>Recommended read-only checks</small>
        <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
          {handoff.recommendedReadOnlyReconciliationChecks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </article>

      <p style={{ color: "#ffd166" }}>
        Automatic retry, remote deletion, force push, merge, and production action are all unavailable while
        reconciliation is required.
      </p>
    </div>
  );
}
