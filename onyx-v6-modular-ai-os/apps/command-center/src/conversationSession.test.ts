import { describe, expect, it } from "vitest";
import { ConversationSession } from "./conversationSession";

describe("conversation session", () => {
  it("resolves structured follow-up context and isolates session changes", () => {
    const session = new ConversationSession({ character: "NOVA", sessionReference: "session-1", accountReference: "account-1" });
    session.record({ turnId: "turn-1", source: "TYPED", normalizedText: "what is tomorrow", discourseAct: "QUESTION", intentKind: "DATE_QUESTION", antecedentReference: null, truthSourceClass: "DETERMINISTIC_LOCAL", limitationCodes: [], activeCharacter: "NOVA", sessionReference: "session-1", accountReference: "account-1", correctionOfTurnId: null, cancellationOfTurnId: null, timestamp: 1000 });
    expect(session.resolveFollowUp("turn-1", 1001).status).toBe("RESOLVED");
    expect(session.resolveFollowUp("missing", 1001).status).toBe("MISSING_CONTEXT");
    session.switchSession("session-2");
    expect(session.size()).toBe(0);
    session.switchCharacter();
    expect(session.size()).toBe(0);
    session.switchSession("session-3");
    session.record({ turnId: "turn-2", source: "TYPED", normalizedText: "hello", discourseAct: "QUESTION", intentKind: "OTHER", antecedentReference: null, truthSourceClass: "UNKNOWN", limitationCodes: [], activeCharacter: "NOVA", sessionReference: "session-3", accountReference: "account-2", correctionOfTurnId: null, cancellationOfTurnId: null, timestamp: 1002 });
    expect(session.size()).toBe(0);
  });

  it("expires stale context and retains bounded limits", () => {
    const session = new ConversationSession({ character: "ONYX", sessionReference: "session-1", accountReference: "account-1", inactivityMs: 100 });
    for (let index = 0; index < 8; index += 1) {
      session.record({ turnId: `turn-${index}`, source: "TYPED", normalizedText: "x", discourseAct: "QUESTION", intentKind: "OTHER", antecedentReference: null, truthSourceClass: "UNKNOWN", limitationCodes: [], activeCharacter: "ONYX", sessionReference: "session-1", accountReference: "account-1", correctionOfTurnId: null, cancellationOfTurnId: null, timestamp: index });
    }
    expect(session.size()).toBeLessThanOrEqual(5);
    expect(session.expireIfStale(1000)).toBe(true);
    expect(session.size()).toBe(0);
  });
});