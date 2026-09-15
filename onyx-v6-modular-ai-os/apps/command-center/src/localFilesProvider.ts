import type { LocalFileCapabilityProjection, LocalPermissionState, LocalPreviewState, LocalSelectedFileProjection, LocalSelectionMechanism } from "@onyx/workspace-contracts";
import { convertersFor } from "./localFileConverters";
import { classifyLocalFileName, LocalFileViewerRegistry, type LocalFileViewerRegistration } from "./localFileRegistries";

export const MAX_TEXT_PREVIEW_BYTES = 1_000_000;
export const MAX_DIRECTORY_ITEMS = 100;
type WritableFileHandle = FileSystemFileHandle & { createWritable?: () => Promise<{ write: (data: Blob | string) => Promise<void>; close: () => Promise<void> }>; queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>; requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState> };
export type LocalSelection = { readonly projection: LocalSelectedFileProjection; readonly file: File; readonly handle?: WritableFileHandle };
type LocalDirectoryEntry = { readonly name: string; readonly kind: "file" | "directory"; getFile?: () => Promise<File>; getDirectoryHandle?: () => Promise<LocalDirectoryHandle> };
type LocalDirectoryHandle = { readonly name: string; values: () => AsyncIterable<LocalDirectoryEntry>; getDirectoryHandle?: (name: string) => Promise<LocalDirectoryHandle>; getFileHandle?: (name: string) => Promise<WritableFileHandle> };
export type LocalDirectoryItem = { readonly name: string; readonly kind: "file" | "directory"; readonly size?: number; readonly modifiedAt?: number; readonly mimeType?: string; readonly handle: LocalDirectoryEntry; readonly parent: LocalDirectoryHandle };
export type LocalDirectorySelection = { readonly name: string; readonly handle: LocalDirectoryHandle; readonly items: readonly LocalDirectoryItem[]; readonly stack: readonly string[]; readonly parents: readonly LocalDirectoryHandle[] };
type FilePickerWindow = Window & { showOpenFilePicker?: (options?: { multiple?: boolean }) => Promise<WritableFileHandle[]>; showSaveFilePicker?: (options?: { suggestedName?: string; types?: readonly { description: string; accept: Record<string, readonly string[]> }[] }) => Promise<WritableFileHandle>; showDirectoryPicker?: () => Promise<LocalDirectoryHandle> };

const browserWindow = (): FilePickerWindow | undefined => typeof window === "undefined" ? undefined : window as FilePickerWindow;
const extensionOf = (name: string): string => name.includes(".") ? `.${name.split(".").pop()?.toLowerCase() ?? ""}` : "";
const imageMimes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);
const textMimes = new Set(["text/plain", "text/markdown", "application/json", "text/csv", "text/html", "application/xml", "text/xml"]);
const isImage = (mimeType: string): boolean => imageMimes.has(mimeType);
const isText = (mimeType: string, extension: string): boolean => textMimes.has(mimeType) || [".txt", ".md", ".json", ".csv", ".html", ".xml"].includes(extension);

export function detectLocalFileCapabilities(): LocalFileCapabilityProjection {
  const browser = browserWindow();
  return { filePicker: browser?.showOpenFilePicker ? "LOCAL_FILE_PICKER_SUPPORTED" : "LOCAL_FILE_ACCESS_NOT_SUPPORTED", directoryPicker: browser?.showDirectoryPicker ? "LOCAL_DIRECTORY_PICKER_SUPPORTED" : "LOCAL_FILE_ACCESS_NOT_SUPPORTED" };
}
export function supportedPreview(mimeType: string, extension: string): boolean { return isImage(mimeType) || isText(mimeType, extension); }
export function supportedEditor(mimeType: string, extension: string): boolean { return isText(mimeType, extension); }
export function conversionCapabilities(mimeType: string): readonly string[] { return convertersFor(mimeType).map((converter) => converter.destinationMimeType); }
export function formatBytes(bytes: number): string { return `${new Intl.NumberFormat(undefined).format(bytes)} bytes`; }
export function permissionStateFor(handle?: WritableFileHandle): LocalPermissionState { return handle ? "GRANTED" : "DENIED"; }

export function projectLocalFile(file: File, mechanism: LocalSelectionMechanism, handle?: WritableFileHandle): LocalSelectedFileProjection {
  const { extension, viewer } = classifyLocalFileName(file.name, file.type || "application/octet-stream"); const mimeType = file.type || "application/octet-stream";
  return { sourceId: "local", selectionId: crypto.randomUUID(), name: file.name, extension, mimeType, size: file.size, lastModified: file.lastModified || undefined, itemKind: "FILE", selectionMechanism: mechanism, readCapability: true, originalSaveCapability: Boolean(handle?.createWritable), saveAsCapability: true, previewCapability: supportedPreview(mimeType, extension) || viewer?.previewSupport === "LIMITED", editCapability: supportedEditor(mimeType, extension), conversionCapabilities: conversionCapabilities(mimeType), dirty: false, permissionState: permissionStateFor(handle), previewState: "NOT_REQUESTED", validationState: "NOT_VALIDATED", viewerId: viewer?.capabilityId };
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
    input.onchange = () => { const file = input.files?.[0]; if (!file) { resolve(undefined); return; } const projection = projectLocalFile(file, "FILE_INPUT"); void (async () => { const viewer = projection.viewerId ? LocalFileViewerRegistry.find((entry) => entry.capabilityId === projection.viewerId) : undefined; resolve({ file, projection: { ...projection, validationState: await validateLocalSignature(file, viewer) } }); })(); };
    input.onerror = () => reject(new Error("Local file selection failed.")); input.click();
  });
}

export async function readLocalDirectory(handle: LocalDirectoryHandle, stack: readonly string[] = [], parents: readonly LocalDirectoryHandle[] = []): Promise<LocalDirectorySelection> {
  const items: LocalDirectoryItem[] = [];
  for await (const entry of handle.values()) {
    if (items.length >= MAX_DIRECTORY_ITEMS) break;
    if (entry.kind === "file" && entry.getFile) { const file = await entry.getFile(); items.push({ name: file.name, kind: "file", size: file.size, modifiedAt: file.lastModified, mimeType: file.type || undefined, handle: entry, parent: handle }); }
    else items.push({ name: entry.name, kind: "directory", handle: entry, parent: handle });
  }
  items.sort((left, right) => Number(right.kind === "directory") - Number(left.kind === "directory") || left.name.localeCompare(right.name));
  return { name: handle.name, handle, items, stack, parents };
}

export async function selectLocalDirectoryFile(item: LocalDirectoryItem): Promise<LocalSelection | undefined> {
  if (item.kind !== "file" || !item.handle.getFile) return undefined;
  const file = await item.handle.getFile();
  const handle = item.parent.getFileHandle ? await item.parent.getFileHandle(item.name) : undefined;
  const projection = projectLocalFile(file, "FILE_SYSTEM_HANDLE", handle);
  const viewer = projection.viewerId ? LocalFileViewerRegistry.find((entry) => entry.capabilityId === projection.viewerId) : undefined;
  return { file, handle, projection: { ...projection, validationState: await validateLocalSignature(file, viewer) } };
}

export async function selectLocalDirectory(): Promise<LocalDirectorySelection | undefined> {
  const browser = browserWindow(); if (!browser?.showDirectoryPicker) return undefined;
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