import { describe, expect, it } from "vitest";
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
});