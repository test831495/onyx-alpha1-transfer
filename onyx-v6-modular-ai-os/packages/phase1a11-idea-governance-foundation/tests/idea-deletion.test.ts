import { describe, expect, it } from "vitest";
import {
  createDeletionTombstone,
  createIdeaId,
  getPermanentDeletionSteps,
  verifyTombstonePrivacy,
} from "../src/index.js";

describe("Idea deletion", () => {
  it("deletion_removes_derived_content", () => {
    const steps = getPermanentDeletionSteps(createIdeaId("idea_delete_001"));
    expect(steps.join("\n")).toContain("Remove derived retrieval index entries");

    const tombstone = createDeletionTombstone(
      createIdeaId("idea_delete_001"),
      "owner_requested",
      "rahul_account_001",
      ["IDEA_DELETE_REQUESTED", "IDEA_PERMANENTLY_DELETED"],
      true,
    );
    expect(verifyTombstonePrivacy(tombstone)).toBe(true);
  });
});
