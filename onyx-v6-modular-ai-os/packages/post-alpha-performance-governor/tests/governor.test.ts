import { describe, expect, it } from "vitest";
import { DEGRADATION_ORDER, choosePerformanceTier, tierPreservesCriticalStates } from "../src/index";

const healthy = { fps: 60, frameTimeMs: 16, reducedMotion: false, tv: false, memoryPressure: false };

describe("Performance Governor", () => {
  it("honors reduced motion as a hard ceiling", () => {
    expect(choosePerformanceTier({ fps: 60, frameTimeMs: 16, reducedMotion: true, tv: false, memoryPressure: false }, "PREMIUM_CINEMATIC").tier).toBe("REDUCED_MOTION");
  });
  it("degrades under pressure and recovers with hysteresis", () => {
    expect(choosePerformanceTier({ fps: 20, frameTimeMs: 50, reducedMotion: false, tv: false, memoryPressure: true }, "PREMIUM_CINEMATIC").tier).toBe("STATIC_ALIVE_FALLBACK");
    expect(choosePerformanceTier({ fps: 60, frameTimeMs: 16, reducedMotion: false, tv: false, memoryPressure: false }, "LIGHTWEIGHT").tier).toBe("LIGHTWEIGHT");
  });
});

describe("T2-PERFORMANCE-001 tier boundaries", () => {
  it("T2-PERFORMANCE-001-POS: each pressure band maps to a stable tier", () => {
    expect(choosePerformanceTier(healthy, "PREMIUM_CINEMATIC").tier).toBe("PREMIUM_CINEMATIC");
    expect(choosePerformanceTier({ ...healthy, fps: 50, frameTimeMs: 22 }, "PREMIUM_CINEMATIC").tier).toBe("BALANCED");
    expect(choosePerformanceTier({ ...healthy, fps: 30, frameTimeMs: 33 }, "PREMIUM_CINEMATIC").tier).toBe("LIGHTWEIGHT");
    expect(choosePerformanceTier({ ...healthy, fps: 20, frameTimeMs: 50 }, "PREMIUM_CINEMATIC").tier).toBe("REDUCED_MOTION");
  });

  it("T2-PERFORMANCE-001-NEG: malformed signals fall back while staying alive", () => {
    const malformed = choosePerformanceTier({ nope: true }, "PREMIUM_CINEMATIC");
    expect(malformed.tier).toBe("STATIC_ALIVE_FALLBACK");
    expect(malformed.alive).toBe(true);
    expect(malformed.reasons).toContain("MALFORMED_SIGNALS");
    expect(choosePerformanceTier(null, null).alive).toBe(true);
  });

  it("never reports a dead presence and always preserves semantic state", () => {
    for (const signals of [healthy, { ...healthy, networkOffline: true }, { ...healthy, fps: 5, frameTimeMs: 200, memoryPressure: true }]) {
      const decision = choosePerformanceTier(signals, "PREMIUM_CINEMATIC");
      expect(decision.alive).toBe(true);
      expect(decision.semanticStatePreserved).toBe(true);
    }
    expect(tierPreservesCriticalStates("STATIC_ALIVE_FALLBACK")).toMatchObject({ privacyVisible: true, approvalVisible: true });
  });

  it("applies hysteresis on recovery but degrades immediately", () => {
    expect(choosePerformanceTier(healthy, "STATIC_ALIVE_FALLBACK").tier).toBe("STATIC_ALIVE_FALLBACK");
    expect(choosePerformanceTier({ ...healthy, stableSamples: 2 }, "STATIC_ALIVE_FALLBACK").tier).toBe("REDUCED_MOTION");
    expect(choosePerformanceTier({ ...healthy, stableSamples: 2 }, "LIGHTWEIGHT").tier).toBe("BALANCED");
    expect(choosePerformanceTier({ ...healthy, fps: 10, frameTimeMs: 90, memoryPressure: true, journalPressure: true }, "PREMIUM_CINEMATIC").tier).toBe("STATIC_ALIVE_FALLBACK");
  });

  it("treats reduced motion as a ceiling even under pressure and orders degradation", () => {
    expect(choosePerformanceTier({ ...healthy, reducedMotion: true, stableSamples: 9 }, "PREMIUM_CINEMATIC").tier).toBe("REDUCED_MOTION");
    expect(choosePerformanceTier({ ...healthy, fps: 15, frameTimeMs: 70, reducedMotion: true, memoryPressure: true }, "PREMIUM_CINEMATIC").tier).toBe("STATIC_ALIVE_FALLBACK");
    expect(DEGRADATION_ORDER[0]).toBe("REDUCE_DECORATIVE_PARTICLES");
    expect(DEGRADATION_ORDER[DEGRADATION_ORDER.length - 1]).toBe("STATIC_ALIVE_PROJECTION");
  });

  it("accounts for TV mini-agent density", () => {
    const tv = choosePerformanceTier({ ...healthy, tv: true, activeMiniAgentCount: 20 }, "PREMIUM_CINEMATIC");
    expect(tv.reasons).toContain("TV_AGENT_DENSITY");
  });
});