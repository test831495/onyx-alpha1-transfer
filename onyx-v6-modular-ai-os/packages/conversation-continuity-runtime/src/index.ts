import type { ConversationPurpose } from "@onyx/conversation-first-contracts";

export const CONTINUITY_VERSION = "B5C-1" as const;
export const SESSION_STATES = Object.freeze(["IDLE", "ACTIVE", "WAITING_FOR_FOLLOW_UP", "INTERRUPTED", "RESUMABLE", "EXPIRED", "CANCELLED"] as const);
export type SessionState = (typeof SESSION_STATES)[number];
export const TURN_STATES = Object.freeze(["RECEIVED", "CLASSIFIED", "PLANNED", "RESPONDING", "COMPLETED", "INTERRUPTED", "SUPERSEDED", "CANCELLED"] as const);
export type TurnState = (typeof TURN_STATES)[number];
export type ContinuitySpeaker = "ONYX" | "NOVA" | "COUNCIL" | "NONE";

export type ConversationTopic = Readonly<{ topicId: string; label: string; version: number }>;
export type ConversationTurn = Readonly<{
  turnId: string;
  sessionId: string;
  utteranceGeneration: number;
  purpose: ConversationPurpose;
  state: TurnState;
  topic: ConversationTopic | null;
  speaker: ContinuitySpeaker;
  summary: string;
  timestamp: number;
}>;
export type ConversationFrame = Readonly<{
  sessionId: string;
  ownerReference: string;
  topic: ConversationTopic | null;
  previousSpeaker: ContinuitySpeaker;
  activeTurnId: string | null;
  activeGeneration: number;
  turns: readonly ConversationTurn[];
}>;
export type CorrectionRecord = Readonly<{ correctionTurnId: string; supersededTurnId: string | null; correctedValue: string; topicVersion: number }>;
export type InterruptionRecord = Readonly<{ interruptionTurnId: string; interruptedTurnId: string | null; interruptedGeneration: number; newGeneration: number }>;
export type ResumeRecord = Readonly<{ resumeTurnId: string; resumedTurnId: string; resumedGeneration: number }>;
export type FollowUpWindow = Readonly<{ openedAt: number; expiresAt: number; sourceTurnId: string; cancellable: true }>;
export type TurnOwnershipReceipt = Readonly<{ sessionId: string; turnId: string; utteranceGeneration: number; current: boolean; staleReason: "NONE" | "SESSION_MISMATCH" | "TURN_MISMATCH" | "STALE_GENERATION" | "EXPIRED" }>;
export type ContinuityDecision = Readonly<{ status: "ACCEPTED" | "CORRECTED" | "INTERRUPTED" | "RESUMED" | "TOPIC_CHANGED" | "CLARIFICATION_REQUIRED" | "STALE_REJECTED" | "EXPIRED" | "CANCELLED"; sessionState: SessionState; frame: ConversationFrame; correction?: CorrectionRecord; interruption?: InterruptionRecord; resume?: ResumeRecord; followUpWindow: FollowUpWindow | null; nonAuthorizing: true }>;
export type ContinuityValidationResult = Readonly<{ status: "VALID" | "INVALID" | "NOT_ASSESSABLE"; reasonCodes: readonly ("MISSING_IDENTIFIER" | "STALE_TURN" | "SESSION_MISMATCH" | "GENERATION_REPLAY" | "EXPIRED_CONTEXT" | "INVALID_PURPOSE" | "UNSAFE_TOPIC_INHERITANCE")[] }>;

export type ContinuityInput = Readonly<{
  sessionId: string;
  ownerReference: string;
  turnId: string;
  utteranceGeneration: number;
  purpose: ConversationPurpose;
  timestamp: number;
  topicLabel?: string;
  topicId?: string;
  speaker?: ContinuitySpeaker;
  summary?: string;
  correctedValue?: string;
  isResume?: boolean;
  openFollowUp?: boolean;
}>;

const MAX_TURNS = 5;
const MAX_SUMMARY = 256;

export class ConversationSession {
  private state: SessionState = "IDLE";
  private frame: ConversationFrame;
  private followUpWindow: FollowUpWindow | null = null;
  private readonly expirationMs: number;
  private lastTimestamp: number | null = null;
  private interruptedTurnId: string | null = null;

  constructor(sessionId: string, ownerReference: string, expirationMs = 2 * 60 * 1000) {
    this.frame = Object.freeze({ sessionId, ownerReference, topic: null, previousSpeaker: "NONE", activeTurnId: null, activeGeneration: -1, turns: Object.freeze([]) });
    this.expirationMs = expirationMs;
  }

  accept(input: ContinuityInput): ContinuityDecision {
    const validation = this.validate(input);
    if (validation.status !== "VALID") return this.decision("STALE_REJECTED", null);
    if (this.lastTimestamp !== null && input.timestamp - this.lastTimestamp > this.expirationMs) {
      this.expire();
      return this.decision("EXPIRED", null);
    }
    const oldFrame = this.frame;
    const topicChanged = input.topicLabel !== undefined && oldFrame.topic !== null && input.topicLabel.toLowerCase() !== oldFrame.topic.label.toLowerCase();
    const topic = input.topicLabel === undefined ? oldFrame.topic : Object.freeze({ topicId: input.topicId ?? input.topicLabel.toLowerCase().replace(/\s+/g, "-"), label: input.topicLabel.slice(0, 160), version: (topicChanged ? oldFrame.topic?.version ?? 0 : oldFrame.topic?.version ?? 0) + (topicChanged ? 1 : 0) });
    const turn = Object.freeze({ turnId: input.turnId, sessionId: input.sessionId, utteranceGeneration: input.utteranceGeneration, purpose: input.purpose, state: "COMPLETED" as const, topic, speaker: input.purpose === "COUNCIL_REQUEST" ? "COUNCIL" as const : input.speaker ?? oldFrame.previousSpeaker, summary: (input.summary ?? input.topicLabel ?? input.purpose).slice(0, MAX_SUMMARY), timestamp: input.timestamp });
    const turns = Object.freeze([...oldFrame.turns, turn].slice(-MAX_TURNS));
    this.frame = Object.freeze({ ...oldFrame, topic, previousSpeaker: turn.speaker, activeTurnId: turn.turnId, activeGeneration: turn.utteranceGeneration, turns });
    this.lastTimestamp = input.timestamp;
    this.state = input.isResume ? "ACTIVE" : input.purpose === "INTERRUPTION" ? "INTERRUPTED" : input.openFollowUp ? "WAITING_FOR_FOLLOW_UP" : "ACTIVE";
    let status: ContinuityDecision["status"] = topicChanged ? "TOPIC_CHANGED" : "ACCEPTED";
    let correction: CorrectionRecord | undefined;
    let resume: ResumeRecord | undefined;
    if (input.purpose === "CORRECTION" && input.correctedValue) {
      correction = Object.freeze({ correctionTurnId: input.turnId, supersededTurnId: oldFrame.activeTurnId, correctedValue: input.correctedValue.slice(0, 160), topicVersion: topic?.version ?? 0 });
      status = "CORRECTED";
    }
    if (input.isResume) {
      if (!this.interruptedTurnId) return this.decision("CLARIFICATION_REQUIRED", null);
      resume = Object.freeze({ resumeTurnId: input.turnId, resumedTurnId: this.interruptedTurnId, resumedGeneration: input.utteranceGeneration });
      this.interruptedTurnId = null;
      status = "RESUMED";
    }
    if (input.purpose === "INTERRUPTION") {
      this.interruptedTurnId = oldFrame.activeTurnId;
      status = "INTERRUPTED";
    }
    if (input.purpose === "FOLLOW_UP" && oldFrame.topic === null) status = "CLARIFICATION_REQUIRED";
    this.followUpWindow = input.openFollowUp ? Object.freeze({ openedAt: input.timestamp, expiresAt: input.timestamp + this.expirationMs, sourceTurnId: input.turnId, cancellable: true }) : this.followUpWindow;
    return this.decision(status, correction ?? null, undefined, resume);
  }

  ownership(sessionId: string, turnId: string, utteranceGeneration: number, now: number): TurnOwnershipReceipt {
    const stale = this.lastTimestamp !== null && now - this.lastTimestamp > this.expirationMs;
    const reason = stale ? "EXPIRED" : sessionId !== this.frame.sessionId ? "SESSION_MISMATCH" : turnId !== this.frame.activeTurnId ? "TURN_MISMATCH" : utteranceGeneration < this.frame.activeGeneration ? "STALE_GENERATION" : "NONE";
    return Object.freeze({ sessionId, turnId, utteranceGeneration, current: reason === "NONE", staleReason: reason });
  }

  expire(): void { this.state = "EXPIRED"; this.followUpWindow = null; this.frame = Object.freeze({ ...this.frame, topic: null, activeTurnId: null, turns: Object.freeze([]) }); this.lastTimestamp = null; this.interruptedTurnId = null; }
  cancel(): void { this.state = "CANCELLED"; this.followUpWindow = null; this.frame = Object.freeze({ ...this.frame, topic: null, activeTurnId: null, turns: Object.freeze([]) }); }
  snapshot(): ConversationFrame { return this.frame; }

  private validate(input: ContinuityInput): ContinuityValidationResult {
    if (!input.sessionId || !input.ownerReference || !input.turnId) return invalidValidation("MISSING_IDENTIFIER");
    if (input.sessionId !== this.frame.sessionId || input.ownerReference !== this.frame.ownerReference) return invalidValidation("SESSION_MISMATCH");
    if (!Number.isSafeInteger(input.utteranceGeneration) || input.utteranceGeneration < this.frame.activeGeneration) return invalidValidation("GENERATION_REPLAY");
    if (this.lastTimestamp !== null && input.timestamp < this.lastTimestamp) return invalidValidation("STALE_TURN");
    return Object.freeze({ status: "VALID", reasonCodes: [] });
  }

  private decision(status: ContinuityDecision["status"], correction: CorrectionRecord | null, interruption?: InterruptionRecord, resume?: ResumeRecord): ContinuityDecision {
    return Object.freeze({ status, sessionState: this.state, frame: this.frame, ...(correction ? { correction } : {}), ...(interruption ? { interruption } : {}), ...(resume ? { resume } : {}), followUpWindow: this.followUpWindow, nonAuthorizing: true as const });
  }
}

export function validateContinuityDecision(decision: unknown): ContinuityValidationResult {
  if (!decision || typeof decision !== "object") return Object.freeze({ status: "NOT_ASSESSABLE", reasonCodes: ["MISSING_IDENTIFIER"] as const });
  const value = decision as Partial<ContinuityDecision>;
  return value.nonAuthorizing === true && value.frame?.sessionId ? Object.freeze({ status: "VALID", reasonCodes: [] as const }) : invalidValidation("MISSING_IDENTIFIER");
}

function invalidValidation(reason: "MISSING_IDENTIFIER" | "STALE_TURN" | "SESSION_MISMATCH" | "GENERATION_REPLAY" | "EXPIRED_CONTEXT" | "INVALID_PURPOSE" | "UNSAFE_TOPIC_INHERITANCE"): ContinuityValidationResult {
  return Object.freeze({ status: "INVALID", reasonCodes: [reason] as const });
}