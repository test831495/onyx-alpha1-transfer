import type { CSSProperties } from "react";
import type { RuntimeSnapshot } from "@onyx/phase1a6-workflow-runtime/browser";
import { getCapabilityDisplayName, getCheckpointDisplayName, getWorkflowStateDisplayName } from "../presentationLabels";

const card: CSSProperties = { border: "1px solid rgba(148,197,218,.22)", background: "rgba(5,23,42,.72)", borderRadius: 14, padding: 14 };
const pill = (ok: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 76,
  minHeight: 28,
  padding: "5px 12px",
  borderRadius: 999,
  border: ok ? "1px solid rgba(114,237,190,.3)" : "1px solid rgba(255,170,170,.3)",
  background: ok ? "rgba(70,210,165,.16)" : "rgba(255,143,143,.16)",
  color: ok ? "#72edbe" : "#ffaaaa",
  fontWeight: 800,
});

/** Recovery panel view model. Reads exclusively from the trusted checkpoint chain; performs no remote repair. */
export interface RecoveryPanelViewModel {
  readonly lastTrustedCheckpointDigest: string | null;
  readonly checkpointCount: number;
  readonly targetState: string;
  readonly firstIncompleteCapability: string | null;
  readonly recoveryAvailable: boolean;
  readonly blockedReason: string | null;
  readonly scopeVerified: boolean;
  readonly approvalVerified: boolean;
  readonly checkpointChainVerified: boolean;
  readonly repositoryVerified: boolean;
}

export interface BuildRecoveryPanelViewModelOptions {
  scopeVerified: boolean;
  approvalVerified: boolean;
  checkpointChainVerified: boolean;
  repositoryVerified: boolean;
  blockedReason?: string | null;
}

/** Derives the read-only recovery view model exclusively from the reused Phase 1A.6 `RuntimeSnapshot`. */
export function buildRecoveryPanelViewModel(snapshot: RuntimeSnapshot, options: BuildRecoveryPanelViewModelOptions): RecoveryPanelViewModel {
  const allVerified = options.scopeVerified && options.approvalVerified && options.checkpointChainVerified && options.repositoryVerified;
  const blockedReason = options.blockedReason ?? (snapshot.reconciliationRequired
    ? "Reconciliation is required; automatic recovery is not permitted."
    : !allVerified
      ? "One or more trust checks failed verification."
      : null);
  return {
    lastTrustedCheckpointDigest: snapshot.latestCheckpointDigest,
    checkpointCount: snapshot.checkpointCount,
    targetState: snapshot.currentWorkflowState,
    firstIncompleteCapability: snapshot.pendingCapabilities[0] ?? null,
    recoveryAvailable: snapshot.recoveryAvailable && !snapshot.reconciliationRequired && allVerified,
    blockedReason,
    scopeVerified: options.scopeVerified,
    approvalVerified: options.approvalVerified,
    checkpointChainVerified: options.checkpointChainVerified,
    repositoryVerified: options.repositoryVerified,
  };
}

export function AutomationRecoveryPanel({ recovery }: { recovery: RecoveryPanelViewModel }) {
  const verificationRows: Array<[string, boolean]> = [
    ["Scope verified", recovery.scopeVerified],
    ["Approval verified", recovery.approvalVerified],
    ["Checkpoint-chain verified", recovery.checkpointChainVerified],
    ["Repository verified", recovery.repositoryVerified],
  ];

  return (
    <div aria-label="Automation runtime recovery panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#65d9ef" }}>Recovery Information</small>
          <h4 style={{ margin: "4px 0" }}>Recovery</h4>
        </div>
        <span style={pill(recovery.recoveryAvailable)}>{recovery.recoveryAvailable ? "Recovery Option Available" : "Recovery Blocked"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Last trusted checkpoint</small>
          <p style={{ overflowWrap: "anywhere" }}>{recovery.lastTrustedCheckpointDigest ? getCheckpointDisplayName(recovery.lastTrustedCheckpointDigest) : "None recorded"}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Checkpoint count</small>
          <p>{recovery.checkpointCount}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>Target state</small>
          <p>{getWorkflowStateDisplayName(recovery.targetState)}</p>
        </article>
        <article style={card}>
          <small style={{ color: "#91bdcb" }}>First incomplete capability</small>
          <p>{recovery.firstIncompleteCapability ? getCapabilityDisplayName(recovery.firstIncompleteCapability) : "None"}</p>
        </article>
      </div>

      <article style={card}>
        <small style={{ color: "#91bdcb" }}>Trust verification</small>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {verificationRows.map(([label, ok]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{label}</span>
              <span style={pill(ok)}>{ok ? "Verified" : "Failed"}</span>
            </div>
          ))}
        </div>
      </article>

      {recovery.blockedReason && (
        <p style={{ color: "#ffd166" }}>Blocked reason: {recovery.blockedReason}</p>
      )}

      <p style={{ color: "#9bc8d5" }}>Recovery never repairs a remote resource; it only reconstructs trusted local runtime state.</p>
    </div>
  );
}
