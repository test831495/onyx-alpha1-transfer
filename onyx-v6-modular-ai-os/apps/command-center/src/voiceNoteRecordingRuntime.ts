import type { NoteFileReference } from "@onyx/workspace-contracts";

import { deleteVoiceNoteAudioAndMetadata, saveVoiceNoteAudioAndMetadata } from "./voiceNotePersistenceService";
import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import { resolveAuthoritativeVoiceNoteMediaType, resolveVoiceNoteFormat, type VoiceNotePlaybackSupport } from "./voiceNoteFormatCompatibility";
import { defaultVoiceNoteTitle, normalizeVoiceNoteTitle } from "./voiceNoteContracts";

export const VOICE_NOTE_ERROR_CODES = [
  "SECURE_CONTEXT_REQUIRED", "MEDIA_DEVICES_UNAVAILABLE", "MEDIA_RECORDER_UNAVAILABLE",
  "PERMISSION_DENIED", "PERMISSION_DISMISSED_OR_UNRESOLVED", "MICROPHONE_NOT_FOUND",
  "MICROPHONE_NOT_READABLE", "MICROPHONE_IN_USE_BY_OTHER_CAPABILITY", "RECORDING_ABORTED",
  "TRACK_ENDED", "FORMAT_UNSUPPORTED", "RECORDING_EMPTY", "RECORDING_TOO_LARGE",
  "RECORDING_TOO_LONG", "STORAGE_UNAVAILABLE", "STORAGE_QUOTA_EXCEEDED", "AUDIO_SAVE_FAILED",
  "METADATA_SAVE_FAILED", "RECORDER_OUTPUT_FORMAT_UNKNOWN", "RECORDER_OUTPUT_FORMAT_CONFLICT", "UNKNOWN_RECORDING_FAILURE",
] as const;

export type VoiceNoteErrorCode = typeof VOICE_NOTE_ERROR_CODES[number];
export type VoiceNoteRecordingState = "IDLE" | "REQUESTING_PERMISSION" | "RECORDING" | "PAUSED" | "STOPPING" | "REVIEW_READY" | "SAVING" | "SAVED" | "CANCELLED" | "FAILED";
export type VoiceNoteCapabilityOutcome = "RECORD_AND_REVIEW" | "RECORD_WITHOUT_PAUSE" | "REVIEW_ONLY" | "RECORDING_UNAVAILABLE" | "STORAGE_UNAVAILABLE";
export type VoiceNoteOwnershipState = "AVAILABLE" | "OWNED_BY_VOICE_NOTE" | "OWNED_BY_CONVERSATION" | "OWNERSHIP_UNKNOWN" | "UNAVAILABLE";

export class VoiceNoteRecordingError extends Error {
  readonly code: VoiceNoteErrorCode | "REVIEW_READY_REQUIRED" | "INVALID_TRANSITION";
  constructor(code: VoiceNoteRecordingError["code"], message: string = code) { super(message); this.name = "VoiceNoteRecordingError"; this.code = code; }
}

export interface VoiceNoteCapability {
  readonly outcome: VoiceNoteCapabilityOutcome;
  readonly reason?: VoiceNoteErrorCode;
  readonly canPause: boolean;
}

export interface VoiceNoteCapabilityFacts {
  readonly isSecureContext: boolean;
  readonly mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  readonly mediaRecorderAvailable: boolean;
  readonly storageAvailable: boolean;
  readonly isTypeSupported?: (mimeType: string) => boolean;
  readonly canPlayType?: (mimeType: string) => VoiceNotePlaybackSupport;
  readonly pauseSupported?: boolean;
  readonly resumeSupported?: boolean;
}

export function createVoiceNoteCapability(facts: VoiceNoteCapabilityFacts): VoiceNoteCapability {
  if (!facts.storageAvailable) return { outcome: "STORAGE_UNAVAILABLE", reason: "STORAGE_UNAVAILABLE", canPause: false };
  if (!facts.isSecureContext) return { outcome: "REVIEW_ONLY", reason: "SECURE_CONTEXT_REQUIRED", canPause: false };
  if (!facts.mediaDevices) return { outcome: "RECORDING_UNAVAILABLE", reason: "MEDIA_DEVICES_UNAVAILABLE", canPause: false };
  if (typeof facts.mediaDevices.getUserMedia !== "function") return { outcome: "RECORDING_UNAVAILABLE", reason: "MEDIA_DEVICES_UNAVAILABLE", canPause: false };
  if (!facts.mediaRecorderAvailable) return { outcome: "RECORDING_UNAVAILABLE", reason: "MEDIA_RECORDER_UNAVAILABLE", canPause: false };
  const canPause = facts.pauseSupported !== false && facts.resumeSupported !== false;
  return { outcome: canPause ? "RECORD_AND_REVIEW" : "RECORD_WITHOUT_PAUSE", canPause };
}

const PREFERRED_MEDIA_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"] as const;
export function negotiateVoiceNoteFormat(isTypeSupported?: (mimeType: string) => boolean): string | undefined {
  if (!isTypeSupported) return undefined;
  return PREFERRED_MEDIA_TYPES.find((candidate) => isTypeSupported(candidate));
}

const TRANSITIONS: Record<VoiceNoteRecordingState, readonly string[]> = {
  IDLE: ["START"], REQUESTING_PERMISSION: ["PERMISSION_GRANTED", "PERMISSION_FAILED", "CANCEL"],
  RECORDING: ["PAUSE", "STOP", "CANCEL", "FAIL", "TRACK_ENDED", "RECORDER_ERROR", "INTERRUPT"],
  PAUSED: ["RESUME", "STOP", "CANCEL", "FAIL", "TRACK_ENDED", "RECORDER_ERROR", "INTERRUPT"],
  STOPPING: ["FINALIZED", "FAIL", "CANCEL"], REVIEW_READY: ["SAVE", "DISCARD", "CANCEL"],
  SAVING: ["SAVED", "SAVE_FAILED", "CANCEL"], SAVED: ["RESET"], CANCELLED: ["RESET"], FAILED: ["RESET"],
};

export function transitionVoiceNoteState(state: VoiceNoteRecordingState, event: string): VoiceNoteRecordingState {
  if (!TRANSITIONS[state].includes(event)) throw new VoiceNoteRecordingError("INVALID_TRANSITION", `${state}:${event}`);
  const next: Record<string, VoiceNoteRecordingState> = {
    START: "REQUESTING_PERMISSION", PERMISSION_GRANTED: "RECORDING", PERMISSION_FAILED: "FAILED", PAUSE: "PAUSED",
    RESUME: "RECORDING", STOP: "STOPPING", FINALIZED: "REVIEW_READY", SAVE: "SAVING", SAVED: "SAVED",
    SAVE_FAILED: "FAILED", CANCEL: "CANCELLED", DISCARD: "IDLE", FAIL: "FAILED", TRACK_ENDED: "FAILED",
    RECORDER_ERROR: "FAILED", INTERRUPT: "FAILED", RESET: "IDLE",
  };
  return next[event] ?? state;
}

export interface VoiceNoteReviewDraft {
  readonly recordingSessionId: string;
  readonly accountScopeId: string;
  readonly audio: Blob;
  readonly actualMediaType: string;
  readonly byteLength: number;
  readonly durationMilliseconds: number;
  readonly interrupted: boolean;
  readonly interruptionReason?: string;
  readonly suggestedTitle: string;
  readonly transcriptStatus: "NOT_REQUESTED";
  readonly category?: string;
  readonly tags: readonly string[];
  readonly fileReferences: readonly NoteFileReference[];
}

export interface VoiceNoteRuntimeProjection {
  readonly stateLabel: VoiceNoteRecordingState;
  readonly canStart: boolean; readonly canPause: boolean; readonly canResume: boolean; readonly canStop: boolean;
  readonly canCancel: boolean; readonly canDiscard: boolean; readonly canSave: boolean;
  readonly elapsedMilliseconds: number; readonly capabilityLimitation?: VoiceNoteErrorCode;
  readonly errorCode?: VoiceNoteErrorCode; readonly recordingIndicatorActive: boolean; readonly reviewReady: boolean;
  readonly interrupted: boolean; readonly interruptionReason?: string;
}

export function projectVoiceNoteRuntime(input: { state: VoiceNoteRecordingState; canPause: boolean; elapsedMilliseconds: number; capabilityLimitation?: VoiceNoteErrorCode; errorCode?: VoiceNoteErrorCode; interrupted: boolean; interruptionReason?: string }): VoiceNoteRuntimeProjection {
  const { state } = input;
  return {
    stateLabel: state, canStart: state === "IDLE", canPause: state === "RECORDING" && input.canPause,
    canResume: state === "PAUSED" && input.canPause, canStop: state === "RECORDING" || state === "PAUSED",
    canCancel: ["REQUESTING_PERMISSION", "RECORDING", "PAUSED", "STOPPING", "REVIEW_READY", "SAVING"].includes(state),
    canDiscard: state === "REVIEW_READY", canSave: state === "REVIEW_READY", elapsedMilliseconds: input.elapsedMilliseconds,
    capabilityLimitation: input.capabilityLimitation, errorCode: input.errorCode,
    recordingIndicatorActive: state === "RECORDING" || state === "PAUSED", reviewReady: state === "REVIEW_READY",
    interrupted: input.interrupted, interruptionReason: input.interruptionReason,
  };
}

export interface VoiceNoteRecorderAdapter {
  readonly mimeType: string;
  readonly supportsPause: boolean;
  start(): void; pause(): void; resume(): void; stop(): void; dispose(): void;
  onData(callback: (data: Blob) => void): void; onError(callback: (error: unknown) => void): void; onStop(callback: () => void): void;
}

class BrowserVoiceNoteRecorderAdapter implements VoiceNoteRecorderAdapter {
  readonly mimeType: string;
  readonly supportsPause: boolean;
  private readonly recorder: MediaRecorder;
  constructor(stream: MediaStream, mimeType?: string, factory: (stream: MediaStream, options?: MediaRecorderOptions) => MediaRecorder = (value, options) => new MediaRecorder(value, options)) {
    this.recorder = factory(stream, mimeType ? { mimeType } : undefined);
    this.mimeType = this.recorder.mimeType || mimeType || "";
    this.supportsPause = typeof this.recorder.pause === "function" && typeof this.recorder.resume === "function";
  }
  start() { this.recorder.start(); }
  pause() { if (!this.supportsPause) throw new VoiceNoteRecordingError("UNKNOWN_RECORDING_FAILURE"); this.recorder.pause(); }
  resume() { if (!this.supportsPause) throw new VoiceNoteRecordingError("UNKNOWN_RECORDING_FAILURE"); this.recorder.resume(); }
  stop() { this.recorder.stop(); }
  dispose() { this.recorder.ondataavailable = null; this.recorder.onerror = null; this.recorder.onstop = null; }
  onData(callback: (data: Blob) => void) { this.recorder.ondataavailable = (event) => callback(event.data); }
  onError(callback: (error: unknown) => void) { this.recorder.onerror = callback; }
  onStop(callback: () => void) { this.recorder.onstop = callback; }
}

export interface VoiceNoteRuntimeOptions {
  readonly accountScopeId: string;
  readonly storageAvailable?: boolean;
  readonly isSecureContext?: boolean;
  readonly mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  readonly mediaRecorderFactory?: (stream: MediaStream, options?: MediaRecorderOptions) => MediaRecorder;
  readonly mediaRecorderTypeSupported?: (mimeType: string) => boolean;
  readonly mediaCanPlayType?: (mimeType: string) => VoiceNotePlaybackSupport | undefined;
  readonly now?: () => number;
  readonly maxDurationMilliseconds?: number;
  readonly maxBytes?: number;
  readonly maxChunks?: number;
  readonly ownership?: VoiceNoteOwnershipGuard;
  readonly notesRepository?: LocalNotesRepository;
  readonly audioRepository?: VoiceNoteAudioRepository;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly fileReferences?: readonly NoteFileReference[];
}

export class VoiceNoteOwnershipGuard {
  private current: VoiceNoteOwnershipState = "AVAILABLE";
  get state() { return this.current; }
  acquire() { if (this.current !== "AVAILABLE") throw new VoiceNoteRecordingError("MICROPHONE_IN_USE_BY_OTHER_CAPABILITY"); this.current = "OWNED_BY_VOICE_NOTE"; }
  release() { if (this.current === "OWNED_BY_VOICE_NOTE") this.current = "AVAILABLE"; }
  markUnknown() { this.current = "OWNERSHIP_UNKNOWN"; }
}

function normalizeError(error: unknown): VoiceNoteErrorCode {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "PERMISSION_DENIED";
  if (name === "NotFoundError") return "MICROPHONE_NOT_FOUND";
  if (name === "NotReadableError" || name === "AbortError") return "MICROPHONE_NOT_READABLE";
  return "UNKNOWN_RECORDING_FAILURE";
}

export class VoiceNoteRecordingRuntime {
  state: VoiceNoteRecordingState = "IDLE";
  reviewDraft?: VoiceNoteReviewDraft;
  errorCode?: VoiceNoteErrorCode;
  interrupted = false;
  interruptionReason?: string;
  private readonly now: () => number;
  private readonly options: VoiceNoteRuntimeOptions;
  private readonly ownership: VoiceNoteOwnershipGuard;
  private stream?: MediaStream;
  private recorder?: VoiceNoteRecorderAdapter;
  private chunks: Blob[] = [];
  private chunkTypes: string[] = [];
  private startedAt = 0;
  private pausedAt?: number;
  private pausedTotal = 0;
  private elapsed = 0;
  private sessionId?: string;
  private sequence = 0;
  private stopEventObserved = false;
  private finalDataObserved = false;
  private finalizationCompleted = false;
  private stopCompletion?: Promise<void>;
  private resolveStopCompletion?: () => void;
  private finalizationFallback?: ReturnType<typeof setTimeout>;
  private readonly trackEndedHandler = () => this.handleTrackEnded();
  private readonly visibilityHandler = () => { if (globalThis.document?.visibilityState === "hidden" && (this.state === "RECORDING" || this.state === "PAUSED")) this.handleTrackEnded("VISIBILITY_INTERRUPTION"); };

  constructor(options: VoiceNoteRuntimeOptions) { this.options = options; this.now = options.now ?? (() => performance.now()); this.ownership = options.ownership ?? new VoiceNoteOwnershipGuard(); }
  get formatResolution() {
    const recorderSupport = this.options.mediaRecorderTypeSupported ?? (typeof globalThis.MediaRecorder !== "undefined" && typeof globalThis.MediaRecorder.isTypeSupported === "function" ? (mimeType: string) => globalThis.MediaRecorder.isTypeSupported(mimeType) : undefined);
    if (!recorderSupport || !this.options.mediaCanPlayType) return undefined;
    return resolveVoiceNoteFormat({ isTypeSupported: recorderSupport, canPlayType: this.options.mediaCanPlayType });
  }
  get elapsedMilliseconds() { return this.state === "RECORDING" ? Math.max(0, this.now() - this.startedAt - this.pausedTotal) : this.elapsed; }
  get projection() { return projectVoiceNoteRuntime({ state: this.state, canPause: this.recorder?.supportsPause ?? false, elapsedMilliseconds: this.elapsedMilliseconds, capabilityLimitation: this.capability.reason, errorCode: this.errorCode, interrupted: this.interrupted, interruptionReason: this.interruptionReason }); }
  private get capability() { return createVoiceNoteCapability({ isSecureContext: this.options.isSecureContext ?? globalThis.isSecureContext, mediaDevices: this.options.mediaDevices ?? globalThis.navigator?.mediaDevices, mediaRecorderAvailable: Boolean(this.options.mediaRecorderFactory ?? globalThis.MediaRecorder), storageAvailable: this.options.storageAvailable ?? true, isTypeSupported: this.options.mediaRecorderTypeSupported }); }
  async start() {
    if (this.state !== "IDLE") throw new VoiceNoteRecordingError("INVALID_TRANSITION", "START");
    this.chunks = [];
    this.chunkTypes = [];
    const capability = this.capability;
    if (capability.outcome === "REVIEW_ONLY" || capability.outcome === "STORAGE_UNAVAILABLE" || capability.outcome === "RECORDING_UNAVAILABLE") throw new VoiceNoteRecordingError(capability.reason ?? "UNKNOWN_RECORDING_FAILURE");
    this.ownership.acquire(); this.state = transitionVoiceNoteState(this.state, "START"); this.sessionId = `voice-session-${++this.sequence}`;
    try {
      const stream = await (this.options.mediaDevices ?? globalThis.navigator.mediaDevices).getUserMedia({ audio: true, video: false });
      if (!this.sessionId) { stream.getTracks().forEach((track) => track.stop()); throw new VoiceNoteRecordingError("RECORDING_ABORTED"); }
      if (stream.getAudioTracks().every((track) => track.readyState !== "live")) throw new VoiceNoteRecordingError("MICROPHONE_NOT_READABLE");
      this.stream = stream;
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", this.trackEndedHandler));
      globalThis.document?.addEventListener("visibilitychange", this.visibilityHandler);
      const factory = this.options.mediaRecorderFactory ?? ((value: MediaStream, recorderOptions?: MediaRecorderOptions) => new MediaRecorder(value, recorderOptions));
      // Playback capability is advisory during capture. The recorder's actual
      // output remains authoritative and playback validates it after saving.
      const selectedFormat = negotiateVoiceNoteFormat(this.options.mediaRecorderTypeSupported);
      const adapter = new BrowserVoiceNoteRecorderAdapter(stream, selectedFormat, factory);
      this.recorder = adapter; adapter.onData((data) => this.acceptChunk(data)); adapter.onError(() => this.fail("UNKNOWN_RECORDING_FAILURE")); adapter.onStop(() => this.finalize());
      this.startedAt = this.now(); this.elapsed = 0; adapter.start(); this.state = transitionVoiceNoteState(this.state, "PERMISSION_GRANTED");
    } catch (error) {
      if (this.state === "CANCELLED") throw error;
      const code = normalizeError(error);
      this.fail(code);
      throw error instanceof VoiceNoteRecordingError ? error : new VoiceNoteRecordingError(code);
    }
  }
  private acceptChunk(data: Blob) { if (this.state !== "RECORDING" && this.state !== "PAUSED" && this.state !== "STOPPING") return; if (!data.size) return; const maxBytes = this.options.maxBytes ?? 25 * 1024 * 1024; const maxChunks = this.options.maxChunks ?? 1000; if (this.elapsedMilliseconds >= (this.options.maxDurationMilliseconds ?? 60 * 60 * 1000)) { this.stopForLimit("RECORDING_TOO_LONG"); return; } if (this.chunks.length >= maxChunks || this.chunks.reduce((sum, chunk) => sum + chunk.size, 0) + data.size > maxBytes) { this.stopForLimit("RECORDING_TOO_LARGE"); return; } this.chunks.push(data); if (data.type.trim()) this.chunkTypes.push(data.type.trim()); if (this.state === "STOPPING") { this.finalDataObserved = true; this.completeFinalizationIfReady(); } }
  private stopForLimit(code: "RECORDING_TOO_LARGE" | "RECORDING_TOO_LONG") { this.errorCode = code; this.elapsed = this.elapsedMilliseconds; if (this.state === "RECORDING" || this.state === "PAUSED") { this.state = "STOPPING"; this.recorder?.stop(); } }
  pause() { if (this.state !== "RECORDING" || !this.recorder?.supportsPause) throw new VoiceNoteRecordingError("INVALID_TRANSITION", "PAUSE"); this.recorder.pause(); this.pausedAt = this.now(); this.elapsed = this.elapsedMilliseconds; this.state = transitionVoiceNoteState(this.state, "PAUSE"); }
  resume() { if (this.state !== "PAUSED" || !this.recorder?.supportsPause) throw new VoiceNoteRecordingError("INVALID_TRANSITION", "RESUME"); this.recorder.resume(); this.pausedTotal += this.now() - (this.pausedAt ?? this.now()); this.pausedAt = undefined; this.state = transitionVoiceNoteState(this.state, "RESUME"); }
  async stop() {
    if (this.state !== "RECORDING" && this.state !== "PAUSED") throw new VoiceNoteRecordingError("INVALID_TRANSITION", "STOP");
    this.elapsed = this.elapsedMilliseconds;
    this.state = transitionVoiceNoteState(this.state, "STOP");
    if (!this.recorder) { this.finalize(); return; }
    this.stopEventObserved = false;
    this.finalDataObserved = this.chunks.length > 0;
    this.finalizationCompleted = false;
    this.stopCompletion = new Promise<void>((resolve) => { this.resolveStopCompletion = resolve; });
    this.recorder.onStop(() => { this.stopEventObserved = true; this.completeFinalizationIfReady(); });
    this.finalizationFallback = setTimeout(() => { this.stopEventObserved = true; this.completeFinalizationIfReady(true); }, 500);
    this.recorder.stop();
    await this.stopCompletion;
  }
  private completeFinalizationIfReady(force = false) { if (this.finalizationCompleted || !this.stopEventObserved || (!this.finalDataObserved && !force)) return; this.finalizationCompleted = true; if (this.finalizationFallback) clearTimeout(this.finalizationFallback); this.finalize(); this.resolveStopCompletion?.(); this.resolveStopCompletion = undefined; this.stopCompletion = undefined; }
  private finalize() { if (this.state !== "STOPPING") return; let authoritativeMediaType = ""; try { authoritativeMediaType = resolveAuthoritativeVoiceNoteMediaType({ recorderType: this.recorder?.mimeType, chunkTypes: this.chunkTypes }); } catch { this.fail("RECORDER_OUTPUT_FORMAT_CONFLICT"); return; } if (!authoritativeMediaType) { this.fail("RECORDER_OUTPUT_FORMAT_UNKNOWN"); return; } const audio = new Blob(this.chunks, { type: authoritativeMediaType }); if (!audio.size) { this.fail("RECORDING_EMPTY"); return; } this.elapsed = this.elapsedMilliseconds; this.reviewDraft = { recordingSessionId: this.sessionId ?? "", accountScopeId: this.options.accountScopeId, audio, actualMediaType: audio.type, byteLength: audio.size, durationMilliseconds: this.elapsed, interrupted: this.interrupted, interruptionReason: this.interruptionReason, suggestedTitle: defaultVoiceNoteTitle(new Date()), transcriptStatus: "NOT_REQUESTED", category: this.options.category, tags: this.options.tags ?? [], fileReferences: this.options.fileReferences ?? [] }; this.chunkTypes = []; this.releaseResources(false); this.state = transitionVoiceNoteState(this.state, "FINALIZED"); }
  /** Lets the caller rename the pending review draft before Save without recreating the recording session. */
  setReviewTitle(title: string) { if (this.state !== "REVIEW_READY" || !this.reviewDraft) throw new VoiceNoteRecordingError("REVIEW_READY_REQUIRED"); const trimmed = normalizeVoiceNoteTitle(title); if (!trimmed) throw new VoiceNoteRecordingError("REVIEW_READY_REQUIRED", "VOICE_NOTE_TITLE_REQUIRED"); this.reviewDraft = { ...this.reviewDraft, suggestedTitle: trimmed }; }
  async save() { if (this.state !== "REVIEW_READY" || !this.reviewDraft || !this.options.notesRepository || !this.options.audioRepository) throw new VoiceNoteRecordingError("REVIEW_READY_REQUIRED"); this.state = transitionVoiceNoteState(this.state, "SAVE"); try { await saveVoiceNoteAudioAndMetadata({ accountScopeId: this.options.accountScopeId, notesRepository: this.options.notesRepository, audioRepository: this.options.audioRepository, noteDraft: { title: this.reviewDraft.suggestedTitle, category: this.reviewDraft.category, tags: this.reviewDraft.tags, fileReferences: this.reviewDraft.fileReferences, audio: this.reviewDraft.audio, mediaType: this.reviewDraft.actualMediaType, byteLength: this.reviewDraft.byteLength, durationMilliseconds: this.reviewDraft.durationMilliseconds, transcriptStatus: "NOT_REQUESTED" } }); this.chunks = []; this.reviewDraft = undefined; this.state = transitionVoiceNoteState(this.state, "SAVED"); this.resetSessionAfterSave(); } catch (error) { this.errorCode = normalizeError(error); this.state = "REVIEW_READY"; throw error; } }
  // Save is terminal in the state machine; auto-reset back to IDLE so a new recording can start immediately.
  private resetSessionAfterSave() { this.sessionId = undefined; this.chunkTypes = []; this.errorCode = undefined; this.interrupted = false; this.interruptionReason = undefined; this.elapsed = 0; this.pausedTotal = 0; this.pausedAt = undefined; this.startedAt = 0; this.state = transitionVoiceNoteState(this.state, "RESET"); }
  cancel() { if (!["REQUESTING_PERMISSION", "RECORDING", "PAUSED", "STOPPING", "REVIEW_READY", "SAVING"].includes(this.state)) return; this.sessionId = undefined; this.releaseResources(true); this.reviewDraft = undefined; this.state = transitionVoiceNoteState(this.state, "CANCEL"); }
  discard() { if (this.state !== "REVIEW_READY") throw new VoiceNoteRecordingError("INVALID_TRANSITION", "DISCARD"); this.reviewDraft = undefined; this.chunks = []; this.chunkTypes = []; this.state = transitionVoiceNoteState(this.state, "DISCARD"); }
  handleTrackEnded(reason = "TRACK_ENDED") { this.interrupted = true; this.interruptionReason = reason; this.fail("TRACK_ENDED"); }
  handleAccountSwitch() { this.cancel(); }
  dispose() { this.releaseResources(true); this.reviewDraft = undefined; this.state = "IDLE"; }
  private fail(code: VoiceNoteErrorCode) { this.errorCode = code; this.interrupted = code === "TRACK_ENDED"; this.releaseResources(true); if (this.state !== "FAILED") this.state = "FAILED"; }
  private releaseResources(clearChunks: boolean) { this.recorder?.dispose(); this.stream?.getAudioTracks().forEach((track) => { track.removeEventListener("ended", this.trackEndedHandler); track.stop(); }); globalThis.document?.removeEventListener("visibilitychange", this.visibilityHandler); this.recorder = undefined; this.stream = undefined; this.ownership.release(); if (clearChunks) { this.chunks = []; this.chunkTypes = []; } }
}

export async function discardSavedVoiceNote(request: { accountScopeId: string; noteId: string; notesRepository: LocalNotesRepository; audioRepository: VoiceNoteAudioRepository }) { return deleteVoiceNoteAudioAndMetadata(request); }