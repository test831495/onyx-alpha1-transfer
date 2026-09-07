export const FOLLOW_UP_TIMEOUT_MS = 15000;
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
  private restartCount = 0;

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
    this.restartCount = 0;
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
    return "STARTED";
  }

  markListeningActive(): boolean {
    if (this.state !== "LISTENING" || this.timeoutHandle !== null) return false;
    this.scheduleTerminal();
    return true;
  }

  handleEarlyEnd(restart: () => boolean): "RESTARTED" | "TAP_TO_CONTINUE" | "CLOSED" {
    if (this.state !== "LISTENING") return "CLOSED";
    if (this.restartCount >= 1) {
      this.state = "TAP_TO_CONTINUE";
      this.scheduleTerminal();
      return "TAP_TO_CONTINUE";
    }
    this.restartCount += 1;
    let restarted = false;
    try { restarted = restart(); } catch { restarted = false; }
    if (restarted) return "RESTARTED";
    this.state = "TAP_TO_CONTINUE";
    this.scheduleTerminal();
    return "TAP_TO_CONTINUE";
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
    this.restartCount = 0;
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