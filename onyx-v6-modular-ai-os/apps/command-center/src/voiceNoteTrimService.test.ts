import { describe, expect, it, vi } from "vitest";
import type { Note } from "@onyx/workspace-contracts";
import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import { saveTrimmedVoiceNoteClip } from "./voiceNoteTrimService";

function makeSourceNote(overrides: Partial<Note> = {}): Note {
  return {
    noteId: "source-note",
    title: "Original recording",
    content: "",
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    pinned: false,
    archived: false,
    tags: [],
    category: "Meetings",
    source: "VOICE_NOTE",
    type: "VOICE_NOTE",
    version: 1,
    futureFields: { audioReferenceId: "source-audio", durationMilliseconds: 20000, recordedMediaType: "audio/webm;codecs=opus", byteLength: 40, recordingStatus: "SAVED", transcriptStatus: "NOT_REQUESTED" },
    fileReferences: [],
    ...overrides,
  } as Note;
}

function makeStores(sourceAudioBytes = "original-audio-bytes") {
  const notes: Note[] = [];
  const audioRecords = new Map<string, { audio: Blob; mediaType: string; byteLength: number; noteId: string }>();
  audioRecords.set("source-audio", { audio: new Blob([sourceAudioBytes], { type: "audio/webm;codecs=opus" }), mediaType: "audio/webm;codecs=opus", byteLength: sourceAudioBytes.length, noteId: "source-note" });
  let sequence = 0;
  const notesRepository = {
    createNote: vi.fn((input: { title: string; content?: string; tags?: readonly string[]; category?: string; futureFields?: Record<string, unknown>; fileReferences?: readonly unknown[] }) => {
      sequence += 1;
      const note = { noteId: `derived-note-${sequence}`, title: input.title, content: input.content ?? "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, archived: false, tags: input.tags ?? [], category: input.category, source: "VOICE_NOTE", type: "VOICE_NOTE", version: 1, futureFields: input.futureFields ?? {}, fileReferences: input.fileReferences ?? [] };
      notes.push(note as Note);
      return note as Note;
    }),
    getNotes: vi.fn(() => notes),
    deleteNote: vi.fn(),
  } as unknown as LocalNotesRepository;
  const audioRepository = {
    hasAudio: vi.fn(async (_scope: string, referenceId: string) => audioRecords.has(referenceId)),
    getAudio: vi.fn(async (_scope: string, referenceId: string) => audioRecords.get(referenceId)?.audio),
    putAudio: vi.fn(async (request: { audioReferenceId: string; noteId: string; audio: Blob; mediaType: string; byteLength: number }) => { audioRecords.set(request.audioReferenceId, { audio: request.audio, mediaType: request.mediaType, byteLength: request.byteLength, noteId: request.noteId }); }),
    deleteAudio: vi.fn(async (_scope: string, referenceId: string) => audioRecords.delete(referenceId)),
  } as unknown as VoiceNoteAudioRepository;
  return { notes, audioRecords, notesRepository, audioRepository };
}

describe("saveTrimmedVoiceNoteClip", () => {
  it("creates an independent derived Note and audio record with the source bytes duplicated exactly", async () => {
    const { notes, audioRecords, notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote();

    const { note } = await saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip - Trimmed", trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, notesRepository, audioRepository, idFactory: () => "clip-audio-1" });

    expect(note.noteId).not.toBe(sourceNote.noteId);
    expect(note.futureFields.audioReferenceId).not.toBe(sourceNote.futureFields.audioReferenceId);
    expect(note.futureFields).toMatchObject({ sourceNoteId: "source-note", sourceAudioReferenceId: "source-audio", trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, originalDurationMilliseconds: 20000, derivedFromVoiceNote: true, durationMilliseconds: 10000 });
    expect(notes).toHaveLength(1);
    expect(audioRecords.size).toBe(2);
    const derivedRecord = audioRecords.get("clip-audio-1");
    expect(derivedRecord?.mediaType).toBe("audio/webm;codecs=opus");
    expect(await derivedRecord?.audio.text()).toBe("original-audio-bytes");
    expect(audioRecords.get("source-audio")?.noteId).toBe("source-note");
  });

  it("preserves the original note's category and never mutates the source audio record", async () => {
    const { audioRecords, notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote({ category: "Research" });
    const { note } = await saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository, idFactory: () => "clip-audio-2" });
    expect(note.category).toBe("Research");
    expect(await audioRecords.get("source-audio")?.audio.text()).toBe("original-audio-bytes");
  });

  it("rejects an invalid trim range without persisting anything", async () => {
    const { notes, audioRecords, notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote();
    await expect(saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 15000, trimEndMilliseconds: 5000, notesRepository, audioRepository })).rejects.toThrow("INVALID_TRIM_RANGE");
    expect(notes).toHaveLength(0);
    expect(audioRecords.size).toBe(1);
  });

  it("rejects a blank title", async () => {
    const { notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote();
    await expect(saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "   ", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository })).rejects.toThrow("VOICE_NOTE_TITLE_REQUIRED");
  });

  it("rejects a non-voice-note source", async () => {
    const { notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote({ type: "TEXT_NOTE" });
    await expect(saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository })).rejects.toThrow("VOICE_NOTE_SOURCE_REQUIRED");
  });

  it("fails cleanly when the source audio cannot be found", async () => {
    const { notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote({ futureFields: { audioReferenceId: "missing-audio", durationMilliseconds: 20000 } });
    await expect(saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository })).rejects.toThrow("AUDIO_NOT_FOUND");
  });

  it("retries on audioReferenceId collision", async () => {
    const { notesRepository, audioRepository } = makeStores();
    const sourceNote = makeSourceNote();
    let calls = 0;
    const idFactory = () => { calls += 1; return calls === 1 ? "source-audio" : "clip-audio-fresh"; };
    const { note } = await saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository, idFactory });
    expect(note.futureFields.audioReferenceId).toBe("clip-audio-fresh");
  });

  it("rolls back the duplicated audio if note creation fails", async () => {
    const { audioRecords, notesRepository, audioRepository } = makeStores();
    (notesRepository.createNote as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error("storage failed"); });
    const sourceNote = makeSourceNote();
    await expect(saveTrimmedVoiceNoteClip({ accountScopeId: "account-a", sourceNote, title: "Clip", trimStartMilliseconds: 0, trimEndMilliseconds: 10000, notesRepository, audioRepository, idFactory: () => "clip-audio-3" })).rejects.toThrow("storage failed");
    expect(audioRecords.has("clip-audio-3")).toBe(false);
    expect(audioRecords.has("source-audio")).toBe(true);
  });
});
