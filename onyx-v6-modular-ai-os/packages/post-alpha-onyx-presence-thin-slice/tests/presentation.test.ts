import { describe, expect, it } from "vitest";
import { createAmbientWorldFixture, createDesktopProjection, createPresentationFixture, createTvProjection, replaceRenderer } from "../src/index";

describe("ONYX presentation projections", () => {
  it("PPT-040 ONYX presentation fixture", () => {
    expect(createPresentationFixture("IDLE")).toMatchObject({ character: "ONYX", role: "STRATEGIC_COMPANION_AND_INTEGRATOR", syntheticVisual: true, authorizing: false });
  });

  it("PPT-041 semantic state projection", () => {
    expect(createPresentationFixture("SPEAKING").layers.semanticState.state).toBe("SPEAKING");
    expect(createPresentationFixture("SPEAKING").operationalTruth).toBe(false);
  });

  it("PPT-042 desktop projection", () => {
    expect(createDesktopProjection("THINKING")).toMatchObject({ device: "DESKTOP", textInputRequired: true, captions: true, continuityUsedCue: true, stopControl: true, ownerPrivate: true });
  });

  it("PPT-043 TV first-class inactive projection", () => {
    expect(createTvProjection("SPEAKING")).toMatchObject({ interfaceClass: "PRESENCE_INTERFACE", mirroring: false, adapterActive: false, runtimeActivation: false, tenFootReadable: true, reducedDensity: true });
  });

  it("PPT-044 canonical identity desktop/TV", () => {
    expect(createDesktopProjection("IDLE").identity).toEqual(createTvProjection("IDLE").identity);
  });

  it("PPT-049 renderer replacement invariant", () => {
    expect(replaceRenderer(createPresentationFixture("THINKING"), "TEXT_ONLY")).toMatchObject({ semanticState: "THINKING", authorizing: false, operationalTruth: false });
  });

  it("PPT-050 ambient world presentation-only", () => {
    expect(createAmbientWorldFixture()).toMatchObject({ worldId: "OPERATIONS_CENTER_REFERENCE_WORLD", classification: "REFERENCE_ONLY", presentationOnly: true, operationalTruthEffect: false, locationWeatherInput: false, runtimeAssetDependency: false });
  });

  it("PPT-051 ambient world reduced-motion fallback", () => {
    expect(createAmbientWorldFixture()).toMatchObject({ reducedMotionVariant: "STATIC_LIGHTING", textOnlyFallback: "Operations center reference world" });
  });
});