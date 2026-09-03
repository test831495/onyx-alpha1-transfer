import { describe, expect, it } from "vitest";
// @ts-expect-error Cross-worktree Vitest harness imports real candidate source.
import * as runtime from "/workspaces/visible-presence-train/runtime/onyx-v6-modular-ai-os/packages/post-alpha-presentation-runtime-shell/src/index.ts";
// @ts-expect-error Cross-worktree Vitest harness imports real candidate source.
import * as renderer from "/workspaces/visible-presence-train/renderer/onyx-v6-modular-ai-os/packages/post-alpha-character-renderer-native/src/index.ts";
// @ts-expect-error Cross-worktree Vitest harness imports real candidate source.
import * as world from "/workspaces/visible-presence-train/world/onyx-v6-modular-ai-os/packages/post-alpha-ambient-experience-foundation/src/index.ts";
// @ts-expect-error Cross-worktree Vitest harness imports real candidate source.
import * as tv from "/workspaces/visible-presence-train/tv/onyx-v6-modular-ai-os/packages/post-alpha-tv-presence-runtime/src/index.ts";

describe("executable Train 1 composition", () => {
  it("executes the real 64-cell character, state, world, and device matrix", () => {
    const cells = [];
    for (const character of renderer.CHARACTERS) {
      for (const worldId of world.WORLD_IDS) {
        for (const state of runtime.SEMANTIC_STATES) {
          const render = renderer.renderIntent(character, state);
          const composition = tv.composeTv(character, worldId, state);
          for (const device of ["DESKTOP", "TV"] as const) {
            cells.push({ character, worldId, state, device, render, composition });
          }
        }
      }
    }
    expect(cells).toHaveLength(64);
    expect(cells.every(({ state, render, composition }) => state === render.state && state === composition.state)).toBe(true);
  });

  it("executes Rehearsal A and B across real package exports", () => {
    for (const character of renderer.CHARACTERS) {
      for (const state of runtime.SEMANTIC_STATES) {
        const transition = runtime.transition("IDLE", state, "input-received");
        const render = renderer.renderIntent(character, state);
        const operations = world.worldStateIntent("OPERATIONS_CENTER", state);
        expect(transition.from).toBe("IDLE");
        expect(render.character).toBe(character);
        expect(operations.externalData).toBe(false);
      }
    }
    expect(runtime.projectPresentation("APPROVAL_REQUIRED").approvalRequired).toBe(true);
    expect(runtime.projectPresentation("PRIVACY_RESTRICTED").protectedDetail).toBe("minimized");
  });

  it("executes Rehearsal C and D with deterministic accessibility and recovery", () => {
    const desktop = runtime.projectAccessibility("SPEAKING", { captions: true });
    const tvComposition = tv.composeTv("ONYX", "OPERATIONS_CENTER", "SPEAKING");
    expect(desktop.state).toBe(tvComposition.state);
    expect(renderer.renderIntent("NOVA", "RECOVERING", { reducedMotion: true, highContrast: true })).toMatchObject({ motion: "reduced", contrast: "high", fallback: true });
    for (const state of runtime.SEMANTIC_STATES) {
      expect(world.worldStateIntent("FUTURE_CITY", state).state).toBe(state);
      expect(tv.composeTv("NOVA", "FUTURE_CITY", state).character).toBe("NOVA");
    }
  });

  it("executes real accessibility, privacy, approval, recovery, and fallback exports", () => {
    expect(runtime.projectAccessibility("SPEAKING", { reducedMotion: true, highContrast: true }).motion).toBe("reduced");
    expect(renderer.rendererFallback("ONYX", "PRIVACY_RESTRICTED").fallback).toBe(true);
    expect(world.getWorld("UNKNOWN").id).toBe("SAFE_FALLBACK");
    expect(tv.composeTv("NOVA", "FUTURE_CITY", "PRIVACY_RESTRICTED", { sharedRoom: true }).disclosure).toBe("minimized");
    expect(runtime.projectPresentation("APPROVAL_REQUIRED").approvalRequired).toBe(true);
    expect(runtime.createCinematicSession("NOVA", "FUTURE_CITY", "RECOVERING").cancelled).toBe(false);
  });
});
