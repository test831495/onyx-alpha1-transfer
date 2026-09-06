import { describe, expect, it } from "vitest";
import { parseConversationalRequest } from "./conversationIntentGrammar";

describe("parseConversationalRequest", () => {
  it("recognizes cancellation words", () => {
    expect(parseConversationalRequest("Stop").kind).toBe("CANCEL");
    expect(parseConversationalRequest("cancel").kind).toBe("CANCEL");
    expect(parseConversationalRequest("Never mind").kind).toBe("CANCEL");
  });

  it("parses the composite calendar + tomorrow's date example", () => {
    const result = parseConversationalRequest("Open calendar and tell me tomorrow's date.");
    expect(result.kind).toBe("COMPOSITE_NAVIGATE_AND_FACT");
    expect(result.navigateAppId).toBe("calendar");
    expect(result.factKind).toBe("TOMORROW_DATE");
  });

  it("parses the composite workspace + visible-ui example", () => {
    const result = parseConversationalRequest("Open workspace and tell me what is currently visible.");
    expect(result.kind).toBe("COMPOSITE_NAVIGATE_AND_FACT");
    expect(result.navigateAppId).toBe("workspace");
    expect(result.factKind).toBe("UI_VISIBLE");
  });

  it("fails closed for an unknown composite navigation target", () => {
    const result = parseConversationalRequest("Open spaceship and tell me tomorrow's date.");
    expect(result.kind).toBe("UNSUPPORTED");
    expect(result.unsupportedReason).toBeTruthy();
  });

  it("parses a standalone tomorrow date question", () => {
    const result = parseConversationalRequest("What is tomorrow's date?");
    expect(result.kind).toBe("DATE_QUESTION");
    expect(result.factKind).toBe("TOMORROW_DATE");
  });

  it("parses a standalone visible-ui question", () => {
    const result = parseConversationalRequest("What is currently visible?");
    expect(result.kind).toBe("UI_VISIBLE_QUESTION");
  });

  it("parses a bounded weekday follow-up", () => {
    const result = parseConversationalRequest("And what about Monday?");
    expect(result.kind).toBe("FOLLOW_UP_DATE_QUESTION");
    expect(result.weekday).toBe("monday");
  });

  it("fails closed for an ambiguous follow-up day", () => {
    const result = parseConversationalRequest("And what about someday?");
    expect(result.kind).toBe("FOLLOW_UP_DATE_QUESTION");
    expect(result.weekday).toBeUndefined();
    expect(result.unsupportedReason).toBeTruthy();
  });

  it("fails closed for unsupported requests", () => {
    const result = parseConversationalRequest("Summarize the news for me please");
    expect(result.kind).toBe("UNSUPPORTED");
  });

  it("does not let raw text bypass into a navigation appId without a registered target", () => {
    const result = parseConversationalRequest("Open the nuclear reactor and tell me tomorrow's date.");
    expect(result.kind).toBe("UNSUPPORTED");
    expect(result.navigateAppId).toBeUndefined();
  });
});
