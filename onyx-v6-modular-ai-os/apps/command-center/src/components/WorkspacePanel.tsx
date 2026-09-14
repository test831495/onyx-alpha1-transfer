import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import type { WorkspaceProviderId } from "@onyx/workspace-contracts";
import { MicrosoftFilesPanel } from "./MicrosoftFilesPanel";
import { clearMicrosoftFilesTrace, getMicrosoftFilesTrace, getMicrosoftFilesAccountKind, loadMicrosoftOneDriveRoot, loadMicrosoftSharePointFolder, reconnectMicrosoftFiles, resolveMicrosoftSharePoint, runBoundedMicrosoftOneDriveTest, runBoundedMicrosoftSharePointTest, subscribeMicrosoftFilesTrace } from "../workspaceController";
import { useEffect, useState } from "react";

const compactActionStyle: React.CSSProperties = {
  minHeight: "2.25rem",
  maxHeight: "2.5rem",
  padding: "0.45rem 0.8rem",
  fontSize: "0.85rem",
  fontWeight: 500,
  lineHeight: "1.2",
  borderRadius: "0.5rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

export const friendlyStatus = (state: string) => {
  switch (state) {
    case "unconfigured":
    case "disconnected":
      return "Not Connected";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Available";
    case "connected-partial":
      return "Connected Partial";
    case "connected-empty":
      return "Connected Empty";
    case "reauthentication-required":
      return "Reconnect Required";
    case "insufficient-scope":
      return "Insufficient Scope";
    case "unavailable":
      return "Unavailable";
    case "rate-limited":
      return "Temporarily Rate Limited";
    case "error":
      return "Error";
    default:
      return "Unavailable";
  }
};

export function WorkspacePanel({ snapshot, busy, onConnect, onReconnect, onDisconnect, onRefresh, onProviderAction = () => undefined }: { snapshot: WorkspaceSnapshot; busy: boolean; onConnect: () => void; onReconnect: () => void; onDisconnect: () => void; onRefresh: () => void; onProviderAction?: (provider: WorkspaceProviderId, action: "connect" | "reconnect" | "disconnect" | "refresh") => void; }) {
  const [filesTrace, setFilesTrace] = useState(getMicrosoftFilesTrace);
  useEffect(() => subscribeMicrosoftFilesTrace(() => setFilesTrace(getMicrosoftFilesTrace())), []);
   return <section id="panel-workspace" className="glass-surface" style={{ margin:"0.75rem", padding:"1rem", borderRadius:"1.25rem", display:"grid", gap:"0.9rem", maxWidth:"100%", boxSizing:"border-box" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.75rem", flexWrap:"wrap", minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <small style={{ color: "#7ea1b8", letterSpacing: "1px", textTransform: "uppercase", fontSize: "0.75rem" }}>Connected Services</small>
        <h2 style={{ margin:"0.2rem 0", fontSize: "1.35rem" }}>Workspace</h2>
      </div>
      <button style={compactActionStyle} type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh workspace status" title={busy ? "Refresh is unavailable while status is loading." : "Refresh workspace status"}>Refresh Status</button>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))", gap:"0.85rem", maxWidth:"100%", minWidth: 0, alignItems: "start" }}>
      {snapshot.providers.map(provider => {
        const stateLabel = friendlyStatus(provider.state);
        const isMicrosoft = provider.provider === "microsoft";
        const isGoogle = provider.provider === "google";
        const disabledReason = busy ? "Refresh is unavailable while status is loading." : provider.state === "unconfigured" ? "Connect Microsoft unavailable because Microsoft is not configured." : undefined;
        return <article key={provider.provider} className="glass-surface" style={{ padding:"0.85rem", borderRadius:"1rem", display:"flex", flexDirection:"column", gap:"0.65rem", minWidth: 0, maxWidth:"100%", boxSizing:"border-box" }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:"0.5rem", alignItems:"center", flexWrap:"wrap", minWidth: 0 }}>
            <b style={{ minWidth: 0, overflowWrap: "anywhere" }}>{provider.label}</b>
            <span aria-live="polite" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "0.4rem", background: "rgba(255, 255, 255, 0.06)", whiteSpace: "nowrap" }}>{stateLabel}</span>
          </div>
          <div style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {provider.profile ? <>
              <strong style={{ display: "block", overflowWrap: "anywhere" }}>{provider.profile.displayName}</strong>
              {provider.profile.email && <small style={{ display: "block", marginTop: "0.25rem", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>{provider.profile.email}</small>}
            </> : <p style={{ margin: 0, overflowWrap: "anywhere", wordBreak: "break-word", fontSize: "0.85rem" }}>{provider.diagnostic}</p>}
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", display: "grid", gap: "0.25rem", minWidth: 0, overflowWrap: "anywhere" }}>{provider.capabilities.map(capability => <li key={capability.id} style={{ minWidth: 0, overflowWrap: "anywhere" }}>{capability.enabled ? "Available" : isGoogle ? "Unavailable" : "Coming Soon"} · {capability.label}</li>)}</ul>
          {isMicrosoft && <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center", minWidth: 0 }}>{provider.state === "connected" ? <><button style={compactActionStyle} type="button" onClick={onReconnect} disabled={busy} aria-label="Reconnect Microsoft workspace" title={busy ? "Reconnect is unavailable while status is loading." : "Reconnect workspace"}>Reconnect</button><button style={compactActionStyle} type="button" onClick={onDisconnect} disabled={busy} aria-label="Disconnect Microsoft workspace" title={busy ? "Disconnect is unavailable while status is loading." : "Disconnect workspace"}>Disconnect</button></> : <button style={compactActionStyle} type="button" onClick={onConnect} disabled={busy || provider.state === "unconfigured"} aria-label={provider.state === "unconfigured" ? "Connect Microsoft unavailable because Microsoft is not configured" : "Connect Microsoft workspace"} title={disabledReason ?? "Connect Microsoft workspace"}>Connect</button>}<button style={compactActionStyle} type="button" onClick={onRefresh} disabled={busy} aria-label="Refresh Microsoft workspace status" title={busy ? "Refresh is unavailable while status is loading." : "Refresh workspace status"}>Refresh Status</button></div>}
          {isMicrosoft && <div className="workspace-files-content" style={{ minWidth: 0, maxWidth: "100%" }}><MicrosoftFilesPanel available={provider.state === "connected" && provider.capabilities.some((capability) => capability.id === "files" && capability.enabled)} onRead={async (continuation) => (await loadMicrosoftOneDriveRoot(continuation)).listing} onWriteTest={runBoundedMicrosoftOneDriveTest} onReconnectFiles={reconnectMicrosoftFiles} sharePointAccountKind={getMicrosoftFilesAccountKind()} sharePointAvailable={provider.state === "connected" && provider.capabilities.some((capability) => capability.id === "sharepoint" && capability.enabled)} onResolveSharePoint={resolveMicrosoftSharePoint} onReadSharePoint={loadMicrosoftSharePointFolder} onWriteSharePointTest={runBoundedMicrosoftSharePointTest} runtimeTrace={filesTrace} onTraceClear={clearMicrosoftFilesTrace} /></div>}
          {isGoogle && <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center", minWidth: 0 }}>{provider.state === "connected" || provider.state === "connected-partial" ? <><button style={compactActionStyle} type="button" onClick={() => onProviderAction("google", "reconnect")} disabled={busy} aria-label="Reconnect Google workspace" title={busy ? "Reconnect is unavailable while status is loading." : "Reconnect Google workspace"}>Reconnect</button><button style={compactActionStyle} type="button" onClick={() => onProviderAction("google", "disconnect")} disabled={busy} aria-label="Disconnect Google workspace" title={busy ? "Disconnect is unavailable while status is loading." : "Disconnect Google workspace"}>Disconnect</button></> : <button style={compactActionStyle} type="button" onClick={() => onProviderAction("google", "connect")} disabled={busy} aria-label="Connect Google workspace" title={busy ? "Connect is unavailable while status is loading." : "Connect Google workspace"}>Connect Google</button>}<button style={compactActionStyle} type="button" onClick={() => onProviderAction("google", "refresh")} disabled={busy} aria-label="Refresh Google workspace status" title={busy ? "Refresh is unavailable while status is loading." : "Refresh workspace status"}>Refresh Status</button></div>}
        </article>;
      })}
    </div>
  </section>;
}
