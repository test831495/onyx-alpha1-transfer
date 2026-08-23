import { describe, expect, it } from "vitest";
import { LANE_MAXIMA, LANE_STAGES, evaluateWave1StageChange } from "../src";
describe("Phase 1A.9 lane stages", () => {
  it("defines the six frozen maxima", () => { expect(LANE_STAGES).toEqual(["S0_SINGLE", "S1_FOUR", "S2_SIX", "S3_EIGHT", "S4_STABILIZE_TWO", "S5_PROMOTE_ONE"]); expect(Object.values(LANE_MAXIMA)).toEqual([1, 4, 6, 8, 2, 1]); });
  it("denies every Wave 1 stage change away from S0", () => { for (const stage of LANE_STAGES.slice(1)) expect(evaluateWave1StageChange("S0_SINGLE", stage)).toBe("DENIED"); });
});