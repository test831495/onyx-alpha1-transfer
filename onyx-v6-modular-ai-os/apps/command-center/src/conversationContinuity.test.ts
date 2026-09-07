import { describe, expect, it } from "vitest";
import { parseConversationalRequest } from "./conversationIntentGrammar";
import { getConversationContinuity } from "./conversationContinuity";

describe("conversation continuity policy", () => {
  it.each(["Open Calendar", "Show Settings", "Go to Health", "Close Tasks"])("keeps successful application actions conversational: %s", (request) => {
    expect(getConversationContinuity(parseConversationalRequest(request))).toBe("CONTINUE_LISTENING");
  });

  it.each(["Stop", "That's all", "Close conversation"])("keeps explicit session endings terminal: %s", (request) => {
    expect(getConversationContinuity(parseConversationalRequest(request))).toBe("TERMINATE_SESSION");
  });
});