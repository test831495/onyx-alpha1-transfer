import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_FOUNDATION_DEPENDENCIES,
  FLAG_MATURITY,
  LIFECYCLE_STATES,
  PRESENCE_RUNTIME_FLAG,
  projectTransition,
  validatePresenceContract,
} from "../src/index";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
const tsconfig = JSON.parse(readFileSync(join(packageRoot, "tsconfig.json"), "utf8")) as { compilerOptions?: Record<string, unknown> };

describe("Presence closed contracts", () => {
  it("PPT-001 schema validation", () => {
    expect(validatePresenceContract({ workstream: "PA-PRESENCE-01", owner: "rahul-kumar", runtimeActivation: false, authorizing: false })).toMatchObject({ runtimeActivation: false, authorizing: false });
    expect(() => validatePresenceContract({ workstream: "PA-PRESENCE-01", owner: "other", runtimeActivation: false, authorizing: false } as never)).toThrow();
  });

  it("PPT-002 closed lifecycle vocabulary", () => {
    expect(LIFECYCLE_STATES).toHaveLength(12);
    expect(LIFECYCLE_STATES).not.toContain("ACTIVE");
  });

  it("PPT-003 closed flag vocabulary", () => {
    expect(FLAG_MATURITY).toEqual(["OFF", "SYNTHETIC_ONLY", "OWNER_CANARY", "OWNER_ACTIVE", "GENERAL_ACTIVE"]);
    expect(PRESENCE_RUNTIME_FLAG).toMatchObject({ name: "onyx_presence_thin_slice_runtime", owner: "PA-PRESENCE-01", state: "OFF" });
  });

  it("PPT-004 dependency allowlist", () => {
    expect(ALLOWED_FOUNDATION_DEPENDENCIES).toEqual([
      "@onyx/post-alpha-governance-foundation",
      "@onyx/post-alpha-intelligence-foundation",
      "@onyx/post-alpha-avatar-foundation",
    ]);
    expect(packageJson.dependencies).toMatchObject({
      "@onyx/post-alpha-intelligence-foundation": "workspace:*",
      "@onyx/post-alpha-avatar-foundation": "workspace:*",
    });
  });

  it("PPT-005 Owner authorization boundary", () => {
    expect(validatePresenceContract({ workstream: "PA-PRESENCE-01", owner: "rahul-kumar", runtimeActivation: false, authorizing: false }).owner).toBe("rahul-kumar");
  });

  it("PPT-006 inactive by default", () => {
    expect(PRESENCE_RUNTIME_FLAG.state).toBe("OFF");
    expect(PRESENCE_RUNTIME_FLAG.activationSeparatelyAuthorized).toBe(false);
  });

  it("PPT-007 immutable contracts", () => {
    const contract = validatePresenceContract({ workstream: "PA-PRESENCE-01", owner: "rahul-kumar", runtimeActivation: false, authorizing: false });
    expect(() => (contract as { owner: string }).owner = "other").toThrow();
  });

  it("PPT-008 deterministic projection", () => {
    const input = { workstream: "PA-PRESENCE-01", owner: "rahul-kumar", runtimeActivation: false, authorizing: false } as const;
    expect(validatePresenceContract(input)).toEqual(validatePresenceContract(input));
    expect(tsconfig.compilerOptions).toMatchObject({ rootDir: ".", noEmit: true });
  });

  it("PPT-009 all-state non-authority", () => {
    expect(LIFECYCLE_STATES.every((state) => ["STOPPED", "UNINITIALIZED", "PRIVACY_RESTRICTED", "RECOVERING", "OFFLINE"].includes(state) || projectTransition(state, "STOP").authorizing === false)).toBe(true);
  });
});