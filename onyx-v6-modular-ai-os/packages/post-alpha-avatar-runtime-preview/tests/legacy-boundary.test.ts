import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const monorepoRoot = resolve(import.meta.dirname, "../../..");
const previewSourceRoot = resolve(monorepoRoot, "packages/post-alpha-avatar-runtime-preview/src");

describe("Legacy and Command Center boundaries", () => {
  it("keeps the legacy avatar runtime package unchanged by this candidate", () => {
    expect(existsSync(resolve(monorepoRoot, "packages/avatar-runtime"))).toBe(true);
  });

  it("contains no legacy bridge module", () => {
    expect(existsSync(resolve(previewSourceRoot, "legacy-bridge.ts"))).toBe(false);
  });

  it("contains no legacy avatar-runtime import", () => {
    const source = readFileSync(resolve(previewSourceRoot, "registry-fixture.ts"), "utf8");
    expect(source).not.toContain("@onyx/avatar-runtime");
  });

  it("does not couple the preview package to Command Center", () => {
    const source = readFileSync(resolve(previewSourceRoot, "composition-adapter.ts"), "utf8");
    expect(source).not.toContain("command-center");
  });
});