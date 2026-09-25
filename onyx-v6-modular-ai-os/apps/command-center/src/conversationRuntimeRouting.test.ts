import { describe, expect, it } from "vitest";
import { parseConversationalRequest } from "./conversationIntentGrammar";

describe("live conversation routing precedence", () => {
  it.each(["I have had a long day.", "Help me decide what to focus on tomorrow.", "Imagine a calmer Operations Center."]) (
    "does not classify ordinary dialogue as a clarification plan: %s",
    (rawText) => {
      const envelope = parseConversationalRequest(rawText);
      expect(envelope.kind).toBe("UNSUPPORTED");
      expect(envelope.clarificationRequired).not.toBe(true);
    },
  );

  it("keeps ambiguous deterministic actions on the clarification path", () => {
    const envelope = parseConversationalRequest("Close the app");
    expect(envelope.kind).toBe("UNSUPPORTED");
    expect(envelope.clarificationRequired).toBe(true);
  });
});