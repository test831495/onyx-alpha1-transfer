/**
 * Phase 1A.9 Scheduler Overview Panel for Automation Center
 * 
 * Read-only display of scheduler state, lanes, and capacity.
 * All content is deterministic and reference-only; no execution controls.
 * Accessible via keyboard navigation and screen reader.
 */

import type { SchedulerProjectionViewModel } from "../schedulerProjectionAdapter";
import {
  formatTechnicalIdentifier,
  getGenericReferenceLabel,
  getLaneStageDisplayName,
  getSourceDisplayName,
  getWorkflowStateDisplayName,
} from "../presentationLabels";

interface SchedulerOverviewPanelProps {
  readonly viewModel: SchedulerProjectionViewModel;
  readonly isLoading?: boolean;
  readonly isStale?: boolean;
  readonly error?: string;
}

/**
 * Render accessibility-friendly status for scheduler health.
 */
function getHealthStatusLabel(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "Scheduler is healthy";
    case "WARNING":
      return "Scheduler has warnings";
    case "BLOCKED":
      return "Scheduler is blocked";
    case "RECONCILIATION_REQUIRED":
      return "Reconciliation is required";
    case "FAILED_SAFE":
      return "Scheduler failed safely";
    case "STALE":
      return "Scheduler state is stale";
    default:
      return "Scheduler Status Not Available";
  }
}

/**
 * Stateless scheduler overview panel component.
 * Props-only, no hooks. Can be invoked directly for testing.
 */
export function SchedulerOverviewPanel({
  viewModel,
  isLoading = false,
  isStale = false,
  error,
}: SchedulerOverviewPanelProps) {
  if (error) {
    return (
      <section
        aria-label="Scheduler overview panel"
        style={{
          border: "1px solid #ff8f8f",
          background: "rgba(255, 143, 143, 0.1)",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ color: "#ff8f8f", margin: 0 }}>Scheduler Error</h3>
        <p style={{ color: "#ffb3b3", margin: 0 }}>{error}</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        aria-label="Scheduler overview panel loading"
        aria-busy="true"
        style={{
          border: "1px solid rgba(148, 197, 218, .22)",
          background: "rgba(5, 23, 42, .72)",
          borderRadius: 12,
          padding: 16,
          color: "#9cc9d8",
        }}
      >
        <p>Loading scheduler state...</p>
      </section>
    );
  }

  const healthLabel = getHealthStatusLabel(viewModel.schedulerHealthStatus);

  return (
    <section
      aria-label="Scheduler overview panel"
      style={{
        border: "1px solid rgba(148, 197, 218, .22)",
        background: "rgba(5, 23, 42, .72)",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 16,
      }}
    >
      <header>
        <h2 style={{ margin: "0 0 8px 0", color: "#e9fbff" }}>Scheduler Status</h2>
        <p
          style={{
            margin: 0,
            color: "#9ac7d6",
            fontSize: "0.875rem",
          }}
          role="status"
          aria-live="polite"
        >
          {isStale ? "⚠️ Stale projection - " : ""}{healthLabel}
        </p>
      </header>

      <div
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
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Scheduler Enabled
          </small>
          <strong style={{ color: "#72edbe" }}>
            {viewModel.schedulerEnabled ? "Yes" : "No"}
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
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Active Lane Stage
          </small>
          <strong style={{ color: "#8bdcf1" }}>{getLaneStageDisplayName(viewModel.activeLaneStage)}</strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Runtime Lane Limit
          </small>
          <strong style={{ color: "#8bdcf1" }}>{viewModel.runtimeLaneLimit}</strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Tasks Ready to Schedule
          </small>
          <strong style={{ color: "#8bdcf1" }}>{viewModel.readyTaskCount}</strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Active Leases
          </small>
          <strong style={{ color: "#8bdcf1" }}>{viewModel.activeLeaseCount}</strong>
        </article>

        <article
          style={{
            border: "1px solid rgba(124, 211, 239, .35)",
            background: "#071c33",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <small
            style={{
              color: "#65d9ef",
              display: "block",
              marginBottom: 4,
            }}
          >
            Warnings
          </small>
          <strong style={{ color: viewModel.warningCount > 0 ? "#ffd166" : "#8bdcf1" }}>
            {viewModel.warningCount}
          </strong>
        </article>
      </div>

      <details
        style={{
          border: "1px solid rgba(124, 211, 239, .25)",
          borderRadius: 8,
          padding: 12,
          background: "rgba(7, 28, 51, 0.5)",
          cursor: "pointer",
        }}
      >
        <summary
          style={{
            color: "#9bcbd9",
            fontWeight: 600,
            outline: "none",
            padding: "4px 0",
            cursor: "pointer",
          }}
          aria-label="Show technical details"
        >
          Show technical details
        </summary>
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 8,
            fontSize: "0.875rem",
            color: "#a5c5d4",
          }}
        >
          <div>
            <strong>Workflow ID:</strong> {formatTechnicalIdentifier(viewModel.workflowId)}
          </div>
          <div>
            <strong>Runtime ID:</strong> {formatTechnicalIdentifier(viewModel.runtimeId)}
          </div>
          <div>
            <strong>Division:</strong> {getSourceDisplayName("E5_DASHBOARD_SERVICE")}
          </div>
          <div>
            <strong>Runtime scenario code:</strong> {formatTechnicalIdentifier(viewModel.activeLaneStage)}
          </div>
          <div>
            <strong>Last Evaluated:</strong> {formatTechnicalIdentifier(viewModel.projectionUpdatedAt)}
          </div>
          <div>
            <strong>Staleness:</strong> {getWorkflowStateDisplayName(viewModel.stalenessStatus)}
          </div>
          <div>
            <strong>Reference label:</strong> {getGenericReferenceLabel(viewModel.workflowId)}
          </div>
          {viewModel.reconciliationRequired && (
            <div
              style={{
                background: "rgba(255, 209, 102, 0.15)",
                borderLeft: "3px solid #ffd166",
                padding: "8px 0 8px 8px",
              }}
            >
              ⚠️ Reconciliation Required before resuming scheduler operations.
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
