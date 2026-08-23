import { describe, expect, it } from "vitest";
import { requiresApproval } from "../src/approval-engine";

describe("automation approval engine", () => {
  it("does not require approval for a local issue draft", () => {
    expect(requiresApproval("github.issue.draft")).toBe(false);
  });

  it("requires approval before creating a GitHub issue", () => {
    expect(requiresApproval("github.issue.create")).toBe(true);
  });

  it("requires approval before creating a branch", () => {
    expect(requiresApproval("github.branch.create")).toBe(true);
  });

  it("requires approval before creating a Draft PR", () => {
    expect(requiresApproval("github.pr.create-draft")).toBe(true);
  });
});
