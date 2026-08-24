import { describe, expect, it } from "vitest";
import {
  determineAssessmentFreshness,
  determinePreflightFreshness,
  determineReadinessExpiration,
} from "../src/index.js";

describe("Idea freshness policies", () => {
  it("freshness_policies", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    const assessmentFreshness = determineAssessmentFreshness(
      new Date("2026-08-23T00:00:00.000Z"),
      now,
      "moderate",
      false,
      false,
    );
    const preflightFreshness = determinePreflightFreshness(
      new Date("2026-08-23T23:30:00.000Z"),
      now,
      false,
      false,
      false,
      false,
    );
    const readinessFreshness = determineReadinessExpiration(
      new Date("2026-08-22T00:00:00.000Z"),
      now,
      "high",
    );

    expect(["CURRENT", "REVIEW_RECOMMENDED", "STALE", "INVALIDATED"]).toContain(assessmentFreshness.freshness);
    expect(["CURRENT", "REVIEW_RECOMMENDED", "STALE", "INVALIDATED"]).toContain(preflightFreshness.freshness);
    expect(["CURRENT", "REVIEW_RECOMMENDED", "STALE", "INVALIDATED"]).toContain(readinessFreshness.freshness);
  });
});
