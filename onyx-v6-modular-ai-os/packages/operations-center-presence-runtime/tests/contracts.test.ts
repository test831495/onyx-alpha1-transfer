import { describe, expect, it } from "vitest";
import { PRESENCE_SPEAKERS, PRESENCE_STATES } from "../PresenceState.js";

describe("presence contracts", () => {
  it("exports the exact stable state contract", () => {
    expect(PRESENCE_STATES).toEqual([
      "IDLE",
      "LISTENING",
      "UNDERSTANDING",
      "THINKING",
      "SPEAKING",
      "APPROVAL_REQUIRED",
      "PRIVACY_RESTRICTED",
      "RECOVERING",
    ]);
  });

  it("exports the exact stable speaker contract", () => {
    expect(PRESENCE_SPEAKERS).toEqual(["NONE", "ONYX", "NOVA", "COUNCIL"]);
  });
});