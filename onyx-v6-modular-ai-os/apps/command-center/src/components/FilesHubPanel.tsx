import { useState } from "react";
import type { FileSourceProjection } from "@onyx/workspace-contracts";
import { detectLocalFileCapabilities, selectLocalDirectory, selectLocalFile, type LocalSelection } from "../localFilesProvider";

export interface FilesHubPanelProps { readonly sources: readonly FileSourceProjection[]; readonly onMicrosoftAction?: (action: "OPEN" | "CONNECT" | "RECONNECT") => void; readonly onGoogleAction?: (action: "OPEN" | "CONNECT" | "REFRESH") => void; }

const localCapabilities = detectLocalFileCapabilities();

export function FilesHubPanel({ sources, onMicrosoftAction = () => undefined, onGoogleAction = () => undefined }: FilesHubPanelProps) {
  const [selection, setSelection] = useState<LocalSelection>();
  const [localMessage, setLocalMessage] = useState("No local file or folder selected.");
  const local = sources.find((source) => source.sourceId === "local");
  const actionFor = (source: FileSourceProjection): (() => void) => {
    if (source.sourceId === "microsoft-onedrive") return () => onMicrosoftAction(source.availability === "CONNECTED" ? "OPEN" : source.availability === "ERROR" ? "RECONNECT" : "CONNECT");
    if (source.sourceId === "google-drive") return () => onGoogleAction(source.availability === "CONNECTED" ? "OPEN" : "CONNECT");
    return () => undefined;
  };
  const openFile = async () => { try { const next = await selectLocalFile(); if (next) { setSelection(next); setLocalMessage(`Selected ${next.name}.`); } else setLocalMessage("Local file selection cancelled."); } catch { setLocalMessage("Local file permission was denied."); } };
  const openFolder = async () => { try { const next = await selectLocalDirectory(); if (next) { setSelection(next); setLocalMessage(`Selected ${next.name} with ${next.entries?.length ?? 0} bounded items.`); } else setLocalMessage("Local folder selection cancelled."); } catch { setLocalMessage("Local folder permission was denied."); } };
  return <section aria-labelledby="files-hub-heading" style={{ display: "grid", gap: "1rem", padding: "1rem", minWidth: 0 }}>
    <header><h2 id="files-hub-heading" style={{ margin: 0 }}>Files</h2><p style={{ margin: "0.35rem 0 0" }}>Browse local and connected file sources.</p></header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(17rem, 100%), 1fr))", gap: "0.8rem", minWidth: 0 }}>
      {sources.map((source) => <article key={source.sourceId} style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.85rem", display: "grid", gap: "0.55rem", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}><b>{source.displayName}</b><span aria-live="polite">{source.availability}</span></div>
        <small>{source.capabilities.filter((capability) => capability.enabled).map((capability) => capability.operation).join(", ") || "No operations currently available"}</small>
        {source.sourceId === "local" ? <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><button type="button" onClick={() => void openFile()} disabled={localCapabilities.filePicker !== "LOCAL_FILE_PICKER_SUPPORTED"}>Open local file</button><button type="button" onClick={() => void openFolder()} disabled={localCapabilities.directoryPicker !== "LOCAL_DIRECTORY_PICKER_SUPPORTED"}>Open local folder</button></div> : <button type="button" onClick={actionFor(source)}>{source.availability === "CONNECTED" ? `Open ${source.displayName}` : source.availability === "ERROR" ? "Reconnect" : "Connect"}</button>}
        {source.diagnostic?.reasonCode && <small role="status">{source.diagnostic.reasonCode}</small>}
        {source.sourceId === "local" && <small role="status">{localMessage}{selection ? ` ${selection.kind === "directory" ? `${selection.entries?.length ?? 0} items shown.` : `${selection.size ?? 0} bytes.`}` : ""}</small>}
      </article>)}
    </div>
    {!local && <small role="alert">Local Files source is unavailable.</small>}
  </section>;
}