import { describe, expect, it } from "vitest";
import {
  IdeaAuditEventType,
  auditAvailabilityRequired,
  ownerAuthorityRequired,
} from "../src/index.js";

describe("Idea audit policy", () => {
  it("audit_failure_blocks_protected_decisions", () => {
    expect(auditAvailabilityRequired(IdeaAuditEventType.IDEA_APPROVED)).toBe(true);
    expect(auditAvailabilityRequired(IdeaAuditEventType.IDEA_PERMANENTLY_DELETED)).toBe(true);
    expect(ownerAuthorityRequired(IdeaAuditEventType.IDEA_APPROVED)).toBe(true);
  });
});
