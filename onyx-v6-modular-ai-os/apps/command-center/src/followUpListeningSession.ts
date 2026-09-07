export const FOLLOW_UP_TIMEOUT_MS = 8000;
export const FOLLOW_UP_MAX_AUTOMATIC_TURNS = 3;

export type FollowUpState = "IDLE" | "WAITING_FOR_TTS" | "LISTENING" | "TAP_TO_CONTINUE";
export type FollowUpCloseReason = "TIMEOUT" | "CANCELLED" | "MAX_TURNS" | "ERROR" | "INELIGIBLE";

export interface FollowUpListeningSessionOptions {
  readonly timeoutMs?: number;
  readonly maxAutomaticTurns?: number;
  readonly setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}

export class FollowUpListeningSession {
  private state: FollowUpState = "IDLE";
  private turns = 0;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly maxAutomaticTurns: number;
  private readonly setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimer: (handle: ReturnType<typeof setTimeout>) => void;

  constructor(options: FollowUpListeningSessionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? FOLLOW_UP_TIMEOUT_MS;
    this.maxAutomaticTurns = options.maxAutomaticTurns ?? FOLLOW_UP_MAX_AUTOMATIC_TURNS;
    this.setTimer = options.setTimer ?? globalThis.setTimeout;
    this.clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  }

  getState(): FollowUpState { return this.state; }
  getTurnCount(): number { return this.turns; }

  beginAfterSpeech(eligible: boolean): boolean {
    if (!eligible || this.turns >= this.maxAutomaticTurns) {
      this.close("INELIGIBLE");
      return false;
    }
    this.clearTimeout();
    this.state = "WAITING_FOR_TTS";
    return true;
  }

  beginListening(start: () => boolean): "STARTED" | "TAP_TO_CONTINUE" | "CLOSED" {
    if (this.state !== "WAITING_FOR_TTS") return "CLOSED";
    let started = false;
    try { started = start(); } catch { started = false; }
    if (!started) {
      this.state = "TAP_TO_CONTINUE";
      return "TAP_TO_CONTINUE";
    }
    this.state = "LISTENING";
    this.timeoutHandle = this.setTimer(() => this.close("TIMEOUT"), this.timeoutMs);
    return "STARTED";
  }

  recordTurn(): boolean {
    if (this.state !== "LISTENING") return false;
    this.turns += 1;
    if (this.turns >= this.maxAutomaticTurns) this.close("MAX_TURNS");
    return true;
  }

  close(_reason: FollowUpCloseReason): void {
    this.clearTimeout();
    this.state = "IDLE";
  }

  private clearTimeout(): void {
    if (this.timeoutHandle !== null) {
      this.clearTimer(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}