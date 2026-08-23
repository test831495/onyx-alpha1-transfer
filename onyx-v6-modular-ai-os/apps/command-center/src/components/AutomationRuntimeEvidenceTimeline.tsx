import type { CSSProperties } from "react";
import { getCapabilityDisplayName, getCheckpointDisplayName, getEvidenceStatusDisplayName, getWorkflowStateDisplayName, formatHistoryEventLanguage, formatHistoryTimestamp } from "../presentationLabels";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };

/**
 * Structurally compatible with the frozen Phase 1A.5 `EvidenceEntry` shape.
 * This is a UI-local display type only; it never redefines evidence authority.
 */
export interface EvidenceTimelineEntry {
  readonly sequence: number;
  readonly stateTransition: string;
  readonly stepId: string;
  readonly providerClassification: string;
  readonly resourceReferences: readonly string[];
  readonly checkpointDigest: string;
  readonly redactedDetail: string;
  readonly timestamp: string;
}

/**
 * Read-only evidence timeline. Displays the monotonic evidence sequence exactly
 * as recorded; all secret-shaped detail was already redacted by the Phase 1A.5
 * evidence timeline before this component ever receives it.
 */
export function AutomationRuntimeEvidenceTimeline({ entries }: { entries: readonly EvidenceTimelineEntry[] }) {
  return (
    <div aria-label="Automation runtime evidence timeline" style={{ display: "grid", gap: 10 }}>
      <div>
        <small style={{ color: "#65d9ef" }}>Evidence Timeline</small>
        <h4 style={{ margin: "4px 0" }}>Evidence timeline</h4>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: "#9bc8d5" }}>No evidence has been recorded yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {[...entries]
            .sort((a, b) => a.sequence - b.sequence)
            .map((entry) => {
              const { readable: readableTimestamp, canonical: canonicalTimestamp } = formatHistoryTimestamp(entry.timestamp);
              return (
                <article key={entry.sequence} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <b>#{entry.sequence} · {getCapabilityDisplayName(entry.stepId)}</b>
                    <span style={{ color: "#8bdcf1" }}>{getEvidenceStatusDisplayName(entry.providerClassification)}</span>
                  </div>
                  <p style={{ margin: "6px 0", color: "#afd5df" }}>{formatHistoryEventLanguage(getWorkflowStateDisplayName(entry.stateTransition))}</p>
                  <p style={{ margin: "4px 0", overflowWrap: "anywhere" }}>{entry.redactedDetail}</p>
                  <p style={{ margin: "4px 0", color: "#9bc8d5", overflowWrap: "anywhere" }}>
                    Checkpoint: {getCheckpointDisplayName(entry.checkpointDigest)}
                  </p>
                  {entry.resourceReferences.length > 0 && (
                    <p style={{ margin: "4px 0", color: "#9bc8d5", overflowWrap: "anywhere" }}>
                      Resources: {entry.resourceReferences.join(", ")}
                    </p>
                  )}
                  {canonicalTimestamp && (
                    <p style={{ margin: "6px 0", color: "#7db8cc", fontSize: "0.9em" }}>
                      <time dateTime={canonicalTimestamp}>{readableTimestamp}</time>
                    </p>
                  )}
                </article>
              );
            })}
        </div>
      )}
    </div>
  );
}
