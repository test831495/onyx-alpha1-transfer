import { describe, expect, it } from "vitest";
import { assertPromotionDecision, assertRetentionCompatible, defaultDenyMemoryAccessProfile, assertValidMemoryAccessProfile, assertCorrectionAllowed, assertSupersessionAllowed, assertDeletionAllowed, isActiveMemoryRecord, assertExportPermitted, assertM4OperationalLedgerRecord } from "../src/track-b/memory-governance";

const source = { memoryTier: "M1" as const, sourceAttribution: "user-1", canonicalSourceId: "source-1" };
const lifecycle = { memoryTier: "M2" as const, sourceAuthorityClass: "DERIVED_INFERENCE" as const };

describe("Wave 3A memory governance", () => {
  it("keeps M1 non-authoritative and requires an explicit governed M2 decision", () => {
    expect(() => assertPromotionDecision({ promotionDecisionId: "promotion-1", sourceMemoryRecordId: "m1", targetTier: "M2", requestedBy: "agent-1", approvedBy: "owner-1", scopeHash: "scope-1", permissionDecision: "ALLOW", sourceAttribution: "user-1", canonicalSourceId: "source-1", promotionReason: "explicit preference", issuedAt: "2026-08-21T00:00:00.000Z", expiresAt: "2026-08-21T01:00:00.000Z", status: "AUTHORIZED", contractVersion: "1.0.0", evidenceReferences: ["ev-1"] }, source, "2026-08-21T00:10:00.000Z")).not.toThrow();
    expect(() => assertPromotionDecision({ promotionDecisionId: "promotion-1", sourceMemoryRecordId: "m1", targetTier: "M2", requestedBy: "agent-1", approvedBy: "", scopeHash: "scope-1", permissionDecision: "", sourceAttribution: "user-1", canonicalSourceId: "source-1", promotionReason: "", issuedAt: "2026-08-21T00:00:00.000Z", expiresAt: "2026-08-21T01:00:00.000Z", status: "AUTHORIZED", contractVersion: "1.0.0", evidenceReferences: [] }, source, "2026-08-21T00:10:00.000Z")).toThrow();
  });

  it("keeps M2 derived records non-canonical and cannot override approval", () => {
    expect(() => assertCorrectionAllowed(lifecycle, { correctionId: "c", memoryRecordId: "m", priorValueDigest: "a", correctedValueDigest: "b", reason: "r", requestedBy: "u", authorizedBy: "u", requestedAt: "2026-08-21T00:00:00.000Z", authorizedAt: "2026-08-21T00:00:00.000Z", scopeHash: "s", permissionDecision: "ALLOW", status: "APPLIED", evidenceReferences: ["audit-1"], contractVersion: "1.0.0" })).toThrow();
    expect(lifecycle.sourceAuthorityClass).toBe("DERIVED_INFERENCE");
  });

  it("enforces tier retention compatibility", () => {
    const base = { retentionPolicyId: "r", retentionDuration: "P30D", expiresAt: null, archiveEligible: false, deletionEligible: true, legalHold: false, reviewRequired: false, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" };
    expect(() => assertRetentionCompatible({ ...base, memoryTier: "M0", retentionClass: "EPHEMERAL" })).not.toThrow();
    expect(() => assertRetentionCompatible({ ...base, memoryTier: "M0", retentionClass: "DURABLE" })).toThrow();
    expect(() => assertRetentionCompatible({ ...base, memoryTier: "M5", retentionClass: "ARCHIVAL" })).not.toThrow();
  });

  it("denies memory access by default and rejects persona writes", () => {
    const profile = defaultDenyMemoryAccessProfile("agent-1", "access-1");
    expect(profile.allowedReadTiers).toEqual([]); expect(profile.allowedWriteTiers).toEqual([]); expect(profile.allowPersonaWrite).toBe(false);
    expect(() => assertValidMemoryAccessProfile(profile)).not.toThrow();
    expect(() => assertValidMemoryAccessProfile({ ...profile, allowedWriteTiers: ["P0"] })).toThrow();
  });

  it("keeps M4 operational references separate and lifecycle history queryable", () => {
    expect(() => assertM4OperationalLedgerRecord({ memoryTier: "M4", workflowId: "wf", runtimeId: "rt", taskId: "task", leaseId: "lease", checkpointId: "cp", evidenceReferences: ["ev"], operation: "APPROVAL_RECORDED", contractVersion: "1.0.0" })).not.toThrow();
    expect(() => assertM4OperationalLedgerRecord({ memoryTier: "M2", workflowId: "wf", runtimeId: "rt", taskId: "task", leaseId: "lease", checkpointId: "cp", evidenceReferences: [], operation: "x", contractVersion: "1.0.0" } as never)).toThrow();
    expect(isActiveMemoryRecord({ deletionState: "DELETED", supersessionState: "REQUESTED" })).toBe(false);
    expect(isActiveMemoryRecord({ deletionState: "ACTIVE", supersessionState: "APPLIED" })).toBe(false);
    expect(() => assertDeletionAllowed({ memoryTier: "M2" }, { authorizedBy: "owner" })).not.toThrow();
    expect(() => assertDeletionAllowed({ memoryTier: "P0" }, { authorizedBy: "owner" })).toThrow();
    expect(() => assertSupersessionAllowed({ memoryTier: "P0" })).toThrow();
    expect(() => assertExportPermitted({ permissionDecision: "ALLOW" })).not.toThrow();
    expect(() => assertExportPermitted({ permissionDecision: "" })).toThrow();
  });
});
