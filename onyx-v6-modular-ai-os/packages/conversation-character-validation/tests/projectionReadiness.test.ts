import { describe, it, expect } from "vitest";
import { buildOperationsCenterValidationProjection } from "../src/index.js";

describe("G7 Operations Center Projection Readiness Contract (B4D)", () => {
  it("builds pure non-authorizing projection metadata for future Operations Center integration", () => {
    const projection = buildOperationsCenterValidationProjection({
      fixtureId: "GC-REPLAY-ARCH-REVIEW-001",
      lifecycleState: "SPEAKER_VALIDATED",
      selectedSpeakerClass: "ONYX",
      selectionReasonClass: "ONYX_ARCHITECTURE_STRATEGY_PREFERENCE",
      councilEligibilityClass: "NOT_ELIGIBLE",
      characterRoleClass: "CLOUD_AUGMENTED_LOCAL_CORE",
      emotionalContextClass: "NORMAL",
      adaptationClasses: ["STANDARD"],
      truthSourceClass: "DETERMINISTIC_LOCAL",
      uncertaintyClass: "KNOWN",
      responseClass: "RECOMMENDATION",
      privacyResult: "ELIGIBLE",
      validationDisposition: "PASSED",
      displaySpokenParityClass: "SEMANTICALLY_ALIGNED",
    });

    expect(projection.projectionVersion).toBe("B4D-1");
    expect(projection.fixtureId).toBe("GC-REPLAY-ARCH-REVIEW-001");
    expect(projection.lifecycleState).toBe("SPEAKER_VALIDATED");
    expect(projection.returnToOperationsCenterEligible).toBe(true);

    // STRICT NON-AUTHORITY & NO-SIDE-EFFECT INVARIANTS
    expect(projection.nonAuthority).toBe(true);
    expect(projection.runtimeActivationAuthorized).toBe(false);
    expect(projection.UIChangeAuthorized).toBe(false);
    expect(projection.speakerRenderAuthorized).toBe(false);
    expect(projection.wakeWordAuthorized).toBe(false);
    expect(projection.applicationExecutionAuthorized).toBe(false);
    expect(projection.replayEvidence).toBeDefined();
  });
});
