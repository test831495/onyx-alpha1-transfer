import { describe, expect, it } from "vitest";
import { auditSecuritySurface, auditTestMatrix, recommendRelease, TEST_IDS } from "../src/validation";

describe("Phase 1A.9 validator", () => {
  it("audits exactly T01-T40", () => expect(TEST_IDS).toHaveLength(40));
  it("rejects an unmapped test ID", () => expect(auditTestMatrix({}).passed).toBe(false));
  it("blocks security findings", () => expect(auditSecuritySurface({ "x.ts": "fetch('https://example.invalid')" }).passed).toBe(false));
  it("blocks unsafe readiness and remains deterministic", () => {
    const input = { acceptancePassed: false, testMatrixPassed: true, simulationsPassed: true, securityPassed: true, evidencePassed: true, predecessorPassed: false, authorityPassed: true, schedulerEnabled: false, promotionExecutable: false, criticalOrHighIssues: 0, knownIssueClassified: true };
    expect(recommendRelease(input)).toEqual(recommendRelease(input));
    expect(recommendRelease(input).recommendation).toBe("CONDITIONALLY_READY_FOR_WAVE_5C");
    expect(recommendRelease({ ...input, schedulerEnabled: true }).recommendation).toBe("CONDITIONALLY_READY_FOR_WAVE_5C");
  });
});