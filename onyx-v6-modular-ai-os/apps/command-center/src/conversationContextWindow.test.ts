import { describe, expect, it } from "vitest";
import { ConversationContextWindow } from "./conversationContextWindow";

const baseTurn = (overrides: Partial<{ kind: "DATE_QUESTION" | "NAVIGATION" | "UI_VISIBLE" | "OTHER"; normalizedText: string; resultSummary: string }> = {}) => ({
  turnId: "turn-1",
  kind: "DATE_QUESTION" as const,
  normalizedText: "what is tomorrows date",
  resultSummary: "answered",
  ...overrides,
});

describe("ConversationContextWindow", () => {
  it("resolves the last turn of a given kind for bounded follow-ups", () => {
    const context = new ConversationContextWindow();
    context.recordTurn(1000, baseTurn());
    const found = context.lastTurnOfKind("DATE_QUESTION");
    expect(found?.normalizedText).toBe("what is tomorrows date");
  });

  it("enforces a bounded maximum turn count", () => {
    const context = new ConversationContextWindow();
    for (let i = 0; i < 10; i += 1) {
      context.recordTurn(1000 + i, baseTurn({ normalizedText: `turn ${i}` }));
    }
    expect(context.size()).toBeLessThanOrEqual(5);
  });

  it("expires stale context rather than resolving a follow-up", () => {
    const context = new ConversationContextWindow(1000);
    context.recordTurn(0, baseTurn());
    context.expireIfStale(5000);
    expect(context.lastTurnOfKind("DATE_QUESTION")).toBeUndefined();
  });

  it("clears on explicit session/account boundary", () => {
    const context = new ConversationContextWindow();
    context.recordTurn(1000, baseTurn());
    context.clear();
    expect(context.size()).toBe(0);
    expect(context.lastTurnOfKind("DATE_QUESTION")).toBeUndefined();
  });

  it("does not resolve an ambiguous kind that was never recorded", () => {
    const context = new ConversationContextWindow();
    context.recordTurn(1000, baseTurn({ kind: "NAVIGATION", normalizedText: "open calendar" }));
    expect(context.lastTurnOfKind("DATE_QUESTION")).toBeUndefined();
  });
});
