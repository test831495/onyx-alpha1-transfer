import { describe, expect, it } from "vitest";
import { isAllowed } from "../src/policy-engine";

describe("automation policy engine", () => {
  it("allows safe local planning", () => {
    expect(isAllowed("github.issue.draft")).toBe(true);
  });

  it("blocks pull-request merge", () => {
    expect(isAllowed("github.pr.merge")).toBe(false);
  });

  it("blocks production deployment", () => {
    expect(isAllowed("netlify.deploy.production")).toBe(false);
  });

  it("blocks repository permission changes", () => {
    expect(isAllowed("github.permissions.update")).toBe(false);
  });

  it("blocks secret read and write operations", () => {
    expect(isAllowed("github.secrets.read")).toBe(false);
    expect(isAllowed("github.secrets.write")).toBe(false);
  });
});
