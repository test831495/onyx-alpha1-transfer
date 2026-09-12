import type { MicrosoftMailMessage, MicrosoftMailDiagnosticReasonCode, MicrosoftMailRuntimeTrace } from "@onyx/workspace-connectors";

export function MailPanel({
  connected,
  busy,
  messages,
  reasonCode,
  runtimeTrace,
  diagnosticsEnabled = false,
  onConnect,
  onRefresh,
  onTraceClear = () => {},
}: {
  connected: boolean;
  busy: boolean;
  messages: readonly MicrosoftMailMessage[];
  reasonCode?: MicrosoftMailDiagnosticReasonCode;
  runtimeTrace?: MicrosoftMailRuntimeTrace;
  diagnosticsEnabled?: boolean;
  onConnect: () => void;
  onRefresh: () => void;
  onTraceClear?: () => void;
}) {
  const permissionRequired = reasonCode === "MAIL_PERMISSION_REQUIRED" || reasonCode === "MAIL_AUTHENTICATION_REQUIRED" || reasonCode === "MAIL_SCOPE_MISSING" || reasonCode === "MAIL_SCOPE_NOT_INSPECTABLE";
  const empty = messages.length === 0 && (reasonCode === "MAIL_EMPTY" || reasonCode === "MAIL_RETRY_SUCCEEDED");
  const failed = Boolean(reasonCode) && !empty && !permissionRequired;
  return (
    <section id="panel-mail" className="glass-surface" style={{ margin: "1rem", padding: "1rem", borderRadius: "1.25rem", display: "grid", gap: ".8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
        <div><small>Microsoft 365</small><h2 style={{ margin: ".2rem 0 0" }}>Outlook Mail</h2></div>
        {connected && <button type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh Mail">Refresh Mail</button>}
      </div>
      <div aria-live="polite" style={{ display: "grid", gap: ".75rem" }}>
        {busy ? <strong>Loading recent mail</strong> : permissionRequired ? <><strong>Mail permission required.</strong><button type="button" onClick={onConnect}>Reconnect Outlook Mail</button></> : failed ? <><strong>Outlook Mail is temporarily unavailable.</strong><button type="button" onClick={onConnect}>Reconnect Outlook Mail</button></> : !connected ? <><strong>Outlook Mail is not connected.</strong><button type="button" onClick={onConnect}>Connect Outlook Mail</button></> : empty ? <strong>No recent mail available.</strong> : messages.slice(0, 10).map((message, index) => <article key={`${message.receivedAt}-${index}`} className="glass-surface" style={{ padding: ".8rem", borderRadius: "1rem", display: "grid", gap: ".25rem" }}><strong>{message.subject || "Untitled message"}</strong><span>{message.senderDisplayName}</span><small>{new Date(message.receivedAt).toLocaleString()}</small><small>{message.isRead ? "Read" : "Unread"} {message.hasAttachments ? "• Has attachments" : ""}</small></article>)}
      </div>
      {diagnosticsEnabled && runtimeTrace && <details open style={{ border: "1px solid rgba(101,217,239,.35)", padding: ".6rem", borderRadius: ".5rem" }}><summary>Diagnostic · privacy-safe</summary><dl><dt>Build</dt><dd>{runtimeTrace.buildIdentity.sha} · {runtimeTrace.buildIdentity.context} · {runtimeTrace.buildIdentity.version}</dd><dt>Stage</dt><dd>{runtimeTrace.stage}</dd><dt>Status</dt><dd>{runtimeTrace.statusClass}</dd><dt>Token stage</dt><dd>{runtimeTrace.tokenStage}</dd><dt>Binding</dt><dd>{runtimeTrace.accountBindingEvidence.bindingDecision}</dd><dt>Envelope</dt><dd>{runtimeTrace.responseEnvelopeClass}</dd><dt>Items</dt><dd>{runtimeTrace.normalizedItemCount} normalized · {runtimeTrace.rejectedItemCount} rejected</dd></dl><button type="button" onClick={onTraceClear}>Clear diagnostic</button></details>}
    </section>
  );
}