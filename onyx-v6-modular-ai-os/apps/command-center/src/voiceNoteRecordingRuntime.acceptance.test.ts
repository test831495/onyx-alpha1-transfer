import { describe, expect, it, vi } from "vitest";

import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import {
  VoiceNoteOwnershipGuard,
  VoiceNoteRecordingError,
  VoiceNoteRecordingRuntime,
  createVoiceNoteCapability,
  negotiateVoiceNoteFormat,
  transitionVoiceNoteState,
} from "./voiceNoteRecordingRuntime";

function makeTrack() {
  const listeners = new Map<string, () => void>();
  return {
    readyState: "live",
    stop: vi.fn(function (this: { readyState: string }) { this.readyState = "ended"; }),
    addEventListener: vi.fn((name: string, listener: () => void) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    end: () => listeners.get("ended")?.(),
  } as unknown as MediaStreamTrack & { end: () => void };
}

function makeRecorder(mimeType = "audio/webm;codecs=opus") {
  const recorder = {
    mimeType,
    state: "inactive",
    start: vi.fn(function (this: { state: string }) { this.state = "recording"; }),
    pause: vi.fn(function (this: { state: string }) { this.state = "paused"; }),
    resume: vi.fn(function (this: { state: string }) { this.state = "recording"; }),
    stop: vi.fn(),
    ondataavailable: undefined as ((event: BlobEvent) => void) | undefined,
    onerror: undefined as ((event: unknown) => void) | undefined,
    onstop: undefined as (() => void) | undefined,
    emitChunk: (value: string, type = mimeType) => recorder.ondataavailable?.({ data: new Blob([value], { type }) } as BlobEvent),
    emitEmptyChunk: () => recorder.ondataavailable?.({ data: new Blob([], { type: mimeType }) } as BlobEvent),
    emitError: (error: unknown = new Error("recorder failed")) => recorder.onerror?.(error),
    emitStop: () => recorder.onstop?.(),
  };
  return recorder;
}

function makeRuntime(options: { now?: () => number; recorder?: ReturnType<typeof makeRecorder>; track?: ReturnType<typeof makeTrack>; mediaDevices?: Pick<MediaDevices, "getUserMedia">; mediaCanPlayType?: (mimeType: string) => "probably" | "maybe" | "" | undefined; ownership?: VoiceNoteOwnershipGuard; maxDurationMilliseconds?: number; maxBytes?: number; maxChunks?: number; notesRepository?: LocalNotesRepository; audioRepository?: VoiceNoteAudioRepository } = {}) {
  const track = options.track ?? makeTrack();
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  const recorder = options.recorder ?? makeRecorder();
  const getUserMedia = options.mediaDevices?.getUserMedia ?? vi.fn().mockResolvedValue(stream);
  const runtime = new VoiceNoteRecordingRuntime({
    accountScopeId: "account-a",
    isSecureContext: true,
    mediaDevices: { getUserMedia },
    mediaRecorderFactory: () => recorder as unknown as MediaRecorder,
    mediaRecorderTypeSupported: () => true,
    mediaCanPlayType: options.mediaCanPlayType,
    now: options.now ?? (() => 0),
    ownership: options.ownership,
    maxDurationMilliseconds: options.maxDurationMilliseconds,
    maxBytes: options.maxBytes,
    maxChunks: options.maxChunks,
    notesRepository: options.notesRepository,
    audioRepository: options.audioRepository,
  });
  return { runtime, recorder, track, stream, getUserMedia };
}

async function startAndStop(runtime: VoiceNoteRecordingRuntime, recorder: ReturnType<typeof makeRecorder>, value = "audio") {
  await runtime.start();
  recorder.emitChunk(value);
  const stopping = runtime.stop();
  recorder.emitStop();
  await stopping;
}

describe("Voice Note Phase B independent acceptance", () => {
  it("covers capability failure and degraded matrices without permission work", () => {
    const getUserMedia = vi.fn();
    expect(createVoiceNoteCapability({ isSecureContext: true, mediaDevices: undefined, mediaRecorderAvailable: true, storageAvailable: true }).reason).toBe("MEDIA_DEVICES_UNAVAILABLE");
    expect(createVoiceNoteCapability({ isSecureContext: true, mediaDevices: {} as Pick<MediaDevices, "getUserMedia">, mediaRecorderAvailable: true, storageAvailable: true }).reason).toBe("MEDIA_DEVICES_UNAVAILABLE");
    expect(createVoiceNoteCapability({ isSecureContext: true, mediaDevices: { getUserMedia }, mediaRecorderAvailable: false, storageAvailable: true }).reason).toBe("MEDIA_RECORDER_UNAVAILABLE");
    expect(createVoiceNoteCapability({ isSecureContext: true, mediaDevices: { getUserMedia }, mediaRecorderAvailable: true, storageAvailable: false }).reason).toBe("STORAGE_UNAVAILABLE");
    expect(createVoiceNoteCapability({ isSecureContext: true, mediaDevices: { getUserMedia }, mediaRecorderAvailable: true, storageAvailable: true, pauseSupported: false, resumeSupported: false })).toMatchObject({ outcome: "RECORD_WITHOUT_PAUSE", canPause: false });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("negotiates preference order and browser-default fallback", () => {
    expect(negotiateVoiceNoteFormat((value) => value === "audio/webm;codecs=opus")).toBe("audio/webm;codecs=opus");
    expect(negotiateVoiceNoteFormat((value) => value === "audio/mp4")).toBe("audio/mp4");
    expect(negotiateVoiceNoteFormat(() => false)).toBeUndefined();
    expect(negotiateVoiceNoteFormat()).toBeUndefined();
  });

  it("selects a mutually compatible format and retains the recorder output type", async () => {
    const session = makeRuntime({ recorder: makeRecorder("audio/mp4"), mediaCanPlayType: (type) => type === "audio/mp4" ? "probably" : "" });
    await startAndStop(session.runtime, session.recorder);
    expect(session.runtime.reviewDraft?.actualMediaType).toBe("audio/mp4");
    expect(session.runtime.reviewDraft?.audio.type).toBe("audio/mp4");
  });

  it("allows recording when playback capability is empty and preserves the actual recorder type", async () => {
    const session = makeRuntime({ mediaCanPlayType: () => "" });
    await startAndStop(session.runtime, session.recorder, "recordable");
    expect(session.runtime.state).toBe("REVIEW_READY");
    expect(session.runtime.reviewDraft?.actualMediaType).toBe("audio/webm;codecs=opus");
  });

  it("requests audio only after explicit Start and normalizes permission failures", async () => {
    const denied = makeRuntime({ mediaDevices: { getUserMedia: vi.fn().mockRejectedValue({ name: "NotAllowedError" }) } });
    expect(denied.getUserMedia).not.toHaveBeenCalled();
    await expect(denied.runtime.start()).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(denied.runtime.state).toBe("FAILED");

    const notFound = makeRuntime({ mediaDevices: { getUserMedia: vi.fn().mockRejectedValue({ name: "NotFoundError" }) } });
    await expect(notFound.runtime.start()).rejects.toMatchObject({ code: "MICROPHONE_NOT_FOUND" });
    const unreadable = makeRuntime({ mediaDevices: { getUserMedia: vi.fn().mockRejectedValue({ name: "NotReadableError" }) } });
    await expect(unreadable.runtime.start()).rejects.toMatchObject({ code: "MICROPHONE_NOT_READABLE" });
  });

  it("cancels an unresolved permission request and stops tracks after initialization failure", async () => {
    let resolvePermission!: (stream: MediaStream) => void;
    const pending = makeRuntime({ mediaDevices: { getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { resolvePermission = resolve; })) } });
    const starting = pending.runtime.start();
    pending.runtime.cancel();
    expect(pending.runtime.state).toBe("CANCELLED");
    resolvePermission(pending.stream);
    await expect(starting).rejects.toMatchObject({ code: "RECORDING_ABORTED" });
    expect(pending.track.stop).toHaveBeenCalled();

    const failedTrack = makeTrack();
    const failed = makeRuntime({ track: failedTrack, recorder: makeRecorder() });
    failed.runtime = new VoiceNoteRecordingRuntime({ accountScopeId: "account-a", isSecureContext: true, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(failed.stream) }, mediaRecorderFactory: () => { throw new Error("recorder init"); } });
    await expect(failed.runtime.start()).rejects.toMatchObject({ code: "UNKNOWN_RECORDING_FAILURE" });
    expect(failedTrack.stop).toHaveBeenCalled();
  });

  it("covers every invalid transition, duplicate Start, explicit reset, and save gating", async () => {
    const invalid: Array<[Parameters<typeof transitionVoiceNoteState>[0], string]> = [
      ["IDLE", "PAUSE"], ["REQUESTING_PERMISSION", "STOP"], ["RECORDING", "RESUME"], ["PAUSED", "PAUSE"], ["STOPPING", "START"], ["REVIEW_READY", "STOP"], ["SAVING", "SAVE"], ["SAVED", "START"], ["CANCELLED", "START"], ["FAILED", "START"],
    ];
    invalid.forEach(([state, event]) => expect(() => transitionVoiceNoteState(state, event)).toThrow(VoiceNoteRecordingError));
    const session = makeRuntime();
    await session.runtime.start();
    await expect(session.runtime.start()).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    session.runtime.cancel();
    expect(session.runtime.state).toBe("CANCELLED");
    expect(transitionVoiceNoteState("CANCELLED", "RESET")).toBe("IDLE");
    await expect(session.runtime.save()).rejects.toMatchObject({ code: "REVIEW_READY_REQUIRED" });
  });

  it("excludes paused time, supports pause/resume, and enforces duration bounds", async () => {
    let clock = 0;
    const session = makeRuntime({ now: () => clock, maxDurationMilliseconds: 1000 });
    await session.runtime.start();
    clock = 400;
    session.runtime.pause();
    clock = 1400;
    expect(session.runtime.elapsedMilliseconds).toBe(400);
    session.runtime.resume();
    clock = 2200;
    session.recorder.emitChunk("audio");
    expect(session.runtime.errorCode).toBe("RECORDING_TOO_LONG");
    expect(session.runtime.state).toBe("STOPPING");
  });

  it("ignores empty chunks, retains valid chunks, rejects byte and count overflow without silent truncation", async () => {
    const bytes = makeRuntime({ maxBytes: 4 });
    await bytes.runtime.start();
    bytes.recorder.emitEmptyChunk();
    bytes.recorder.emitChunk("1234");
    bytes.recorder.emitChunk("5");
    expect(bytes.runtime.errorCode).toBe("RECORDING_TOO_LARGE");
    expect(bytes.runtime.state).toBe("STOPPING");
    bytes.recorder.emitStop();
    expect(bytes.runtime.reviewDraft?.byteLength).toBe(4);

    const chunks = makeRuntime({ maxChunks: 1 });
    await chunks.runtime.start();
    chunks.recorder.emitChunk("1");
    chunks.recorder.emitChunk("2");
    expect(chunks.runtime.errorCode).toBe("RECORDING_TOO_LARGE");
    expect(chunks.runtime.state).toBe("STOPPING");
    chunks.recorder.emitStop();
    expect(chunks.runtime.reviewDraft?.byteLength).toBe(1);
  });

  it("retains the final chunk, authoritative MIME type, and rejects an empty final recording", async () => {
    const session = makeRuntime({ recorder: makeRecorder("audio/mp4") });
    await session.runtime.start();
    session.recorder.emitChunk("first");
    const stopping = session.runtime.stop();
    session.recorder.emitChunk("final");
    session.recorder.emitStop();
    await stopping;
    expect(session.runtime.reviewDraft?.actualMediaType).toBe("audio/mp4");
    expect(session.runtime.reviewDraft?.byteLength).toBe(10);

    const empty = makeRuntime();
    await empty.runtime.start();
    const emptyStopping = empty.runtime.stop();
    empty.recorder.emitStop();
    await emptyStopping;
    expect(empty.runtime.errorCode).toBe("RECORDING_EMPTY");

    const conflict = makeRuntime({ recorder: makeRecorder("audio/mp4") });
    await conflict.runtime.start();
    conflict.recorder.emitChunk("first", "audio/mp4");
    const conflictingStop = conflict.runtime.stop();
    conflict.recorder.emitChunk("second", "audio/webm");
    conflict.recorder.emitStop();
    await conflictingStop;
    expect(conflict.runtime.errorCode).toBe("RECORDER_OUTPUT_FORMAT_CONFLICT");

    const browserVariant = makeRuntime({ recorder: makeRecorder("audio/webm;codecs=opus") });
    await browserVariant.runtime.start();
    browserVariant.recorder.emitChunk("audio", "audio/webm");
    const browserVariantStop = browserVariant.runtime.stop();
    browserVariant.recorder.emitStop();
    await browserVariantStop;
    expect(browserVariant.runtime.state).toBe("REVIEW_READY");
    expect(browserVariant.runtime.reviewDraft?.actualMediaType).toBe("audio/webm;codecs=opus");
  });

  it("accepts data that arrives after the recorder stop event", async () => {
    const session = makeRuntime();
    await session.runtime.start();
    const stopping = session.runtime.stop();
    session.recorder.emitStop();
    session.recorder.emitChunk("late-final");
    await stopping;
    expect(session.runtime.state).toBe("REVIEW_READY");
    expect(session.runtime.reviewDraft?.byteLength).toBe(10);
  });

  it("waits for delayed final data after the stop event", async () => {
    const session = makeRuntime();
    await session.runtime.start();
    const stopping = session.runtime.stop();
    session.recorder.emitStop();
    setTimeout(() => session.recorder.emitChunk("delayed-final"), 10);
    await stopping;
    expect(session.runtime.state).toBe("REVIEW_READY");
    expect(session.runtime.reviewDraft?.byteLength).toBe(13);
  });

  it("rejects stale chunks, handles track and recorder interruption, and cleans up repeatedly", async () => {
    const session = makeRuntime();
    await session.runtime.start();
    session.runtime.cancel();
    session.recorder.emitChunk("stale");
    expect(session.runtime.reviewDraft).toBeUndefined();
    session.runtime.cancel();
    session.runtime.dispose();
    session.runtime.dispose();
    expect(session.track.stop).toHaveBeenCalledTimes(1);
    expect(session.track.removeEventListener).toHaveBeenCalled();

    const ended = makeRuntime();
    await ended.runtime.start();
    ended.track.end();
    expect(ended.runtime.errorCode).toBe("TRACK_ENDED");
    expect(ended.runtime.interrupted).toBe(true);

    const recorderError = makeRuntime();
    await recorderError.runtime.start();
    recorderError.recorder.emitError();
    expect(recorderError.runtime.state).toBe("FAILED");
  });

  it("represents ownership truthfully and blocks duplicate or conversational ownership", () => {
    const guard = new VoiceNoteOwnershipGuard();
    guard.acquire();
    expect(guard.state).toBe("OWNED_BY_VOICE_NOTE");
    expect(() => guard.acquire()).toThrow("MICROPHONE_IN_USE_BY_OTHER_CAPABILITY");
    guard.release();
    guard.markUnknown();
    expect(guard.state).toBe("OWNERSHIP_UNKNOWN");
    expect(() => guard.acquire()).toThrow("MICROPHONE_IN_USE_BY_OTHER_CAPABILITY");
    const conversation = new VoiceNoteOwnershipGuard();
    (conversation as unknown as { current: string }).current = "OWNED_BY_CONVERSATION";
    expect(() => conversation.acquire()).toThrow("MICROPHONE_IN_USE_BY_OTHER_CAPABILITY");
  });

  it("does not persist before Save, preserves draft metadata, and supports explicit retry", async () => {
    const note = { noteId: "note-1", title: "Voice note", content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, archived: false, tags: ["tag"], category: "Research", source: "LOCAL", type: "VOICE_NOTE", version: 1, futureFields: {}, fileReferences: [] };
    const notes = { createNote: vi.fn(() => note), getNotes: vi.fn(() => []), deleteNote: vi.fn() } as unknown as LocalNotesRepository;
    const audio = { hasAudio: vi.fn(async () => false), putAudio: vi.fn(async () => undefined), deleteAudio: vi.fn(async () => true) } as unknown as VoiceNoteAudioRepository;
    const session = makeRuntime({ notesRepository: notes, audioRepository: audio, now: (() => { let tick = 0; return () => ++tick * 100; })() });
    await startAndStop(session.runtime, session.recorder);
    expect(notes.createNote).not.toHaveBeenCalled();
    expect(audio.putAudio).not.toHaveBeenCalled();
    session.runtime.reviewDraft = { ...session.runtime.reviewDraft!, category: "Research", tags: ["tag"], fileReferences: [{ referenceId: "ref", fileId: "file", provider: "local", displayName: "file.txt", referencedAt: new Date().toISOString() }] };
    await session.runtime.save();
    expect(notes.createNote).toHaveBeenCalledWith(expect.objectContaining({ category: "Research", tags: ["tag"], fileReferences: expect.any(Array), futureFields: expect.objectContaining({ recordedMediaType: "audio/webm;codecs=opus" }) }));
    expect(audio.putAudio).toHaveBeenCalled();

    const cancelled = makeRuntime({ notesRepository: notes, audioRepository: audio });
    await cancelled.runtime.start();
    cancelled.runtime.cancel();
    expect(notes.createNote).toHaveBeenCalledTimes(1);
  });

  it("cancels on account switch and visibility interruption without touching conversational runtime", async () => {
    const switched = makeRuntime();
    await switched.runtime.start();
    switched.runtime.handleAccountSwitch();
    expect(switched.runtime.state).toBe("CANCELLED");
    expect(switched.track.stop).toHaveBeenCalled();

    const interrupted = makeRuntime();
    await interrupted.runtime.start();
    if (typeof document !== "undefined") {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(interrupted.runtime.interruptionReason).toBe("VISIBILITY_INTERRUPTION");
    }
  });

  it("retries an explicit save after a recoverable persistence failure", async () => {
    let failFirstWrite = true;
    const note = { noteId: "retry-note", title: "Voice note", content: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, archived: false, tags: [], source: "LOCAL", type: "VOICE_NOTE", version: 1, futureFields: {}, fileReferences: [] };
    const notes = { createNote: vi.fn(() => note), getNotes: vi.fn(() => []), deleteNote: vi.fn() } as unknown as LocalNotesRepository;
    const audio = { hasAudio: vi.fn(async () => false), putAudio: vi.fn(async () => { if (failFirstWrite) throw new Error("temporary storage failure"); }), deleteAudio: vi.fn(async () => true) } as unknown as VoiceNoteAudioRepository;
    const session = makeRuntime({ notesRepository: notes, audioRepository: audio, now: (() => { let tick = 0; return () => ++tick * 100; })() });
    await startAndStop(session.runtime, session.recorder);
    await expect(session.runtime.save()).rejects.toThrow("temporary storage failure");
    expect(session.runtime.state).toBe("REVIEW_READY");
    failFirstWrite = false;
    await session.runtime.save();
    expect(session.runtime.state).toBe("IDLE");
    expect(session.runtime.reviewDraft).toBeUndefined();
  });

  it("completes three consecutive Record-Stop-Save cycles on one runtime instance with no INVALID_TRANSITION and no overwritten records", async () => {
    const notes: Array<Record<string, unknown>> = [];
    const audioRecords = new Map<string, { audio: Blob; mediaType: string; byteLength: number; noteId: string }>();
    let noteSequence = 0;
    const notesRepository = {
      createNote: vi.fn((input: { title: string; content?: string; tags?: readonly string[]; category?: string; futureFields?: Record<string, unknown>; fileReferences?: readonly unknown[] }) => {
        noteSequence += 1;
        const note = { noteId: `note-${noteSequence}`, title: input.title, content: input.content ?? "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, archived: false, tags: input.tags ?? [], category: input.category, source: "LOCAL", type: "VOICE_NOTE", version: 1, futureFields: input.futureFields ?? {}, fileReferences: input.fileReferences ?? [] };
        notes.push(note);
        return note;
      }),
      getNotes: vi.fn(() => notes),
      deleteNote: vi.fn((noteId: string) => { const index = notes.findIndex((entry) => entry.noteId === noteId); if (index >= 0) notes.splice(index, 1); return true; }),
    } as unknown as LocalNotesRepository;
    const audioRepository = {
      hasAudio: vi.fn(async (_scope: string, referenceId: string) => audioRecords.has(referenceId)),
      putAudio: vi.fn(async (request: { audioReferenceId: string; noteId: string; audio: Blob; mediaType: string; byteLength: number }) => { audioRecords.set(request.audioReferenceId, { audio: request.audio, mediaType: request.mediaType, byteLength: request.byteLength, noteId: request.noteId }); }),
      deleteAudio: vi.fn(async () => true),
    } as unknown as VoiceNoteAudioRepository;
    const getUserMedia = vi.fn(() => Promise.resolve({ getAudioTracks: () => [makeTrack()], getTracks: () => [makeTrack()] } as unknown as MediaStream));
    let tick = 0;
    const session = makeRuntime({ notesRepository, audioRepository, mediaDevices: { getUserMedia }, now: () => (tick += 100) });

    const runCycle = async (payload: string, expectedNoteCount: number) => {
      await session.runtime.start();
      expect(session.runtime.state).toBe("RECORDING");
      session.recorder.emitChunk(payload);
      const stopping = session.runtime.stop();
      session.recorder.emitStop();
      await stopping;
      expect(session.runtime.state).toBe("REVIEW_READY");
      await session.runtime.save();
      expect(session.runtime.state).toBe("IDLE");
      expect(session.runtime.reviewDraft).toBeUndefined();
      expect(notes).toHaveLength(expectedNoteCount);
    };

    await runCycle("audio-1", 1);
    await runCycle("audio-2", 2);
    await runCycle("audio-3", 3);

    const noteIds = notes.map((entry) => entry.noteId as string);
    expect(new Set(noteIds).size).toBe(3);
    const audioReferenceIds = notes.map((entry) => String((entry.futureFields as Record<string, unknown>).audioReferenceId));
    expect(new Set(audioReferenceIds).size).toBe(3);
    expect(audioRecords.size).toBe(3);
    const persistedTexts = await Promise.all(audioReferenceIds.map(async (id) => audioRecords.get(id)!.audio.text()));
    expect(persistedTexts.sort()).toEqual(["audio-1", "audio-2", "audio-3"]);

    await session.runtime.start();
    expect(session.runtime.state).toBe("RECORDING");
    session.runtime.cancel();
    expect(session.runtime.state).toBe("CANCELLED");
    expect(notes).toHaveLength(3);
    expect(audioRecords.size).toBe(3);
  });
});