import { describe, expect, it } from "vitest";
import { projectConversationShadow } from "./conversationShadowProjection";

describe("conversation shadow projection", () => {
  it("compares decisions without executing side effects", () => {
    const projection = projectConversationShadow(
      { kind: "OPEN_APP", sideEffect: "NAVIGATION" },
      { kind: "GENERAL_CONVERSATION", sideEffect: "GENERAL_CONVERSATION" },
      "AMBIGUOUS",
    );
    expect(projection.diverged).toBe(true);
    expect(projection.sideEffectsExecuted).toBe(false);
    expect(projection.divergenceCategory).toBe("CLASSIFICATION");
  });

  it("does not treat a non-applicable context as a mismatch", () => {
    const projection = projectConversationShadow(
      { kind: "DATE_QUESTION", sideEffect: "DETERMINISTIC_RESPONSE" },
      { kind: "DATE_QUESTION", sideEffect: "DETERMINISTIC_RESPONSE" },
      "NOT_APPLICABLE",
    );
    expect(projection.diverged).toBe(false);
  });
});