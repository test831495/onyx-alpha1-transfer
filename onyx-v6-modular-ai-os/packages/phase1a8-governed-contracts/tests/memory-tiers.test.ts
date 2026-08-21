import { describe, expect, it } from "vitest";
import { assertMemoryTier, createMemoryTierContract, MEMORY_TIERS } from "../src/track-b/memory-tiers";
import { assertValidMemoryRecord } from "../src/track-b/memory-governance";

const baseRecord = {
  memoryRecordId: "memory-1", memoryTier: "M1" as const, canonicalSourceId: "source-1", sourceType: "USER_AUTHORED" as const,
  sourceReference: "conversation-1", sourceAttribution: "user-1", trustClassification: "SESSION_MEMORY" as const,
  permissionProfileId: "permission-1", memoryAccessProfileId: "access-1", ownerScope: "owner-1", projectScope: "project-1",
  characterScope: "none", createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z", retentionPolicyId: "retention-1",
  correctionState: "REQUESTED" as const, supersessionState: "REQUESTED" as const, deletionState: "ACTIVE" as const,
  tombstoneId: null, derivedArtifactIds: [], auditReferences: [], contractVersion: "1.0.0",
};

describe("Wave 3A memory tiers", () => {
  it("defines exactly seven explicit tiers and rejects unknown or missing tiers", () => {
    expect(MEMORY_TIERS).toEqual(["M0", "M1", "M2", "M3", "M4", "M5", "P0"]);
    expect(() => assertMemoryTier("M6")).toThrow();
    expect(() => assertMemoryTier(undefined)).toThrow();
    expect(() => createMemoryTierContract("M2")).not.toThrow();
  });

  it("requires common provenance and trust fields and gives no authority", () => {
    expect(() => assertValidMemoryRecord(baseRecord)).not.toThrow();
    expect(() => assertValidMemoryRecord({ ...baseRecord, sourceAttribution: "" })).toThrow();
    expect(() => assertValidMemoryRecord({ ...baseRecord, trustClassification: undefined })).toThrow();
    expect(createMemoryTierContract("M2")).toMatchObject({ authoritative: false, approvalAuthority: false, executionAuthority: false });
  });

  it("requires M0 expiry", () => {
    expect(() => assertValidMemoryRecord({ ...baseRecord, memoryTier: "M0", expiresAt: undefined })).toThrow();
    expect(() => assertValidMemoryRecord({ ...baseRecord, memoryTier: "M0", expiresAt: "2026-08-21T00:05:00.000Z" })).not.toThrow();
  });
});
