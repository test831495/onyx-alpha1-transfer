/**
 * Short-lived, session-scoped conversational context. Bounded turns/bytes,
 * no raw audio, no persistent storage: this class only ever exists in
 * memory for the lifetime of the owning component/session.
 */

export type ConversationTurnKind = "DATE_QUESTION" | "NAVIGATION" | "UI_VISIBLE" | "OTHER";

export interface ConversationTurnRecord {
  readonly turnId: string;
  readonly createdSequence: number;
  readonly kind: ConversationTurnKind;
  readonly normalizedText: string;
  readonly resultSummary: string;
}

const MAX_TURNS = 5;
const MAX_BYTES = 4000;
const DEFAULT_INACTIVITY_MS = 2 * 60 * 1000;

export class ConversationContextWindow {
  private turns: ConversationTurnRecord[] = [];
  private sequence = 0;
  private lastActivityAt = 0;

  constructor(private readonly inactivityMs = DEFAULT_INACTIVITY_MS) {}

  recordTurn(nowMs: number, turn: Omit<ConversationTurnRecord, "createdSequence">): void {
    this.expireIfStale(nowMs);
    this.sequence += 1;
    this.turns.push({ ...turn, createdSequence: this.sequence });
    this.enforceBounds();
    this.lastActivityAt = nowMs;
  }

  expireIfStale(nowMs: number): void {
    if (this.turns.length > 0 && nowMs - this.lastActivityAt > this.inactivityMs) {
      this.clear();
    }
  }

  lastTurnOfKind(kind: ConversationTurnKind): ConversationTurnRecord | undefined {
    for (let index = this.turns.length - 1; index >= 0; index -= 1) {
      const turn = this.turns[index];
      if (turn?.kind === kind) return turn;
    }
    return undefined;
  }

  clear(): void {
    this.turns = [];
    this.lastActivityAt = 0;
    this.sequence = 0;
  }

  size(): number {
    return this.turns.length;
  }

  private enforceBounds(): void {
    while (this.turns.length > MAX_TURNS) this.turns.shift();
    while (this.byteSize() > MAX_BYTES && this.turns.length > 0) this.turns.shift();
  }

  private byteSize(): number {
    return this.turns.reduce((total, turn) => total + turn.normalizedText.length + turn.resultSummary.length, 0);
  }
}
