import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { FileSourceProjection, LocalPreviewState } from "@onyx/workspace-contracts";
import { buildFallbackDirectorySelection, captureInputFiles, convertImage, createPreviewUrl, detectLocalFileCapabilities, formatBytes, readFallbackDirectory, readLocalDirectory, readTextPreview, revokePreviewUrl, saveAs, selectLocalDirectory, selectLocalDirectoryFile, selectLocalFile, selectLocalFileFromInput, type LocalDirectorySelection, type LocalSelection, writeToHandle } from "../localFilesProvider";
import { notesRepository } from "../notesRepository";

export interface FilesHubPanelProps { readonly sources: readonly FileSourceProjection[]; readonly accountScope?: string; readonly onMicrosoftAction?: (action: "OPEN" | "CONNECT" | "RECONNECT") => void; readonly onGoogleAction?: (action: "OPEN" | "CONNECT" | "REFRESH") => void; readonly providerBodies?: Partial<Record<PanelId, ReactNode>>; }
const prettyPreviewState: Record<LocalPreviewState, string> = { NOT_REQUESTED: "Not opened", AVAILABLE: "Available", UNSUPPORTED: "Preview unavailable", UNAVAILABLE: "Preview unavailable", TOO_LARGE: "Preview unavailable due to size", FAILED: "Preview failed" };
const secretPattern = /(bearer\s+|token\s*[:=]|password\s*[:=]|secret\s*[:=]|-----BEGIN [A-Z ]+-----)[^\n]*/gi;

type PanelMode = "NORMAL" | "MAXIMISED" | "MINIMISED";
type PanelId = "local-files" | "microsoft-onedrive" | "microsoft-sharepoint" | "google-drive";
type PanelState = { readonly mode: PanelMode; readonly width: number; readonly height: number };
type LocalSort = "NAME_ASC" | "NAME_DESC" | "MODIFIED_NEWEST" | "MODIFIED_OLDEST" | "SIZE_LARGEST" | "SIZE_SMALLEST" | "TYPE";
type LocalUndoSnapshot = { readonly selection?: LocalSelection; readonly directory?: LocalDirectorySelection; readonly search: string; readonly sort: LocalSort };
const MAX_SESSION_ITEMS = 20;
const MAX_MULTI_SELECTION = 25;

const compactToolbarButton: CSSProperties = { width: "2rem", height: "2rem", minWidth: "2rem", padding: 0, alignSelf: "flex-start", lineHeight: 1 };

function FilesProviderSubPanel({ id, title, state, onState, canGoBack = false, onBack, providerAppearance, children }: { readonly id: PanelId; readonly title: string; readonly state: PanelState; readonly onState: (state: PanelState) => void; readonly canGoBack?: boolean; readonly onBack?: () => void; readonly providerAppearance?: { readonly family: string; readonly label: string; readonly icon: string; readonly accent: string; readonly badge: string }; readonly children: ReactNode }) {
  const resize = (delta: number) => onState({ ...state, width: Math.max(18, Math.min(100, state.width + delta)), height: Math.max(18, Math.min(90, state.height + delta / 2)) });
  const appearance = providerAppearance ?? { family: "local", label: "Local Files", icon: "▤", accent: "#7dd3fc", badge: "Local" };
  const action = (label: string, symbol: string, disabled: boolean, callback: () => void) => <button type="button" style={compactToolbarButton} aria-label={`${label} ${title}`} title={`${label} ${title}`} disabled={disabled} onClick={callback}>{symbol}</button>;
  const articleStyle: CSSProperties = { minWidth: 0, maxWidth: "100%", boxSizing: "border-box", border: `1px solid color-mix(in srgb, ${appearance.accent} 52%, rgba(255,255,255,0.18))`, background: "linear-gradient(180deg, rgba(10, 16, 22, 0.88), rgba(16, 24, 31, 0.72))", boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${appearance.accent} 24%, transparent), 0 10px 20px rgba(7, 12, 18, 0.12)`, borderRadius: "0.9rem" };
  const minimized = state.mode === "MINIMISED";
  const panelStyle: CSSProperties = { ...articleStyle, minHeight: minimized ? 0 : state.mode === "NORMAL" ? `${state.height}rem` : 0, width: state.mode === "MAXIMISED" ? "100%" : `${state.width}%`, display: "grid", gridTemplateRows: minimized ? "auto" : "auto minmax(0, 1fr)", overflow: "hidden", height: minimized ? "auto" : state.mode !== "NORMAL" ? "100%" : undefined };
  return <article className={`files-provider-subpanel files-provider-subpanel--${state.mode.toLowerCase()} files-provider-subpanel--${appearance.family}`} style={panelStyle} data-provider-family={appearance.family} data-provider-label={appearance.label} aria-label={`Provider ${title} ${state.mode.toLowerCase()}`} aria-labelledby={`${id}-heading`}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0, flexWrap: "wrap", borderBottom: minimized ? undefined : `1px solid color-mix(in srgb, ${appearance.accent} 32%, rgba(255,255,255,0.08))`, paddingBottom: minimized ? undefined : "0.35rem" }}><div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}><span aria-hidden="true" style={{ color: appearance.accent, fontSize: "0.9rem" }}>{appearance.icon}</span><strong id={`${id}-heading`} style={{ minWidth: 0, overflowWrap: "anywhere" }}>{title}</strong><span style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>{appearance.badge}</span></div><div role="toolbar" aria-label={`${title} controls`} style={{ display: "flex", gap: "0.2rem", flex: "0 0 auto" }}>{action("Back", "←", !canGoBack, () => onBack?.())}{action("Maximise", "↗", state.mode === "MAXIMISED", () => onState({ ...state, mode: "MAXIMISED" }))}{action("Minimise", "—", false, () => onState({ ...state, mode: "MINIMISED" }))}{action("Restore", "□", state.mode === "NORMAL", () => onState({ ...state, mode: "NORMAL" }))}{action("Resize", "◢", state.mode !== "NORMAL", () => resize(8))}</div></header><div style={{ minWidth: 0, minHeight: 0, maxWidth: "100%", overflow: "auto", overflowWrap: "anywhere", wordBreak: "break-word", display: minimized ? "none" : "block" }} aria-hidden={minimized}>{children}</div>
  </article>;
}

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function FullScreenPreviewModal({ titleId, onClose, children }: { readonly titleId: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const scrollPosition = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const focusableElements = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusableElements()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const elements = focusableElements();
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      window.scrollTo(0, scrollPosition);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ position: "fixed", inset: 0, zIndex: 2147483647, overflow: "auto", background: "Canvas", padding: "env(safe-area-inset-top) 1rem 1rem", display: "grid", gap: "0.7rem" }}>
      {children}
    </div>,
    document.body,
  );
}

function LocalFileWorkspace({ accountScope, onNavigationChange, onFullScreenChange }: { readonly accountScope: string; readonly onNavigationChange?: (canGoBack: boolean, onBack: () => void) => void; readonly onFullScreenChange?: (fullScreen: boolean) => void }) {
  const localCapabilities = detectLocalFileCapabilities();
  const [selection, setSelection] = useState<LocalSelection>();
  const [directory, setDirectory] = useState<LocalDirectorySelection>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewState, setPreviewState] = useState<LocalPreviewState>("NOT_REQUESTED");
  const [message, setMessage] = useState("No local file or folder selected.");
  const [busy, setBusy] = useState(false);
  const [outputMimeType, setOutputMimeType] = useState<string>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LocalSort>("NAME_ASC");
  const [undoSnapshot, setUndoSnapshot] = useState<LocalUndoSnapshot>();
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [recentFolders, setRecentFolders] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<ReadonlySet<string>>(new Set());
  const [fullScreen, setFullScreen] = useState(false);
  const [replace, setReplace] = useState("");
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const setMediaRef = (element: HTMLMediaElement | null): void => { mediaRef.current = element; };

  useEffect(() => () => { mediaRef.current?.pause(); revokePreviewUrl(previewUrl); }, [previewUrl]);
  useEffect(() => {
    revokePreviewUrl(previewUrl);
    setPreviewUrl(undefined);
    setText("");
    setDirty(false); setOutputMimeType(undefined);
    if (!selection) { setPreviewState("NOT_REQUESTED"); return; }
    if (selection.projection.validationState === "INVALID") { setPreviewState("FAILED"); return; }
    if (["image-viewer", "audio-player", "video-player", "pdf-viewer"].includes(selection.projection.viewerId ?? "")) { setPreviewUrl(createPreviewUrl(selection.file)); setPreviewState("AVAILABLE"); return; }
    // A stale read (from a superseded selection or an account switch that unmounted this instance) must never overwrite newer state.
    let cancelled = false;
    void readTextPreview(selection.file).then((result) => { if (cancelled) return; setText(result.text ?? ""); setPreviewState(result.state); });
    return () => { cancelled = true; };
  }, [selection?.projection.selectionId]);

  const replaceSelection = (next: LocalSelection | undefined) => {
    if (dirty && !window.confirm("Discard unsaved local changes?")) return;
    setDirectory(undefined); setSelection(next); setMessage(next ? `Selected ${next.projection.name}.` : "Local selection cleared.");
    if (next) setRecentFiles((items) => [next.projection.name, ...items.filter((item) => item !== next.projection.name)].slice(0, MAX_SESSION_ITEMS));
  };
  const openFile = async () => { if (localCapabilities.filePicker === "HANDLE_FILE_PICKER_SUPPORTED") { try { const next = await selectLocalFile(); if (next) replaceSelection(next); else setMessage("Local file selection cancelled."); } catch { setMessage("Local file permission was denied."); } return; } fileInputRef.current?.click(); };
  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => { const files = captureInputFiles(event.currentTarget); event.currentTarget.value = ""; const file = files[0]; if (!file) { setMessage("Local file selection cancelled."); return; } try { replaceSelection(await selectLocalFileFromInput(file)); } catch { setMessage("Local file selection failed."); } };
  const commitDirectory = (next: LocalDirectorySelection) => { if (dirty && !window.confirm("Discard unsaved local changes?")) return; setSelection(undefined); setDirectory(next); setRecentFolders((items) => [next.name, ...items.filter((item) => item !== next.name)].slice(0, MAX_SESSION_ITEMS)); setMessage(`Selected ${next.name}.`); };
  const openFolder = async () => { if (localCapabilities.directoryPicker === "HANDLE_DIRECTORY_PICKER_SUPPORTED") { try { const next = await selectLocalDirectory(); if (next) commitDirectory(next); else setMessage("Local folder selection cancelled."); } catch { setMessage("Local folder permission was denied."); } return; } directoryInputRef.current?.click(); };
  const handleDirectoryInput = (event: ChangeEvent<HTMLInputElement>) => { const files = captureInputFiles(event.currentTarget); event.currentTarget.value = ""; if (!files.length) { setMessage("Local folder selection cancelled."); return; } try { commitDirectory(buildFallbackDirectorySelection(files)); } catch { setMessage("The selected folder could not be opened safely."); } };
  const openDirectory = async (entry: LocalDirectorySelection["items"][number]) => {
    if (entry.kind !== "directory" || !directory) return;
    try {
      let nextDirectory: LocalDirectorySelection | undefined;
      if (entry.directoryHandle) {
        nextDirectory = await readLocalDirectory(entry.directoryHandle, directory.handle ? [...directory.stack, { name: directory.name, handle: directory.handle }] : directory.stack, directory.handle ? [...directory.parents, directory.handle] : directory.parents);
      } else if (entry.fallbackNodeId && directory.fallbackTree) {
        nextDirectory = readFallbackDirectory(directory, entry.fallbackNodeId, [...directory.stack, { name: directory.name, handle: directory.handle, nodeId: directory.fallbackNodeId }]);
      }
      if (!nextDirectory) throw new Error("Folder unavailable");
      setDirectory(nextDirectory); setSelection(undefined); setMessage(`Opened ${entry.name}.`);
    } catch { setMessage("The selected folder is no longer available."); }
  };
  const openDirectoryFile = async (entry: LocalDirectorySelection["items"][number]) => { if (dirty && !window.confirm("Discard unsaved local changes?")) return; mediaRef.current?.pause(); try { const next = await selectLocalDirectoryFile(entry); if (next) { setSelection(next); setMessage(`Selected ${next.projection.name}.`); } } catch { setMessage("The selected file is no longer available."); } };
  const backDirectory = () => { if (!directory || directory.stack.length === 0) return; const previousStack = directory.stack.slice(0, -1); if (!directory.handle && directory.fallbackTree) { const parentId = directory.fallbackTree[directory.fallbackNodeId ?? ""]?.parentId; if (!parentId) return; setDirectory(readFallbackDirectory(directory, parentId, previousStack)); setSelection(undefined); setMessage("Returned to the parent folder."); return; } const previousEntry = directory.stack[directory.stack.length - 1]; if (!previousEntry?.handle) return; const previousParents = directory.parents.slice(0, -1); void readLocalDirectory(previousEntry.handle, previousStack, previousParents).then((next) => { setDirectory(next); setSelection(undefined); setMessage("Returned to the parent folder."); }).catch(() => setMessage("The parent folder is no longer available.")); };
  const navigateBreadcrumb = (index: number) => { if (!directory) return; if (index < 0) { if (directory.handle) { void readLocalDirectory(directory.parents[0] ?? directory.handle, [], []); } else if (directory.fallbackTree) { const rootId = Object.keys(directory.fallbackTree).find((id) => !directory.fallbackTree?.[id]?.parentId); if (rootId) setDirectory(readFallbackDirectory(directory, rootId, [])); } return; } const target = directory.stack[index]; if (!target) return; if (target.handle) { void readLocalDirectory(target.handle, directory.stack.slice(0, index), directory.parents.slice(0, index)).then(setDirectory).catch(() => setMessage("The selected folder is no longer available.")); } else if (target.nodeId && directory.fallbackTree) setDirectory(readFallbackDirectory(directory, target.nodeId, directory.stack.slice(0, index)));
  };
  useEffect(() => { onNavigationChange?.(Boolean(directory?.stack.length), backDirectory); }, [directory, onNavigationChange]);
  useEffect(() => { onFullScreenChange?.(fullScreen); }, [fullScreen, onFullScreenChange]);
  const visibleItems = directory?.items.filter((entry) => entry.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) ?? [];
  const orderedItems = [...visibleItems].sort((left, right) => { if (sort === "NAME_DESC") return right.name.localeCompare(left.name); if (sort === "MODIFIED_NEWEST" || sort === "MODIFIED_OLDEST") return ((sort === "MODIFIED_NEWEST" ? -1 : 1) * ((left.modifiedAt ?? 0) - (right.modifiedAt ?? 0))) || left.name.localeCompare(right.name); if (sort === "SIZE_LARGEST" || sort === "SIZE_SMALLEST") return ((sort === "SIZE_LARGEST" ? -1 : 1) * ((left.size ?? -1) - (right.size ?? -1))) || left.name.localeCompare(right.name); if (sort === "TYPE") return (left.mimeType ?? "").localeCompare(right.mimeType ?? "") || left.name.localeCompare(right.name); return Number(right.kind === "directory") - Number(left.kind === "directory") || left.name.localeCompare(right.name); });
  const currentPosition = directory && selection ? orderedItems.findIndex((entry) => entry.name === selection.projection.name && entry.kind === "file") : -1;
  const openAdjacent = (offset: number) => { const next = orderedItems[currentPosition + offset]; if (next?.kind === "file") void openDirectoryFile(next); };
  const displayText = selection?.projection.viewerId === "log-viewer" ? text.replace(secretPattern, "[REDACTED]") : text;
  const content = selection ? (selection.projection.editCapability ? new Blob([text], { type: selection.projection.mimeType }) : selection.file) : undefined;
  const relatedNotes = selection ? notesRepository.forAccount(accountScope).getNotesReferencingFile(selection.projection.selectionId, selection.projection.sourceId) : [];
  const saveOriginal = async () => { if (!selection?.handle || !content || !selection.projection.originalSaveCapability) return; if (!window.confirm(`Save changes to original ${selection.projection.name}?`)) return; setBusy(true); try { await writeToHandle(selection.handle, content, selection.file); setDirty(false); setSelection({ ...selection, projection: { ...selection.projection, dirty: false } }); setMessage("Original file saved and verified by the browser write completion."); } catch (error) { setMessage(error instanceof Error && error.message.includes("changed") ? "Save stopped because the original file changed. Reload or use Save As." : "Original save could not be completed."); } finally { setBusy(false); } };
  const saveCopy = async () => { if (!selection || !content) return; setBusy(true); try { const output = outputMimeType && outputMimeType !== selection.projection.mimeType ? await convertImage(selection.file, outputMimeType) : content; const extension = outputMimeType === "image/jpeg" ? ".jpg" : outputMimeType === "image/webp" ? ".webp" : outputMimeType === "image/png" ? ".png" : selection.projection.extension; const name = extension && selection.projection.name.toLowerCase().endsWith(selection.projection.extension) ? `${selection.projection.name.slice(0, -selection.projection.extension.length)}${extension}` : selection.projection.name; const result = await saveAs(output, name, outputMimeType ?? selection.projection.mimeType); setMessage(result === "PICKER" ? "Save As completed." : "Download copy created. Open the downloaded file using the operating system's default application or another installed application."); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") setMessage("Save As cancelled."); else setMessage("Save As could not be completed."); } finally { setBusy(false); } };
  const openInBrowser = () => { if (!selection) return; const url = createPreviewUrl(selection.file); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => revokePreviewUrl(url), 60_000); };
  const clear = () => { if (dirty && !window.confirm("Discard unsaved local changes?")) return; setUndoSnapshot({ selection, directory, search, sort }); setSelection(undefined); setDirectory(undefined); setMessage("Local selection cleared. Undo is available."); };
  const undoClear = () => { if (!undoSnapshot) return; setSelection(undoSnapshot.selection); setDirectory(undoSnapshot.directory); setSearch(undoSnapshot.search); setSort(undoSnapshot.sort); setUndoSnapshot(undefined); setMessage("Local selection restored."); };
  const toggleItem = (entry: LocalDirectorySelection["items"][number]) => { const id = entry.fallbackNodeId ?? `${entry.kind}:${entry.name}`; setSelectedItemIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else if (next.size < MAX_MULTI_SELECTION) next.add(id); return next; }); };
  const handleDrop = (event: DragEvent<HTMLElement>) => { event.preventDefault(); const files = Array.from(event.dataTransfer.files); if (!files.length) return; if (files.length > 1 || files.some((file) => file.size > 50_000_000)) { setMessage("Drop rejected: file count or size limit exceeded."); return; } void selectLocalFileFromInput(files[0]!).then(replaceSelection).catch(() => setMessage("The dropped file could not be opened safely.")); };
  const selectedFileBody = selection ? <>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}><h3 id="selected-file-heading" style={{ margin: 0 }}>Selected File</h3><span aria-live="polite">{dirty ? "Unsaved changes" : "Saved state"}</span></div>
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(8rem, 0.4fr) minmax(0, 1fr)", gap: "0.3rem 0.8rem", margin: 0 }}><dt>Name</dt><dd>{selection.projection.name}</dd><dt>Extension</dt><dd>{selection.projection.extension || "None"}</dd><dt>MIME type</dt><dd>{selection.projection.mimeType}</dd><dt>Size</dt><dd>{formatBytes(selection.projection.size)} ({selection.projection.size} bytes)</dd><dt>Last modified</dt><dd>{selection.projection.lastModified ? new Date(selection.projection.lastModified).toLocaleString() : "Not available"}</dd><dt>Source</dt><dd>Local Files</dd><dt>Selection</dt><dd>{selection.projection.selectionMechanism}</dd><dt>Detected viewer</dt><dd>{selection.projection.viewerId ?? "Unsupported"}</dd><dt>Read permission</dt><dd>{selection.projection.readCapability ? "Granted" : "Unavailable"}</dd><dt>Write permission</dt><dd>{selection.projection.originalSaveCapability ? "Original file may be saved" : "Original save unavailable; use Save As"}</dd><dt>Preview</dt><dd>{prettyPreviewState[previewState]}</dd><dt>Editing</dt><dd>{selection.projection.editCapability ? "Supported text editing" : "Not supported"}</dd><dt>Dirty</dt><dd>{selection.projection.dirty ? "Yes" : "No"}</dd></dl>
    {previewUrl && selection.projection.viewerId === "image-viewer" && <div><img src={previewUrl} alt={selection.projection.name} style={{ display: "block", maxWidth: "100%", maxHeight: "32rem", objectFit: "contain" }} /><button type="button" onClick={openInBrowser}>Open in browser</button></div>}
    {previewUrl && selection.projection.viewerId === "audio-player" && <div><audio ref={setMediaRef} controls preload="metadata" src={previewUrl} aria-label={`Audio player for ${selection.projection.name}`} /><button type="button" onClick={openInBrowser}>Open in browser</button></div>}
    {previewUrl && selection.projection.viewerId === "video-player" && <div><video ref={setMediaRef} controls preload="metadata" src={previewUrl} style={{ display: "block", maxWidth: "100%", maxHeight: "32rem" }} aria-label={`Video player for ${selection.projection.name}`} /><button type="button" onClick={openInBrowser}>Open in browser</button></div>}
    {previewUrl && selection.projection.viewerId === "pdf-viewer" && <div><object data={previewUrl} type="application/pdf" aria-label={`PDF viewer for ${selection.projection.name}`} style={{ width: "100%", minHeight: "32rem" }}><p>Browser PDF preview is unavailable.</p></object><button type="button" onClick={openInBrowser}>Open in browser</button></div>}
    {selection.projection.editCapability && previewState === "AVAILABLE" && <><div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Replace<input value={replace} onChange={(event) => setReplace(event.target.value)} /></label><button type="button" onClick={() => { if (search) { setText(text.split(search).join(replace)); setDirty(true); setSelection({ ...selection, projection: { ...selection.projection, dirty: true } }); } }}>Replace all</button></div><label>{selection.projection.viewerId === "code-editor" ? "Code editor (safe textarea fallback)" : "Editable file content"}<textarea value={displayText} onChange={(event) => { setText(event.target.value); setDirty(true); setSelection({ ...selection, projection: { ...selection.projection, dirty: true } }); }} rows={12} spellCheck={false} wrap="off" style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace" }} /></label><small>{displayText.split("\n").length} lines, {displayText.length} characters{selection.projection.viewerId === "log-viewer" ? " · display masking applied" : ""}</small></>}
    {!selection.projection.previewCapability && <div role="status"><b>Preview is not available for this file type.</b><p>View details, save a copy, or open the downloaded file using the operating system.</p></div>}
    {selection.projection.editCapability && previewState === "TOO_LARGE" && <small role="status">Preview unavailable due to size. The file remains available for Save As.</small>}
    {selection.projection.conversionCapabilities.length > 0 && <label>Output format<select value={outputMimeType ?? selection.projection.mimeType} onChange={(event) => setOutputMimeType(event.target.value)}><option value={selection.projection.mimeType}>Original format</option>{selection.projection.conversionCapabilities.filter((mimeType) => mimeType !== selection.projection.mimeType).map((mimeType) => <option key={mimeType} value={mimeType}>{mimeType === "image/jpeg" || mimeType === "image/webp" ? `${mimeType} (lossy)` : mimeType}</option>)}</select></label>}
    {relatedNotes.length > 0 && <aside aria-label="Related Notes" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem", display: "grid", gap: "0.35rem" }}><strong>Related Notes</strong><small>{relatedNotes.length} Note{relatedNotes.length === 1 ? "" : "s"} reference this file. File contents remain in Files and are not copied into Notes.</small>{relatedNotes.map((note) => <div key={note.noteId}><strong>{note.title}</strong><small>{note.fileReferences.filter((reference) => reference.fileId === selection.projection.selectionId && reference.provider === selection.projection.sourceId).map((reference) => reference.displayName).join(", ")}</small></div>)}</aside>}
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><button type="button" onClick={() => openAdjacent(-1)} disabled={busy || currentPosition <= 0}>Previous</button>{currentPosition >= 0 && <span aria-live="polite">{currentPosition + 1} of {orderedItems.length}</span>}<button type="button" onClick={() => openAdjacent(1)} disabled={busy || currentPosition < 0 || currentPosition >= orderedItems.length - 1}>Next</button><button type="button" onClick={() => setFullScreen((value) => !value)} aria-pressed={fullScreen}>{fullScreen ? "Exit full-screen preview" : "Full-screen preview"}</button><button type="button" onClick={() => void saveOriginal()} disabled={busy || !dirty || !selection.projection.originalSaveCapability || (outputMimeType !== undefined && outputMimeType !== selection.projection.mimeType)}>Save</button><button type="button" onClick={() => void saveCopy()} disabled={busy}>Save As / Download copy</button><button type="button" onClick={clear} disabled={busy}>Clear Selection</button>{undoSnapshot && <button type="button" onClick={undoClear} disabled={busy}>Undo</button>}</div>
  </> : null;

  return <section aria-labelledby="local-files-heading" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} style={{ display: "grid", gap: "0.8rem", minWidth: 0 }}>
    <input ref={fileInputRef} type="file" accept="*/*" onChange={(event) => void handleFileInput(event)} hidden aria-hidden="true" />
    <input ref={directoryInputRef} type="file" multiple onChange={handleDirectoryInput} hidden aria-hidden="true" {...(localCapabilities.directoryPicker === "DIRECTORY_INPUT_SUPPORTED" ? { webkitdirectory: "" } : {})} />
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}><button type="button" onClick={() => void openFile()} disabled={localCapabilities.filePicker === "LOCAL_FILE_ACCESS_NOT_SUPPORTED"}>Open local file</button><button type="button" onClick={() => void openFolder()} disabled={localCapabilities.directoryPicker === "DIRECTORY_SELECTION_UNSUPPORTED"}>Open local folder</button></div>
    {localCapabilities.directoryPicker === "DIRECTORY_SELECTION_UNSUPPORTED" && <small role="status">Folder selection is not supported by this browser. You can still open individual files.</small>}
    <small role="status">{message}</small>
    {!directory && !selection && <small role="status">Open a folder to continue browsing. ONYX/NOVA does not scan subfolders automatically.</small>}
    {directory && <section aria-labelledby="local-folder-heading" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem", minWidth: 0 }}><nav aria-label="Local Files breadcrumb" style={{ overflowWrap: "anywhere", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}><button type="button" onClick={() => navigateBreadcrumb(-1)}>Local Files</button>{directory.stack.map((part, index) => <span key={`${part.name}-${index}`}> / <button type="button" onClick={() => navigateBreadcrumb(index)}>{part.name}</button></span>)}<span> / <span aria-current="page">{directory.name}</span></span></nav><h3 id="local-folder-heading" style={{ marginTop: "0.5rem", overflowWrap: "anywhere" }}>{directory.name}</h3><div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}><label>Search current folder<input value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as LocalSort)}><option value="NAME_ASC">Name A-Z</option><option value="NAME_DESC">Name Z-A</option><option value="MODIFIED_NEWEST">Modified newest</option><option value="MODIFIED_OLDEST">Modified oldest</option><option value="SIZE_LARGEST">Size largest</option><option value="SIZE_SMALLEST">Size smallest</option><option value="TYPE">Type</option></select></label><button type="button" onClick={() => setSelectMode((value) => !value)}>{selectMode ? "Exit Select mode" : "Select items"}</button><small role="status">{orderedItems.length} matching {orderedItems.length === 1 ? "item" : "items"}; {selectedItemIds.size} selected</small></div><small>{directory.items.length} {directory.items.length === 1 ? "item shown in this folder" : "items shown in this folder"}. Open a folder to continue browsing. ONYX/NOVA does not scan subfolders automatically.</small>{directory.stack.length > 0 && <button type="button" onClick={backDirectory}>Back to parent</button>}<ul style={{ paddingLeft: "1.2rem", minWidth: 0 }}>{orderedItems.map((entry) => { const id = entry.fallbackNodeId ?? `${entry.kind}:${entry.name}`; return <li key={`${entry.kind}-${id}`} style={{ overflowWrap: "anywhere" }}>{selectMode && <input type="checkbox" aria-label={`Select ${entry.name}`} checked={selectedItemIds.has(id)} onChange={() => toggleItem(entry)} />}{entry.kind === "directory" ? <button type="button" onClick={() => void openDirectory(entry)} aria-label={`Open folder ${entry.name}`}>Folder: {entry.name}</button> : <button type="button" onClick={() => void openDirectoryFile(entry)} aria-label={`Open file ${entry.name}`}>File: {entry.name}</button>}{entry.size === undefined ? "" : ` (${formatBytes(entry.size)})`}</li>; })}</ul></section>}
    {selection && (fullScreen ? <FullScreenPreviewModal titleId="selected-file-heading" onClose={() => setFullScreen(false)}>{selectedFileBody}</FullScreenPreviewModal> : <section aria-labelledby="selected-file-heading" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem", display: "grid", gap: "0.7rem", minWidth: 0 }}>{selectedFileBody}</section>)}
    {(recentFiles.length > 0 || recentFolders.length > 0) && <aside aria-label="Recent local Files" style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)", padding: "0.75rem" }}><strong>Recent in this session</strong><small>{recentFiles.length ? ` Files: ${recentFiles.join(", ")}.` : ""}{recentFolders.length ? ` Folders: ${recentFolders.join(", ")}.` : ""}</small><button type="button" onClick={() => { setRecentFiles([]); setRecentFolders([]); }}>Clear Recent</button></aside>}
  </section>;
}

export function FilesHubPanel({ sources, accountScope = "local-default", onMicrosoftAction = () => undefined, onGoogleAction = () => undefined, providerBodies = {} }: FilesHubPanelProps) {
  const [panelStates, setPanelStates] = useState<Record<PanelId, PanelState>>({ "local-files": { mode: "NORMAL", width: 100, height: 24 }, "microsoft-onedrive": { mode: "NORMAL", width: 100, height: 12 }, "microsoft-sharepoint": { mode: "NORMAL", width: 100, height: 12 }, "google-drive": { mode: "NORMAL", width: 100, height: 12 } });
  const [localNavigation, setLocalNavigation] = useState<{ readonly canGoBack: boolean; readonly onBack: () => void }>({ canGoBack: false, onBack: () => undefined });
  const [localFullScreen, setLocalFullScreen] = useState(false);
  // Stable identity: an inline callback here would re-fire the child's navigation effect every render and loop forever.
  const handleLocalNavigationChange = useCallback((canGoBack: boolean, onBack: () => void) => {
    setLocalNavigation((current) => (current.canGoBack === canGoBack && current.onBack === onBack) ? current : { canGoBack, onBack });
  }, []);
  const actionFor = (source: FileSourceProjection): (() => void) => { if (source.sourceId === "microsoft-onedrive") return () => onMicrosoftAction(source.availability === "CONNECTED" ? "OPEN" : source.availability === "ERROR" ? "RECONNECT" : "CONNECT"); if (source.sourceId === "google-drive") return () => onGoogleAction(source.availability === "CONNECTED" ? "OPEN" : "CONNECT"); return () => undefined; };
  const maximised = Object.entries(panelStates).find(([, state]) => state.mode === "MAXIMISED")?.[0] as PanelId | undefined;
  const appearanceFor = (source: FileSourceProjection) => {
    const family = source.providerFamily ?? source.sourceId;
    if (family === "microsoft") return { family: "microsoft", label: "Microsoft", icon: "◫", accent: "#60a5fa", badge: "Microsoft" };
    if (family === "google") return { family: "google", label: "Google", icon: "◌", accent: "#fbbc04", badge: "Google" };
    return { family: "local", label: "Local Files", icon: "▣", accent: "#7dd3fc", badge: "Local" };
  };
  return <section aria-labelledby="files-hub-heading" style={{ display: "grid", gap: "1rem", padding: "1rem", minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}><header><h2 id="files-hub-heading" style={{ margin: 0 }}>Files</h2><p style={{ margin: "0.35rem 0 0" }}>Browse local and connected file sources.</p></header><div aria-hidden={localFullScreen || undefined} inert={localFullScreen || undefined} style={{ display: localFullScreen ? "none" : "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(20rem, 100%), 1fr))", gap: "0.8rem", minWidth: 0, alignItems: "start" }}>{sources.map((source) => { const id = (source.sourceId === "local" ? "local-files" : source.sourceId) as PanelId; const state = panelStates[id]; const appearance = appearanceFor(source); const panelVisible = !maximised || maximised === id; return <div key={source.sourceId} style={{ display: panelVisible ? "block" : "none" }}><FilesProviderSubPanel id={id} title={source.displayName} state={state} canGoBack={id === "local-files" ? localNavigation.canGoBack : false} onBack={id === "local-files" ? localNavigation.onBack : undefined} providerAppearance={appearance} onState={(next) => setPanelStates((current) => { const nextStates = { ...current }; (Object.keys(nextStates) as PanelId[]).forEach((panelId) => { if (panelId !== id && next.mode === "MAXIMISED") nextStates[panelId] = { ...nextStates[panelId], mode: "NORMAL" }; }); nextStates[id] = next; return nextStates; })}>
    {source.sourceId === "local" ? <LocalFileWorkspace key={accountScope} accountScope={accountScope} onNavigationChange={handleLocalNavigationChange} onFullScreenChange={setLocalFullScreen} /> : providerBodies[id] ?? <div style={{ display: "grid", gap: "0.6rem", minWidth: 0 }}><span aria-live="polite">{source.availability}</span><small style={{ overflowWrap: "anywhere" }}>{source.capabilities.filter((capability) => capability.enabled).map((capability) => capability.operation).join(", ") || "No operations currently available"}</small><button type="button" style={{ alignSelf: "flex-start", width: "fit-content", maxWidth: "100%" }} onClick={actionFor(source)}>{source.availability === "CONNECTED" ? `Open ${source.displayName}` : source.availability === "ERROR" ? "Reconnect" : "Connect"}</button>{source.diagnostic?.reasonCode && <small role="status" style={{ overflowWrap: "anywhere" }}>{source.diagnostic.reasonCode}</small>}</div>}
  </FilesProviderSubPanel></div>; })}</div>{!sources.some((source) => source.sourceId === "local") && <small role="alert">Local Files source is unavailable.</small>}</section>;
}