import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PRESENCE_SPEAKERS, PRESENCE_STATES } from "@onyx/operations-center-presence-runtime/PresenceState";
import { HeroCore } from "./HeroCore";

function render(state: (typeof PRESENCE_STATES)[number], speaker?: (typeof PRESENCE_SPEAKERS)[number]): string {
  return renderToStaticMarkup(
    <HeroCore
      mode={speaker === "NOVA" ? "nova" : "onyx"}
      state={state}
      presenceSpeaker={speaker}
      quality="balanced"
      lowPower={false}
      onSwitch={() => undefined}
      onAction={() => undefined}
    />,
  );
}

describe("living Operations Center presence integration", () => {
  it.each(PRESENCE_STATES)("renders the %s state offline", (state) => {
    const html = render(state, "ONYX");
    expect(html).toContain(`data-state="${state}"`);
    expect(html).toContain('data-offline-capable="true"');
    expect(html).toContain('data-asset-id="ONYX_MASTER_V2"');
    expect(html).toContain('data-asset-id="NOVA_MASTER_V2"');
    expect(html).not.toMatch(/https?:|fetch\(|XMLHttpRequest|WebSocket/);
  });

  it.each(PRESENCE_SPEAKERS)("renders the %s speaker transition", (speaker) => {
    const html = render("LISTENING", speaker);
    expect(html).toContain(`data-speaker="${speaker}"`);
    expect(html).toContain(`Speaker: ${speaker.toLowerCase()}`);
  });

  it("returns an idle character to center", () => {
    const html = render("IDLE");
    expect(html).toContain('data-speaker="NONE"');
    expect(html).toContain("character-ambient");
    expect(html).toContain("reactor-system-ready");
  });

  it("synchronizes Council focus and reactor without granting authority", () => {
    const html = render("THINKING", "COUNCIL");
    expect(html).toContain('data-reactor-state="COUNCIL"');
    expect(html).toContain("council-active");
    expect(html).toContain('data-grants-authority="false"');
  });

  it("keeps blink and breathing schedules active offline", () => {
    const html = render("IDLE", "NONE");
    expect(html).toContain("blink-scheduler");
    expect(html).toContain("breathing-scheduler");
    expect(html).toContain("presence-blink");
    expect(html).toContain("presence-breathe");
  });

  it("shows only visual speaker, state, and reasoning-stage captions", () => {
    const html = render("SPEAKING", "NOVA");
    expect(html).toContain("Speaker: nova");
    expect(html).toContain("State: speaking");
    expect(html).toContain("Reasoning stage: speaking");
  });
});