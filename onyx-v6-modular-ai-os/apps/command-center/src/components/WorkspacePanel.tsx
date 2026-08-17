import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
export function WorkspacePanel({ snapshot, busy, onConnect, onDisconnect, onRefresh }: { snapshot: WorkspaceSnapshot; busy: boolean; onConnect: () => void; onDisconnect: () => void; onRefresh: () => void; }) {
  return <section id="panel-workspace" className="glass-surface" style={{ margin:"1rem", padding:"1rem", borderRadius:"1.25rem", display:"grid", gap:"0.9rem" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}><div><small>PHASE 1 WORKSPACE</small><h2 style={{ margin:"0.2rem 0" }}>Connected providers</h2></div><button onClick={onRefresh} disabled={busy}>Refresh status</button></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))", gap:"0.75rem" }}>
      {snapshot.providers.map(provider => <article key={provider.provider} className="glass-surface" style={{ padding:"0.85rem", borderRadius:"1rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:"0.5rem" }}><b>{provider.label}</b><span>{provider.state.toUpperCase()}</span></div>
        <div style={{ minWidth: 0 }}>
          {provider.profile ? <>
            <strong style={{ display: "block", overflowWrap: "anywhere" }}>{provider.profile.displayName}</strong>
            {provider.profile.email && <small style={{ display: "block", marginTop: "0.25rem", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>{provider.profile.email}</small>}
          </> : <p style={{ margin: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>{provider.diagnostic}</p>}
        </div>
        <ul>{provider.capabilities.map(capability => <li key={capability.id}>{capability.enabled ? "READY" : "PLANNED"} · {capability.label}{capability.plannedRelease ? ` · ${capability.plannedRelease}` : ""}</li>)}</ul>
        {provider.provider === "microsoft" && <div style={{ display:"flex", gap:"0.5rem" }}>{provider.state === "connected" ? <button onClick={onDisconnect} disabled={busy}>Disconnect</button> : <button onClick={onConnect} disabled={busy || provider.state === "unconfigured"}>Connect Microsoft</button>}</div>}
      </article>)}
    </div>
  </section>;
}
