import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const readJson = (name: string) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8")) as Record<string, any>;
describe("Phase 1A.9 registries", () => {
  it("contains exactly 22 pending acceptance records", () => { const manifest = readJson("acceptance-manifest.json"); expect(Object.keys(manifest)).toHaveLength(22); expect(Object.values(manifest).every((entry: any) => entry.acceptanceStatus === "pending")).toBe(true); });
  it("contains exactly 40 test records and 14 artifact records", () => { expect(Object.keys(readJson("test-matrix.json"))).toHaveLength(40); expect(Object.keys(readJson("evidence-artifacts.json"))).toHaveLength(14); });
});