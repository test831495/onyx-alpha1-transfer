import { describe, expect, it } from "vitest";
import { C1_CHARACTER_BIBLE, C1_GOLDEN_CONVERSATIONS, createSyntheticB1Briefing } from "./conversation-assurance";

describe("C1 character and sealed B1 synthetic assurance", () => {
  it("keeps canonical character behavior and authorization consistent across English, Hindi and Hinglish", () => {
    expect(C1_CHARACTER_BIBLE.identity).toBe("ONYX/NOVA");
    expect(C1_CHARACTER_BIBLE.authorization).toBe("SERVER_AUTHORITATIVE_DENY_BY_DEFAULT");
    expect(new Set(C1_GOLDEN_CONVERSATIONS.map((conversation) => conversation.language))).toEqual(new Set(["English", "Hindi", "Hinglish"]));
    expect(C1_GOLDEN_CONVERSATIONS.map((conversation) => conversation.scenario)).toEqual(expect.arrayContaining([
      "GENERAL", "CREATIVE", "B1_BRIEFING", "CONFLICTING_EVIDENCE", "STALE_EVIDENCE", "UNAVAILABLE_EVIDENCE", "APPROVAL", "PRIVACY", "RECOVERY", "PROVIDER_FAILURE",
    ]));
  });

  it("uses sealed synthetic B1 evidence with attribution and preserves unavailable or conflicting truth", () => {
    expect(createSyntheticB1Briefing("CURRENT")).toMatchObject({ source: "B1_SYNTHETIC", attributed: true, freshness: "CURRENT", unavailable: false });
    expect(createSyntheticB1Briefing("STALE")).toMatchObject({ freshness: "STALE", unavailable: false });
    expect(createSyntheticB1Briefing("CONFLICTING")).toMatchObject({ conflicting: true });
    expect(createSyntheticB1Briefing("UNAVAILABLE")).toMatchObject({ unavailable: true, summary: "Not verified" });
  });
});