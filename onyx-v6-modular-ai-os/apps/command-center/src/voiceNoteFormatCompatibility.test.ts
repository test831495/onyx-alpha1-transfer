import { describe, expect, it, vi } from "vitest";
import {
  VOICE_NOTE_FORMAT_CANDIDATES,
  resolveVoiceNoteFormat,
  resolveAuthoritativeVoiceNoteMediaType,
  playbackSupportFor,
  type VoiceNoteFormatProbe,
} from "./voiceNoteFormatCompatibility";
import { saveVoiceNoteAudioAndMetadata } from "./voiceNotePersistenceService";

describe("Voice Note format compatibility", () => {
  it("selects only a mutually recordable and playable format", () => {
    const probe: VoiceNoteFormatProbe = {
      isTypeSupported: (type) => type === "audio/webm;codecs=opus" || type === "audio/mp4",
      canPlayType: (type) => type === "audio/webm;codecs=opus" ? "" : "probably",
    };

    expect(resolveVoiceNoteFormat(probe)).toMatchObject({ selected: "audio/mp4" });
    expect(VOICE_NOTE_FORMAT_CANDIDATES).toContain("audio/mp4");
  });

  it("does not choose a record-only format or silently fall back", () => {
    expect(resolveVoiceNoteFormat({ isTypeSupported: () => true, canPlayType: () => "" }).selected).toBeUndefined();
    expect(resolveVoiceNoteFormat({ isTypeSupported: () => false, canPlayType: () => "probably" }).selected).toBeUndefined();
  });

  it("accepts maybe playback capability and preserves exact codec parameters", () => {
    const selected = resolveVoiceNoteFormat({ isTypeSupported: (type) => type === "audio/ogg;codecs=opus", canPlayType: () => "maybe" });
    expect(selected).toMatchObject({ selected: "audio/ogg;codecs=opus", playbackSupport: "maybe" });
  });

  it("uses actual recorder and consistent chunk evidence as authoritative type", () => {
    expect(resolveAuthoritativeVoiceNoteMediaType({ recorderType: "audio/mp4", chunkTypes: ["audio/mp4", "audio/mp4"], finalBlobType: "audio/mp4" })).toBe("audio/mp4");
    expect(resolveAuthoritativeVoiceNoteMediaType({ recorderType: "audio/webm;codecs=opus", chunkTypes: ["audio/webm", "audio/webm"], finalBlobType: "" })).toBe("audio/webm;codecs=opus");
    expect(() => resolveAuthoritativeVoiceNoteMediaType({ recorderType: "audio/mp4", chunkTypes: ["audio/mp4", "audio/webm"], finalBlobType: "audio/mp4" })).toThrow("RECORDER_OUTPUT_FORMAT_CONFLICT");
  });

  it("probes the exact persisted MIME string without normalising codec parameters", () => {
    const canPlayType = (type: string) => type === "audio/webm;codecs=opus" ? "probably" : "";
    expect(playbackSupportFor({ canPlayType }, "audio/webm;codecs=opus")).toBe("probably");
    expect(playbackSupportFor({ canPlayType }, "audio/webm")).toBe("");
  });

  it("keeps persisted media type equal to Blob.type and rejects conflicting metadata", async () => {
    const note = { noteId: "note-1", version: 1, title: "Voice note", content: "", type: "VOICE_NOTE", source: "LOCAL", tags: [], fileReferences: [], pinned: false, archived: false, createdAt: "2026-09-17", updatedAt: "2026-09-17", futureFields: {} } as never;
    const putAudio = vi.fn().mockResolvedValue(undefined);
    const repositories = {
      notes: { createNote: vi.fn(() => note) },
      audio: { hasAudio: vi.fn().mockResolvedValue(false), putAudio, deleteAudio: vi.fn().mockResolvedValue(true) },
    };
    await saveVoiceNoteAudioAndMetadata({ accountScopeId: "account-a", notesRepository: repositories.notes as never, audioRepository: repositories.audio as never, noteDraft: { title: "Voice note", audio: new Blob(["audio"], { type: "audio/mp4" }), durationMilliseconds: 1000, byteLength: 5 } });
    expect(putAudio).toHaveBeenCalledWith(expect.objectContaining({ mediaType: "audio/mp4", audio: expect.any(Blob) }));
    await expect(saveVoiceNoteAudioAndMetadata({ accountScopeId: "account-a", notesRepository: repositories.notes as never, audioRepository: repositories.audio as never, noteDraft: { title: "Voice note", audio: new Blob(["audio"], { type: "audio/mp4" }), mediaType: "audio/webm", durationMilliseconds: 1000, byteLength: 5 } })).rejects.toThrow("AUDIO_FORMAT_METADATA_MISMATCH");
  });
});
