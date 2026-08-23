import type { AutomationCenterSchedulerProjection } from "@onyx/phase1a9-governed-scheduler";

interface SchedulerDetailPanelsProps {
  readonly projection: AutomationCenterSchedulerProjection;
}

const sections = [
  ["Task Graph and Ready Set", "taskGraphSummary", "readySetSummary"],
  ["Locks and Checkpoints", "lockSummary", "checkpointSummary"],
  ["Cancellation and Joins", "cancellationSummary", "joinSummary"],
  ["Budget and Cost", "budgetSummary"],
  ["Recovery and Reconciliation", "recoverySummary"],
  ["Promotion and Evidence", "promotionSummary", "evidenceSummary"],
  ["Memory and Context Boundary", "memoryBoundarySummary"],
  ["Council Agreement and Disagreement", "councilSummary"],
  ["Saved Draft Eligibility", "draftSummary"],
  ["Connector Provider and Scope", "connectorSummary"],
] as const;

/** Read-only semantic summaries for the scheduler status areas not shown in the overview cards. */
export function SchedulerDetailPanels({ projection }: SchedulerDetailPanelsProps) {
  return (
    <section aria-label="Scheduler detail panels" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Scheduler Details</h2>
      <p role="status" aria-live="polite" style={{ margin: 0 }}>
        Reference-only projections. No scheduler, memory, connector, Council, draft, recovery, or promotion action is available.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {sections.map(([title, firstKey, secondKey]) => {
          const first = projection[firstKey];
          const second = secondKey ? projection[secondKey] : undefined;
          return (
            <article key={title} aria-label={title} style={{ border: "1px solid rgba(148,197,218,.22)", borderRadius: 8, padding: 12 }}>
              <h3 style={{ fontSize: "1rem", margin: "0 0 8px" }}>{title}</h3>
              <dl style={{ margin: 0, display: "grid", gap: 4 }}>
                <div><dt style={{ display: "inline", fontWeight: 700 }}>Status: </dt><dd style={{ display: "inline", margin: 0 }}>Read-Only Status</dd></div>
                <div><dt style={{ display: "inline", fontWeight: 700 }}>Reference fields: </dt><dd style={{ display: "inline", margin: 0 }}>{Object.keys(first).length}{second ? ` + ${Object.keys(second).length}` : ""}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
