import type { Note } from "@onyx/workspace-contracts";

export type VoiceNoteDeviceSaveOutcome = "SUCCESS" | "CANCELLED" | "PERMISSION_DENIED" | "UNSUPPORTED" | "WRITE_FAILED";
export type VoiceNoteShareOutcome = "SUCCESS_OR_HANDOFF_STARTED" | "CANCELLED" | "UNSUPPORTED" | "BLOCKED" | "SHARE_FAILED";

interface SaveFileWritable { write: (data: Blob) => Promise<void>; close: () => Promise<void>; }
interface SaveFileHandle { createWritable: () => Promise<SaveFileWritable>; }
export interface SaveFilePickerWindow {
  readonly showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<SaveFileHandle>;
  readonly document?: Pick<Document, "createElement" | "body">;
  readonly URL?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  readonly setTimeout?: (handler: () => void, timeout: number) => unknown;
}

function isAbort(error: unknown): boolean { return error instanceof DOMException && error.name === "AbortError"; }
function isPermissionDenied(error: unknown): boolean { return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError"); }

/** Never reports SUCCESS unless the write (native picker) or download handoff (fallback) actually completed. */
export async function saveVoiceNoteToDevice(blob: Blob, filename: string, env: SaveFilePickerWindow | undefined = typeof window === "undefined" ? undefined : (window as unknown as SaveFilePickerWindow)): Promise<VoiceNoteDeviceSaveOutcome> {
  if (env?.showSaveFilePicker) {
    try {
      const handle = await env.showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "SUCCESS";
    } catch (error) {
      if (isAbort(error)) return "CANCELLED";
      if (isPermissionDenied(error)) return "PERMISSION_DENIED";
      return "WRITE_FAILED";
    }
  }
  return downloadVoiceNoteFallback(blob, filename, env);
}

function downloadVoiceNoteFallback(blob: Blob, filename: string, env: SaveFilePickerWindow | undefined): VoiceNoteDeviceSaveOutcome {
  const doc = env?.document;
  const urlApi = env?.URL;
  if (!doc || !urlApi || typeof urlApi.createObjectURL !== "function") return "UNSUPPORTED";
  try {
    const url = urlApi.createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    doc.body.appendChild(anchor);
    anchor.click();
    doc.body.removeChild(anchor);
    const revoke = () => urlApi.revokeObjectURL(url);
    if (typeof env?.setTimeout === "function") env.setTimeout(revoke, 30_000);
    else revoke();
    return "SUCCESS";
  } catch {
    return "WRITE_FAILED";
  }
}

export interface ShareNavigator { readonly share?: (data: { readonly files: readonly File[] }) => Promise<void>; readonly canShare?: (data?: { readonly files: readonly File[] }) => boolean; }

export function canShareVoiceNote(mediaType: string, nav: ShareNavigator | undefined = typeof navigator === "undefined" ? undefined : (navigator as unknown as ShareNavigator)): boolean {
  if (typeof nav?.share !== "function") return false;
  if (typeof nav.canShare !== "function") return true;
  try { return nav.canShare({ files: [new File([""], "probe", { type: mediaType || "application/octet-stream" })] }); } catch { return false; }
}

/** Never labels native Share as a specific provider; the OS decides which share targets appear. */
export async function shareVoiceNote(blob: Blob, filename: string, mediaType: string, nav: ShareNavigator | undefined = typeof navigator === "undefined" ? undefined : (navigator as unknown as ShareNavigator)): Promise<VoiceNoteShareOutcome> {
  if (typeof nav?.share !== "function") return "UNSUPPORTED";
  const file = new File([blob], filename, { type: mediaType || blob.type || "application/octet-stream" });
  if (typeof nav.canShare === "function" && !nav.canShare({ files: [file] })) return "UNSUPPORTED";
  try {
    await nav.share({ files: [file] });
    return "SUCCESS_OR_HANDOFF_STARTED";
  } catch (error) {
    if (isAbort(error)) return "CANCELLED";
    if (isPermissionDenied(error)) return "BLOCKED";
    return "SHARE_FAILED";
  }
}

export type VoiceNoteExportDestinationId = "device" | "share" | "files" | "onedrive" | "google-drive" | "sharepoint" | "dropbox" | "box";
export type VoiceNoteExportDestinationStatus = "AVAILABLE" | "SIGN_IN_REQUIRED" | "READ_ONLY" | "NOT_CONFIGURED" | "COMING_LATER" | "UNAVAILABLE_ON_DEVICE";
export interface VoiceNoteExportDestination {
  readonly id: VoiceNoteExportDestinationId;
  readonly label: string;
  readonly status: VoiceNoteExportDestinationStatus;
  readonly reason: string;
  readonly group: "EXPORT_FILE" | "CONNECTED_STORAGE" | "OTHER";
}

/**
 * Destinations are capability-driven only. OneDrive/SharePoint/Google Drive/Files are shown as
 * truthfully disabled: the only existing Microsoft Graph "write" path is a bounded, explicit-test-mode
 * connector self-validation (creates/deletes a synthetic artifact in a fixed test folder) and the Files
 * source registry only declares BROWSE/READ_METADATA today, so none of them are a real end-user file
 * save capability yet. No provider-specific business logic lives in NotesPanel; this registry is the
 * single source of truth NotesPanel renders from.
 */
export function listVoiceNoteExportDestinations(facts: { readonly deviceSaveSupported: boolean; readonly shareSupported: boolean }): readonly VoiceNoteExportDestination[] {
  return [
    { id: "device", label: "Save to Device", status: facts.deviceSaveSupported ? "AVAILABLE" : "UNAVAILABLE_ON_DEVICE", reason: facts.deviceSaveSupported ? "Downloads the audio file to this device." : "Not available on this browser/device.", group: "EXPORT_FILE" },
    { id: "share", label: "Share", status: facts.shareSupported ? "AVAILABLE" : "UNAVAILABLE_ON_DEVICE", reason: facts.shareSupported ? "Opens this device's native Share sheet." : "Native sharing is not available on this device.", group: "EXPORT_FILE" },
    { id: "files", label: "Save to Files", status: "READ_ONLY", reason: "Files app: read-only. Writing files from ONYX is not available yet.", group: "EXPORT_FILE" },
    { id: "onedrive", label: "OneDrive", status: "NOT_CONFIGURED", reason: "Write support not available yet.", group: "CONNECTED_STORAGE" },
    { id: "google-drive", label: "Google Drive", status: "NOT_CONFIGURED", reason: "Write support not available yet.", group: "CONNECTED_STORAGE" },
    { id: "sharepoint", label: "SharePoint", status: "NOT_CONFIGURED", reason: "Write support not available yet.", group: "CONNECTED_STORAGE" },
    { id: "dropbox", label: "Dropbox", status: "COMING_LATER", reason: "Not connected.", group: "OTHER" },
    { id: "box", label: "Box", status: "COMING_LATER", reason: "Not connected.", group: "OTHER" },
  ];
}

export interface VoiceNoteClipDefinitionExport {
  readonly sourceTitle: string;
  readonly sourceFormat: string;
  readonly trimStartMilliseconds: number;
  readonly trimEndMilliseconds: number;
  readonly clipDurationMilliseconds: number;
  readonly exportedAt: string;
}

/** Truthful metadata-only export for a derived clip; never renders or transcodes audio. */
export function buildVoiceNoteClipDefinition(derivedNote: Note, sourceNote: Note | undefined, exportedAt: string): VoiceNoteClipDefinitionExport | undefined {
  const start = derivedNote.futureFields.trimStartMilliseconds;
  const end = derivedNote.futureFields.trimEndMilliseconds;
  if (typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return {
    sourceTitle: sourceNote?.title ?? String(derivedNote.futureFields.sourceNoteId ?? ""),
    sourceFormat: String(sourceNote?.futureFields.recordedMediaType ?? derivedNote.futureFields.recordedMediaType ?? ""),
    trimStartMilliseconds: start,
    trimEndMilliseconds: end,
    clipDurationMilliseconds: end - start,
    exportedAt,
  };
}

export interface VoiceNoteExportReceipt {
  readonly destination: VoiceNoteExportDestinationId;
  readonly filename: string;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly status: "SUCCESS" | "FAILED";
  readonly exportedAt: string;
}
