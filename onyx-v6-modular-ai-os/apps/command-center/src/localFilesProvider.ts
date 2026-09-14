import type { LocalFileCapabilityProjection } from "@onyx/workspace-contracts";

export type LocalSelection = { readonly name: string; readonly kind: "file" | "directory"; readonly size?: number; readonly modifiedAt?: number; readonly mimeType?: string; readonly entries?: readonly { readonly name: string; readonly kind: "file" | "directory"; readonly size?: number; readonly modifiedAt?: number; readonly mimeType?: string }[] };
type LocalDirectoryEntry = { readonly name: string; readonly kind: "file" | "directory"; getFile?: () => Promise<File> };
type LocalDirectoryHandle = { readonly name: string; values: () => AsyncIterable<LocalDirectoryEntry> };

export function detectLocalFileCapabilities(): LocalFileCapabilityProjection {
  const browser = typeof window === "undefined" ? undefined : window;
  return {
    filePicker: browser && "showOpenFilePicker" in browser ? "LOCAL_FILE_PICKER_SUPPORTED" : "LOCAL_FILE_ACCESS_NOT_SUPPORTED",
    directoryPicker: browser && "showDirectoryPicker" in browser ? "LOCAL_DIRECTORY_PICKER_SUPPORTED" : "LOCAL_FILE_ACCESS_NOT_SUPPORTED",
  };
}

export async function selectLocalFile(): Promise<LocalSelection | undefined> {
  if (typeof window === "undefined" || !("showOpenFilePicker" in window)) return undefined;
  try {
    const [handle] = await (window as Window & { showOpenFilePicker: () => Promise<FileSystemFileHandle[]> }).showOpenFilePicker();
    if (!handle) return undefined;
    const file = await handle.getFile();
    return { name: file.name, kind: "file", size: file.size, modifiedAt: file.lastModified, mimeType: file.type || undefined };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return undefined;
    throw error;
  }
}

export async function selectLocalDirectory(): Promise<LocalSelection | undefined> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) return undefined;
  try {
    const handle = await (window as Window & { showDirectoryPicker: () => Promise<LocalDirectoryHandle> }).showDirectoryPicker();
    const entries: Array<NonNullable<LocalSelection["entries"]>[number]> = [];
    for await (const entry of handle.values()) {
      if (entries.length >= 100) break;
      if (entry.kind === "file") {
        if (!entry.getFile) continue;
        const file = await entry.getFile();
        entries.push({ name: file.name, kind: "file", size: file.size, modifiedAt: file.lastModified, mimeType: file.type || undefined });
      } else entries.push({ name: entry.name, kind: "directory" });
    }
    return { name: handle.name, kind: "directory", entries };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return undefined;
    throw error;
  }
}