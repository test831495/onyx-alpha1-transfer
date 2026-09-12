import type { ConversationCharacter, ConversationInputSource } from "./conversationContract";

const MAX_TURNS = 5;
const MAX_BYTES = 4000;

export type ConversationContextStatus = "RESOLVED" | "MISSING_CONTEXT" | "STALE_CONTEXT" | "AMBIGUOUS_CONTEXT" | "CONFLICTING_CONTEXT" | "CANCELLED";
export type ConversationDiscourseAct = "QUESTION" | "COMMAND" | "FOLLOW_UP" | "CORRECTION" | "CANCEL" | "UNSUPPORTED";
export type ConversationTruthSource = "DETERMINISTIC_LOCAL" | "CONNECTOR" | "LOCAL_MEMORY" | "GENERATED" | "UNKNOWN";

export interface ConversationSessionTurn {
  readonly turnId: string;
  readonly source: ConversationInputSource;
  readonly normalizedText: string;
  readonly discourseAct: ConversationDiscourseAct;
  readonly intentKind: string;
  readonly planReference?: string;
  readonly resultReference?: string;
  readonly antecedentReference: string | null;
  readonly truthSourceClass: ConversationTruthSource;
  readonly limitationCodes: readonly string[];
  readonly activeCharacter: ConversationCharacter;
  readonly sessionReference: string;
  readonly accountReference: string;
  readonly correctionOfTurnId: string | null;
  readonly cancellationOfTurnId: string | null;
  readonly timestamp: number;
}

export interface FollowUpResolution {
  readonly status: ConversationContextStatus;
  readonly turn?: ConversationSessionTurn;
}

export interface ConversationSessionOptions {
  readonly character: ConversationCharacter;
  readonly sessionReference: string;
  readonly accountReference?: string;
  readonly inactivityMs?: number;
}

export class ConversationSession {
  private readonly inactivityMs: number;
  private readonly character: ConversationCharacter;
  private sessionReference: string;
  private readonly accountReference: string;
  private turns: ConversationSessionTurn[] = [];
  private lastActivityAt = 0;

  constructor(options: ConversationSessionOptions) {
    this.character = options.character;
    this.sessionReference = options.sessionReference;
    this.accountReference = options.accountReference ?? "NOT_AVAILABLE";
    this.inactivityMs = options.inactivityMs ?? 2 * 60 * 1000;
  }

  record(turn: ConversationSessionTurn): void {
    if (turn.activeCharacter !== this.character || turn.sessionReference !== this.sessionReference || turn.accountReference !== this.accountReference) return;
    this.expireIfStale(turn.timestamp);
    this.turns.push(Object.freeze({ ...turn, limitationCodes: Object.freeze([...turn.limitationCodes]) }));
    while (this.turns.length > MAX_TURNS || this.byteSize() > MAX_BYTES) this.turns.shift();
    this.lastActivityAt = turn.timestamp;
  }

  resolveFollowUp(antecedentReference: string | null, now: number): FollowUpResolution {
    if (this.expireIfStale(now)) return { status: "STALE_CONTEXT" };
    if (!antecedentReference) return { status: "MISSING_CONTEXT" };
    const turn = this.turns.find((candidate) => candidate.turnId === antecedentReference);
    return turn ? { status: "RESOLVED", turn } : { status: "MISSING_CONTEXT" };
  }

  expireIfStale(now: number): boolean {
    if (this.turns.length > 0 && now - this.lastActivityAt > this.inactivityMs) {
      this.clear();
      return true;
    }
    return false;
  }

  switchSession(sessionReference: string): void {
    if (sessionReference !== this.sessionReference) {
      this.sessionReference = sessionReference;
      this.clear();
    }
  }

  switchCharacter(): void {
    this.clear();
  }

  clear(): void {
    this.turns = [];
    this.lastActivityAt = 0;
  }

  size(): number { return this.turns.length; }

  private byteSize(): number {
    const encoder = new TextEncoder();
    return this.turns.reduce((total, turn) => total + encoder.encode(turn.normalizedText).length + encoder.encode(turn.intentKind).length, 0);
  }
}