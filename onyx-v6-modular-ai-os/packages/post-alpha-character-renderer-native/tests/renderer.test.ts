import { describe, expect, it } from "vitest";
import { CHARACTERS, renderIntent, rendererFallback } from "../src/index.js";

describe("provider-neutral character renderer", () => {
  it("keeps ONYX and NOVA canonical across every semantic state", () => {
    expect(CHARACTERS).toEqual(["ONYX", "NOVA"]);
    expect(CHARACTERS.flatMap((character) => renderIntent(character, "IDLE").character)).toHaveLength(2);
    for (const character of CHARACTERS) {
      for (const state of ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"] as const) {
        expect(renderIntent(character, state).state).toBe(state);
      }
    }
  });

  it("provides accessible and unsupported fallbacks", () => {
    const intent = renderIntent("ONYX", "SPEAKING", { reducedMotion: true, highContrast: true });
    expect(intent.motion).toBe("reduced");
    expect(intent.contrast).toBe("high");
    expect(rendererFallback("NOVA", "PRIVACY_RESTRICTED").fallback).toBe(true);
  });
});
