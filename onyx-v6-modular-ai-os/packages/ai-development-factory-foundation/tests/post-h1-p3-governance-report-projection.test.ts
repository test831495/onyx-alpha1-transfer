import { describe, expect, it } from "vitest";
import { projectP3GovernanceReport } from "../src/post-h1/p3-governance-report-projection";

const candidate = (disposition: "PROJECTED" | "NOT_ASSESSABLE" = "PROJECTED") => ({
  authority: "NON_AUTHORIZING" as const,
  disposition,
  evaluationEpochMilliseconds: 1772300000100,
  target: { repository: "test831495/onyx-alpha1-transfer", baseBranch: "main", headSha: "b".repeat(40), prNumber: 29 },
  lifecycle: { state: "LOCALLY_ACCEPTED", currentGate: "LOCAL", authoritativeTransitionPerformed: false as const },
  predecessor: { drift: { outcome: disposition === "PROJECTED" ? "MATCH" : "NOT_ASSESSABLE", reasons: disposition === "PROJECTED" ? [] : ["EVIDENCE_STALE"], authority: "NON_AUTHORIZING" as const }, readiness: { outcome: "TECHNICALLY_READY", authority: "NON_AUTHORIZING" as const }, closure: { outcome: "NOT_ASSESSABLE", authority: "NON_AUTHORIZING" as const }, manifest: { manifestHash: "c".repeat(64), authority: "NON_AUTHORIZING" as const } },
  blockers: disposition === "PROJECTED" ? [] : ["EVIDENCE_STALE"],
  warnings: [], nextGate: "OWNER_REVIEW", reopeningTriggers: ["HEAD_DRIFT", "EVIDENCE_STALE"], requiredHumanActions: [], ownerDecisions: ["OWNER_APPROVAL_REMAINS_REQUIRED"],
  evidenceReferences: [{ id: "z", hash: "a".repeat(64) }, { id: "a", hash: "b".repeat(64) }],
  provenance: [{ id: "z-source", hash: "b".repeat(64) }, { id: "a-source", hash: "a".repeat(64) }],
});

describe("Post-H1 P3 governance report projection", () => {
  it("projects a stable bounded immutable non-authorizing governance report", () => {
    const report = projectP3GovernanceReport(candidate() as never);
    expect(report.authority).toBe("NON_AUTHORIZING");
    expect(report.disposition).toBe("PROJECTED");
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.evidenceReferences)).toBe(true);
  });

  it("preserves P2 evidence manifest references without inventing evidence", () => {
    const report = projectP3GovernanceReport(candidate() as never);
    expect(report.evidenceManifestHash).toBe("c".repeat(64));
    expect(report.evidenceReferences).toHaveLength(2);
    expect(report.provenance).toHaveLength(2);
  });

  it("canonicalizes governance report ordering and stable hash inputs", () => {
    const first = projectP3GovernanceReport(candidate() as never);
    const reordered = candidate();
    reordered.evidenceReferences.reverse(); reordered.provenance.reverse(); reordered.reopeningTriggers.reverse();
    const second = projectP3GovernanceReport(reordered as never);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.evidenceReferences.map((entry) => (entry as { id: string }).id)).toEqual(["a", "z"]);
  });

  it("produces a bounded target-bound factual non-authorizing PR body proposal", () => {
    const report = projectP3GovernanceReport(candidate() as never);
    expect(report.prBodyProposal?.authority).toBe("NON_AUTHORIZING");
    expect(report.prBodyProposal?.body).toContain("non-authorizing");
    expect(report.prBodyProposal?.body.length).toBeLessThanOrEqual(4096);
  });

  it("suppresses the PR body proposal when required facts are unsafe or invalid", () => {
    expect(projectP3GovernanceReport(candidate("NOT_ASSESSABLE") as never).prBodyProposal).toBeUndefined();
  });

  it("produces identical recursively immutable output for identical input", () => {
    const first = projectP3GovernanceReport(candidate() as never);
    const second = projectP3GovernanceReport(candidate() as never);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first.prBodyProposal!)).toBe(true);
  });
});