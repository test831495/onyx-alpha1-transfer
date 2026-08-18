import { describe, expect, it } from "vitest";
import { capabilities } from "../src/registry";

describe("automation capability registry", () => {
  it("contains unique capability identifiers", () => {
    const ids = capabilities.map((capability) => capability.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("allows safe issue drafting without approval", () => {
    const capability = capabilities.find(
      (item) => item.id === "github.issue.draft",
    );

    expect(capability).toBeDefined();
    expect(capability?.enabled).toBe(true);
    expect(capability?.approvalRequired).toBe(false);
    expect(capability?.risk).toBe("low");
  });

  it("keeps pull-request merge disabled", () => {
    const capability = capabilities.find(
      (item) => item.id === "github.pr.merge",
    );

    expect(capability).toBeDefined();
    expect(capability?.enabled).toBe(false);
    expect(capability?.risk).toBe("critical");
  });
});
