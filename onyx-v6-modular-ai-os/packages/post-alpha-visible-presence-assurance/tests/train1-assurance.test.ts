import { describe, expect, it } from "vitest";
import { assureTrain1, PERFORMANCE_BUDGETS, TRAIN1_CHARACTERS, TRAIN1_STATES, TRAIN1_WORLDS, type LaneEvidence } from "../src/train1-assurance.js";

describe("Train 1 additive assurance", () => {
  it("covers the bounded cinematic foundation", () => {
    expect(TRAIN1_STATES).toHaveLength(8);
    expect(TRAIN1_CHARACTERS).toEqual(["ONYX", "NOVA"]);
    expect(TRAIN1_WORLDS).toEqual(["OPERATIONS_CENTER", "FUTURE_CITY"]);
    expect(PERFORMANCE_BUDGETS.measured).toBe(false);
  });

  it("accepts only validated lane evidence and excludes lockfile drift", () => {
    const lanes: LaneEvidence[] = ["runtime", "renderer", "world", "tv", "assure"].map((lane) => ({ lane, allowlist: lane, changedPaths: [`packages/${lane}/src/index.ts`], lockfileDrift: "accepted-importer-only", tests: "PASS", typecheck: "PASS", flags: "OFF", activation: "NONE" }));
    expect(assureTrain1(lanes).accepted).toBe(true);
    expect(assureTrain1([{ ...lanes[0]!, changedPaths: ["pnpm-lock.yaml"] }, ...lanes.slice(1)]).accepted).toBe(false);
  });
});
