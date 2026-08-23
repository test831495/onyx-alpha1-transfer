import { describe, expect, it } from "vitest";
import { idempotencyKey } from "../src/idempotency";

describe("versioned idempotency keys", () => {
  it("uses the current namespace and separates material payloads", () => {
    const first = idempotencyKey("o/r", "issue", { title: "one" });
    const second = idempotencyKey("o/r", "issue", { title: "two" });
    expect(first).toMatch(/^sha256-v1-[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
    expect(first).not.toMatch(/^fnv1a-/);
  });

  it("does not overlap the legacy namespace", () => {
    const current = idempotencyKey("o/r", "issue", { title: "one" });
    expect(current.startsWith("fnv1a-")).toBe(false);
    expect(current).not.toBe("fnv1a-deadbeef");
  });
});