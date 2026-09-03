import { describe, expect, it } from "vitest";
import { WORLD_IDS, getWorld, worldStateIntent } from "../src/index.js";

describe("ambient experience foundation", () => {
  it("registers both canonical worlds and a safe fallback", () => {
    expect(WORLD_IDS).toEqual(["OPERATIONS_CENTER", "FUTURE_CITY"]);
    expect(getWorld("OPERATIONS_CENTER").atmosphere).toContain("mission-control");
    expect(getWorld("FUTURE_CITY").lighting).toContain("violet");
    expect(getWorld("UNKNOWN")).toEqual(getWorld("SAFE_FALLBACK"));
  });

  it("reacts deterministically to every state without operational claims", () => {
    for (const world of WORLD_IDS) {
      for (const state of ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"] as const) {
        const result = worldStateIntent(world, state);
        expect(result.state).toBe(state);
        expect(result.externalData).toBe(false);
      }
    }
  });
});
