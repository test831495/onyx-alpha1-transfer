import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { approvalValid, createApproval, createPlan } from "../src/index";
import { canonicalizeScopeValue, createScopeHash, isCurrentScopeHash, isLegacyScopeHash, isSupportedScopeHash } from "../src/scope-hash";

describe("versioned scope hash", () => {
  it("canonicalizes equivalent nested objects and arrays deterministically", () => {
    const first = { z: [{ b: true, a: null }, "value"], a: 1 };
    const second = { a: 1, z: [{ a: null, b: true }, "value"] };
    expect(canonicalizeScopeValue(first)).toBe(canonicalizeScopeValue(second));
    expect(createScopeHash(first)).toBe(createScopeHash(second));
  });

  it("matches an independently computed SHA-256 digest", () => {
    const canonical = canonicalizeScopeValue({ a: 1, b: 2 });
    const expected = createHash("sha256").update(canonical, "utf8").digest("hex");
    expect(createScopeHash({ b: 2, a: 1 })).toBe(`sha256-v1-${expected}`);
    expect(createScopeHash({ b: 2, a: 1 })).toMatch(/^sha256-v1-[0-9a-f]{64}$/);
  });

  it("changes for material payload changes", () => {
    expect(createScopeHash({ title: "one" })).not.toBe(createScopeHash({ title: "two" }));
  });

  it("recognizes legacy hashes but accepts only the current exact format", () => {
    const current = createScopeHash({ value: 1 });
    expect(isCurrentScopeHash(current)).toBe(true);
    expect(isLegacyScopeHash("fnv1a-deadbeef")).toBe(true);
    expect(isSupportedScopeHash("fnv1a-deadbeef")).toBe(true);
    expect(isCurrentScopeHash("sha256-v1-deadbeef")).toBe(false);
    expect(isSupportedScopeHash("sha512-v1-" + "a".repeat(128))).toBe(false);
    expect(isSupportedScopeHash("sha256-v1-" + "g".repeat(64))).toBe(false);
  });

  it.each([
    ["undefined", undefined],
    ["non-finite number", Number.NaN],
    ["date", new Date(0)],
    ["bigint", BigInt(1)],
    ["map", new Map()],
    ["set", new Set()],
    ["accessor", Object.defineProperty({}, "value", { enumerable: true, get: () => 1 })],
    ["sparse array", Object.assign([], { 1: "value" })],
  ])("rejects unsupported %s input deterministically", (_label, value) => {
    expect(() => createScopeHash(value)).toThrow(TypeError);
  });

  it("rejects circular values", () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => createScopeHash(value)).toThrow(/circular/i);
  });

  it("rejects legacy and changed hashes for approval authority", () => {
    const plan = createPlan({ capabilityId: "github.issue.create", repository: "o/r", payload: { title: "one" }, approvalRequired: true });
    const approval = createApproval(plan, "Rahul");
    expect(approvalValid(plan, approval)).toBe(true);
    expect(approvalValid({ ...plan, payload: { title: "two" }, scopeHash: createScopeHash({ changed: true }) }, approval)).toBe(false);
    expect(approvalValid(plan, { ...approval, scopeHash: "fnv1a-deadbeef" })).toBe(false);
  });
});