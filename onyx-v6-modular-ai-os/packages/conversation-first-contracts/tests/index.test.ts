import { describe, expect, it } from "vitest";
import { CONVERSATIONAL_PURPOSES, ConversationalPurposeResolver } from "../src/ConversationPurpose";
import { DialogueContextBuilder } from "../src/DialogueContext";

describe("conversation-first shared contracts", () => {
  it("preserves the closed 13-purpose vocabulary and required precedence", () => {
    expect(CONVERSATIONAL_PURPOSES).toHaveLength(13);
    const resolver = new ConversationalPurposeResolver();
    expect(resolver.resolve({ rawText: "I am opening Calendar" }).purpose).toBe("NAVIGATION_REQUEST");
    expect(resolver.resolve({ rawText: "I just sent the report" }).purpose).toBe("ACTION_REQUEST");
    expect(resolver.resolve({ rawText: "I am asking what happened" }).purpose).toBe("INFORMATION_REQUEST");
    expect(resolver.resolve({ rawText: "I have had a long day" }).purpose).toBe("REFLECTION");
  });

  it("requires active context for follow-up and preserves correction extraction", () => {
    const resolver = new ConversationalPurposeResolver();
    expect(resolver.resolve({ rawText: "Tell me more" }).purpose).toBe("UNKNOWN");
    expect(resolver.resolve({ rawText: "Tell me more", hasActiveTopic: true }).purpose).toBe("FOLLOW_UP");
    expect(resolver.resolve({ rawText: "No, Microsoft, not Google" }).correctedEntity).toBe("Microsoft");
  });

  it("bounds context and fails closed for invalid metadata", () => {
    const context = new DialogueContextBuilder().build({
      recentTurnSummaries: ["one", "two", "three", "four", "five", "six"],
      previousSpeaker: "COUNCIL",
      operatingMode: "INVALID" as never,
      privacyClass: "INVALID" as never,
      suppliedTruthReferences: ["truth-1", "bearer token"],
    });
    expect(context.recentTurnSummaries).toHaveLength(5);
    expect(context.previousSpeaker).toBe("COUNCIL");
    expect(context.operatingMode).toBe("UNKNOWN");
    expect(context.privacyClass).toBe("SENSITIVE");
    expect(context.suppliedTruthReferences).toEqual(["truth-1"]);
    expect(context.contextVersion).toBe("b5a-v1");
  });
});