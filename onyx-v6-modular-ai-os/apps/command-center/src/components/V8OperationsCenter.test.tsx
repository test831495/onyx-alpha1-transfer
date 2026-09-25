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

describe("Mobile compact portrait speaker cards", () => {
  const render = (activeSpeaker: "ONYX" | "NOVA" | "COUNCIL" | "NONE", state: (typeof PRESENCE_STATES)[number] = "IDLE") =>
    renderToStaticMarkup(
      <V8OperationsCenter
        state={state}
        activeSpeaker={activeSpeaker}
        caption="Here is the current answer."
        characterStage={<HeroCore
          mode="onyx"
          state={state}
          quality="balanced"
          lowPower={false}
          onSwitch={() => undefined}
          onAction={() => undefined}
        />}
        intentLayer={<form className="glass-command"><input aria-label="Unified intent" /></form>}
      />,
    );

  it("renders the canonical ONYX portrait", () => {
    expect(render("NONE")).toContain('src="/heroes/onyx-original.jpeg"');
  });

  it("renders the canonical NOVA portrait", () => {
    expect(render("NONE")).toContain('src="/heroes/nova-original.jpeg"');
  });

  it("keeps both portraits visible simultaneously regardless of active speaker", () => {
    const html = render("ONYX");
    expect(html).toContain('src="/heroes/onyx-original.jpeg"');
    expect(html).toContain('src="/heroes/nova-original.jpeg"');
  });

  it("provides accessible alt text for each portrait", () => {
    const html = render("NONE");
    expect(html).toContain('alt="ONYX portrait"');
    expect(html).toContain('alt="NOVA portrait"');
  });

  it("highlights ONYX as active without hiding NOVA", () => {
    const html = render("ONYX");
    expect(html).toMatch(/v8-speaker-card v8-speaker-onyx is-active/);
    expect(html).toMatch(/v8-speaker-card v8-speaker-nova is-standby/);
  });

  it("highlights NOVA as active without hiding ONYX", () => {
    const html = render("NOVA");
    expect(html).toMatch(/v8-speaker-card v8-speaker-nova is-active/);
    expect(html).toMatch(/v8-speaker-card v8-speaker-onyx is-standby/);
  });

  it("keeps both cards in standby when no speaker is active", () => {
    const html = render("NONE");
    expect(html).toMatch(/v8-speaker-card v8-speaker-onyx is-standby/);
    expect(html).toMatch(/v8-speaker-card v8-speaker-nova is-standby/);
  });

  it.each(["LISTENING", "THINKING", "SPEAKING", "RECOVERING"] as const)("represents the %s state on the active card", (state) => {
    const html = render("ONYX", state);
    expect(html).toContain(state.toLowerCase());
  });

  it("renders the conversation region with the current caption directly after the speaker cards", () => {
    const html = render("ONYX");
    const speakerIndex = html.indexOf("v8-mobile-speakers");
    const conversationIndex = html.indexOf("v8-conversation-region");
    expect(speakerIndex).toBeGreaterThan(-1);
    expect(conversationIndex).toBeGreaterThan(speakerIndex);
    expect(html).toContain("Here is the current answer.");
  });

  it("keeps activeSpeaker optional and defaulted to NONE for existing callers", () => {
    const html = renderToStaticMarkup(
      <V8OperationsCenter
        state="IDLE"
        characterStage={<span />}
        intentLayer={<span />}
      />,
    );
    expect(html).toMatch(/v8-speaker-card v8-speaker-onyx is-standby/);
  });
});

describe("Mobile layout CSS budget", () => {
  const css = readFileSync(new URL("../styles/V8OperationsCenter.css", import.meta.url), "utf8");

  it("clamps portrait size to a 120px maximum with an 88px minimum floor", () => {
    expect(css).toContain("clamp(88px, 24vw, 120px)");
  });

  it("increases portrait size modestly for small tablets", () => {
    expect(css).toContain("clamp(112px, 14vw, 144px)");
  });

  it("never sizes a mobile portrait below 88px", () => {
    const widths = [...css.matchAll(/\.v8-speaker-portrait\s*\{[^}]*width:\s*clamp\((\d+)px/g), ...css.matchAll(/width:\s*clamp\((\d+)px,[^)]*\);\s*height:\s*clamp\(\1px/g)]
      .map((match) => Number(match[1]));
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((min) => min >= 88)).toBe(true);
  });

  it("defines the mobile flex stack that keeps the visible portrait strip above the conversation region", () => {
    expect(css).toContain(".v8-mobile-shell {\n    display: flex;\n    flex-direction: column;");
    expect(css).toMatch(/\.v8-mobile-speakers\s*\{[^}]*display:\s*flex;/);
    expect(css).toMatch(/\.v8-conversation-region\s*\{[^}]*flex:\s*1\s+1\s+50vh;/);
    expect(css).toMatch(/\.v8-conversation-region\s*\{[^}]*min-height:\s*50vh;/);
    expect(css).toMatch(/\.v8-conversation-region\s*\{[^}]*overflow-y:\s*auto;/);
  });

  it("removes the stage from flow and leaves only the compact mobile stack under the breakpoint", () => {
    expect(css).toContain("@media (max-width: 900px)");
    const mobileBlockStart = css.indexOf("@media (max-width: 900px)");
    const worldHideRuleIndex = css.indexOf(".v8-world { display: none; }");
    const stageHideRuleIndex = css.indexOf(".v8-character-stage { display: none; }");
    expect(mobileBlockStart).toBeGreaterThan(-1);
    expect(worldHideRuleIndex).toBeGreaterThan(mobileBlockStart);
    expect(stageHideRuleIndex).toBeGreaterThan(mobileBlockStart);
  });

  it("defines phone landscape and small-tablet treatments", () => {
    expect(css).toContain("@media (max-width: 900px) and (orientation: landscape)");
    expect(css).toContain("@media (min-width: 701px) and (max-width: 900px)");
  });
});