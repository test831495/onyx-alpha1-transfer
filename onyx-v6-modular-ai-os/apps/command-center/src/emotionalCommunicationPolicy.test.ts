import { describe, expect, it } from "vitest";
import { decideCommunicationStyle } from "./emotionalCommunicationPolicy";

describe("explicit emotional communication policy", () => {
  it("adapts only from explicit wording or deterministic failure events", () => {
    expect(decideCommunicationStyle("This is frustrating. Just tell me what failed.").acknowledgementRequired).toBe(true);
    expect(decideCommunicationStyle("Please simplify it.").detailMode).toBe("BRIEF");
    expect(decideCommunicationStyle("Explain in detail.").detailMode).toBe("DETAILED");
    expect(decideCommunicationStyle("neutral request").signal).toBe("NEUTRAL");
    expect(decideCommunicationStyle("neutral request", true).signal).toBe("REPEATED_FAILURE_IN_CURRENT_SESSION");
    expect(decideCommunicationStyle("I don't understand.").signal).toBe("USER_EXPLICIT_CONFUSION");
    expect(decideCommunicationStyle("I don’t understand.").signal).toBe("USER_EXPLICIT_CONFUSION");
    expect(decideCommunicationStyle("This isn't working.").signal).toBe("USER_EXPLICIT_FRUSTRATION");
    expect(decideCommunicationStyle("This isn’t working.").signal).toBe("USER_EXPLICIT_FRUSTRATION");
    expect(decideCommunicationStyle("I do not understand.").signal).toBe("USER_EXPLICIT_CONFUSION");
  });

  it("cannot change authority or persist a communication label", () => {
    const decision = decideCommunicationStyle("speak slower");
    expect(decision.speechRate).toBe("SLOWER");
    expect(decision.noAuthorityEffect).toBe(true);
    expect(decision.noPersistence).toBe(true);
  });
});