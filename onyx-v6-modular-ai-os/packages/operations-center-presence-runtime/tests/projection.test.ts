import { describe, expect, it } from "vitest";
import { blinkAt, breathingScaleAt, projectCharacterPresence } from "../ProjectionEngine.js";
import { PRESENCE_SPEAKERS, PRESENCE_STATES } from "../PresenceState.js";

describe("character projection engine", () => {
  it.each(PRESENCE_STATES)("projects the %s state", (state) => {
    const projection = projectCharacterPresence({ speaker: "ONYX", state });
    expect(projection.state).toBe(state);
    expect(projection.activeSpeaker).toBe("ONYX");
    expect(projection.offlineCapable).toBe(true);
    expect(projection.grantsAuthority).toBe(false);
  });

  it.each(PRESENCE_SPEAKERS)("projects the %s speaker transition", (speaker) => {
    const projection = projectCharacterPresence({ speaker, state: "LISTENING" });
    expect(projection.activeSpeaker).toBe(speaker);
    expect(projection.focusMode).toBe(speaker === "NONE" ? "AMBIENT" : speaker);
  });

  it("returns to NONE without hiding either character", () => {
    const speaking = projectCharacterPresence({ speaker: "NOVA", state: "SPEAKING" });
    const idle = projectCharacterPresence({ speaker: "NONE", state: "IDLE" });
    expect(speaking.activeSpeaker).toBe("NOVA");
    expect(idle.activeSpeaker).toBe("NONE");
    expect(idle.focusMode).toBe("AMBIENT");
  });

  it("fails closed for unsupported input", () => {
    expect(projectCharacterPresence({ speaker: "OWNER", state: "UNKNOWN" })).toMatchObject({
      activeSpeaker: "NONE",
      state: "PRIVACY_RESTRICTED",
      grantsAuthority: false,
    });
  });

  it("maps the required visual profiles", () => {
    expect(projectCharacterPresence({ speaker: "ONYX", state: "LISTENING" }).auraProfile.cssClass).toContain("listening-glow");
    expect(projectCharacterPresence({ speaker: "NOVA", state: "THINKING" }).auraProfile.cssClass).toContain("thinking-pulse");
    expect(projectCharacterPresence({ speaker: "ONYX", state: "SPEAKING" }).auraProfile.cssClass).toContain("speaking-glow");
    expect(projectCharacterPresence({ speaker: "NONE", state: "APPROVAL_REQUIRED" }).auraProfile.cssClass).toContain("approval-amber");
    expect(projectCharacterPresence({ speaker: "NONE", state: "PRIVACY_RESTRICTED" }).auraProfile.cssClass).toContain("privacy-shield");
    expect(projectCharacterPresence({ speaker: "NONE", state: "RECOVERING" }).auraProfile.cssClass).toContain("recovery-visualization");
  });

  it("executes the blink scheduler deterministically", () => {
    const profile = projectCharacterPresence({ speaker: "NONE", state: "IDLE" }).blinkProfile;
    expect(blinkAt(profile, 0)).toBe(true);
    expect(blinkAt(profile, profile.durationMs)).toBe(false);
    expect(blinkAt(profile, profile.intervalMs)).toBe(true);
  });

  it("executes the breathing scheduler deterministically", () => {
    const profile = projectCharacterPresence({ speaker: "NONE", state: "IDLE" }).breathingProfile;
    expect(breathingScaleAt(profile, 0)).toBe(1);
    expect(breathingScaleAt(profile, profile.durationMs / 4)).toBeGreaterThan(1);
    expect(breathingScaleAt(profile, profile.intervalMs)).toBe(1);
  });
});