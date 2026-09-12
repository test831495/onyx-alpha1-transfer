import { describe, expect, it } from "vitest";
import { getConversationFeatureState } from "./conversationFeatureFlag";

describe("conversation feature state", () => {
  it("defaults to OFF and accepts only explicit test state", () => {
    expect(getConversationFeatureState(undefined)).toBe("OFF");
    expect(getConversationFeatureState("TEST_HARNESS")).toBe("TEST_HARNESS");
    expect(getConversationFeatureState("ACTIVE")).toBe("OFF");
  });
});