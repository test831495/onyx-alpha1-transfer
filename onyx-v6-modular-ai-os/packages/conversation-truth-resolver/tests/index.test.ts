import { describe, expect, it } from "vitest";
import {
  CLAIM_TYPES,
  CLAIM_POLICIES,
  CONFLICT_TYPES,
  FALLBACK_POLICIES,
  TRUTH_SOURCE_CLASSES,
  UNCERTAINTY_CLASSES,
  createEvidenceItem,
  resolveTruth,
} from "../src/index";

describe("B4A taxonomy closure", () => {
  it("exposes the closed versioned vocabularies", () => {
    expect(CLAIM_TYPES).toEqual([
      "CALENDAR_EVENT",
      "MAIL_METADATA",
      "PR_STATE",
      "CHECK_STATUS",
      "CURRENT_PROJECT_READINESS",
      "OWNER_DECISION",
      "PUBLIC_TECHNICAL_FACT",
      "GENERAL_EXPLANATION",
      "GENERATED_RECOMMENDATION",
    ]);
    expect(TRUTH_SOURCE_CLASSES).toContain("CONNECTOR_GROUNDED");
    expect(UNCERTAINTY_CLASSES).toContain("NOT_ASSESSABLE");
    expect(CONFLICT_TYPES).toContain("AUTHORITY_CONFLICT");
    expect(FALLBACK_POLICIES).toContain("STOP_ON_PREFERRED_CLASS_UNAVAILABLE");
  });

  it("rejects unknown claim types and prohibited raw fields", () => {
    expect(() => createEvidenceItem({ claimType: "UNKNOWN" })).toThrow("UNKNOWN_CLAIM_TYPE");
    expect(() => createEvidenceItem({ claimType: "MAIL_METADATA", rawContent: "secret" })).toThrow("PROHIBITED_FIELD");
  });
});

describe("B4A deterministic resolution", () => {
  it("selects eligible evidence by claim-specific precedence and is order independent", () => {
    const local = createEvidenceItem({
      evidenceId: "local-1",
      claimType: "GENERAL_EXPLANATION",
      subject: "topic",
      predicate: "meaning",
      valueFingerprint: "local-value",
      truthSourceClass: "GENERATED_GENERAL",
      purpose: "answer",
      scope: "topic",
      freshness: "CURRENT",
      provenance: "COMPLETE",
      integrity: "VERIFIED",
      privacy: "ELIGIBLE",
      directness: 1,
      specificity: 1,
    });
    const publicFact = createEvidenceItem({
      ...local,
      evidenceId: "public-1",
      truthSourceClass: "PUBLIC_EXTERNAL",
      valueFingerprint: "public-value",
      directness: 2,
      specificity: 2,
    });
    const request = { requestVersion: "1", claimType: "GENERAL_EXPLANATION", purpose: "answer", scope: "topic", evidence: [local, publicFact] } as const;
    const first = resolveTruth(request);
    const second = resolveTruth({ ...request, evidence: [publicFact, local] });
    expect(first.selectedEvidenceIds).toEqual(["public-1"]);
    expect(second).toEqual(first);
    expect(first.nonAuthority).toBe(true);
    expect(first.executionAuthorized).toBe(false);
  });

  it("detects material conflicts before selecting a conclusion", () => {
    const base = {
      claimType: "PR_STATE" as const,
      subject: "pr:12",
      predicate: "state",
      purpose: "status",
      scope: "repo/pr:12/head:abc",
      truthSourceClass: "CONNECTOR_GROUNDED" as const,
      freshness: "CURRENT" as const,
      provenance: "COMPLETE" as const,
      integrity: "VERIFIED" as const,
      privacy: "ELIGIBLE" as const,
    };
    const receipt = resolveTruth({
      requestVersion: "1",
      claimType: "PR_STATE",
      purpose: "status",
      scope: "repo/pr:12/head:abc",
      evidence: [
        createEvidenceItem({ ...base, evidenceId: "open", valueFingerprint: "OPEN" }),
        createEvidenceItem({ ...base, evidenceId: "merged", valueFingerprint: "MERGED" }),
      ],
    });
    expect(receipt.uncertaintyClass).toBe("CONFLICTING");
    expect(receipt.materialConflict).toBe(true);
    expect(receipt.conflictTypes).toContain("STATUS_CONFLICT");
    expect(receipt.selectedEvidenceIds).toEqual([]);
  });

  it("distinguishes missing, stale, and rejected evidence", () => {
    const receipt = resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: [] });
    expect(receipt.uncertaintyClass).toBe("UNKNOWN");
    expect(receipt.missingEvidenceClasses).toContain("CONNECTOR_GROUNDED");
    const stale = resolveTruth({
      requestVersion: "1",
      claimType: "CALENDAR_EVENT",
      purpose: "calendar",
      scope: "account:a",
      account: "a",
      evidence: [createEvidenceItem({ evidenceId: "stale", claimType: "CALENDAR_EVENT", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "calendar", scope: "account:a", account: "a", freshness: "STALE", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" })],
    });
    expect(stale.uncertaintyClass).toBe("STALE");
    expect(stale.rejectedEvidenceIds).toContain("stale");
  });
});

describe("B4A receipt safety", () => {
  it("is deeply immutable, deterministic, bounded, and non-authorizing", () => {
    const request = { requestVersion: "1", claimType: "OWNER_DECISION" as const, purpose: "decision", scope: "owner", evidence: [] };
    const first = resolveTruth(request);
    const second = resolveTruth(request);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.selectedEvidenceIds)).toBe(true);
    expect(first.replayEvidence).toMatch(/^[a-f0-9]{16}$/);
    expect(first.approvalGranted).toBe(false);
    expect(first.memoryWriteAuthorized).toBe(false);
    expect(first.connectorExecutionAuthorized).toBe(false);
  });
});

describe("B4A review regressions", () => {
  const connectorEvidence = (overrides: Record<string, unknown> = {}) => createEvidenceItem({
    evidenceId: "evidence-1",
    claimType: "CALENDAR_EVENT",
    truthSourceClass: "CONNECTOR_GROUNDED",
    purpose: "calendar",
    scope: "account:a",
    freshness: "CURRENT",
    provenance: "COMPLETE",
    integrity: "VERIFIED",
    privacy: "ELIGIBLE",
    ...overrides,
  });

  it("freezes every exported vocabulary and the policy registry deeply", () => {
    expect(Object.isFrozen(CLAIM_TYPES)).toBe(true);
    expect(Object.isFrozen(TRUTH_SOURCE_CLASSES)).toBe(true);
    expect(Object.isFrozen(UNCERTAINTY_CLASSES)).toBe(true);
    expect(Object.isFrozen(CONFLICT_TYPES)).toBe(true);
    expect(Object.isFrozen(FALLBACK_POLICIES)).toBe(true);
    expect(Object.isFrozen(CLAIM_POLICIES)).toBe(true);
    expect(Object.isFrozen(CLAIM_POLICIES.CALENDAR_EVENT)).toBe(true);
    expect(Object.isFrozen(CLAIM_POLICIES.CALENDAR_EVENT.precedence)).toBe(true);
    expect(() => (CLAIM_TYPES as unknown as string[]).push("OWNER_DECISION")).toThrow();
    expect(() => (CLAIM_POLICIES.CALENDAR_EVENT.precedence as unknown as string[]).splice(0, 1)).toThrow();
  });

  it("requires exact account binding for account-bearing evidence", () => {
    const accountEvidence = connectorEvidence({ account: "a" });
    expect(resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: [accountEvidence] }).selectedEvidenceIds).toEqual([]);
    expect(resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", account: "b", evidence: [accountEvidence] }).selectedEvidenceIds).toEqual([]);
    expect(resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", account: "a", evidence: [accountEvidence] }).selectedEvidenceIds).toEqual(["evidence-1"]);
    expect(resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: [connectorEvidence({ evidenceId: "neutral", account: undefined })] }).resolutionStatus).toBe("UNAVAILABLE");
  });

  it("requires account scope for mail and never exposes rejected account values", () => {
    const receipt = resolveTruth({ requestVersion: "1", claimType: "MAIL_METADATA", purpose: "mail", scope: "account:a", evidence: [connectorEvidence({ claimType: "MAIL_METADATA", purpose: "mail", account: "a" })] });
    expect(receipt.selectedEvidenceIds).toEqual([]);
    expect(receipt.rejectionReasons["evidence-1"]).toContain("ACCOUNT_MISMATCH");
    expect(JSON.stringify(receipt)).not.toContain('"a"');
  });

  it("honors fail-closed fallback and discloses lower-class fallback", () => {
    const lower = createEvidenceItem({ evidenceId: "lower", claimType: "CURRENT_PROJECT_READINESS", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "readiness", scope: "project", freshness: "CURRENT", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" });
    const failClosed = resolveTruth({ requestVersion: "1", claimType: "CURRENT_PROJECT_READINESS", purpose: "readiness", scope: "project", evidence: [lower] });
    expect(failClosed.resolutionStatus).toBe("NOT_ASSESSABLE");
    expect(failClosed.selectedEvidenceIds).toEqual([]);
    const fallback = resolveTruth({ requestVersion: "1", claimType: "GENERAL_EXPLANATION", purpose: "answer", scope: "topic", evidence: [createEvidenceItem({ evidenceId: "generated", claimType: "GENERAL_EXPLANATION", truthSourceClass: "GENERATED_GENERAL", purpose: "answer", scope: "topic", freshness: "CURRENT", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" })] });
    expect(fallback.fallbackUsed).toBe(true);
    expect(fallback.preferredClassUnavailable).toBe(true);
    expect(fallback.selectedLowerClass).toBe("GENERATED_GENERAL");
  });

  it("rejects unknown fields and bounded secret-like values", () => {
    expect(() => createEvidenceItem({ claimType: "MAIL_METADATA", token: "secret" })).toThrow("PROHIBITED_FIELD");
    expect(() => createEvidenceItem({ claimType: "MAIL_METADATA", evidenceId: "safe", valueFingerprint: "-----BEGIN PRIVATE KEY-----" })).toThrow("PROHIBITED_FIELD");
    expect(() => createEvidenceItem({ claimType: "MAIL_METADATA", evidenceId: "unknown", unknownField: "value" })).toThrow("SCHEMA_FAILURE");
    expect(() => createEvidenceItem({ claimType: "MAIL_METADATA", evidenceId: "safe", valueFingerprint: "bounded-reference", truthSourceClass: "CONNECTOR_GROUNDED" })).not.toThrow();
  });

  it("keeps unsupported source and stale freshness distinct", () => {
    const unsupported = resolveTruth({ requestVersion: "1", claimType: "PR_STATE", purpose: "status", scope: "pr", evidence: [createEvidenceItem({ evidenceId: "unsupported", claimType: "PR_STATE", truthSourceClass: "PUBLIC_EXTERNAL", purpose: "status", scope: "pr", freshness: "CURRENT", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" })] });
    expect(unsupported.rejectionReasons.unsupported).toContain("UNSUPPORTED_EVIDENCE_CLASS");
    expect(unsupported.rejectionReasons.unsupported).not.toContain("STALE_EVIDENCE");
    const stale = resolveTruth({ requestVersion: "1", claimType: "PR_STATE", purpose: "status", scope: "pr", evidence: [createEvidenceItem({ evidenceId: "stale", claimType: "PR_STATE", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "status", scope: "pr", freshness: "STALE", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" })] });
    expect(stale.rejectionReasons.stale).toContain("STALE_EVIDENCE");
  });

  it("preserves independent scope, provenance, and integrity rejection reasons", () => {
    const receipt = resolveTruth({ requestVersion: "1", claimType: "PR_STATE", purpose: "status", scope: "pr:2", evidence: [createEvidenceItem({ evidenceId: "invalid", claimType: "PR_STATE", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "other", scope: "pr:1", freshness: "CURRENT", provenance: "INCOMPLETE", integrity: "FAILED", privacy: "ELIGIBLE" })] });
    expect(receipt.rejectionReasons.invalid).toEqual(expect.arrayContaining(["PURPOSE_MISMATCH", "SCOPE_MISMATCH", "INTEGRITY_FAILURE", "MISSING_PROVENANCE"]));
  });

  it("keeps representative policy behavior closed for every claim family", () => {
    const evidence = (claimType: "CHECK_STATUS" | "PUBLIC_TECHNICAL_FACT", source: "CONNECTOR_GROUNDED" | "PUBLIC_EXTERNAL") => createEvidenceItem({ evidenceId: claimType, claimType, truthSourceClass: source, purpose: "answer", scope: "subject", freshness: "CURRENT", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "ELIGIBLE" });
    expect(resolveTruth({ requestVersion: "1", claimType: "CHECK_STATUS", purpose: "answer", scope: "subject", evidence: [evidence("CHECK_STATUS", "CONNECTOR_GROUNDED")] }).resolutionStatus).toBe("RESOLVED");
    expect(resolveTruth({ requestVersion: "1", claimType: "PUBLIC_TECHNICAL_FACT", purpose: "answer", scope: "subject", evidence: [evidence("PUBLIC_TECHNICAL_FACT", "PUBLIC_EXTERNAL")] }).truthSourceClass).toBe("PUBLIC_EXTERNAL");
    const recommendation = resolveTruth({ requestVersion: "1", claimType: "GENERATED_RECOMMENDATION", purpose: "answer", scope: "subject", evidence: [] });
    expect(recommendation.resolutionStatus).toBe("NOT_ASSESSABLE");
    expect(recommendation.uncertaintyClass).toBe("NOT_ASSESSABLE");
  });

  it("preserves not-assessable and privacy outcomes", () => {
    const noEvidence = resolveTruth({ requestVersion: "1", claimType: "OWNER_DECISION", purpose: "decision", scope: "owner", evidence: [] });
    expect(noEvidence.uncertaintyClass).toBe("NOT_ASSESSABLE");
    const privateEvidence = resolveTruth({ requestVersion: "1", claimType: "PR_STATE", purpose: "status", scope: "pr", evidence: [createEvidenceItem({ evidenceId: "private", claimType: "PR_STATE", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "status", scope: "pr", freshness: "CURRENT", provenance: "COMPLETE", integrity: "VERIFIED", privacy: "INELIGIBLE" })] });
    expect(privateEvidence.privacyResult).toBe("NOT_ELIGIBLE");
    expect(privateEvidence.selectedEvidenceIds).toEqual([]);
  });

  it("canonicalizes rejected references before bounding and rejects duplicate IDs", () => {
    const rejected = Array.from({ length: 70 }, (_, index) => connectorEvidence({ evidenceId: `rejected-${String(index).padStart(2, "0")}`, purpose: "other" }));
    const first = resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: rejected });
    const second = resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: [...rejected].reverse() });
    expect(second).toEqual(first);
    expect(() => resolveTruth({ requestVersion: "1", claimType: "CALENDAR_EVENT", purpose: "calendar", scope: "account:a", evidence: [connectorEvidence(), connectorEvidence()] })).toThrow("DUPLICATE_EVIDENCE_ID");
  });
});
