import { describe, expect, it } from "vitest";
import { createAccessibilityProjection, createDesktopProjection, createTvProjection, projectPrivacy } from "../src/index";

describe("Presence privacy and accessibility", () => {
  it("PPT-045 shared-room privacy", () => {
    expect(projectPrivacy({ established: true, environment: "SHARED_ROOM", text: "Private project detail" })).toEqual({ mode: "SHARED_ROOM_REDACTED", text: "Private detail available on a trusted personal display.", authorizing: false });
    expect(projectPrivacy({ established: false, environment: "TRUSTED_PRIVATE", text: "detail" }).mode).toBe("PRIVACY_RESTRICTED");
    expect(projectPrivacy({ disposition: "UNKNOWN", text: "Private project detail" }).mode).toBe("PRIVACY_RESTRICTED");
    expect(projectPrivacy({ disposition: "CONFLICTING", established: true, environment: "TRUSTED_PRIVATE", text: "Private project detail" }).mode).toBe("PRIVACY_RESTRICTED");
  });

  it("PPT-046 captions", () => {
    expect(createAccessibilityProjection("SPEAKING")).toMatchObject({ captions: true, captionTiming: "DETERMINISTIC_FIXTURE", muteProjection: true });
  });

  it("PPT-047 reduced motion equivalence", () => {
    const standard = createAccessibilityProjection("THINKING", false);
    const reduced = createAccessibilityProjection("THINKING", true);
    expect(reduced.semanticDescription).toBe(standard.semanticDescription);
    expect(reduced.reducedMotion).toBe(true);
  });

  it("PPT-048 high contrast/text fallback", () => {
    const projection = createAccessibilityProjection("UNDERSTANDING", true);
    expect(projection).toMatchObject({ highContrast: true, textOnlyFallback: true, keyboardNavigation: true, remoteFocus: true, noColorOnlyMeaning: true, stopControl: true });
    expect(createDesktopProjection("UNDERSTANDING").stateDescription).toBe(createTvProjection("UNDERSTANDING").stateDescription);
  });
});