/**
 * Phase 1A.9 Scheduler Agent Activity Panel
 * 
 * Display agent, lease, and heartbeat activity.
 * No worker credentials, memory content, or connector payloads are shown.
 * Accessible via keyboard and screen reader.
 */

import type { AutomationCenterSchedulerProjection } from "@onyx/phase1a9-governed-scheduler";

interface SchedulerAgentActivityPanelProps {
  readonly projection: AutomationCenterSchedulerProjection;
  readonly isLoading?: boolean;
}

/**
 * Stateless agent activity panel component.
 */
export function SchedulerAgentActivityPanel({
  projection,
  isLoading = false,
}: SchedulerAgentActivityPanelProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Agent activity loading"
        aria-busy="true"
        style={{
          border: "1px solid rgba(148, 197, 218, .22)",
          background: "rgba(5, 23, 42, .72)",
          borderRadius: 12,
          padding: 16,
          color: "#9cc9d8",
        }}
      >
        <p>Loading agent activity...</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Agent activity panel"
      style={{
        border: "1px solid rgba(148, 197, 218, .22)",
        background: "rgba(5, 23, 42, .72)",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 16,
      }}
    >
      <h2 style={{ margin: "0 0 8px 0", color: "#e9fbff" }}>Agent Activity</h2>

      <div
        role="region"
        aria-label="Lease and heartbeat status"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Active Leases
          </small>
          <strong style={{ color: "#8bdcf1" }}>
            {projection.leaseSummary.activeLeaseCount}
          </strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Lease Generations
          </small>
          <strong style={{ color: "#8bdcf1" }}>
            {projection.leaseSummary.generationCount}
          </strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Healthy Heartbeats
          </small>
          <strong style={{ color: "#72edbe" }}>
            {projection.heartbeatSummary.healthyHeartbeatCount}
          </strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Stale Heartbeats
          </small>
          <strong style={{ color: "#ffd166" }}>
            {projection.heartbeatSummary.staleHeartbeatCount}
          </strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Clock Skew Detected
          </small>
          <strong style={{ color: "#ffd166" }}>
            {projection.heartbeatSummary.clockSkewDetectedCount}
          </strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small style={{ color: "#65d9ef", display: "block", marginBottom: 4 }}>
            Recovery Handoffs
          </small>
          <strong style={{ color: "#8bdcf1" }}>
            {projection.heartbeatSummary.recoveryHandoffCount}
          </strong>
        </article>
      </div>

      <div
        style={{
          background: "rgba(7, 28, 51, 0.5)",
          borderLeft: "3px solid #65d9ef",
          padding: 12,
          borderRadius: 8,
          fontSize: "0.875rem",
          color: "#a5c5d4",
        }}
      >
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>Note:</strong> No worker identity, task assignments, credentials,
          or memory content are shown. All activity is displayed as reference counts
          only.
        </p>
      </div>
    </section>
  );
}
