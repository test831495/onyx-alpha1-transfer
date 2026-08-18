import { describe, expect, it } from "vitest";
import { canTransition } from "../src/state-machine";

describe("automation state machine", () => {
  it("allows the approved execution path", () => {
    expect(canTransition("draft", "approved")).toBe(true);
    expect(canTransition("approved", "planning")).toBe(true);
    expect(canTransition("planning", "executing")).toBe(true);
    expect(canTransition("executing", "validating")).toBe(true);
    expect(canTransition("validating", "evidence-ready")).toBe(true);
    expect(canTransition("evidence-ready", "draft-pr-ready")).toBe(true);
    expect(canTransition("draft-pr-ready", "awaiting-review")).toBe(true);
    expect(canTransition("awaiting-review", "completed")).toBe(true);
  });

  it("allows controlled failure states", () => {
    expect(canTransition("executing", "failed")).toBe(true);
    expect(canTransition("validating", "failed")).toBe(true);
  });

  it("allows cancellation only at the review gate", () => {
    expect(canTransition("awaiting-review", "cancelled")).toBe(true);
  });

  it("blocks skipping directly from draft to execution", () => {
    expect(canTransition("draft", "executing")).toBe(false);
  });

  it("blocks direct merge-like completion from draft", () => {
    expect(canTransition("draft", "completed")).toBe(false);
  });

  it("keeps terminal states terminal", () => {
    expect(canTransition("completed", "executing")).toBe(false);
    expect(canTransition("failed", "executing")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
  });
});
