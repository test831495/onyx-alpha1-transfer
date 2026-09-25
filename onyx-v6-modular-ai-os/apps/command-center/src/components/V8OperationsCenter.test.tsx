import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PRESENCE_STATES } from "@onyx/operations-center-presence-runtime/PresenceState";
import { HeroCore } from "./HeroCore";
import { V8OperationsCenter } from "./V8OperationsCenter";

function renderState(state: (typeof PRESENCE_STATES)[number], council = false): string {
  return renderToStaticMarkup(
    <V8OperationsCenter
      state={state}
      characterStage={<HeroCore
        mode="onyx"
        state={state}
        presenceSpeaker={council ? "COUNCIL" : undefined}
        quality="balanced"
        lowPower={false}
        onSwitch={() => undefined}
        onAction={() => undefined}
      />}
      intentLayer={<form className="glass-command"><input aria-label="Unified intent" /></form>}
    />,
  );
}

describe("V8 Character-First Operations Center", () => {
  it.each(PRESENCE_STATES)("projects %s into the cinematic world", (state) => {
    const html = renderState(state);
    expect(html).toContain(`v8-state-${state.toLowerCase()}`);
    expect(html).toContain(`data-state="${state}"`);
    expect(html).toContain('data-world="future-city-local"');
    expect(html).toContain('data-asset-id="NOVA_MASTER_V2"');
    expect(html).toContain('data-asset-id="ONYX_MASTER_V2"');
  });

  it("starts centered with System Ready and Awaiting Command", () => {
    const html = renderState("IDLE");
    expect(html).toContain("System Ready");
    expect(html).toContain("Awaiting Command");
    expect(html).toContain('data-speaker="NONE"');
  });

  it("renders Council as balanced and non-authorizing", () => {
    const html = renderState("THINKING", true);
    expect(html).toContain('data-speaker="COUNCIL"');
    expect(html).toContain("Council Active");
    expect(html).toContain('data-grants-authority="false"');
    expect(html).toContain('data-council-authority="false"');
  });

  it("keeps the default scene free of dashboard and application chrome", () => {
    const html = renderState("IDLE");
    expect(html).not.toContain("functional-header");
    expect(html).not.toContain("functional-footer");
    expect(html).not.toContain("app-card-shell");
    expect(html).not.toContain("activity-strip");
    expect(html).not.toContain("Telemetry");
  });

  it("defines desktop, TV, tablet, mobile, reduced-motion, and shared-room treatments", () => {
    const css = readFileSync(new URL("../styles/V8OperationsCenter.css", import.meta.url), "utf8");
    expect(css).toContain("@media (min-width: 1600px)");
    expect(css).toContain("@media (max-width: 1024px)");
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (min-width: 1280px) and (hover: none)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) 6rem minmax(0, 1fr)");
  });
});