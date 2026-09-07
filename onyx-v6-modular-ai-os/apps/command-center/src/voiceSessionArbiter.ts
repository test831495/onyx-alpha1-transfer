export type VoiceSessionMode =
  | "IDLE"
  | "PUSH_TO_TALK"
  | "ORBITAL_LISTEN"
  | "FOLLOW_UP_LISTENING"
  | "WAKE_WORD_STANDBY"
  | "TTS_PLAYBACK"
  | "CANCELLING"
  | "ERROR_RECOVERY";

export type VoiceSessionAbortReason =
  | "MODE_HANDOFF"
  | "USER_CANCEL"
  | "CHARACTER_SWITCH"
  | "SESSION_CLOSE"
  | "TTS_PROTECTION"
  | "UNMOUNT"
  | "RESTART_PREPARATION"
  | "STALE_GENERATION"
  | "UNEXPECTED_ABORT";

export interface VoiceSessionSnapshot {
  readonly generation: number;
  readonly mode: VoiceSessionMode;
  readonly characterId: string | null;
  readonly recognitionInstanceId: string | null;
  readonly pendingStart: boolean;
  readonly terminal: boolean;
  readonly cancellationReason: VoiceSessionAbortReason | null;
}

export interface VoiceSessionStartDecision {
  readonly generation: number;
  readonly mode: VoiceSessionMode;
  readonly shouldStartRecognition: boolean;
  readonly expectedAbortReason: VoiceSessionAbortReason | null;
}

export interface VoiceAbortClassification {
  readonly expected: boolean;
  readonly userMessage: string | null;
  readonly reason: VoiceSessionAbortReason;
}

const explicitModes = new Set<VoiceSessionMode>(["PUSH_TO_TALK", "ORBITAL_LISTEN"]);

export class VoiceSessionArbiter {
  private generation = 0;
  private mode: VoiceSessionMode = "IDLE";
  private characterId: string | null = null;
  private recognitionInstanceId: string | null = null;
  private pendingStart = false;
  private terminal = true;
  private cancellationReason: VoiceSessionAbortReason | null = null;
  private readonly expectedAbortReasons = new Map<number, VoiceSessionAbortReason>();
  private readonly expectedAbortModes = new Map<number, VoiceSessionMode>();

  snapshot(): VoiceSessionSnapshot {
    return {
      generation: this.generation,
      mode: this.mode,
      characterId: this.characterId,
      recognitionInstanceId: this.recognitionInstanceId,
      pendingStart: this.pendingStart,
      terminal: this.terminal,
      cancellationReason: this.cancellationReason,
    };
  }

  enterWakeWordStandby(characterId: string): VoiceSessionStartDecision {
    this.markCurrentAbortExpected("MODE_HANDOFF");
    this.generation += 1;
    this.mode = "WAKE_WORD_STANDBY";
    this.characterId = characterId;
    this.recognitionInstanceId = null;
    this.pendingStart = false;
    this.terminal = true;
    this.cancellationReason = null;
    return { generation: this.generation, mode: this.mode, shouldStartRecognition: false, expectedAbortReason: null };
  }

  requestStart(mode: Exclude<VoiceSessionMode, "IDLE" | "TTS_PLAYBACK" | "CANCELLING" | "ERROR_RECOVERY">, characterId: string): VoiceSessionStartDecision {
    if (this.pendingStart && explicitModes.has(mode) && explicitModes.has(this.mode)) {
      return { generation: this.generation, mode: this.mode, shouldStartRecognition: false, expectedAbortReason: null };
    }

    const expectedAbortReason = this.mode === "IDLE" ? null : "MODE_HANDOFF";
    this.markCurrentAbortExpected(expectedAbortReason);
    this.generation += 1;
    this.mode = mode;
    this.characterId = characterId;
    this.recognitionInstanceId = null;
    this.pendingStart = true;
    this.terminal = false;
    this.cancellationReason = null;
    return { generation: this.generation, mode, shouldStartRecognition: true, expectedAbortReason };
  }

  markRecognitionStarted(generation: number, recognitionInstanceId: string): boolean {
    if (generation !== this.generation) return false;
    this.recognitionInstanceId = recognitionInstanceId;
    this.pendingStart = false;
    this.terminal = false;
    return true;
  }

  markRecognitionEnded(generation: number): boolean {
    if (generation !== this.generation) return false;
    this.expectedAbortReasons.delete(generation);
    this.expectedAbortModes.delete(generation);
    this.recognitionInstanceId = null;
    this.pendingStart = false;
    this.terminal = true;
    if (this.mode !== "ERROR_RECOVERY") this.mode = "IDLE";
    return true;
  }

  expectAbort(generation: number, reason: VoiceSessionAbortReason): void {
    this.expectedAbortReasons.set(generation, reason);
    this.expectedAbortModes.set(generation, this.mode);
    if (generation === this.generation) this.cancellationReason = reason;
  }

  cancel(reason: VoiceSessionAbortReason): number {
    if (this.terminal && !this.pendingStart && !this.recognitionInstanceId) {
      this.mode = "IDLE";
      this.cancellationReason = null;
      return this.generation;
    }
    this.markCurrentAbortExpected(reason);
    this.mode = "CANCELLING";
    this.pendingStart = false;
    this.cancellationReason = reason;
    return this.generation;
  }

  classifyRecognitionError(generation: number, error: string): VoiceAbortClassification {
    const expectedReason = this.expectedAbortReasons.get(generation);

    if (generation !== this.generation) {
      if (error === "aborted" && expectedReason) {
        this.expectedAbortReasons.delete(generation);
        const previousMode = this.expectedAbortModes.get(generation);
        this.expectedAbortModes.delete(generation);
        return {
          expected: true,
          userMessage: null,
          reason: previousMode === "WAKE_WORD_STANDBY" ? expectedReason : "STALE_GENERATION",
        };
      }
      return { expected: true, userMessage: null, reason: "STALE_GENERATION" };
    }

    if (error === "aborted" && expectedReason) {
      this.expectedAbortReasons.delete(generation);
      this.expectedAbortModes.delete(generation);
      this.markRecognitionEnded(generation);
      return { expected: true, userMessage: null, reason: expectedReason };
    }

    if (error === "aborted") {
      this.mode = "IDLE";
      this.pendingStart = false;
      this.recognitionInstanceId = null;
      this.terminal = true;
      this.cancellationReason = "UNEXPECTED_ABORT";
      return { expected: false, userMessage: "VOICE_ABORT_UNEXPECTED", reason: "UNEXPECTED_ABORT" };
    }

    this.mode = "ERROR_RECOVERY";
    this.pendingStart = false;
    this.recognitionInstanceId = null;
    this.terminal = true;
    return { expected: false, userMessage: null, reason: "UNEXPECTED_ABORT" };
  }

  private markCurrentAbortExpected(reason: VoiceSessionAbortReason | null): void {
    if (reason && !this.terminal) {
      this.expectedAbortReasons.set(this.generation, reason);
      this.expectedAbortModes.set(this.generation, this.mode);
    }
  }
}

export class TtsSttHandoffGate {
  private expectedRecognitionGeneration: number | null = null;
  private speechComplete = false;
  private recognitionTerminal = true;

  expectPreviousRecognitionEnd(generation: number | null): void {
    this.expectedRecognitionGeneration = generation;
    this.recognitionTerminal = generation == null;
    this.speechComplete = false;
  }

  markSpeechComplete(): void {
    this.speechComplete = true;
  }

  markRecognitionTerminal(generation: number): void {
    if (generation === this.expectedRecognitionGeneration) {
      this.recognitionTerminal = true;
    }
  }

  canStartFollowUp(): boolean {
    return this.speechComplete && this.recognitionTerminal;
  }
}