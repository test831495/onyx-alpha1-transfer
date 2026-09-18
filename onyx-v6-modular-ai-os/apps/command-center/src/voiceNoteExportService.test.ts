import { describe, expect, it, vi } from "vitest";
import type { Note } from "@onyx/workspace-contracts";
import {
  buildVoiceNoteClipDefinition,
  canShareVoiceNote,
  listVoiceNoteExportDestinations,
  saveVoiceNoteToDevice,
  shareVoiceNote,
  type SaveFilePickerWindow,
  type ShareNavigator,
} from "./voiceNoteExportService";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    noteId: "note-1",
    title: "Original recording",
    content: "",
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    pinned: false,
    archived: false,
    tags: [],
    source: "VOICE_NOTE",
    type: "VOICE_NOTE",
    version: 1,
    futureFields: { audioReferenceId: "audio-1", durationMilliseconds: 20000, recordedMediaType: "audio/webm", byteLength: 40, recordingStatus: "SAVED", transcriptStatus: "NOT_REQUESTED" },
    fileReferences: [],
    ...overrides,
  } as Note;
}

describe("saveVoiceNoteToDevice", () => {
  it("returns SUCCESS only after the native picker actually writes and closes", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
    const outcome = await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", { showSaveFilePicker } as unknown as SaveFilePickerWindow);
    expect(outcome).toBe("SUCCESS");
    expect(write).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("maps picker cancellation and permission denial without claiming success", async () => {
    const abort = async () => { throw new DOMException("cancelled", "AbortError"); };
    expect(await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", { showSaveFilePicker: abort } as unknown as SaveFilePickerWindow)).toBe("CANCELLED");
    const denied = async () => { throw new DOMException("denied", "NotAllowedError"); };
    expect(await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", { showSaveFilePicker: denied } as unknown as SaveFilePickerWindow)).toBe("PERMISSION_DENIED");
  });

  it("reports WRITE_FAILED when the writable stream rejects", async () => {
    const showSaveFilePicker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write: vi.fn().mockRejectedValue(new Error("disk full")), close: vi.fn() }) });
    expect(await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", { showSaveFilePicker } as unknown as SaveFilePickerWindow)).toBe("WRITE_FAILED");
  });

  it("falls back to a download anchor and revokes the object URL without leaking it", async () => {
    vi.useFakeTimers();
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:voice-note-export");
    const anchor = { href: "", download: "", style: {} as CSSStyleDeclaration, click: vi.fn() } as unknown as HTMLAnchorElement;
    const body = { appendChild: vi.fn(), removeChild: vi.fn() } as unknown as HTMLElement;
    const doc = { createElement: vi.fn().mockReturnValue(anchor), body } as unknown as Pick<Document, "createElement" | "body">;
    const env: SaveFilePickerWindow = { document: doc, URL: { createObjectURL, revokeObjectURL }, setTimeout: ((handler: () => void, ms: number) => setTimeout(handler, ms)) as unknown as SaveFilePickerWindow["setTimeout"] };
    const outcome = await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", env);
    expect(outcome).toBe("SUCCESS");
    expect(anchor.download).toBe("clip.webm");
    expect(body.appendChild).toHaveBeenCalledWith(anchor);
    expect(body.removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-note-export");
    vi.useRealTimers();
  });

  it("reports UNSUPPORTED when neither the picker nor the fallback is available", async () => {
    expect(await saveVoiceNoteToDevice(new Blob(["a"]), "clip.webm", {} as SaveFilePickerWindow)).toBe("UNSUPPORTED");
  });
});

describe("canShareVoiceNote / shareVoiceNote", () => {
  it("reflects navigator.canShare when present", () => {
    expect(canShareVoiceNote("audio/webm", { share: vi.fn(), canShare: () => true } as unknown as ShareNavigator)).toBe(true);
    expect(canShareVoiceNote("audio/webm", { share: vi.fn(), canShare: () => false } as unknown as ShareNavigator)).toBe(false);
    expect(canShareVoiceNote("audio/webm", {} as ShareNavigator)).toBe(false);
  });

  it("shares the exact blob content and mime as a File and reports success without naming a destination", async () => {
    let sharedFile: File | undefined;
    const nav = { share: vi.fn(async (data: { files: readonly File[] }) => { sharedFile = data.files[0]; }), canShare: () => true } as unknown as ShareNavigator;
    const outcome = await shareVoiceNote(new Blob(["audio-bytes"], { type: "audio/webm" }), "clip.webm", "audio/webm", nav);
    expect(outcome).toBe("SUCCESS_OR_HANDOFF_STARTED");
    expect(sharedFile?.name).toBe("clip.webm");
    expect(sharedFile?.type).toBe("audio/webm");
    expect(await sharedFile?.text()).toBe("audio-bytes");
  });

  it("maps cancellation, permission block, and unsupported without fabricating success", async () => {
    expect(await shareVoiceNote(new Blob(["a"]), "clip.webm", "audio/webm", {} as ShareNavigator)).toBe("UNSUPPORTED");
    const cancelled = { share: async () => { throw new DOMException("cancelled", "AbortError"); }, canShare: () => true } as unknown as ShareNavigator;
    expect(await shareVoiceNote(new Blob(["a"]), "clip.webm", "audio/webm", cancelled)).toBe("CANCELLED");
    const blocked = { share: async () => { throw new DOMException("blocked", "NotAllowedError"); }, canShare: () => true } as unknown as ShareNavigator;
    expect(await shareVoiceNote(new Blob(["a"]), "clip.webm", "audio/webm", blocked)).toBe("BLOCKED");
  });
});

describe("listVoiceNoteExportDestinations", () => {
  it("marks Save to Device and Share available only when capability facts say so, and never marks connectors as writable", () => {
    const supported = listVoiceNoteExportDestinations({ deviceSaveSupported: true, shareSupported: true });
    expect(supported.find((d) => d.id === "device")?.status).toBe("AVAILABLE");
    expect(supported.find((d) => d.id === "share")?.status).toBe("AVAILABLE");

    const unsupported = listVoiceNoteExportDestinations({ deviceSaveSupported: false, shareSupported: false });
    expect(unsupported.find((d) => d.id === "device")?.status).toBe("UNAVAILABLE_ON_DEVICE");
    expect(unsupported.find((d) => d.id === "share")?.status).toBe("UNAVAILABLE_ON_DEVICE");

    for (const id of ["files", "onedrive", "google-drive", "sharepoint"] as const) {
      const destination = supported.find((d) => d.id === id);
      expect(destination?.status).not.toBe("AVAILABLE");
      expect(destination?.reason.length).toBeGreaterThan(0);
    }
    expect(supported.find((d) => d.id === "dropbox")?.status).toBe("COMING_LATER");
    expect(supported.find((d) => d.id === "box")?.status).toBe("COMING_LATER");
  });
});

describe("buildVoiceNoteClipDefinition", () => {
  it("builds truthful bounded metadata for a derived clip", () => {
    const source = makeNote({ noteId: "source-note", title: "Original recording" });
    const derived = makeNote({ noteId: "derived-note", title: "Original recording - Trimmed", futureFields: { ...source.futureFields, sourceNoteId: "source-note", sourceAudioReferenceId: "audio-1", trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, originalDurationMilliseconds: 20000, derivedFromVoiceNote: true } });
    const definition = buildVoiceNoteClipDefinition(derived, source, "2026-09-17T12:00:00.000Z");
    expect(definition).toEqual({ sourceTitle: "Original recording", sourceFormat: "audio/webm", trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, clipDurationMilliseconds: 10000, exportedAt: "2026-09-17T12:00:00.000Z" });
  });

  it("returns undefined for a non-derived note (no trim boundaries)", () => {
    expect(buildVoiceNoteClipDefinition(makeNote(), undefined, "2026-09-17T12:00:00.000Z")).toBeUndefined();
  });
});
