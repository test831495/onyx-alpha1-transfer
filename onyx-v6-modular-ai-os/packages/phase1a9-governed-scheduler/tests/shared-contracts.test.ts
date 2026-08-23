import { describe, expect, it } from "vitest";
import { assertSchedulerAuthorityBoundary, defaultSchedulerAuthorityBoundary, defaultSchedulerConfig, defaultSchedulerSafetyProfile, assertSchedulerSafetyProfile } from "../src";
describe("Phase 1A.9 shared contracts", () => {
  it("is disabled, bounded, and owns no predecessor authority", () => {
    const config = defaultSchedulerConfig();
    expect(config.enabled).toBe(false); expect(config.activeLaneStage).toBe("S0_SINGLE"); expect(config.authoringLaneLimit).toBe(1); expect(config.promotionLaneLimit).toBe(1);
    const authority = defaultSchedulerAuthorityBoundary(); assertSchedulerAuthorityBoundary(authority);
    expect(authority.schedulerOwnedStateClasses).not.toContain("workflow-authority"); expect(authority.schedulerOwnedStateClasses).not.toContain("runtime-authority");
    const safety = defaultSchedulerSafetyProfile(); assertSchedulerSafetyProfile(safety); expect(Object.values(safety).every((value) => value === false)).toBe(true);
  });
});