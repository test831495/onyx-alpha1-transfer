import type { CSSProperties } from "react";
import type { RuntimeIdentityProjection } from "../automationRuntimeContracts";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };

/**
 * Read-only runtime identity panel. Character, agent, and lane fields are
 * displayed for attribution only and never imply approval authority: only the
 * Phase 1A.5 approval package is authoritative for governed actions.
 */
export function AutomationRuntimeIdentityPanel({ identity }: { identity: RuntimeIdentityProjection }) {
  const rows: Array<[string, string]> = [
    ["Runtime ID", identity.runtimeId],
    ["Runtime session ID", identity.runtimeSessionId],
    ["Workflow ID", identity.workflowId],
    ["Supervising user", identity.supervisingUserId],
    ["Presence mode", identity.initiatingPresenceMode],
    ["Initiating character", identity.initiatingCharacterId ?? "None"],
    ["Active agent", identity.activeAgentId ?? "Unassigned"],
    ["Assigned agents", identity.assignedAgentIds?.join(", ") || "None"],
    ["Active lane", identity.activeLaneId ?? "None"],
    ["Lane count", String(identity.laneCount)],
    ["Promotion lane active", identity.promotionLaneActive ? "YES" : "NO"],
  ];

  return (
    <div aria-label="Automation runtime identity panel" style={{ display: "grid", gap: 10 }}>
      <div>
        <small style={{ color: "#65d9ef" }}>PHASE 1A.7 · IDENTITY ATTRIBUTION, GRANTS NO APPROVAL AUTHORITY</small>
        <h4 style={{ margin: "4px 0" }}>Identity</h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
        {rows.map(([label, value]) => (
          <article key={label} style={card}>
            <small style={{ color: "#91bdcb" }}>{label}</small>
            <p style={{ overflowWrap: "anywhere" }}>{value}</p>
          </article>
        ))}
      </div>

      {identity.sharedTaskReferences && identity.sharedTaskReferences.length > 0 && (
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Shared task references, permission-checked only</small>
          <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
            {identity.sharedTaskReferences.map((reference) => (
              <li key={reference.taskId} style={{ overflowWrap: "anywhere" }}>{reference.redactedSummary}</li>
            ))}
          </ul>
        </article>
      )}

      <p style={{ color: "#9bc8d5" }}>
        Character, agent, and lane identity are attribution metadata only. No personality memory or
        character-private memory is projected here, and only the Phase 1A.5 approval package authorizes any
        governed action.
      </p>
    </div>
  );
}
