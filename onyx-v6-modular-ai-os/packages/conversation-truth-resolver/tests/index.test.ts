import { describe, expect, it } from "vitest";
import {
  CLAIM_TYPES,
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
      evidence: [createEvidenceItem({ evidenceId: "stale", claimType: "CALENDAR_EVENT", truthSourceClass: "CONNECTOR_GROUNDED", purpose: "calendar", scope: "account:a", freshness: "STALE" })],
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
