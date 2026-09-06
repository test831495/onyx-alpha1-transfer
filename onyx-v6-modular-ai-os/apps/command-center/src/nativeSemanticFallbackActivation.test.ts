import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroCore } from "./components/HeroCore";
import {
  ACTIVATION_CONTROL_ID,
  AUTHORIZED_PRIVATE_ALPHA_STATE,
  NATIVE_SEMANTIC_STATES,
  PRIVATE_ALPHA_BUILD_ACTIVATION,
  mapCoreStateToSemanticState,
  performanceTierForQuality,
  resolveActivationState,
  projectNativeSemanticFallback,
} from "./nativeSemanticFallbackActivation";

describe("native semantic fallback activation", () => {
  it("is closed, source-controlled, and off by default", () => {
    expect(ACTIVATION_CONTROL_ID).toBe(
      "ONYX_NOVA_NATIVE_SEMANTIC_FALLBACK_VISUAL_ACTIVATION_V1",
    );
    expect(resolveActivationState()).toBe("OFF");
    expect(resolveActivationState("unexpected")).toBe("OFF");
    expect(PRIVATE_ALPHA_BUILD_ACTIVATION.state).toBe(
      AUTHORIZED_PRIVATE_ALPHA_STATE,
    );
  });

  it("supports every canonical state for both characters without authority", () => {
    expect(NATIVE_SEMANTIC_STATES).toHaveLength(8);
    for (const character of ["ONYX", "NOVA"] as const) {
      for (const state of NATIVE_SEMANTIC_STATES) {
        const projection = projectNativeSemanticFallback(
          PRIVATE_ALPHA_BUILD_ACTIVATION,
          character,
          state,
        );
        expect(projection.character).toBe(character);
        expect(projection.state).toBe(state);
        expect(projection.authority).toBe(false);
        expect(projection.provider).toBe("none");
        expect(projection.motion).toBeDefined();
      }
    }
  });

  it("maps unknown and malformed input to a safe recovering state", () => {
    expect(mapCoreStateToSemanticState("unknown")).toBe("RECOVERING");
    expect(
      projectNativeSemanticFallback(
        PRIVATE_ALPHA_BUILD_ACTIVATION,
        "NOVA",
        "not-a-state",
      ).state,
    ).toBe("RECOVERING");
  });

  it("disables independently and preserves a text-safe projection", () => {
    const projection = projectNativeSemanticFallback(
      { ...PRIVATE_ALPHA_BUILD_ACTIVATION, state: "OFF" },
      "ONYX",
      "THINKING",
    );
    expect(projection.enabled).toBe(false);
    expect(projection.fallback).toBe(true);
    expect(projection.label).toContain("ONYX");
  });

  it("applies the existing governor before semantic presentation", () => {
    expect(performanceTierForQuality("full")).toBe("PREMIUM_CINEMATIC");
    expect(performanceTierForQuality("balanced")).toBe("BALANCED");
    expect(performanceTierForQuality("low")).toBe("LIGHTWEIGHT");
    expect(performanceTierForQuality("full", true)).toBe("REDUCED_MOTION");
  });

  it("renders an accessible semantic label without exposing internal data attributes", () => {
    const html = renderToStaticMarkup(
      React.createElement(HeroCore, {
        mode: "onyx",
        state: "thinking",
        quality: "balanced",
        lowPower: false,
        onSwitch: () => undefined,
        onAction: () => undefined,
      }),
    );
    expect(html).toContain('class="native-semantic-label"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("native-fallback-thinking");
    expect(html).not.toContain("data-native-fallback");
    expect(html).not.toContain("data-truth-label");
    expect(html).toContain("Tap core for actions");
  });

  it("renders the enabled production HeroCore path with canonical visible states for both characters", () => {
    for (const mode of ["onyx", "nova"] as const) {
      const executingHtml = renderToStaticMarkup(
        React.createElement(HeroCore, {
          mode,
          state: "executing",
          quality: "balanced",
          lowPower: false,
          onSwitch: () => undefined,
          onAction: () => undefined,
        }),
      );
      const errorHtml = renderToStaticMarkup(
        React.createElement(HeroCore, {
          mode,
          state: "error",
          quality: "balanced",
          lowPower: false,
          onSwitch: () => undefined,
          onAction: () => undefined,
        }),
      );

      expect(executingHtml).toContain(">UNDERSTANDING</b>");
      expect(executingHtml).toContain("native-fallback-understanding");
      expect(executingHtml).toContain(`${mode.toUpperCase()} understanding`);
      expect(executingHtml).not.toContain(">EXECUTING</b>");
      expect(executingHtml).not.toContain("core-executing");

      expect(errorHtml).toContain(">RECOVERING</b>");
      expect(errorHtml).toContain("native-fallback-recovering");
      expect(errorHtml).toContain(`${mode.toUpperCase()} recovering`);
      expect(errorHtml).not.toContain(">ERROR</b>");
      expect(errorHtml).not.toContain(">ATTENTION</b>");
      expect(errorHtml).not.toContain("core-error");
    }
  });

  it("makes approval, privacy, understanding, and recovery canonical states visibly renderable", () => {
    for (const state of [
      "UNDERSTANDING",
      "APPROVAL_REQUIRED",
      "PRIVACY_RESTRICTED",
      "RECOVERING",
    ] as const) {
      const html = renderToStaticMarkup(
        React.createElement(HeroCore, {
          mode: "onyx",
          state,
          quality: "balanced",
          lowPower: false,
          onSwitch: () => undefined,
          onAction: () => undefined,
        }),
      );
      const visibleLabel = state.replace("_", " ");

      expect(html).toContain(`>${visibleLabel}</b>`);
      expect(html).toContain(`core-${state.toLowerCase()}`);
      expect(html).toContain(`native-fallback-${state.toLowerCase()}`);
      expect(html).toContain(`ONYX ${visibleLabel.toLowerCase()}`);
    }
  });

  it("restores the stable legacy shell when native semantic activation is off", () => {
    const html = renderToStaticMarkup(
      React.createElement(HeroCore, {
        mode: "nova",
        state: "executing",
        quality: "balanced",
        lowPower: false,
        activationControl: { ...PRIVATE_ALPHA_BUILD_ACTIVATION, state: "OFF" },
        onSwitch: () => undefined,
        onAction: () => undefined,
      }),
    );

    expect(html).toContain(">EXECUTING</b>");
    expect(html).toContain("core-executing");
    expect(html).toContain("native-fallback-off");
    expect(html).not.toContain("native-semantic-label");
    expect(html).not.toContain("native-fallback-understanding");
  });

  it("normalizes canonical semantic input when activation is off", () => {
    const html = renderToStaticMarkup(
      React.createElement(HeroCore, {
        mode: "nova",
        state: "APPROVAL_REQUIRED",
        quality: "balanced",
        lowPower: false,
        activationControl: { ...PRIVATE_ALPHA_BUILD_ACTIVATION, state: "OFF" },
        onSwitch: () => undefined,
        onAction: () => undefined,
      }),
    );

    expect(html).toContain(">APPROVAL REQUIRED</b>");
    expect(html).toContain("core-approval-required");
    expect(html).toContain("native-fallback-off");
    expect(html).not.toContain("native-semantic-label");
  });

  it("scopes privacy and approval colors to the semantic label only", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toContain(
      ".hero-core.native-fallback-privacy_restricted .hero-status-row .native-semantic-label",
    );
    expect(css).toContain(
      ".hero-core.native-fallback-approval_required .hero-status-row .native-semantic-label",
    );
    expect(css).not.toContain(
      ".hero-core.native-fallback-privacy_restricted .hero-status-row small",
    );
    expect(css).not.toContain(
      ".hero-core.native-fallback-approval_required .hero-status-row small",
    );
  });

  it("uses public workspace package imports", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/nativeSemanticFallbackActivation.ts"),
      "utf8",
    );
    expect(source).toContain('"@onyx/post-alpha-performance-governor"');
    expect(source).toContain('"@onyx/post-alpha-character-renderer-native"');
    expect(source).not.toMatch(/\.\.\/\.\.\/\.\.\/\.\.\/packages\//);
  });
});