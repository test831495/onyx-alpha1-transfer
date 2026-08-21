import type { CSSProperties } from "react";
import type { ReconciliationHandoff } from "@onyx/phase1a6-workflow-runtime";
import type { AutomationRuntimeProjection } from "../automationRuntimeProjection";
import { AutomationConnectorScopePanel } from "./AutomationConnectorScopePanel";
import { AutomationRecoveryPanel, type RecoveryPanelViewModel } from "./AutomationRecoveryPanel";
import { AutomationReconciliationPanel } from "./AutomationReconciliationPanel";
import { AutomationRuntimeBudgetPanel } from "./AutomationRuntimeBudgetPanel";
import { AutomationRuntimeEvidenceTimeline, type EvidenceTimelineEntry } from "./AutomationRuntimeEvidenceTimeline";
import { AutomationRuntimeIdentityPanel } from "./AutomationRuntimeIdentityPanel";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };
const btn: CSSProperties = {
  border: "1px solid rgba(124,211,239,.35)",
  background: "#071c33",
  color: "#d9f7ff",
  padding: "9px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};
const btnDisabled: CSSProperties = { ...btn, opacity: 0.4, cursor: "not-allowed" };
const safetyPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 90,
  minHeight: 28,
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,170,170,.3)",
  background: "rgba(255,143,143,.16)",
  color: "#ffaaaa",
  fontWeight: 800,
};

/** Read-only Phase 1A.5 approval package display. Reused from the frozen approval contract; never re-submits. */
export interface ApprovalReadOnlyProjection {
  readonly approver: string;
  readonly scopeHash: string;
  readonly orderedCapabilityCount: number;
  readonly approvalDigest: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly consumed: boolean;
}

/** Structurally compatible with the frozen Phase 1A.5 `ApprovalPackage`. Builds a read-only display projection. */
export function buildApprovalReadOnlyProjection(approval: {
  approver: string;
  scopeHash: string;
  orderedCapabilities: readonly unknown[];
  digest: string;
  issuedAt: string;
  expiresAt: string;
  consumed: boolean;
}): ApprovalReadOnlyProjection {
  return {
    approver: approval.approver,
    scopeHash: approval.scopeHash,
    orderedCapabilityCount: approval.orderedCapabilities.length,
    approvalDigest: approval.digest,
    issuedAt: approval.issuedAt,
    expiresAt: approval.expiresAt,
    consumed: approval.consumed,
  };
}

export interface AutomationRuntimeDashboardProps {
  projection: AutomationRuntimeProjection;
  recovery?: RecoveryPanelViewModel;
  reconciliation?: ReconciliationHandoff | null;
  evidenceEntries?: readonly EvidenceTimelineEntry[];
  approval?: ApprovalReadOnlyProjection | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRecover?: () => void;
  actionError?: string | null;
}

/**
 * Phase 1A.7 Automation Center runtime dashboard. Extends the existing
 * Automation Center; it never replaces `AutomationDashboard`. It displays a
 * mock or local-simulation runtime only, and it never calls GitHub, Git, a
 * connector, a paid API, a child process, or any shell interface.
 */
export function AutomationRuntimeDashboard({
  projection,
  recovery,
  reconciliation,
  evidenceEntries,
  approval,
  onPause,
  onResume,
  onCancel,
  onRecover,
  actionError,
}: AutomationRuntimeDashboardProps) {
  const safetyFlags: Array<[string, boolean]> = [
    ["Merge allowed", projection.mergeAllowed],
    ["Production deploy allowed", projection.productionDeployAllowed],
    ["Force push allowed", projection.forcePushAllowed],
    ["Branch deletion allowed", projection.branchDeletionAllowed],
  ];

  return (
    <section aria-label="ONYX Automation Center runtime dashboard" style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#65d9ef" }}>
            PHASE 1A.7 · GOVERNED RUNTIME PROJECTION · {projection.noLiveWorkflowExecuting ? "NO LIVE GITHUB WORKFLOW IS EXECUTING" : ""}
          </small>
          <h3 style={{ margin: "4px 0" }}>
            {projection.repository} · {projection.currentState}
          </h3>
          <p style={{ margin: "4px 0", color: "#9ac7d6" }}>
            Runtime status: {projection.runtimeStatus} · Current capability: {projection.currentCapability ?? "None"} · Lane limit: {projection.executionLaneLimit}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {safetyFlags.map(([label, allowed]) => (
            <span key={label} style={safetyPill}>{label}: {allowed ? "YES" : "NO"}</span>
          ))}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Scope hash</small>
          <p style={{ overflowWrap: "anywhere" }}>{projection.scopeHash}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Checkpoints</small>
          <p>{projection.checkpointCount} · digest {projection.latestCheckpointDigest ?? "none"}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Evidence</small>
          <p>{projection.evidenceCount} · latest sequence {projection.latestEvidenceSequence ?? "none"}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Reconciliation required</small>
          <p>{projection.reconciliationRequired ? "YES" : "NO"}</p>
        </article>
      </div>

      <article style={card}>
        <small style={{ color: "#91bdcb" }}>Ordered capability progress</small>
        <p style={{ margin: "6px 0" }}>
          Completed: {projection.completedCapabilities.join(", ") || "None"}
        </p>
        <p style={{ margin: "6px 0" }}>
          Pending: {projection.pendingCapabilities.join(", ") || "None"}
        </p>
      </article>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={projection.pauseAvailable && onPause ? btn : btnDisabled} disabled={!projection.pauseAvailable || !onPause} onClick={onPause}>Pause</button>
        <button type="button" style={projection.resumeAvailable && onResume ? btn : btnDisabled} disabled={!projection.resumeAvailable || !onResume} onClick={onResume}>Resume</button>
        <button type="button" style={projection.cancelAvailable && onCancel ? btn : btnDisabled} disabled={!projection.cancelAvailable || !onCancel} onClick={onCancel}>Cancel</button>
        <button type="button" style={projection.recoveryAvailable && onRecover ? btn : btnDisabled} disabled={!projection.recoveryAvailable || !onRecover} onClick={onRecover}>Recover</button>
      </div>

      {actionError && <p style={{ color: "#ffaaaa" }}>{actionError}</p>}

      <AutomationRuntimeIdentityPanel identity={projection.identity} />
      <AutomationConnectorScopePanel connectors={projection.connectors} />
      <AutomationRuntimeBudgetPanel
        budget={projection.budget}
        modelRoutingClass={projection.modelRoutingClass}
        voiceMetadataProviderNeutralReady={projection.voiceMetadataProviderNeutralReady}
      />

      {evidenceEntries && <AutomationRuntimeEvidenceTimeline entries={evidenceEntries} />}
      {recovery && <AutomationRecoveryPanel recovery={recovery} />}
      <AutomationReconciliationPanel handoff={reconciliation ?? null} />

      {approval && (
        <article aria-label="Read-only workflow approval package" style={card}>
          <small style={{ color: "#65d9ef" }}>PHASE 1A.5 APPROVAL PACKAGE, READ-ONLY, NO SUBMISSION</small>
          <p style={{ margin: "6px 0", overflowWrap: "anywhere" }}>
            Approver: {approval.approver}
            <br />
            Scope hash: {approval.scopeHash}
            <br />
            Ordered capability count: {approval.orderedCapabilityCount}
            <br />
            Approval digest: {approval.approvalDigest}
            <br />
            Issued: {approval.issuedAt}
            <br />
            Expires: {approval.expiresAt}
            <br />
            Consumed: {approval.consumed ? "YES" : "NO"}
          </p>
        </article>
      )}
    </section>
  );
}
