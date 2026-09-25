import { describe, expect, it } from "vitest";
import { APPROVED_CHARACTER_ARTWORK, CHARACTER_MOTION_PROFILES, nextBlinkDelay, renderCharacter } from "../CharacterRenderer.js";
import { renderCouncil } from "../CouncilRenderer.js";
import { PresenceShell } from "../PresenceShell.js";
import { projectCharacterPresence } from "../ProjectionEngine.js";
import { renderReactor } from "../ReactorRenderer.js";
import { PRESENCE_STATES } from "../PresenceState.js";

describe("HTML presence renderers", () => {
  it("renders approved local ONYX and NOVA artwork", () => {
    const projection = projectCharacterPresence({ speaker: "ONYX", state: "IDLE" });
    expect(APPROVED_CHARACTER_ARTWORK).toEqual({
      ONYX: { id: "ONYX_MASTER_V2", source: "/heroes/onyx-original.jpeg" },
      NOVA: { id: "NOVA_MASTER_V2", source: "/heroes/nova-original.jpeg" },
    });
    expect(renderCharacter("ONYX", projection)).toContain('src="/heroes/onyx-original.jpeg"');
    expect(renderCharacter("NOVA", projection)).toContain('src="/heroes/nova-original.jpeg"');
    expect(renderCharacter("ONYX", projection)).toContain('data-asset-id="ONYX_MASTER_V2"');
    expect(renderCharacter("NOVA", projection)).toContain('data-asset-id="NOVA_MASTER_V2"');
  });

  it("keeps both characters visible when no speaker is active", () => {
    const html = PresenceShell({ speaker: "NONE", state: "IDLE" });
    expect(html).toContain('data-character="ONYX"');
    expect(html).toContain('data-character="NOVA"');
    expect(html).toContain('data-speaker="NONE"');
  });

  it("uses restrained character-specific breathing and natural local blink ranges", () => {
    expect(CHARACTER_MOTION_PROFILES.ONYX.breathingScale).toBeLessThan(CHARACTER_MOTION_PROFILES.NOVA.breathingScale);
    expect(nextBlinkDelay("ONYX", 0)).toBe(4_000);
    expect(nextBlinkDelay("ONYX", 1)).toBe(8_000);
    expect(nextBlinkDelay("NOVA", 0)).toBe(3_000);
    expect(nextBlinkDelay("NOVA", 1)).toBe(7_000);
  });

  it.each([
    ["IDLE", "SYSTEM_READY"],
    ["LISTENING", "LISTENING"],
    ["UNDERSTANDING", "UNDERSTANDING"],
    ["THINKING", "THINKING"],
    ["SPEAKING", "SPEAKING"],
  ] as const)("renders the %s reactor state", (state, mode) => {
    const projection = projectCharacterPresence({ speaker: "ONYX", state });
    expect(renderReactor(projection.reactorProfile)).toContain(`data-reactor-state="${mode}"`);
  });

  it("renders the COUNCIL reactor state", () => {
    const projection = projectCharacterPresence({ speaker: "COUNCIL", state: "THINKING" });
    expect(renderReactor(projection.reactorProfile)).toContain('data-reactor-state="COUNCIL"');
  });

  it("renders speaker, state, and reasoning-stage captions", () => {
    const html = PresenceShell({ speaker: "NOVA", state: "UNDERSTANDING" });
    expect(html).toContain("Speaker: nova");
    expect(html).toContain("State: understanding");
    expect(html).toContain("Reasoning stage: understanding");
  });

  it("renders Council as a visual-only advisory representation", () => {
    const active = projectCharacterPresence({ speaker: "COUNCIL", state: "UNDERSTANDING" });
    const inactive = projectCharacterPresence({ speaker: "NONE", state: "IDLE" });
    expect(renderCouncil(active.councilProfile)).toContain('data-advisory-only="true"');
    expect(renderCouncil(active.councilProfile)).toContain('data-grants-authority="false"');
    expect(renderCouncil(active.councilProfile)).toContain("Council Active");
    expect(renderCouncil(inactive.councilProfile)).toContain("hidden");
  });

  it.each(PRESENCE_STATES)("renders %s without a network dependency", (state) => {
    const html = PresenceShell({ speaker: "NOVA", state });
    expect(html).toContain(`data-state="${state}"`);
    expect(html).not.toMatch(/https?:|fetch\(|XMLHttpRequest|WebSocket/);
    expect(html).toContain("presence-blink");
    expect(html).toContain("presence-breathe");
  });

  it("renders the fail-closed privacy shell", () => {
    const html = PresenceShell(null);
    expect(html).toContain('data-state="PRIVACY_RESTRICTED"');
    expect(html).toContain("privacy-shield");
  });
});