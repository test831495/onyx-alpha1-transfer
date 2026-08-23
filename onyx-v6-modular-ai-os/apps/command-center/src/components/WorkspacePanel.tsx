import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";

const friendlyStatus = (state: string) => {
  switch (state) {
    case "connected":
      return "Available";
    case "disconnected":
    case "unconfigured":
    case "error":
      return "Not Connected";
    default:
      return "Coming Soon";
  }
};

export function WorkspacePanel({ snapshot, busy, onConnect, onDisconnect, onRefresh }: { snapshot: WorkspaceSnapshot; busy: boolean; onConnect: () => void; onDisconnect: () => void; onRefresh: () => void; }) {
  return <section id="panel-workspace" className="glass-surface" style={{ margin:"1rem", padding:"1rem", borderRadius:"1.25rem", display:"grid", gap:"0.9rem" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}><div><small>Connected Services</small><h2 style={{ margin:"0.2rem 0" }}>Workspace</h2></div><button type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh workspace status" title={busy ? "Refresh is unavailable while status is loading." : "Refresh workspace status"}>Refresh Status</button></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))", gap:"0.75rem" }}>
      {snapshot.providers.map(provider => {
        const stateLabel = friendlyStatus(provider.state);
        const isMicrosoft = provider.provider === "microsoft";
        const disabledReason = busy ? "Refresh is unavailable while status is loading." : provider.state === "unconfigured" ? "This service is not connected yet." : undefined;
        return <article key={provider.provider} className="glass-surface" style={{ padding:"0.85rem", borderRadius:"1rem", display:"grid", gap:"0.6rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:"0.5rem", alignItems:"center" }}><b>{provider.label}</b><span aria-live="polite">{stateLabel}</span></div>
          <div style={{ minWidth: 0 }}>
            {provider.profile ? <>
              <strong style={{ display: "block", overflowWrap: "anywhere" }}>{provider.profile.displayName}</strong>
              {provider.profile.email && <small style={{ display: "block", marginTop: "0.25rem", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>{provider.profile.email}</small>}
            </> : <p style={{ margin: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>{provider.diagnostic}</p>}
          </div>
          <ul>{provider.capabilities.map(capability => <li key={capability.id}>{capability.enabled ? "Available" : "Coming Soon"} · {capability.label}</li>)}</ul>
          {isMicrosoft && <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>{provider.state === "connected" ? <button type="button" onClick={onDisconnect} disabled={busy} aria-label="Manage Microsoft workspace" title={busy ? "Manage is unavailable while status is loading." : "Manage workspace"}>Manage</button> : <button type="button" onClick={onConnect} disabled={busy || provider.state === "unconfigured"} aria-label={provider.state === "unconfigured" ? "Connect Microsoft service is unavailable because it is not connected" : "Connect Microsoft workspace"} title={disabledReason ?? "Connect Microsoft workspace"}>Connect</button>}<button type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh Microsoft workspace status" title={busy ? "Refresh is unavailable while status is loading." : "Refresh workspace status"}>Refresh Status</button></div>}
        </article>;
      })}
    </div>
  </section>;
}
