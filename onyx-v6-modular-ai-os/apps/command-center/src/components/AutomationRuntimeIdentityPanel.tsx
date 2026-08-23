import type { CSSProperties } from "react";
import type { RuntimeIdentityProjection } from "../automationRuntimeContracts";
import { formatPresenceMode, formatRuntimeStatus } from "../presentationLabels";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };
const technicalCard: CSSProperties = { ...card, background: "rgba(20,40,60,.60)" };

/**
 * Read-only runtime identity panel. Character, agent, and lane fields are
 * displayed for attribution only and never imply approval authority: only the
 * Phase 1A.5 approval package is authoritative for governed actions.
 */
export function AutomationRuntimeIdentityPanel({ identity }: { identity: RuntimeIdentityProjection }) {

  // Main user-facing rows with friendly display names
  const userRows: Array<[string, string]> = [
    ["Runtime", formatRuntimeStatus(identity.runtimeId) || "Runtime"],
    ["Session", formatRuntimeStatus(identity.runtimeSessionId) || "Session"],
    ["Workflow", formatRuntimeStatus(identity.workflowId) || "Current Governed Workflow"],
    ["Supervising User", identity.supervisingUserId],
    ["Presence Mode", formatPresenceMode(identity.initiatingPresenceMode)],
    ["Initiating Character", identity.initiatingCharacterId ?? "None"],
    ["Active Agent", identity.activeAgentId ? identity.activeAgentId : "No Active Agent"],
    ["Assigned Agents", identity.assignedAgentIds && identity.assignedAgentIds.length > 0 ? identity.assignedAgentIds.join(", ") : "No Assigned Agents"],
    ["Active Lane", identity.activeLaneId ?? "None"],
    ["Lane Count", String(identity.laneCount)],
    ["Promotion Lane Active", identity.promotionLaneActive ? "Yes" : "No"],
  ];

  // Technical details rows (raw canonical values)
  const technicalRows: Array<[string, string]> = [
    ["Runtime ID", identity.runtimeId],
    ["Runtime Session ID", identity.runtimeSessionId],
    ["Workflow ID", identity.workflowId],
    ["Presence Mode Code", identity.initiatingPresenceMode],
  ];

  return (
    <div aria-label="Automation runtime identity panel" style={{ display: "grid", gap: 10 }}>
      <div>
        <small style={{ color: "#65d9ef" }}>Identity Attribution, Grants No Approval Authority</small>
        <h4 style={{ margin: "4px 0" }}>Identity</h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
        {userRows.map(([label, value]) => (
          <article key={label} style={card}>
            <small style={{ color: "#91bdcb" }}>{label}</small>
            <p style={{ overflowWrap: "anywhere" }}>{value}</p>
          </article>
        ))}
      </div>

      {/* Technical Details Disclosure */}
      <details style={{ marginTop: 10 }}>
        <summary
          style={{
            cursor: "pointer",
            color: "#65d9ef",
            padding: "8px 0",
            userSelect: "none",
          }}
        >
          Show Automation Center technical details
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 10 }}>
          {technicalRows.map(([label, value]) => (
            <article key={`technical-${label}`} style={technicalCard}>
              <small style={{ color: "#91bdcb" }}>{label}</small>
              <p style={{ overflowWrap: "anywhere", fontSize: "0.9em", fontFamily: "monospace" }}>{value}</p>
            </article>
          ))}
        </div>
      </details>

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
