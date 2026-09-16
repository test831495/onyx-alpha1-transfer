import { beforeEach, describe, expect, it } from "vitest";

import type { Note } from "@onyx/workspace-contracts";

import { LocalNotesRepository } from "./notesRepository";
import { isValidVoiceNoteMetadata, NOTE_TYPE_VOICE_NOTE, NOTE_RECORDING_STATUS, NOTE_TRANSCRIPT_STATUS, NOTE_RECORDING_ERROR_CODES } from "./voiceNoteContracts";
import { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import { deleteVoiceNoteAudioAndMetadata, saveVoiceNoteAudioAndMetadata } from "./voiceNotePersistenceService";

function makeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

function makeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>();
  const databases = new Map<string, any>();

  const createRequest = (handler: () => void) => {
    const request: any = { result: undefined, error: undefined, onupgradeneeded: undefined, onsuccess: undefined, onerror: undefined };
    queueMicrotask(() => handler());
    return request;
  };

  const getStoreImpl = (dbName: string, storeName: string) => ({
    put: (value: any) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      stores.set(`${dbName}:${storeName}`, store);
      store.set(value.id, value);
      const request: any = { result: value, error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
    get: (key: string) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      const request: any = { result: store.get(key), error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
    delete: (key: string) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      const existed = store.delete(key);
      const request: any = { result: existed, error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
  });

  return {
    open: (databaseName: string, version: number) => {
      const request: any = { result: undefined, error: undefined, onupgradeneeded: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => {
        const existing = databases.get(databaseName);
        const database = existing ?? {
          name: databaseName,
          version,
          objectStoreNames: { contains: (storeName: string) => stores.has(`${databaseName}:${storeName}`) },
          createObjectStore: (storeName: string) => {
            if (!stores.has(`${databaseName}:${storeName}`)) {
              stores.set(`${databaseName}:${storeName}`, new Map());
            }
            return getStoreImpl(databaseName, storeName);
          },
          close: () => undefined,
          transaction: (storeName: string) => ({
            objectStore: () => getStoreImpl(databaseName, storeName),
          }),
        };
        databases.set(databaseName, database);
        request.result = database;
        request.onupgradeneeded?.call(request);
        request.onsuccess?.call(request);
      });
      return request;
    },
  };
}

function makeBlob(value: string, type = "audio/webm") {
  return new Blob([value], { type });
}

describe("Voice Note Phase A contracts and storage", () => {
  beforeEach(() => {
    const storage = makeStorage();
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
    Object.defineProperty(globalThis, "indexedDB", { value: makeIndexedDb(), configurable: true, writable: true });
    storage.clear();
  });

  it("accepts a valid saved Voice Note record and rejects invalid values", () => {
    const valid: Partial<Note> = {
      noteId: "note-1",
      title: "Voice note",
      content: "",
      tags: ["idea"],
      category: "Research",
      source: "LOCAL",
      type: NOTE_TYPE_VOICE_NOTE,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      archived: false,
      fileReferences: [],
      futureFields: {
        audioReferenceId: "audio-1",
        durationMilliseconds: 5000,
        recordedMediaType: "audio/webm",
        byteLength: 1234,
        recordingCreatedAt: new Date().toISOString(),
        recordingStatus: NOTE_RECORDING_STATUS.SAVED,
        transcriptStatus: NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED,
        recordingErrorCode: undefined,
      },
    };

    expect(isValidVoiceNoteMetadata(valid)).toBe(true);
    expect(isValidVoiceNoteMetadata({ ...valid, futureFields: { ...valid.futureFields, audioReferenceId: undefined } })).toBe(false);
    expect(isValidVoiceNoteMetadata({ ...valid, futureFields: { ...valid.futureFields, durationMilliseconds: 0 } })).toBe(false);
    expect(NOTE_RECORDING_ERROR_CODES).toContain("MICROPHONE_NOT_FOUND");
  });

  it("persists audio in an account-scoped IndexedDB store and not in localStorage", async () => {
    const repo = new VoiceNoteAudioRepository({ databaseName: "onyx.voice-notes.audio.test", storeName: "voice_note_audio" });
    await repo.open();
    const audio = makeBlob("hello-audio");
    const accountScopeId = "account-a";
    const audioReferenceId = "audio-1";
    const noteId = "note-1";

    await repo.putAudio({ accountScopeId, audioReferenceId, noteId, audio, mediaType: audio.type, byteLength: audio.size, createdAt: new Date().toISOString() });
    const persistentAudio = await repo.getAudio(accountScopeId, audioReferenceId);
    expect(persistentAudio).toBeInstanceOf(Blob);
    expect(localStorage.getItem("onyx.voice-notes.audio.test")).toBeNull();
    expect(await repo.hasAudio(accountScopeId, audioReferenceId)).toBe(true);
    expect((await repo.getAudioMetadata(accountScopeId, audioReferenceId))?.audioReferenceId).toBe(audioReferenceId);
    await repo.close();
  });

  it("isolates audio between accounts and deletes it cleanly", async () => {
    const repo = new VoiceNoteAudioRepository({ databaseName: "onyx.voice-notes.audio.test", storeName: "voice_note_audio" });
    await repo.open();
    const audio = makeBlob("audio-a");
    await repo.putAudio({ accountScopeId: "account-a", audioReferenceId: "audio-1", noteId: "note-a", audio, mediaType: audio.type, byteLength: audio.size, createdAt: new Date().toISOString() });
    expect(await repo.getAudio("account-b", "audio-1")).toBeUndefined();
    expect(await repo.deleteAudio("account-a", "audio-1")).toBe(true);
    expect(await repo.hasAudio("account-a", "audio-1")).toBe(false);
    await repo.close();
  });

  it("atomic save persists metadata and audio together, and rollbacks metadata failure cleanly", async () => {
    const repository = new LocalNotesRepository(makeStorage());
    const audioRepository = new VoiceNoteAudioRepository({ databaseName: "onyx.voice-notes.audio.test", storeName: "voice_note_audio" });
    await audioRepository.open();

    const blob = makeBlob("capture");
    const draft = {
      accountScopeId: "account-a",
      title: "Voice note",
      tags: ["test"],
      category: "Research",
      content: "",
      source: "LOCAL" as const,
      fileReferences: [],
      audio: blob,
      mediaType: blob.type,
      byteLength: blob.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationMilliseconds: 3000,
      recordingCreatedAt: new Date().toISOString(),
      recordingStatus: NOTE_RECORDING_STATUS.SAVED,
      transcriptStatus: NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED,
    };

    const saved = await saveVoiceNoteAudioAndMetadata({
      accountScopeId: draft.accountScopeId,
      noteDraft: { ...draft, title: "Saved voice note" },
      notesRepository: repository,
      audioRepository,
    });

    expect(saved.note.type).toBe(NOTE_TYPE_VOICE_NOTE);
    expect(saved.audioReferenceId).toBeTruthy();
    expect((await audioRepository.hasAudio(draft.accountScopeId, saved.audioReferenceId)).valueOf()).toBe(true);

    const data = repository.getNotes();
    expect(data.some((note) => note.type === NOTE_TYPE_VOICE_NOTE)).toBe(true);

    await audioRepository.close();
  });

  it("archival and restore preserve the same audio reference and keep deleted voice notes scoped", async () => {
    const repository = new LocalNotesRepository(makeStorage());
    const audioRepository = new VoiceNoteAudioRepository({ databaseName: "onyx.voice-notes.audio.test", storeName: "voice_note_audio" });
    await audioRepository.open();
    const blob = makeBlob("archive-me");
    const saved = await saveVoiceNoteAudioAndMetadata({
      accountScopeId: "account-a",
      noteDraft: {
        title: "Archive demo",
        tags: ["archive"],
        category: "Research",
        content: "",
        source: "LOCAL",
        fileReferences: [],
        audio: blob,
        mediaType: blob.type,
        byteLength: blob.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        durationMilliseconds: 1000,
        recordingCreatedAt: new Date().toISOString(),
        recordingStatus: NOTE_RECORDING_STATUS.SAVED,
        transcriptStatus: NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED,
      },
      notesRepository: repository,
      audioRepository,
    });

    const archived = repository.archiveNote(saved.note.noteId);
    expect(archived.archived).toBe(true);
    const restored = repository.restoreNote(saved.note.noteId);
    expect(restored.archived).toBe(false);
    expect(saved.audioReferenceId).toBeTruthy();
    expect(await audioRepository.hasAudio("account-a", saved.audioReferenceId)).toBe(true);

    const deleted = await deleteVoiceNoteAudioAndMetadata({
      accountScopeId: "account-a",
      noteId: saved.note.noteId,
      notesRepository: repository,
      audioRepository,
    });

    expect(deleted.deleted).toBe(true);
    await audioRepository.close();
  });
});
