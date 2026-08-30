import { describe, expect, it } from "vitest";
import { projectP3GovernanceReport } from "../src/post-h1/p3-governance-report-projection";
import type { P3GovernanceAutomationResult } from "../src/post-h1/p3-governance-automation";

type PredecessorManifest = NonNullable<P3GovernanceAutomationResult["predecessor"]["manifest"]>;

const manifest = (): PredecessorManifest => ({
  manifestHash: "c".repeat(64),
  targetHash: "d".repeat(64),
  rawEvidenceHashes: [],
  normalizedFactHash: "e".repeat(64),
  p1InputHash: "f".repeat(64),
  p1OutputHash: "0".repeat(64),
  driftReportHash: "1".repeat(64),
  governanceResultHash: "2".repeat(64),
  freshness: { observedAtEpochMilliseconds: 1772300000000, maxAgeMilliseconds: 86400000, ageMilliseconds: 100, isFresh: true },
  isPaginationComplete: true,
  authority: "NON_AUTHORIZING",
});

const candidate = (disposition: P3GovernanceAutomationResult["disposition"] = "PROJECTED"): P3GovernanceAutomationResult => ({
  authority: "NON_AUTHORIZING",
  disposition,
  evaluationEpochMilliseconds: 1772300000100,
  target: { repository: "test831495/onyx-alpha1-transfer", baseBranch: "main", headSha: "b".repeat(40), prNumber: 29 },
  lifecycle: { state: "LOCALLY_ACCEPTED", currentGate: "LOCAL", authoritativeTransitionPerformed: false },
  predecessor: {
    drift: { outcome: disposition === "PROJECTED" ? "MATCH" : "NOT_ASSESSABLE", driftCount: 0, details: [], reasons: disposition === "PROJECTED" ? [] : ["EVIDENCE_STALE"], authority: "NON_AUTHORIZING" },
    readiness: { outcome: "TECHNICALLY_READY", authority: "NON_AUTHORIZING" },
    closure: { outcome: "NOT_ASSESSABLE", authority: "NON_AUTHORIZING" },
    manifest: manifest(),
  },
  blockers: disposition === "PROJECTED" ? [] : ["EVIDENCE_STALE"],
  warnings: [],
  nextGate: "OWNER_REVIEW",
  reopeningTriggers: ["HEAD_DRIFT", "EVIDENCE_STALE"],
  requiredHumanActions: [],
  ownerDecisions: ["OWNER_APPROVAL_REMAINS_REQUIRED"],
  evidenceReferences: [{ id: "z", hash: "a".repeat(64) }, { id: "a", hash: "b".repeat(64) }],
  provenance: [{ id: "z-source", hash: "b".repeat(64) }, { id: "a-source", hash: "a".repeat(64) }],
});

describe("Post-H1 P3 governance report projection", () => {
  it("projects a stable bounded immutable non-authorizing governance report", () => {
    const report = projectP3GovernanceReport(candidate());
    expect(report.authority).toBe("NON_AUTHORIZING");
    expect(report.disposition).toBe("PROJECTED");
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.evidenceReferences)).toBe(true);
  });

  it("preserves P2 evidence manifest references without inventing evidence", () => {
    const report = projectP3GovernanceReport(candidate());
    expect(report.evidenceManifestHash).toBe("c".repeat(64));
    expect(report.evidenceReferences).toHaveLength(2);
    expect(report.provenance).toHaveLength(2);
  });

  it("canonicalizes governance report ordering and stable hash inputs", () => {
    const first = projectP3GovernanceReport(candidate());
    const reordered: P3GovernanceAutomationResult = {
      ...candidate(),
      evidenceReferences: [...candidate().evidenceReferences].reverse(),
      provenance: [...candidate().provenance].reverse(),
      reopeningTriggers: [...candidate().reopeningTriggers].reverse(),
    };
    const second = projectP3GovernanceReport(reordered);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.evidenceReferences.map((entry) => (entry as { id: string }).id)).toEqual(["a", "z"]);
  });

  it("orders identifiers using locale-independent ordinal comparison", () => {
    // "B" (0x42) precedes "a" (0x61) ordinally, the opposite of typical locale-aware collation.
    const withCaseVariants: P3GovernanceAutomationResult = { ...candidate(), evidenceReferences: [{ id: "a", hash: "a".repeat(64) }, { id: "B", hash: "b".repeat(64) }] };
    const report = projectP3GovernanceReport(withCaseVariants);
    expect(report.evidenceReferences.map((entry) => (entry as { id: string }).id)).toEqual(["B", "a"]);
  });

  it("produces a bounded target-bound factual non-authorizing PR body proposal", () => {
    const report = projectP3GovernanceReport(candidate());
    expect(report.prBodyProposal?.authority).toBe("NON_AUTHORIZING");
    expect(report.prBodyProposal?.body).toContain("non-authorizing");
    expect(report.prBodyProposal?.body.length).toBeLessThanOrEqual(4096);
  });

  it("suppresses the PR body proposal when required facts are unsafe or invalid", () => {
    expect(projectP3GovernanceReport(candidate("NOT_ASSESSABLE")).prBodyProposal).toBeUndefined();
  });

  it("produces identical recursively immutable output for identical input", () => {
    const first = projectP3GovernanceReport(candidate());
    const second = projectP3GovernanceReport(candidate());
    expect(first).toEqual(second);
    expect(Object.isFrozen(first.prBodyProposal!)).toBe(true);
  });
});