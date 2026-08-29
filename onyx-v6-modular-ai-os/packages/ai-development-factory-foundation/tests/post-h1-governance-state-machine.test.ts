import { describe, expect, it } from "vitest";
import { projectGovernanceReport } from "../src/post-h1/governance-report";
import { validateTransition } from "../src/post-h1/governance-state-machine";

describe("POST-H1 P1 state and report", () => {
  it("STATE-C01 rejects skipped transitions and permits a supplied reopening lineage", () => {
    expect(validateTransition("PLANNED", "MERGE_READY", { targetLocked: true, ownerDecision: true }).outcome).toBe("BLOCKED");
    expect(validateTransition("MAIN_CLOSED", "REOPENED", { targetLocked: true, ownerDecision: true, reopeningRecord: true }).outcome).toBe("ALLOWED");
  });
  it("STATE-C02 does not mistake verification for authorization", () => expect(validateTransition("LOCALLY_ACCEPTED", "COMMITTED", { targetLocked: true, ownerDecision: false }).outcome).toBe("BLOCKED"));
  it("REPORT-C01 produces a frozen, deterministic, complete report without mutation capabilities", () => {
    const report = projectGovernanceReport({ currentState: "LOCALLY_ACCEPTED", currentGate: "LOCAL", acceptedMarkers: [], targetLock: "locked", lineage: [], acceptanceSummary: "complete", findingSummary: "none", evidenceFreshnessSummary: "fresh", knownLimitations: [], residualRisks: [], authorityBoundaries: ["OWNER_MERGE_REQUIRED"], mergeReadiness: "APPROVAL_REQUIRED", mainClosure: "NOT_ASSESSABLE", nextGate: "INDEPENDENT_REVIEW", reopeningTriggers: [], verificationOutcome: "PASS", reasonCodes: [] });
    expect(Object.isFrozen(report)).toBe(true); expect(report).toEqual(projectGovernanceReport({ ...report }));
  });
});