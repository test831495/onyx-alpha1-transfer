import { useEffect, useState } from "react";
import type { FileSourceProjection, LocalPreviewState } from "@onyx/workspace-contracts";
import { convertImage, createPreviewUrl, detectLocalFileCapabilities, formatBytes, readTextPreview, revokePreviewUrl, saveAs, selectLocalDirectory, selectLocalFile, selectLocalFileFallback, type LocalSelection, writeToHandle } from "../localFilesProvider";

export interface FilesHubPanelProps { readonly sources: readonly FileSourceProjection[]; readonly onMicrosoftAction?: (action: "OPEN" | "CONNECT" | "RECONNECT") => void; readonly onGoogleAction?: (action: "OPEN" | "CONNECT" | "REFRESH") => void; }
const localCapabilities = detectLocalFileCapabilities();
const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);
const prettyPreviewState: Record<LocalPreviewState, string> = { NOT_REQUESTED: "Not opened", AVAILABLE: "Available", UNSUPPORTED: "Preview unavailable", UNAVAILABLE: "Preview unavailable", TOO_LARGE: "Preview unavailable due to size", FAILED: "Preview failed" };

function LocalFileWorkspace() {
  const [selection, setSelection] = useState<LocalSelection>();
  const [directory, setDirectory] = useState<{ readonly name: string; readonly entries: readonly { readonly name: string; readonly kind: "file" | "directory"; readonly size?: number; readonly modifiedAt?: number; readonly mimeType?: string }[] }>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewState, setPreviewState] = useState<LocalPreviewState>("NOT_REQUESTED");
  const [message, setMessage] = useState("No local file or folder selected.");
  const [busy, setBusy] = useState(false);
  const [outputMimeType, setOutputMimeType] = useState<string>();

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl]);
  useEffect(() => {
    revokePreviewUrl(previewUrl);
    setPreviewUrl(undefined);
    setText("");
    setDirty(false); setOutputMimeType(undefined);
    if (!selection) { setPreviewState("NOT_REQUESTED"); return; }
    if (imageMimeTypes.has(selection.projection.mimeType)) { setPreviewUrl(createPreviewUrl(selection.file)); setPreviewState("AVAILABLE"); return; }
    void readTextPreview(selection.file).then((result) => { setText(result.text ?? ""); setPreviewState(result.state); });
  }, [selection?.projection.selectionId]);

  const replaceSelection = (next: LocalSelection | undefined) => {
    if (dirty && !window.confirm("Discard unsaved local changes?")) return;
    setDirectory(undefined); setSelection(next); setMessage(next ? `Selected ${next.projection.name}.` : "Local selection cleared.");
  };
  const openFile = async () => { try { const next = localCapabilities.filePicker === "LOCAL_FILE_PICKER_SUPPORTED" ? await selectLocalFile() : await selectLocalFileFallback(); if (next) replaceSelection(next); else setMessage("Local file selection cancelled."); } catch { setMessage("Local file permission was denied."); } };
  const openFolder = async () => { try { const next = await selectLocalDirectory(); if (next) { if (dirty && !window.confirm("Discard unsaved local changes?")) return; setSelection(undefined); setDirectory(next); setMessage(`Selected ${next.name}.`); } else setMessage("Local folder selection cancelled."); } catch { setMessage("Local folder permission was denied."); } };
  const content = selection ? (selection.projection.editCapability ? new Blob([text], { type: selection.projection.mimeType }) : selection.file) : undefined;
  const saveOriginal = async () => { if (!selection?.handle || !content || !selection.projection.originalSaveCapability) return; if (!window.confirm(`Save changes to original ${selection.projection.name}?`)) return; setBusy(true); try { await writeToHandle(selection.handle, content, selection.file); setDirty(false); setSelection({ ...selection, projection: { ...selection.projection, dirty: false } }); setMessage("Original file saved and verified by the browser write completion."); } catch (error) { setMessage(error instanceof Error && error.message.includes("changed") ? "Save stopped because the original file changed. Reload or use Save As." : "Original save could not be completed."); } finally { setBusy(false); } };
  const saveCopy = async () => { if (!selection || !content) return; setBusy(true); try { const output = outputMimeType && outputMimeType !== selection.projection.mimeType ? await convertImage(selection.file, outputMimeType) : content; const extension = outputMimeType === "image/jpeg" ? ".jpg" : outputMimeType === "image/webp" ? ".webp" : outputMimeType === "image/png" ? ".png" : selection.projection.extension; const name = extension && selection.projection.name.toLowerCase().endsWith(selection.projection.extension) ? `${selection.projection.name.slice(0, -selection.projection.extension.length)}${extension}` : selection.projection.name; const result = await saveAs(output, name, outputMimeType ?? selection.projection.mimeType); setMessage(result === "PICKER" ? "Save As completed." : "Download copy created. Open the downloaded file using the operating system's default application or another installed application."); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") setMessage("Save As cancelled."); else setMessage("Save As could not be completed."); } finally { setBusy(false); } };
  const openInBrowser = () => { if (!selection) return; const url = createPreviewUrl(selection.file); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => revokePreviewUrl(url), 60_000); };
  const clear = () => replaceSelection(undefined);

  return <section aria-labelledby="local-files-heading" style={{ display: "grid", gap: "0.8rem", minWidth: 0 }}>
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><button type="button" onClick={() => void openFile()}>Open local file</button><button type="button" onClick={() => void openFolder()} disabled={localCapabilities.directoryPicker !== "LOCAL_DIRECTORY_PICKER_SUPPORTED"}>Open local folder</button></div>
    <small role="status">{message}</small>
    {directory && <section aria-labelledby="local-folder-heading" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem" }}><h3 id="local-folder-heading" style={{ marginTop: 0 }}>{directory.name}</h3><small>{directory.entries.length} bounded items shown. No recursive scan was performed.</small><ul>{directory.entries.map((entry) => <li key={`${entry.kind}-${entry.name}`}>{entry.kind === "directory" ? "Folder" : "File"} {entry.name}{entry.size === undefined ? "" : ` (${formatBytes(entry.size)})`}</li>)}</ul></section>}
    {selection && <section aria-labelledby="selected-file-heading" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem", display: "grid", gap: "0.7rem", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}><h3 id="selected-file-heading" style={{ margin: 0 }}>Selected File</h3><span aria-live="polite">{dirty ? "Unsaved changes" : "Saved state"}</span></div>
      <dl style={{ display: "grid", gridTemplateColumns: "minmax(8rem, 0.4fr) minmax(0, 1fr)", gap: "0.3rem 0.8rem", margin: 0 }}><dt>Name</dt><dd>{selection.projection.name}</dd><dt>Extension</dt><dd>{selection.projection.extension || "None"}</dd><dt>MIME type</dt><dd>{selection.projection.mimeType}</dd><dt>Size</dt><dd>{formatBytes(selection.projection.size)} ({selection.projection.size} bytes)</dd><dt>Last modified</dt><dd>{selection.projection.lastModified ? new Date(selection.projection.lastModified).toLocaleString() : "Not available"}</dd><dt>Source</dt><dd>Local Files</dd><dt>Selection</dt><dd>{selection.projection.selectionMechanism}</dd><dt>Read permission</dt><dd>{selection.projection.readCapability ? "Granted" : "Unavailable"}</dd><dt>Write permission</dt><dd>{selection.projection.originalSaveCapability ? "Original file may be saved" : "Original save unavailable; use Save As"}</dd><dt>Preview</dt><dd>{prettyPreviewState[previewState]}</dd><dt>Editing</dt><dd>{selection.projection.editCapability ? "Supported text editing" : "Not supported"}</dd></dl>
      {previewUrl && <div><img src={previewUrl} alt={selection.projection.name} style={{ display: "block", maxWidth: "100%", maxHeight: "32rem", objectFit: "contain" }} /><button type="button" onClick={openInBrowser}>Open in browser</button></div>}
      {selection.projection.editCapability && previewState === "AVAILABLE" && <label>Editable file content<textarea value={text} onChange={(event) => { setText(event.target.value); setDirty(true); setSelection({ ...selection, projection: { ...selection.projection, dirty: true } }); }} rows={12} style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace" }} /></label>}
      {!selection.projection.previewCapability && <div role="status"><b>Preview is not available for this file type.</b><p>View details, save a copy, or open the downloaded file using the operating system.</p></div>}
      {selection.projection.editCapability && previewState === "TOO_LARGE" && <small role="status">Preview unavailable due to size. The file remains available for Save As.</small>}
      {selection.projection.conversionCapabilities.length > 0 && <label>Output format<select value={outputMimeType ?? selection.projection.mimeType} onChange={(event) => setOutputMimeType(event.target.value)}><option value={selection.projection.mimeType}>Original format</option>{selection.projection.conversionCapabilities.filter((mimeType) => mimeType !== selection.projection.mimeType).map((mimeType) => <option key={mimeType} value={mimeType}>{mimeType === "image/jpeg" || mimeType === "image/webp" ? `${mimeType} (lossy)` : mimeType}</option>)}</select></label>}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><button type="button" onClick={() => void saveOriginal()} disabled={busy || !dirty || !selection.projection.originalSaveCapability || (outputMimeType !== undefined && outputMimeType !== selection.projection.mimeType)}>Save</button><button type="button" onClick={() => void saveCopy()} disabled={busy}>Save As / Download copy</button><button type="button" onClick={clear} disabled={busy}>Clear Selection</button></div>
    </section>}
  </section>;
}

export function FilesHubPanel({ sources, onMicrosoftAction = () => undefined, onGoogleAction = () => undefined }: FilesHubPanelProps) {
  const actionFor = (source: FileSourceProjection): (() => void) => { if (source.sourceId === "microsoft-onedrive") return () => onMicrosoftAction(source.availability === "CONNECTED" ? "OPEN" : source.availability === "ERROR" ? "RECONNECT" : "CONNECT"); if (source.sourceId === "google-drive") return () => onGoogleAction(source.availability === "CONNECTED" ? "OPEN" : "CONNECT"); return () => undefined; };
  return <section aria-labelledby="files-hub-heading" style={{ display: "grid", gap: "1rem", padding: "1rem", minWidth: 0 }}><header><h2 id="files-hub-heading" style={{ margin: 0 }}>Files</h2><p style={{ margin: "0.35rem 0 0" }}>Browse local and connected file sources.</p></header><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(17rem, 100%), 1fr))", gap: "0.8rem", minWidth: 0 }}>{sources.map((source) => <article key={source.sourceId} style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.85rem", display: "grid", gap: "0.55rem", minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}><b>{source.displayName}</b><span aria-live="polite">{source.availability}</span></div><small>{source.capabilities.filter((capability) => capability.enabled).map((capability) => capability.operation).join(", ") || "No operations currently available"}</small>{source.sourceId === "local" ? <LocalFileWorkspace /> : <button type="button" onClick={actionFor(source)}>{source.availability === "CONNECTED" ? `Open ${source.displayName}` : source.availability === "ERROR" ? "Reconnect" : "Connect"}</button>}{source.diagnostic?.reasonCode && <small role="status">{source.diagnostic.reasonCode}</small>}</article>)}</div>{!sources.some((source) => source.sourceId === "local") && <small role="alert">Local Files source is unavailable.</small>}</section>;
}