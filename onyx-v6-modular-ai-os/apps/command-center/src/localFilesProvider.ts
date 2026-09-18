import type { LocalFileCapabilityProjection, LocalPermissionState, LocalPreviewState, LocalSelectedFileProjection, LocalSelectionMechanism } from "@onyx/workspace-contracts";
import { convertersFor } from "./localFileConverters";
import { classifyLocalFileName, LocalFileViewerRegistry, type LocalFileViewerRegistration } from "./localFileRegistries";

export const MAX_TEXT_PREVIEW_BYTES = 1_000_000;
export const MAX_DIRECTORY_ITEMS = 100;
type WritableFileHandle = FileSystemFileHandle & { createWritable?: () => Promise<{ write: (data: Blob | string) => Promise<void>; close: () => Promise<void> }>; queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>; requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState> };
export type LocalSelection = { readonly projection: LocalSelectedFileProjection; readonly file: File; readonly handle?: WritableFileHandle };
export type LocalDirectoryStackEntry = { readonly name: string; readonly handle?: LocalDirectoryHandle; readonly nodeId?: string };
type LocalDirectoryEntry = { readonly name: string; readonly kind: "file" | "directory"; getFile?: () => Promise<File>; getDirectoryHandle?: () => Promise<LocalDirectoryHandle> };
type LocalDirectoryHandle = { readonly name: string; values: () => AsyncIterable<LocalDirectoryEntry>; getDirectoryHandle?: (name: string) => Promise<LocalDirectoryHandle>; getFileHandle?: (name: string) => Promise<WritableFileHandle> };
export type FallbackDirectoryNode = { readonly nodeId: string; readonly name: string; readonly kind: "file" | "directory"; readonly parentId?: string; readonly relativePath: readonly string[]; readonly file?: File; readonly children: readonly string[] };
export type LocalDirectoryItem = { readonly name: string; readonly kind: "file" | "directory"; readonly size?: number; readonly modifiedAt?: number; readonly mimeType?: string; readonly directoryHandle?: LocalDirectoryHandle; readonly fileHandle?: WritableFileHandle; readonly fallbackNodeId?: string; readonly fallbackFile?: File; readonly parent?: LocalDirectoryHandle };
export type LocalDirectorySelection = { readonly name: string; readonly handle?: LocalDirectoryHandle; readonly items: readonly LocalDirectoryItem[]; readonly stack: readonly LocalDirectoryStackEntry[]; readonly parents: readonly LocalDirectoryHandle[]; readonly fallbackTree?: Readonly<Record<string, FallbackDirectoryNode>>; readonly fallbackNodeId?: string };
type FilePickerWindow = Window & { showOpenFilePicker?: (options?: { multiple?: boolean }) => Promise<WritableFileHandle[]>; showSaveFilePicker?: (options?: { suggestedName?: string; types?: readonly { description: string; accept: Record<string, readonly string[]> }[] }) => Promise<WritableFileHandle>; showDirectoryPicker?: () => Promise<LocalDirectoryHandle> };
type CapabilityProbe = { readonly showOpenFilePicker?: unknown; readonly showDirectoryPicker?: unknown; readonly createFileInput?: () => HTMLInputElement };

const browserWindow = (): FilePickerWindow | undefined => typeof window === "undefined" ? undefined : window as FilePickerWindow;
const extensionOf = (name: string): string => name.includes(".") ? `.${name.split(".").pop()?.toLowerCase() ?? ""}` : "";
const imageMimes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);
const textMimes = new Set(["text/plain", "text/markdown", "application/json", "text/csv", "text/html", "application/xml", "text/xml"]);
export type LocalFileIdentityStrength = "PROVIDER_CANONICAL" | "DIRECTORY_RELATIVE" | "METADATA_FINGERPRINT";
export interface LocalFileIdentityResult { readonly fileId: string; readonly identityVersion: number; readonly identityStrength: LocalFileIdentityStrength; readonly sourceProvider: "local"; readonly collisionPossible: boolean; readonly factsUsed: readonly string[]; }
const LOCAL_IDENTITY_VERSION = 1;
const metadataFacts = (file: File) => `${encodeURIComponent(file.name)}:${file.size}:${file.lastModified || 0}:${encodeURIComponent(file.type || "application/octet-stream")}`;
// No canonical provider ID or file handle identity is available for generic browser File objects; a directory-relative
// path (when the browser supplies one) is the strongest available fact, otherwise metadata may collide across files.
export function resolveLocalFileIdentity(file: File): LocalFileIdentityResult {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (relativePath) return { fileId: `local:v${LOCAL_IDENTITY_VERSION}:relpath:${encodeURIComponent(relativePath)}:${metadataFacts(file)}`, identityVersion: LOCAL_IDENTITY_VERSION, identityStrength: "DIRECTORY_RELATIVE", sourceProvider: "local", collisionPossible: false, factsUsed: ["webkitRelativePath", "size", "lastModified", "type"] };
  return { fileId: `local:${metadataFacts(file)}`, identityVersion: LOCAL_IDENTITY_VERSION, identityStrength: "METADATA_FINGERPRINT", sourceProvider: "local", collisionPossible: true, factsUsed: ["name", "size", "lastModified", "type"] };
}
const stableLocalSelectionId = (file: File) => resolveLocalFileIdentity(file).fileId;
const isImage = (mimeType: string): boolean => imageMimes.has(mimeType);
const isText = (mimeType: string, extension: string): boolean => textMimes.has(mimeType) || [".txt", ".md", ".json", ".csv", ".html", ".xml"].includes(extension);

export function detectLocalFileCapabilities(probe?: CapabilityProbe): LocalFileCapabilityProjection {
  const browser = browserWindow();
  const source = probe ?? browser;
  const createFileInput = probe?.createFileInput ?? (() => { if (typeof document === "undefined") return undefined as unknown as HTMLInputElement; const input = document.createElement("input"); input.type = "file"; return input; });
  const fileInput = createFileInput();
  const directoryInput = createFileInput();
  const directoryInputSupported = Boolean(directoryInput && "webkitdirectory" in directoryInput);
  return { filePicker: source?.showOpenFilePicker ? "HANDLE_FILE_PICKER_SUPPORTED" : fileInput ? "FILE_INPUT_SUPPORTED" : "LOCAL_FILE_ACCESS_NOT_SUPPORTED", directoryPicker: source?.showDirectoryPicker ? "HANDLE_DIRECTORY_PICKER_SUPPORTED" : directoryInputSupported ? "DIRECTORY_INPUT_SUPPORTED" : "DIRECTORY_SELECTION_UNSUPPORTED" };
}
export function captureInputFiles(input: Pick<HTMLInputElement, "files">): File[] { return Array.from(input.files ?? []); }
export function supportedPreview(mimeType: string, extension: string): boolean { return isImage(mimeType) || isText(mimeType, extension); }
export function supportedEditor(mimeType: string, extension: string): boolean { return isText(mimeType, extension); }
export function conversionCapabilities(mimeType: string): readonly string[] { return convertersFor(mimeType).map((converter) => converter.destinationMimeType); }
export function formatBytes(bytes: number): string { return `${new Intl.NumberFormat(undefined).format(bytes)} bytes`; }
export function permissionStateFor(handle?: WritableFileHandle): LocalPermissionState { return handle ? "GRANTED" : "DENIED"; }

export function projectLocalFile(file: File, mechanism: LocalSelectionMechanism, handle?: WritableFileHandle): LocalSelectedFileProjection {
  const { extension, viewer } = classifyLocalFileName(file.name, file.type || "application/octet-stream"); const mimeType = file.type || "application/octet-stream";
  const originalSaveCapability = Boolean(handle?.createWritable);
  return { sourceId: "local", selectionId: stableLocalSelectionId(file), name: file.name, extension, mimeType, size: file.size, lastModified: file.lastModified || undefined, itemKind: "FILE", selectionMechanism: mechanism, readCapability: true, originalSaveCapability, originalSaveStatus: originalSaveCapability ? "ORIGINAL_SAVE_SUPPORTED" : "ORIGINAL_SAVE_UNAVAILABLE_USE_SAVE_AS", saveAsCapability: true, saveAsStatus: "SAVE_AS_SUPPORTED", downloadCopyStatus: "DOWNLOAD_COPY_SUPPORTED", previewCapability: supportedPreview(mimeType, extension) || viewer?.previewSupport === "LIMITED", editCapability: supportedEditor(mimeType, extension), conversionCapabilities: conversionCapabilities(mimeType), dirty: false, permissionState: permissionStateFor(handle), previewState: "NOT_REQUESTED", validationState: "NOT_VALIDATED", viewerId: viewer?.capabilityId };
}

export async function validateLocalSignature(file: File, viewer?: LocalFileViewerRegistration): Promise<"VALID" | "INVALID" | "NOT_VALIDATED"> {
  if (!viewer || !["pdf-viewer", "zip-explorer", "database-inspector"].includes(viewer.capabilityId)) return "NOT_VALIDATED";
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (viewer.capabilityId === "pdf-viewer") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" ? "VALID" : "INVALID";
  if (viewer.capabilityId === "zip-explorer") return bytes[0] === 0x50 && bytes[1] === 0x4b ? "VALID" : "INVALID";
  const sqlite = new TextDecoder().decode(bytes.slice(0, 16)); return sqlite === "SQLite format 3\u0000" ? "VALID" : "INVALID";
}

export async function selectLocalFile(): Promise<LocalSelection | undefined> {
  const browser = browserWindow(); if (!browser?.showOpenFilePicker) return undefined;
  try { const handle = (await browser.showOpenFilePicker({ multiple: false }))[0]; if (!handle) return undefined; const file = await handle.getFile(); const projection = projectLocalFile(file, "FILE_SYSTEM_HANDLE", handle); const viewer = projection.viewerId ? LocalFileViewerRegistry.find((entry) => entry.capabilityId === projection.viewerId) : undefined; return { file, handle, projection: { ...projection, validationState: await validateLocalSignature(file, viewer) } }; }
  catch (error) { if (error instanceof DOMException && error.name === "AbortError") return undefined; throw error; }
}

export async function selectLocalFileFallback(): Promise<LocalSelection | undefined> {
  if (typeof document === "undefined") return undefined;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input"); input.type = "file"; input.accept = "*/*";
    input.onchange = () => { const file = input.files?.[0]; if (!file) { input.value = ""; resolve(undefined); return; } void selectLocalFileFromInput(file).then((selection) => { input.value = ""; resolve(selection); }, reject); };
    input.onerror = () => reject(new Error("Local file selection failed.")); input.click();
  });
}

export async function selectLocalFileFromInput(file: File): Promise<LocalSelection> {
  const projection = projectLocalFile(file, "FILE_INPUT");
  const viewer = projection.viewerId ? LocalFileViewerRegistry.find((entry) => entry.capabilityId === projection.viewerId) : undefined;
  return { file, projection: { ...projection, validationState: await validateLocalSignature(file, viewer) } };
}

const relativeSegments = (file: File): string[] => {
  const relativePath = ((file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name).replaceAll("\\", "/");
  const segments = relativePath.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === ".." || segment.includes("\0"))) throw new Error("The selected folder contains an invalid relative path.");
  return segments;
};

const fallbackItem = (node: FallbackDirectoryNode): LocalDirectoryItem => ({ name: node.name, kind: node.kind, size: node.file?.size, modifiedAt: node.file?.lastModified, mimeType: node.file?.type || undefined, fallbackNodeId: node.nodeId, fallbackFile: node.file });

export function buildFallbackDirectorySelection(files: readonly File[]): LocalDirectorySelection {
  const tree: Record<string, FallbackDirectoryNode> = {};
  let rootName: string | undefined;
  const addNode = (name: string, kind: "file" | "directory", parentId: string | undefined, path: string[], file?: File): string => {
    const nodeId = `${parentId ?? "root"}/${name}`;
    if (tree[nodeId]) return nodeId;
    tree[nodeId] = { nodeId, name, kind, parentId, relativePath: path, file, children: [] };
    if (parentId) { const parent = tree[parentId]; if (parent) tree[parentId] = { ...parent, children: [...parent.children, nodeId] }; }
    return nodeId;
  };
  for (const file of files.slice(0, MAX_DIRECTORY_ITEMS * MAX_DIRECTORY_ITEMS)) {
    const segments = relativeSegments(file);
    rootName ??= segments[0];
    if (segments[0] !== rootName) continue;
    let parentId: string | undefined;
    segments.forEach((segment, index) => { parentId = addNode(segment, index === segments.length - 1 ? "file" : "directory", parentId, segments, index === segments.length - 1 ? file : undefined); });
  }
  const rootId = `root/${rootName ?? "Selected folder"}`;
  tree[rootId] ??= { nodeId: rootId, name: rootName ?? "Selected folder", kind: "directory", relativePath: [], children: [] };
  const root = tree[rootId];
  const items = root.children.map((nodeId) => fallbackItem(tree[nodeId]!)).sort((left, right) => Number(right.kind === "directory") - Number(left.kind === "directory") || left.name.localeCompare(right.name)).slice(0, MAX_DIRECTORY_ITEMS);
  return { name: root.name, items, stack: [], parents: [], fallbackTree: tree, fallbackNodeId: rootId };
}

export function readFallbackDirectory(selection: LocalDirectorySelection, nodeId: string, stack: readonly LocalDirectoryStackEntry[] = []): LocalDirectorySelection {
  const node = selection.fallbackTree?.[nodeId];
  if (!node) throw new Error("The selected folder is no longer available.");
  const items = node.children.map((childId) => fallbackItem(selection.fallbackTree![childId]!)).sort((left, right) => Number(right.kind === "directory") - Number(left.kind === "directory") || left.name.localeCompare(right.name)).slice(0, MAX_DIRECTORY_ITEMS);
  return { ...selection, name: node.name, items, stack, fallbackNodeId: nodeId };
}

export async function selectLocalDirectoryFallback(): Promise<LocalDirectorySelection | undefined> {
  if (typeof document === "undefined") return undefined;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input"); input.type = "file"; input.multiple = true; (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    input.onchange = () => { const files = Array.from(input.files ?? []); input.value = ""; resolve(files.length ? buildFallbackDirectorySelection(files) : undefined); };
    input.onerror = () => reject(new Error("Local folder selection failed.")); input.click();
  });
}

export async function readLocalDirectory(handle: LocalDirectoryHandle, stack: readonly LocalDirectoryStackEntry[] = [], parents: readonly LocalDirectoryHandle[] = []): Promise<LocalDirectorySelection> {
  const items: LocalDirectoryItem[] = [];
  for await (const entry of handle.values()) {
    if (items.length >= MAX_DIRECTORY_ITEMS) break;
    if (entry.kind === "file" && entry.getFile) {
      const file = await entry.getFile();
      const fileHandle = handle.getFileHandle ? await handle.getFileHandle(file.name).catch(() => undefined) : undefined;
      items.push({ name: file.name, kind: "file", size: file.size, modifiedAt: file.lastModified, mimeType: file.type || undefined, fileHandle, parent: handle });
    } else {
      const directoryHandle = handle.getDirectoryHandle ? await handle.getDirectoryHandle(entry.name).catch(() => undefined) : undefined;
      items.push({ name: entry.name, kind: "directory", directoryHandle, parent: handle });
    }
  }
  items.sort((left, right) => Number(right.kind === "directory") - Number(left.kind === "directory") || left.name.localeCompare(right.name));
  return { name: handle.name, handle, items, stack, parents };
}

export async function selectLocalDirectoryFile(item: LocalDirectoryItem): Promise<LocalSelection | undefined> {
  if (item.kind !== "file") return undefined;
  if (item.fallbackFile) return selectLocalFileFromInput(item.fallbackFile);
  if (!item.parent) return undefined;
  const handle = item.fileHandle ?? (item.parent.getFileHandle ? await item.parent.getFileHandle(item.name).catch(() => undefined) : undefined);
  const file = handle ? await handle.getFile() : new File([], item.name, { type: item.mimeType ?? "application/octet-stream" });
  const projection = projectLocalFile(file, "FILE_SYSTEM_HANDLE", handle);
  const viewer = projection.viewerId ? LocalFileViewerRegistry.find((entry) => entry.capabilityId === projection.viewerId) : undefined;
  return { file, handle, projection: { ...projection, validationState: await validateLocalSignature(file, viewer) } };
}

export async function selectLocalDirectory(): Promise<LocalDirectorySelection | undefined> {
  const browser = browserWindow(); if (!browser?.showDirectoryPicker) return selectLocalDirectoryFallback();
  try { const handle = await browser.showDirectoryPicker(); return readLocalDirectory(handle); }
  catch (error) { if (error instanceof DOMException && error.name === "AbortError") return undefined; throw error; }
}

export async function readTextPreview(file: File): Promise<{ readonly text?: string; readonly state: LocalPreviewState }> {
  if (file.size > MAX_TEXT_PREVIEW_BYTES) return { state: "TOO_LARGE" }; if (!isText(file.type || "application/octet-stream", extensionOf(file.name))) return { state: "UNSUPPORTED" };
  try { return { text: await file.text(), state: "AVAILABLE" }; } catch { return { state: "FAILED" }; }
}
export function createPreviewUrl(file: File): string { return URL.createObjectURL(file); }
export function revokePreviewUrl(url?: string): void { if (url) URL.revokeObjectURL(url); }
export async function convertImage(file: File, destinationMimeType: string): Promise<Blob> {
  const url = createPreviewUrl(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Image conversion is unavailable."); context.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image conversion failed.")), destinationMimeType));
  } finally { revokePreviewUrl(url); }
}
export async function writeToHandle(handle: WritableFileHandle, content: Blob | string, expected?: Pick<File, "size" | "lastModified">): Promise<void> {
  if (!handle.createWritable) throw new Error("Original save is unavailable for this selection.");
  const permission = handle.queryPermission ? await handle.queryPermission({ mode: "readwrite" }) : "granted";
  const granted = permission === "granted" || (handle.requestPermission && await handle.requestPermission({ mode: "readwrite" }) === "granted");
  if (!granted) throw new Error("Write permission was denied.");
  if (expected) { const current = await handle.getFile(); if (current.size !== expected.size || current.lastModified !== expected.lastModified) throw new Error("The original file changed before save."); }
  const payload = content instanceof Blob ? content : new Blob([content]); const writable = await handle.createWritable(); await writable.write(content); await writable.close();
  const verified = await handle.getFile(); if (verified.size !== payload.size) throw new Error("Saved file verification failed.");
}
export async function saveAs(content: Blob | string, name: string, mimeType: string): Promise<"PICKER" | "DOWNLOAD"> {
  const browser = browserWindow();
  if (browser?.showSaveFilePicker) { const handle = await browser.showSaveFilePicker({ suggestedName: name, types: [{ description: mimeType, accept: { [mimeType]: [extensionOf(name) || ".txt"] } }] }); await writeToHandle(handle, content); return "PICKER"; }
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mimeType })); try { const link = document.createElement("a"); link.href = url; link.download = name; link.click(); } finally { revokePreviewUrl(url); } return "DOWNLOAD";
}