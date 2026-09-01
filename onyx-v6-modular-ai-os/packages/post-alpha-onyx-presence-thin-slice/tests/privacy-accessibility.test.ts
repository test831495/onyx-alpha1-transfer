import { describe, expect, it } from "vitest";
import { createAccessibilityProjection, createDesktopProjection, createTvProjection, FIXTURES, orchestratePresence, projectPrivacy } from "../src/index";

describe("Presence privacy and accessibility", () => {
  it("PPT-045 shared-room privacy", () => {
    expect(projectPrivacy({ established: true, environment: "SHARED_ROOM", text: "Private project detail" })).toEqual({ mode: "SHARED_ROOM_REDACTED", text: "Private detail available on a trusted personal display.", authorizing: false });
    expect(projectPrivacy({ established: false, environment: "TRUSTED_PRIVATE", text: "detail" }).mode).toBe("PRIVACY_RESTRICTED");
    expect(projectPrivacy({ disposition: "UNKNOWN", text: "Private project detail" }).mode).toBe("PRIVACY_RESTRICTED");
    expect(projectPrivacy({ disposition: "CONFLICTING", established: true, environment: "TRUSTED_PRIVATE", text: "Private project detail" }).mode).toBe("PRIVACY_RESTRICTED");
    for (const disposition of ["MISSING", "MALFORMED"] as const) {
      expect(projectPrivacy({ disposition, text: "Private project detail" }).mode).toBe("PRIVACY_RESTRICTED");
    }
    const omitted = orchestratePresence({ request: FIXTURES.modelRequest, memory: FIXTURES.memoryRecords, tool: { projectId: "onyx", cancelled: false, available: true } });
    expect(omitted.privacyProjection.mode).toBe("PRIVACY_RESTRICTED");
    expect(omitted).toMatchObject({ modelResponses: 0, memoryProjections: 0, toolCalls: 0, responseSuppressed: true, presentationSuppressed: true, speechSuppressed: true, authorizing: false });
    expect(omitted.model.text).toBeNull();
    expect(omitted.memoryProjection).toBeNull();
    expect(omitted.toolProjection).toBeNull();
    const malformed = orchestratePresence({ request: FIXTURES.modelRequest, privacy: { text: "detail" } });
    expect(malformed.privacyProjection.mode).toBe("PRIVACY_RESTRICTED");
    expect(malformed.responseSuppressed).toBe(true);
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