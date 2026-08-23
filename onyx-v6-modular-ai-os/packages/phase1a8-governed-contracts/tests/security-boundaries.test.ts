import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defaultGovernedSafetyFlags, assertNoProhibitedSurface, PROHIBITED_CAPABILITY_SURFACES } from "../src/shared/safety";

const here = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(here, "../src/shared");

// safety.ts itself legitimately declares the prohibited substrings as denylist data, not a usage site.
function readAllSharedSourceExceptSafetyDeclaration(): string {
  return readdirSync(sharedDir)
    .filter((file) => file.endsWith(".ts") && file !== "safety.ts")
    .map((file) => readFileSync(path.join(sharedDir, file), "utf8"))
    .join("\n");
}

describe("frozen safety flags", () => {
  it("defaults every safety flag to false, including the four newly introduced flags", () => {
    const flags = defaultGovernedSafetyFlags();
    expect(flags.mergeAllowed).toBe(false);
    expect(flags.productionDeployAllowed).toBe(false);
    expect(flags.forcePushAllowed).toBe(false);
    expect(flags.branchDeletionAllowed).toBe(false);
    expect(flags.secretAccessAllowed).toBe(false);
    expect(flags.permissionChangeAllowed).toBe(false);
    expect(flags.liveConnectorMutationAllowed).toBe(false);
    expect(flags.paidActionAllowed).toBe(false);
  });
});

describe("prohibited execution surfaces", () => {
  it("rejects source text containing a prohibited surface", () => {
    expect(() => assertNoProhibitedSurface("const x = child_process.exec('ls');", "test.ts")).toThrow();
  });

  it("accepts source text with no prohibited surface", () => {
    expect(() => assertNoProhibitedSurface("export const x = 1;", "test.ts")).not.toThrow();
  });

  it("finds none of the prohibited surfaces anywhere in the Wave 1 shared module source", () => {
    const source = readAllSharedSourceExceptSafetyDeclaration();
    for (const surface of PROHIBITED_CAPABILITY_SURFACES) {
      expect(source.includes(surface)).toBe(false);
    }
  });

  it("declares no dependency beyond the two governed predecessor packages", () => {
    const packageJsonPath = path.resolve(here, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { dependencies?: Record<string, string> };
    const deps = Object.keys(packageJson.dependencies ?? {});
    expect(deps).toEqual(["@onyx/phase1a5-workflow-engine", "@onyx/phase1a6-workflow-runtime"]);
  });
});
