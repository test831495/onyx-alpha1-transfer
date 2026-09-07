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

export type FollowUpTerminalHandler = (reason: FollowUpCloseReason, generation: number) => void;

export class FollowUpListeningSession {
  private state: FollowUpState = "IDLE";
  private turns = 0;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private readonly maxAutomaticTurns: number;
  private readonly setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimer: (handle: ReturnType<typeof setTimeout>) => void;
  private generation = 0;
  private terminalHandler: FollowUpTerminalHandler | null = null;

  constructor(options: FollowUpListeningSessionOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? FOLLOW_UP_TIMEOUT_MS;
    this.maxAutomaticTurns = options.maxAutomaticTurns ?? FOLLOW_UP_MAX_AUTOMATIC_TURNS;
    this.setTimer = options.setTimer ?? globalThis.setTimeout;
    this.clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  }

  getState(): FollowUpState { return this.state; }
  getTurnCount(): number { return this.turns; }
  getGeneration(): number { return this.generation; }

  beginAfterSpeech(eligible: boolean): boolean {
    if (!eligible || this.turns >= this.maxAutomaticTurns) {
      this.close("INELIGIBLE");
      return false;
    }
    this.clearTimeout();
    this.state = "WAITING_FOR_TTS";
    return true;
  }

  beginListening(start: () => boolean, onTerminal: FollowUpTerminalHandler): "STARTED" | "TAP_TO_CONTINUE" | "CLOSED" {
    if (this.state !== "WAITING_FOR_TTS") return "CLOSED";
    this.terminalHandler = onTerminal;
    let started = false;
    try { started = start(); } catch { started = false; }
    if (!started) {
      this.state = "TAP_TO_CONTINUE";
      this.scheduleTerminal();
      return "TAP_TO_CONTINUE";
    }
    this.state = "LISTENING";
    this.scheduleTerminal();
    return "STARTED";
  }

  recordTurn(): boolean {
    if (this.state !== "LISTENING") return false;
    this.clearTimeout();
    this.generation += 1;
    this.state = "IDLE";
    this.turns += 1;
    if (this.turns >= this.maxAutomaticTurns) this.close("MAX_TURNS");
    return true;
  }

  close(_reason: FollowUpCloseReason): void {
    this.clearTimeout();
    this.generation += 1;
    this.terminalHandler = null;
    this.state = "IDLE";
  }

  private scheduleTerminal(): void {
    const generation = this.generation;
    this.timeoutHandle = this.setTimer(() => {
      if (generation !== this.generation) return;
      const handler = this.terminalHandler;
      this.close("TIMEOUT");
      handler?.("TIMEOUT", generation);
    }, this.timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle !== null) {
      this.clearTimer(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}