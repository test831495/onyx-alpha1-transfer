import type { MicrosoftMailMessage, MicrosoftMailDiagnosticReasonCode } from "@onyx/workspace-connectors";

export function MailPanel({
  connected,
  busy,
  messages,
  reasonCode,
  onConnect,
  onRefresh,
}: {
  connected: boolean;
  busy: boolean;
  messages: readonly MicrosoftMailMessage[];
  reasonCode?: MicrosoftMailDiagnosticReasonCode;
  onConnect: () => void;
  onRefresh: () => void;
}) {
  const permissionRequired = reasonCode === "MAIL_PERMISSION_REQUIRED" || reasonCode === "MAIL_AUTHENTICATION_REQUIRED" || reasonCode === "MAIL_SCOPE_MISSING" || reasonCode === "MAIL_SCOPE_NOT_INSPECTABLE";
  const empty = reasonCode === "MAIL_EMPTY";
  const failed = Boolean(reasonCode) && !empty && !permissionRequired;
  return (
    <section id="panel-mail" className="glass-surface" style={{ margin: "1rem", padding: "1rem", borderRadius: "1.25rem", display: "grid", gap: ".8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
        <div><small>Microsoft 365</small><h2 style={{ margin: ".2rem 0 0" }}>Outlook Mail</h2></div>
        {connected && <button type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh Mail">Refresh Mail</button>}
      </div>
      <div aria-live="polite" style={{ display: "grid", gap: ".75rem" }}>
        {!connected ? <><strong>Outlook Mail is not connected.</strong><button type="button" onClick={onConnect} disabled={busy}>Connect Outlook Mail</button></> : busy ? <strong>Loading recent mail</strong> : permissionRequired ? <><strong>Mail permission required.</strong><button type="button" onClick={onConnect}>Reconnect Outlook Mail</button></> : empty ? <strong>No recent mail available.</strong> : failed ? <strong>Outlook Mail is temporarily unavailable.</strong> : messages.slice(0, 10).map((message, index) => <article key={`${message.receivedAt}-${index}`} className="glass-surface" style={{ padding: ".8rem", borderRadius: "1rem", display: "grid", gap: ".25rem" }}><strong>{message.subject || "Untitled message"}</strong><span>{message.senderDisplayName}</span><small>{new Date(message.receivedAt).toLocaleString()}</small><small>{message.isRead ? "Read" : "Unread"} {message.hasAttachments ? "• Has attachments" : ""}</small></article>)}
      </div>
    </section>
  );
}