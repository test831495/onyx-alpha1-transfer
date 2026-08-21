import type { CSSProperties } from "react";
import type { ConnectorScopeProjection } from "../automationRuntimeContracts";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };
const pill = (readOnly: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 76,
  minHeight: 26,
  padding: "4px 10px",
  borderRadius: 999,
  border: readOnly ? "1px solid rgba(114,237,190,.3)" : "1px solid rgba(255,209,102,.3)",
  background: readOnly ? "rgba(70,210,165,.16)" : "rgba(255,209,102,.16)",
  color: readOnly ? "#72edbe" : "#ffd166",
  fontWeight: 800,
});

/**
 * Read-only connector scope panel. Displays connector metadata only: never
 * reads connector content, never executes a connector action, never stores a
 * connector credential, and never merges two connector-account identities.
 */
export function AutomationConnectorScopePanel({ connectors }: { connectors: readonly ConnectorScopeProjection[] }) {
  return (
    <div aria-label="Automation runtime connector scope panel" style={{ display: "grid", gap: 10 }}>
      <div>
        <small style={{ color: "#65d9ef" }}>PHASE 1A.7 · CONNECTOR SCOPE, METADATA ONLY, NO CONTENT ACCESS</small>
        <h4 style={{ margin: "4px 0" }}>Connector scope</h4>
      </div>

      {connectors.length === 0 ? (
        <p style={{ color: "#9bc8d5" }}>No connector is scoped to this runtime.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {connectors.map((connector) => (
            <article key={`${connector.connectorProvider}:${connector.connectorAccountId}`} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <b>{connector.connectorProvider} · {connector.connectorAccountLabel}</b>
                <span style={pill(connector.readOnly)}>{connector.readOnly ? "READ-ONLY" : "ACTION APPROVAL REQUIRED"}</span>
              </div>
              <p style={{ margin: "6px 0", color: "#afd5df", overflowWrap: "anywhere" }}>
                Account: {connector.connectorAccountId}
                <br />
                Scope: {connector.connectorScope}
                <br />
                Permission mode: {connector.permissionMode}
              </p>
            </article>
          ))}
        </div>
      )}

      <p style={{ color: "#9bc8d5" }}>
        Connector content is never read here, no connector action is executed, and no connector credential is
        stored. Each connector account is isolated and never merged with another account's identity.
      </p>
    </div>
  );
}
