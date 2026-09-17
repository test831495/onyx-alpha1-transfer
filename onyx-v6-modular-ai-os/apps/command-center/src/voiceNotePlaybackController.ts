import type { Note } from "@onyx/workspace-contracts";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";

export type VoiceNotePlaybackState = "IDLE" | "LOADING" | "READY" | "PLAYING" | "PAUSED" | "SEEKING" | "ENDED" | "FAILED";
export type VoiceNotePlaybackErrorCode = "AUDIO_NOT_FOUND" | "AUDIO_LOAD_FAILED" | "PLAYBACK_NOT_ALLOWED" | "PLAYBACK_FORMAT_UNSUPPORTED" | "PLAYBACK_ABORTED" | "INVALID_SEEK_TARGET" | "PLAYBACK_FAILED";

export interface VoiceNotePlaybackProjection {
  readonly state: VoiceNotePlaybackState;
  readonly noteId?: string;
  readonly current: number;
  readonly duration: number;
  readonly errorCode?: VoiceNotePlaybackErrorCode;
}

export class VoiceNotePlaybackError extends Error {
  readonly code: VoiceNotePlaybackErrorCode;

  constructor(code: VoiceNotePlaybackErrorCode) {
    super(code);
    this.name = "VoiceNotePlaybackError";
    this.code = code;
  }
}

type UrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
type PlaybackOptions = {
  readonly accountScopeId: string;
  readonly audioRepository: Pick<VoiceNoteAudioRepository, "getAudio">;
  readonly createAudio?: () => HTMLAudioElement;
  readonly urlApi?: UrlApi;
  readonly onChange?: (projection: VoiceNotePlaybackProjection) => void;
};

const initialProjection: VoiceNotePlaybackProjection = { state: "IDLE", current: 0, duration: 0 };

function playbackErrorCode(error: unknown): VoiceNotePlaybackErrorCode {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "NotAllowedError") return "PLAYBACK_NOT_ALLOWED";
  if (name === "NotSupportedError") return "PLAYBACK_FORMAT_UNSUPPORTED";
  return "PLAYBACK_FAILED";
}

export class VoiceNotePlaybackController {
  private readonly accountScopeId: string;
  private readonly audioRepository: Pick<VoiceNoteAudioRepository, "getAudio">;
  private readonly createAudio: () => HTMLAudioElement;
  private readonly urlApi: UrlApi;
  private readonly onChange?: (projection: VoiceNotePlaybackProjection) => void;
  private readonly subscribers = new Set<(projection: VoiceNotePlaybackProjection) => void>();
  private readonly audio: HTMLAudioElement;
  private projection: VoiceNotePlaybackProjection = initialProjection;
  private objectUrl?: string;
  private loadToken = 0;
  private bound = false;

  constructor(options: PlaybackOptions) {
    this.accountScopeId = options.accountScopeId;
    this.audioRepository = options.audioRepository;
    this.createAudio = options.createAudio ?? (() => new Audio());
    this.urlApi = options.urlApi ?? URL;
    this.onChange = options.onChange;
    this.audio = this.createAudio();
    this.audio.autoplay = false;
    this.audio.preload = "metadata";
    this.bindEvents();
  }

  getProjection(): VoiceNotePlaybackProjection {
    return this.projection;
  }

  async play(note: Note): Promise<void> {
    if (note.type !== "VOICE_NOTE") throw new VoiceNotePlaybackError("AUDIO_NOT_FOUND");
    const audioReferenceId = note.futureFields.audioReferenceId;
    if (typeof audioReferenceId !== "string" || audioReferenceId.length === 0) {
      this.fail("AUDIO_NOT_FOUND");
      throw new VoiceNotePlaybackError("AUDIO_NOT_FOUND");
    }

    if (this.projection.noteId !== note.noteId || !this.objectUrl) {
      await this.load(note, audioReferenceId);
    } else if (this.projection.state === "ENDED") {
      this.audio.currentTime = 0;
      this.updateCurrent(0);
    }

    try {
      await Promise.resolve(this.audio.play());
      this.setProjection({ state: "PLAYING" });
    } catch (error) {
      const code = playbackErrorCode(error);
      this.fail(code);
      throw new VoiceNotePlaybackError(code);
    }
  }

  pause(): void {
    this.audio.pause();
    this.setProjection({ state: "PAUSED" });
  }

  async restart(): Promise<void> {
    if (!this.objectUrl) return;
    const wasPlaying = this.projection.state === "PLAYING";
    try {
      this.audio.currentTime = 0;
      this.updateCurrent(0);
      if (this.projection.state === "ENDED") this.setProjection({ state: "READY" });
      if (wasPlaying) await this.playCurrentSource();
    } catch {
      this.fail("AUDIO_LOAD_FAILED");
    }
  }

  seek(value: number): void {
    if (!Number.isFinite(value) || !Number.isFinite(this.projection.duration) || this.projection.duration <= 0) {
      this.fail("INVALID_SEEK_TARGET");
      throw new VoiceNotePlaybackError("INVALID_SEEK_TARGET");
    }
    const target = Math.min(this.projection.duration, Math.max(0, value));
    this.setProjection({ state: "SEEKING" });
    this.audio.currentTime = target;
    this.updateCurrent(target);
    this.setProjection({ state: this.audio.paused ? "PAUSED" : "PLAYING" });
  }

  subscribe(onChange: (projection: VoiceNotePlaybackProjection) => void): () => void {
    this.subscribers.add(onChange);
    onChange(this.projection);
    return () => this.subscribers.delete(onChange);
  }

  dispose(): void {
    this.loadToken += 1;
    this.audio.pause();
    this.unbindEvents();
    this.audio.src = "";
    this.audio.load();
    this.revokeObjectUrl();
    this.setProjection(initialProjection);
  }

  private async load(note: Note, audioReferenceId: string): Promise<void> {
    const token = ++this.loadToken;
    this.cleanupMedia();
    this.setProjection({ state: "LOADING", noteId: note.noteId, current: 0, duration: 0, errorCode: undefined });
    let blob: Blob | undefined;
    try {
      blob = await this.audioRepository.getAudio(this.accountScopeId, audioReferenceId);
    } catch {
      this.fail("AUDIO_LOAD_FAILED", note.noteId);
      throw new VoiceNotePlaybackError("AUDIO_LOAD_FAILED");
    }
    if (token !== this.loadToken) throw new VoiceNotePlaybackError("PLAYBACK_ABORTED");
    if (!(blob instanceof Blob) || blob.size === 0) {
      this.fail("AUDIO_NOT_FOUND", note.noteId);
      throw new VoiceNotePlaybackError("AUDIO_NOT_FOUND");
    }
    if (typeof this.urlApi.createObjectURL !== "function") {
      this.fail("AUDIO_LOAD_FAILED", note.noteId);
      throw new VoiceNotePlaybackError("AUDIO_LOAD_FAILED");
    }
    try {
      this.objectUrl = this.urlApi.createObjectURL(blob);
      this.audio.src = this.objectUrl;
      this.audio.load();
    } catch {
      this.fail("AUDIO_LOAD_FAILED", note.noteId);
      throw new VoiceNotePlaybackError("AUDIO_LOAD_FAILED");
    }
  }

  private bindEvents(): void {
    if (this.bound) return;
    this.bound = true;
    this.audio.addEventListener("loadedmetadata", this.handleLoadedMetadata);
    this.audio.addEventListener("durationchange", this.handleLoadedMetadata);
    this.audio.addEventListener("playing", this.handlePlaying);
    this.audio.addEventListener("play", this.handlePlaying);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.addEventListener("seeking", this.handleSeeking);
    this.audio.addEventListener("seeked", this.handleSeeked);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("error", this.handleMediaError);
    this.audio.addEventListener("abort", this.handleAbort);
  }

  private unbindEvents(): void {
    if (!this.bound) return;
    this.bound = false;
    this.audio.removeEventListener("loadedmetadata", this.handleLoadedMetadata);
    this.audio.removeEventListener("durationchange", this.handleLoadedMetadata);
    this.audio.removeEventListener("playing", this.handlePlaying);
    this.audio.removeEventListener("play", this.handlePlaying);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.removeEventListener("seeking", this.handleSeeking);
    this.audio.removeEventListener("seeked", this.handleSeeked);
    this.audio.removeEventListener("ended", this.handleEnded);
    this.audio.removeEventListener("error", this.handleMediaError);
    this.audio.removeEventListener("abort", this.handleAbort);
  }

  private readonly handleLoadedMetadata = () => {
    const duration = this.audio.duration;
    this.setProjection({ duration: Number.isFinite(duration) && duration >= 0 ? duration : 0, state: this.projection.state === "LOADING" ? "READY" : this.projection.state });
  };
  private readonly handlePlaying = () => this.setProjection({ state: "PLAYING" });
  private readonly handlePause = () => { if (this.projection.state === "PLAYING" || this.projection.state === "SEEKING") this.setProjection({ state: "PAUSED" }); };
  private readonly handleTimeUpdate = () => this.updateCurrent(this.audio.currentTime);
  private readonly handleSeeking = () => this.setProjection({ state: "SEEKING" });
  private readonly handleSeeked = () => this.setProjection({ state: this.audio.paused ? "PAUSED" : "PLAYING" });
  private readonly handleEnded = () => { const current = this.projection.duration; this.setProjection({ state: "ENDED", current }); };
  private readonly handleMediaError = () => this.fail(this.audio.error?.code === 4 ? "PLAYBACK_FORMAT_UNSUPPORTED" : "AUDIO_LOAD_FAILED");
  private readonly handleAbort = () => this.fail("PLAYBACK_ABORTED");

  private updateCurrent(value: number): void {
    if (!Number.isFinite(value)) return;
    const duration = this.projection.duration;
    const current = duration > 0 ? Math.min(duration, Math.max(0, value)) : Math.max(0, value);
    this.setProjection({ current });
  }

  private setProjection(change: Partial<VoiceNotePlaybackProjection>): void {
    this.projection = { ...this.projection, ...change };
    this.onChange?.(this.projection);
    this.subscribers.forEach((subscriber) => subscriber(this.projection));
  }

  private async playCurrentSource(): Promise<void> {
    try {
      await Promise.resolve(this.audio.play());
      this.setProjection({ state: "PLAYING" });
    } catch (error) {
      const code = playbackErrorCode(error);
      this.fail(code);
      throw new VoiceNotePlaybackError(code);
    }
  }

  private fail(code: VoiceNotePlaybackErrorCode, noteId = this.projection.noteId): void {
    this.setProjection({ state: "FAILED", errorCode: code, noteId });
  }

  private cleanupMedia(): void {
    this.audio.pause();
    this.audio.src = "";
    this.audio.load();
    this.revokeObjectUrl();
  }

  private revokeObjectUrl(): void {
    if (!this.objectUrl) return;
    this.urlApi.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
