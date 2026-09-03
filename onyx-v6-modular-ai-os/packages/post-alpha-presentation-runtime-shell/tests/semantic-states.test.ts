import { describe, expect, it } from "vitest";
import { SEMANTIC_STATES, isSemanticState } from "../src/index.js";

describe("semantic states", () => {
  it("exposes the frozen eight-state presentation vocabulary", () => {
    expect(SEMANTIC_STATES).toEqual([
      "IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING",
    ]);
    expect(Object.isFrozen(SEMANTIC_STATES)).toBe(true);
    expect(isSemanticState("UNKNOWN")).toBe(false);
  });
});