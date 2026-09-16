import { describe, expect, it, vi } from "vitest";

import {
  VoiceNoteRecordingRuntime,
  VoiceNoteRecordingError,
  VoiceNoteRecordingState,
  createVoiceNoteCapability,
  negotiateVoiceNoteFormat,
  projectVoiceNoteRuntime,
  transitionVoiceNoteState,
} from "./voiceNoteRecordingRuntime";
import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";

describe("Voice Note Phase B runtime contracts", () => {
  it("resolves capability without touching permission APIs", () => {
    const getUserMedia = vi.fn();
    expect(createVoiceNoteCapability({ isSecureContext: false, mediaDevices: { getUserMedia }, mediaRecorderAvailable: true, storageAvailable: true })).toEqual({ outcome: "REVIEW_ONLY", reason: "SECURE_CONTEXT_REQUIRED", canPause: false });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("negotiates explicit formats and falls back to browser default", () => {
    expect(negotiateVoiceNoteFormat((value) => value === "audio/ogg;codecs=opus")).toBe("audio/ogg;codecs=opus");
    expect(negotiateVoiceNoteFormat(() => false)).toBeUndefined();
  });

  it("rejects invalid transitions and exposes deterministic projection", () => {
    expect(() => transitionVoiceNoteState("IDLE", "PAUSE")).toThrow(VoiceNoteRecordingError);
    expect(projectVoiceNoteRuntime({ state: "REVIEW_READY", canPause: false, elapsedMilliseconds: 1200, interrupted: false })).toMatchObject({ canSave: true, reviewReady: true, recordingIndicatorActive: false });
  });

  it("requests audio only after start, retains final mime type, and reaches review", async () => {
    const track = { stop: vi.fn(), readyState: "live", addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
    const recorder = { mimeType: "audio/webm;codecs=opus", state: "inactive", start: vi.fn(function (this: { state: string }) { this.state = "recording"; }), stop: vi.fn(function (this: { state: string; ondataavailable?: (event: BlobEvent) => void; onstop?: () => void }) { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm;codecs=opus" }) } as BlobEvent); this.onstop?.(); }), pause: vi.fn(), resume: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaRecorder;
    const runtime = new VoiceNoteRecordingRuntime({
      accountScopeId: "account-a",
      isSecureContext: true,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      mediaRecorderFactory: () => recorder,
      now: (() => { let value = 0; return () => (value += 100); })(),
    });

    expect(runtime.state).toBe("IDLE");
    await runtime.start();
    expect(runtime.state).toBe("RECORDING");
    await runtime.stop();
    expect(runtime.state).toBe("REVIEW_READY");
    expect(runtime.reviewDraft?.actualMediaType).toBe("audio/webm;codecs=opus");
    expect(track.stop).toHaveBeenCalled();
  });

  it("keeps a failed explicit save retryable and does not save automatically", async () => {
    const notesRepository = { createNote: vi.fn(() => { throw new Error("storage failed"); }), getNotes: vi.fn(() => []), deleteNote: vi.fn() } as unknown as LocalNotesRepository;
    const audioRepository = { hasAudio: vi.fn(async () => false), putAudio: vi.fn(async () => { throw new Error("storage failed"); }), deleteAudio: vi.fn(async () => true) } as unknown as VoiceNoteAudioRepository;
    const runtime = new VoiceNoteRecordingRuntime({ accountScopeId: "account-a", isSecureContext: false, mediaDevices: undefined, mediaRecorderFactory: undefined, notesRepository, audioRepository });
    expect(runtime.state).toBe("IDLE");
    await expect(runtime.save()).rejects.toThrow("REVIEW_READY_REQUIRED");
    expect(runtime.state).toBe("IDLE");
    runtime.state = "REVIEW_READY";
    runtime.reviewDraft = { recordingSessionId: "session-1", accountScopeId: "account-a", audio: new Blob(["audio"], { type: "audio/webm" }), actualMediaType: "audio/webm", byteLength: 5, durationMilliseconds: 1000, interrupted: false, suggestedTitle: "Voice note", transcriptStatus: "NOT_REQUESTED", tags: [], fileReferences: [] };
    await expect(runtime.save()).rejects.toThrow("storage failed");
    expect(runtime.state).toBe("REVIEW_READY");
    expect(runtime.reviewDraft?.recordingSessionId).toBe("session-1");
  });
});