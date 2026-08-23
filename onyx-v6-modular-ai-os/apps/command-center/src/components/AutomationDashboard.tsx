import { useEffect, useState, type CSSProperties } from "react";
import { useAutomationDashboard } from "../automationDashboardHook";
import type { UiJob, UiTab } from "../automationDashboardContracts";
import { AutomationSupervisedOrchestration } from "./AutomationSupervisedOrchestration";
import { AutomationNaturalLanguageIntake } from "./AutomationNaturalLanguageIntake";
import { AutomationDraftPrReview } from "./AutomationDraftPrReview";
import { ApprovalDialog } from "./AutomationApprovalDialog";
import { recordApprovalDecision } from "../automationApprovalService";
import type {
  ApprovalAction,
  ApprovalDecision,
} from "../automationApprovalContracts";
import { AutomationEvidenceViewer } from "./AutomationEvidenceViewer";
import { AutomationRuntimeDashboard } from "./AutomationRuntimeDashboard";
import {
  buildRuntimeFixtures,
  RUNTIME_FIXTURE_IDS,
  type RuntimeFixtureId,
} from "../automationRuntimeFixtures";
import type { RecoveryPanelViewModel } from "./AutomationRecoveryPanel";
import type { EvidenceTimelineEntry } from "./AutomationRuntimeEvidenceTimeline";
import "./AutomationDashboard.shell.css";
import "./AutomationDashboard.accessibility";
import { createEmptySchedulerProjection } from "@onyx/phase1a9-governed-scheduler/projections";
import { adaptSchedulerProjectionToViewModel } from "../schedulerProjectionAdapter";
import { SchedulerOverviewPanel } from "./SchedulerOverviewPanel";
import { SchedulerAgentActivityPanel } from "./SchedulerAgentActivityPanel";
import { SchedulerDetailPanels } from "./SchedulerDetailPanels";
import {
  formatTimestampDisplay,
  formatHistoryEventLanguage,
  formatHistoryTimestamp,
  formatValidationDetail,
  formatValidationLabel,
  getBranchDisplayName,
  getRuntimeScenarioDisplayName,
  getRepositoryDisplayName,
  getScopeDisplayName,
  getWorkflowStateDisplayName,
} from "../presentationLabels";
/** Stable Phase 1A.7 tab identifier for the governed runtime view; used for reachability, never a guessed label. */
export const GOVERNED_RUNTIME_TAB_ID = "governed-runtime" as const;
type ExtendedTab = UiTab | typeof GOVERNED_RUNTIME_TAB_ID;
const runtimeFixtures = buildRuntimeFixtures();
/**
 * Phase 1A.7 governed runtime tab content. Renders the existing, already-tested
 * `AutomationRuntimeDashboard` against a deterministic mock fixture; it never
 * duplicates runtime projection or controller logic, and it never calls
 * GitHub, Git, a connector, a paid API, a child process, or any shell interface.
 */
/** Stateless by design so it can be invoked directly in tests without a DOM renderer. */
export function GovernedRuntimeTab({
  fixtureId,
  onFixtureChange,
}: {
  fixtureId: RuntimeFixtureId;
  onFixtureChange: (id: RuntimeFixtureId) => void;
}) {
  const projection = runtimeFixtures[fixtureId];
  const recovery: RecoveryPanelViewModel = {
    lastTrustedCheckpointDigest: projection.latestCheckpointDigest,
    checkpointCount: projection.checkpointCount,
    targetState: projection.currentState,
    firstIncompleteCapability: projection.pendingCapabilities[0] ?? null,
    recoveryAvailable: projection.recoveryAvailable,
    blockedReason: projection.reconciliationRequired
      ? "Reconciliation is required; automatic recovery is not permitted."
      : null,
    scopeVerified: true,
    approvalVerified: true,
    checkpointChainVerified: true,
    repositoryVerified: true,
  };
  const evidenceEntries: EvidenceTimelineEntry[] =
    projection.evidenceCount > 0
      ? [
          {
            sequence:
              projection.latestEvidenceSequence ?? projection.evidenceCount,
            stateTransition: projection.currentState,
            stepId:
              projection.currentCapability ??
              projection.completedCapabilities.at(-1) ??
              "WORKFLOW",
            providerClassification: "DETERMINISTIC_SUCCESS",
            resourceReferences: [],
            checkpointDigest: projection.latestCheckpointDigest ?? "",
            redactedDetail: `Deterministic local-simulation evidence summary (${projection.evidenceCount} total entries).`,
            timestamp: projection.updatedAt,
          },
        ]
      : [];
  const schedulerProjection = createEmptySchedulerProjection(
    "automation-center-scheduler",
    1703203200000,
  );
  const schedulerViewModel =
    adaptSchedulerProjectionToViewModel(schedulerProjection);
  return (
    <div
      aria-label="Governed runtime tab content"
      style={{ display: "grid", gap: 14 }}
    >
      <label style={{ display: "grid", gap: 5, color: "#9bcbd9" }}>
        Governed runtime scenario
        <select
          aria-label="Governed runtime scenario"
          value={fixtureId}
          onChange={(e) => onFixtureChange(e.target.value as RuntimeFixtureId)}
          style={{ ...btn, minWidth: 280 }}
        >
          {RUNTIME_FIXTURE_IDS.map((id) => (
            <option key={id} value={id}>
              {getRuntimeScenarioDisplayName(id)}
            </option>
          ))}
        </select>
      </label>
      <AutomationRuntimeDashboard
        projection={projection}
        recovery={recovery}
        evidenceEntries={evidenceEntries}
      />
      <SchedulerOverviewPanel viewModel={schedulerViewModel} />
      <SchedulerAgentActivityPanel projection={schedulerProjection} />
      <SchedulerDetailPanels projection={schedulerProjection} />
    </div>
  );
}
export const tabs: ExtendedTab[] = [
  "create",
  "execute",
  "overview",
  "queue",
  "approvals",
  "validation",
  "evidence",
  "draft-prs",
  "history",
  GOVERNED_RUNTIME_TAB_ID,
];
export const labels: Record<ExtendedTab, string> = {
  create: "Create",
  execute: "Execute",
  overview: "Overview",
  queue: "Queue",
  approvals: "Approvals",
  validation: "Validation",
  evidence: "Evidence",
  "draft-prs": "Draft PRs",
  history: "History",
  [GOVERNED_RUNTIME_TAB_ID]: "Governed Runtime",
};
const btn: CSSProperties = {
  border: "1px solid rgba(124,211,239,.35)",
  background: "#071c33",
  color: "#d9f7ff",
  padding: "9px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};
const card: CSSProperties = {
  border: "1px solid rgba(148,197,218,.22)",
  background: "rgba(5,23,42,.72)",
  borderRadius: 14,
  padding: 14,
};
function statusColor(state: string) {
  if (state === "DRAFT_PR_CREATED" || state === "EVIDENCE_READY")
    return "#58e6b0";
  if (state.includes("AWAITING")) return "#ffd166";
  if (state === "FAILED_POLICY") return "#ff8f8f";
  return "#8bdcf1";
}
function Empty({ text }: { text: string }) {
  return (
    <div
      style={{ ...card, textAlign: "center", padding: 28, color: "#9cc9d8" }}
    >
      {text}
    </div>
  );
}
function Summary({ job }: { job: UiJob }) {
  const items: Array<[string, string]> = [
    ["Status", getWorkflowStateDisplayName(job.state)],
    ["Risk", job.risk.toUpperCase()],
    ["Validation", `${job.validation.passed}/${job.validation.total}`],
    ["Repairs", String(job.repairAttempts)],
    ["Evidence", job.evidence.ready ? "READY" : "PENDING"],
    ["Draft PR", job.draftPr ? `#${job.draftPr.number}` : "PENDING"],
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 10,
      }}
    >
      {items.map(([a, b]) => (
        <article key={a} style={card}>
          <small style={{ color: "#91bdcb" }}>{a}</small>
          <strong
            style={{
              display: "block",
              marginTop: 6,
              color: a === "Status" ? statusColor(b) : "#f4fbff",
              overflowWrap: "anywhere",
            }}
          >
            {b}
          </strong>
        </article>
      ))}
    </div>
  );
}
function JobPicker({
  jobs,
  value,
  onChange,
}: {
  jobs: UiJob[];
  value: string;
  onChange: (x: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 5, color: "#9bcbd9" }}>
      Selected job
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...btn, minWidth: 280 }}
      >
        {jobs.map((j) => (
          <option key={j.jobId} value={j.jobId}>
            Work Item {j.issueNumber} · {getRuntimeScenarioDisplayName(j.title)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function AutomationDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const [open, setOpen] = useState(embedded),
    [tab, setTab] = useState<ExtendedTab>("overview"),
    [notice, setNotice] = useState(""),
    [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null),
    [runtimeFixtureId, setRuntimeFixtureId] = useState<RuntimeFixtureId>(
      "RUNNING_BRANCH_STEP",
    );
  const { snapshot, selected, selectedId, setSelectedId, counts } =
    useAutomationDashboard();
  useEffect(() => {
    if (embedded) return;
    const show = () => setOpen(true);
    window.addEventListener("onyx:open-automation", show);
    return () => window.removeEventListener("onyx:open-automation", show);
  }, [embedded]);
  if (!open) return null;
  return (
    <section
      aria-label="ONYX Automation Center"
      style={{
        position: embedded ? "relative" : "fixed",
        inset: embedded ? undefined : 18,
        zIndex: embedded ? "auto" : 12000,
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        background: "linear-gradient(160deg,#061325,#081d34)",
        color: "#e9fbff",
        border: "1px solid rgba(105,213,241,.35)",
        borderRadius: embedded ? 0 : 18,
        boxShadow: embedded ? "none" : "0 22px 80px rgba(0,0,0,.52)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(140,205,226,.2)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <small style={{ color: "#65d9ef" }}>Automation Center Status</small>
          <h2 style={{ margin: "3px 0" }}>Automation Center</h2>
          <span style={{ color: "#9ac7d6" }}>
            Safely plan, validate, and prepare changes for review
            <br />
            Merging and production deployment are unavailable in this workspace.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(70,210,165,.14)",
              color: "#72edbe",
            }}
          >
            Source: Automation Center
          </span>
          {!embedded && <button style={btn} onClick={() => setOpen(false)}>Close</button>}
        </div>
      </header>
      <details
        aria-label="Show technical details"
        style={{
          margin: 0,
          padding: "12px 18px 0",
          borderBottom: "1px solid rgba(140,205,226,.15)",
        }}
      >
        <summary
          style={{ cursor: "pointer", color: "#9bcbd9", fontWeight: 600 }}
        >
          Show technical details
        </summary>
        <div
          style={{
            padding: "10px 0 12px",
            display: "grid",
            gap: 6,
            color: "#a5c5d4",
            fontSize: "0.8rem",
          }}
        >
          <div>
            <strong>Technical source ID:</strong> {snapshot.source}
          </div>
          <div>
            <strong>Phase reference:</strong> E.8A · E5_DASHBOARD_SERVICE
          </div>
          <div><strong>Validation commands:</strong> git diff --check; tsc --noEmit</div>
        </div>
      </details>
      <nav
        aria-label="Automation Center tabs"
        style={{
          display: "flex",
          gap: 7,
          padding: 10,
          overflowX: "auto",
          borderBottom: "1px solid rgba(140,205,226,.15)",
        }}
      >
        {tabs.map((x) => (
          <button
            key={x}
            aria-selected={tab === x}
            style={{
              ...btn,
              background: tab === x ? "#0b7089" : "#071c33",
              whiteSpace: "nowrap",
            }}
            onClick={() => setTab(x)}
          >
            {labels[x]}
            {x === "approvals" && counts.awaiting
              ? ` (${counts.awaiting})`
              : ""}
          </button>
        ))}
      </nav>
      <div style={{ overflow: "auto", padding: 18, display: "grid", gap: 14 }}>
        {notice && (
          <div style={{ ...card, borderColor: "#ffd166", color: "#ffe7a3" }}>
            {notice}
            <button
              style={{ ...btn, marginLeft: 12 }}
              onClick={() => setNotice("")}
            >
              Dismiss
            </button>
          </div>
        )}
        {snapshot.jobs.length > 0 && (
          <JobPicker
            jobs={snapshot.jobs}
            value={selectedId}
            onChange={setSelectedId}
          />
        )}{" "}
        {tab === GOVERNED_RUNTIME_TAB_ID ? (
          <GovernedRuntimeTab
            fixtureId={runtimeFixtureId}
            onFixtureChange={setRuntimeFixtureId}
          />
        ) : !selected ? (
          <Empty text="No automation jobs are available." />
        ) : (
          <>
            {tab === "create" && <AutomationNaturalLanguageIntake />}
            {tab === "execute" && <AutomationSupervisedOrchestration />}
            {tab === "overview" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                    gap: 10,
                  }}
                >
                  {Object.entries(counts).map(([k, v]) => (
                    <article key={k} style={card}>
                      <small style={{ color: "#91bdcb" }}>
                        {k.toUpperCase()}
                      </small>
                      <b style={{ display: "block", fontSize: 28 }}>{v}</b>
                    </article>
                  ))}
                </div>
                <Summary job={selected} />
                <article style={card}>
                  <b>Governance boundary</b>
                  <p>
                    Scope-bound approvals, isolated branches, evidence, and
                    Draft PR only. Merge and production deployment remain
                    unavailable.
                  </p>
                  <button disabled style={{ ...btn, opacity: 0.45 }}>
                    Execute production unavailable
                  </button>
                </article>
              </>
            )}
            {tab === "queue" && (
              <div style={{ display: "grid", gap: 10 }}>
                {snapshot.jobs.map((j) => (
                  <article
                    key={j.jobId}
                    style={{
                      ...card,
                      borderColor:
                        j.jobId === selectedId
                          ? "#36c9e8"
                          : "rgba(148,197,218,.22)",
                    }}
                    onClick={() => setSelectedId(j.jobId)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <b>
                        Work Item {j.issueNumber} · {getRuntimeScenarioDisplayName(j.title)}
                      </b>
                      <span style={{ color: statusColor(j.state) }}>
                        {getWorkflowStateDisplayName(j.state)}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0", color: "#a8d1dd" }}>
                      {getRepositoryDisplayName(j.repository)}
                    </p>
                    <small>
                      Branch: {getBranchDisplayName(j.branch)}
                      <br />
                      Updated: {formatTimestampDisplay(j.updatedAt)}
                      <br />
                      Scope: {getScopeDisplayName(j.scopeHash)}
                    </small>
                  </article>
                ))}
              </div>
            )}
            {tab === "approvals" && (
              <article style={card}>
                <h3>Governed approval center</h3>
                <p>
                  Work Item {selected.issueNumber} · State: {getWorkflowStateDisplayName(selected.state)}
                </p>
                <p style={{ color: "#9bc8d5" }}>
                  Every decision records Rahul Kumar, a meaningful reason, exact
                  scope hash, action, timestamp, and optional expiry.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={btn}
                    onClick={() => setApprovalAction("APPROVE_SCOPE")}
                  >
                    Approve scope
                  </button>
                  <button
                    style={btn}
                    onClick={() => setApprovalAction("REJECT_SCOPE")}
                  >
                    Reject scope
                  </button>
                  <button
                    style={btn}
                    disabled={!selected.evidence.ready}
                    onClick={() => setApprovalAction("APPROVE_DRAFT_PR")}
                  >
                    Approve Draft PR
                  </button>
                  <button
                    style={btn}
                    disabled={!selected.evidence.ready}
                    onClick={() => setApprovalAction("REJECT_DRAFT_PR")}
                  >
                    Reject Draft PR
                  </button>
                </div>
                <p style={{ color: "#ffd166" }}>
                  Local audit decision only. No GitHub mutation, merge, or
                  deployment.
                </p>
              </article>
            )}
            {tab === "validation" && (
              <>
                <Summary job={selected} />
                <div style={{ display: "grid", gap: 9 }}>
                  {selected.validation.gates.map((g) => (
                    <article key={g.id} style={card}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <b>{formatValidationLabel(g.label)}</b>
                        <span
                          style={{
                            color:
                              g.status === "passed"
                                ? "#58e6b0"
                                : g.status === "failed"
                                  ? "#ff8f8f"
                                  : "#ffd166",
                          }}
                        >
                          {g.status.toUpperCase()}
                        </span>
                      </div>
                      <p>{formatValidationDetail(g.detail)}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
            {tab === "evidence" && <AutomationEvidenceViewer job={selected} />}
            {tab === "draft-prs" && <AutomationDraftPrReview job={selected} />}
            {tab === "history" && (
              <div style={{ display: "grid", gap: 9 }}>
                {selected.events.map((e) => (
                  <article
                    key={e.id}
                    style={{
                      ...card,
                      display: "grid",
                      gridTemplateColumns: "160px 1fr",
                      gap: 12,
                    }}
                  >
                    {(() => { const timestamp = formatHistoryTimestamp(e.at); return <time dateTime={timestamp.canonical} style={{ color: "#85cadb" }}>{timestamp.readable}</time>; })()}
                    <div>
                      <b>{formatHistoryEventLanguage(e.label)}</b>
                      <p style={{ margin: "5px 0" }}>{formatHistoryEventLanguage(e.detail)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {approvalAction && selected && (
        <ApprovalDialog
          action={approvalAction}
          issueNumber={selected.issueNumber}
          scopeHash={selected.scopeHash}
          onCancel={() => setApprovalAction(null)}
          onSubmit={(decision: ApprovalDecision) => {
            recordApprovalDecision(selected.jobId, decision);
            setNotice(
              `${decision.action} recorded for Issue #${selected.issueNumber}. No GitHub mutation was performed.`,
            );
            setApprovalAction(null);
          }}
        />
      )}
    </section>
  );
}
