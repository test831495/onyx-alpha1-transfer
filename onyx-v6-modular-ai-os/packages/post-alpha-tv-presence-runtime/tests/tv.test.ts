import { describe, expect, it } from "vitest";
import { TV_PROFILE, composeTv, moveFocus } from "../src/index.js";

describe("TV-first presence runtime", () => {
  it("provides readable safe-zone composition and deterministic focus", () => {
    expect(TV_PROFILE.readabilityMinimum).toBeGreaterThanOrEqual(24);
    expect(composeTv("ONYX", "OPERATIONS_CENTER", "IDLE").safeZones).toHaveLength(4);
    expect(moveFocus("primary", "next").focus).toBe("supporting");
    expect(moveFocus("primary", "previous").accepted).toBe(false);
  });

  it("minimizes shared-room privacy and keeps device adaptation non-authorizing", () => {
    const composition = composeTv("NOVA", "FUTURE_CITY", "PRIVACY_RESTRICTED", { sharedRoom: true });
    expect(composition.disclosure).toBe("minimized");
    expect(composition.mutatesAccount).toBe(false);
    expect(composition.usesCasting).toBe(false);
  });
});
