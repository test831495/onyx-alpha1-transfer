import { describe, expect, it } from "vitest";
import { ConversationSession, validateContinuityDecision } from "../src/index";

const input = (overrides: Partial<Parameters<ConversationSession["accept"]>[0]> = {}) => ({ sessionId: "session-1", ownerReference: "owner-1", turnId: "turn-1", utteranceGeneration: 1, purpose: "INFORMATION_REQUEST" as const, timestamp: 1000, topicLabel: "offline safety", speaker: "ONYX" as const, ...overrides });

describe("B5C conversation continuity runtime", () => {
  it("preserves topic and speaker for follow-up turns", () => {
    const session = new ConversationSession("session-1", "owner-1");
    session.accept(input());
    const result = session.accept(input({ turnId: "turn-2", utteranceGeneration: 2, purpose: "FOLLOW_UP", topicLabel: undefined, timestamp: 1001 }));
    expect(result.status).toBe("ACCEPTED");
    expect(result.frame.topic?.label).toBe("offline safety");
    expect(result.frame.previousSpeaker).toBe("ONYX");
  });

  it("requires a valid topic for short follow-up", () => {
    const session = new ConversationSession("session-1", "owner-1");
    expect(session.accept(input({ purpose: "FOLLOW_UP", topicLabel: undefined })).status).toBe("CLARIFICATION_REQUIRED");
  });

  it("records correction ownership without restarting", () => {
    const session = new ConversationSession("session-1", "owner-1");
    session.accept(input({ topicLabel: "Google" }));
    const result = session.accept(input({ turnId: "correction", utteranceGeneration: 2, purpose: "CORRECTION", topicLabel: "Microsoft", correctedValue: "Microsoft", timestamp: 1001 }));
    expect(result.status).toBe("CORRECTED");
    expect(result.correction?.supersededTurnId).toBe("turn-1");
    expect(result.frame.topic?.label).toBe("Microsoft");
  });

  it("interrupts and resumes only the active owned turn", () => {
    const session = new ConversationSession("session-1", "owner-1");
    session.accept(input({ openFollowUp: true }));
    const interrupted = session.accept(input({ turnId: "interrupt", utteranceGeneration: 2, purpose: "INTERRUPTION", timestamp: 1001 }));
    expect(interrupted.status).toBe("INTERRUPTED");
    const resumed = session.accept(input({ turnId: "resume", utteranceGeneration: 3, isResume: true, purpose: "GENERAL_CONVERSATION", timestamp: 1002 }));
    expect(resumed.status).toBe("RESUMED");
    expect(resumed.resume?.resumedTurnId).toBe("turn-1");
  });

  it("rejects stale generations and wrong ownership", () => {
    const session = new ConversationSession("session-1", "owner-1");
    session.accept(input());
    expect(session.accept(input({ turnId: "stale", utteranceGeneration: 0, timestamp: 1001 })).status).toBe("STALE_REJECTED");
    expect(session.ownership("other", "turn-1", 1, 1001).current).toBe(false);
    expect(session.ownership("session-1", "turn-1", 0, 1001).staleReason).toBe("STALE_GENERATION");
  });

  it("expires, clears sensitive frame state, and bounds turns", () => {
    const session = new ConversationSession("session-1", "owner-1", 100);
    for (let index = 0; index < 8; index += 1) session.accept(input({ turnId: `turn-${index}`, utteranceGeneration: index + 1, timestamp: 1000 + index, summary: "bounded" }));
    expect(session.snapshot().turns.length).toBeLessThanOrEqual(5);
    session.accept(input({ turnId: "expired", utteranceGeneration: 20, timestamp: 1201 }));
    expect(session.snapshot().topic).toBeNull();
  });

  it("prepares Council continuity without authority", () => {
    const session = new ConversationSession("session-1", "owner-1");
    const result = session.accept(input({ purpose: "COUNCIL_REQUEST", speaker: "COUNCIL", topicLabel: "sequencing" }));
    expect(result.frame.previousSpeaker).toBe("COUNCIL");
    expect(result.nonAuthorizing).toBe(true);
  });

  it("validates immutable non-authorizing decisions", () => {
    const session = new ConversationSession("session-1", "owner-1");
    const result = session.accept(input());
    expect(validateContinuityDecision(result).status).toBe("VALID");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.frame)).toBe(true);
  });
});