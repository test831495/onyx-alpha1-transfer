import { describe, expect, it } from "vitest";
import { assessMainClosure, assessMergeReadiness, verifyLifecycle } from "../src/post-h1/verification-engine";

const complete = { prOpen: true, draft: false, targetExact: true, headFresh: true, commitScopeValid: true, checksPassed: true, approvalsPresent: true, threadsResolved: true, findingsClosed: true, coverageComplete: true, evidenceFresh: true, conflicts: false, rulesetVisible: true, ownerAuthorization: false };

describe("POST-H1 P1 verification", () => {
  it("VERIFY-C01 keeps technically ready distinct from Owner merge authority", () => expect(assessMergeReadiness(complete).outcome).toBe("APPROVAL_REQUIRED"));
  it("VERIFY-C02 classifies unresolved threads, pending checks, finding remediation, and target drift", () => {
    expect(assessMergeReadiness({ ...complete, threadsResolved: false }).outcome).toBe("THREAD_RESOLUTION_REQUIRED");
    expect(assessMergeReadiness({ ...complete, checksPassed: false }).outcome).toBe("CHECKS_PENDING");
    expect(assessMergeReadiness({ ...complete, findingsClosed: false }).outcome).toBe("FINDING_REMEDIATION_REQUIRED");
    expect(assessMergeReadiness({ ...complete, targetExact: false }).outcome).toBe("TARGET_DRIFT");
  });
  it("VERIFY-C03 requires reachability but makes branch deletion optional for main closure", () => {
    const closure = { prMergedClosed: true, mainLineage: true, commitsReachable: true, fileScopeIncorporated: true, validationCurrent: true, unauthorizedReleaseClaim: false, finalMarker: true, handoff: true };
    expect(assessMainClosure(closure).outcome).toBe("MAIN_CLOSED");
    expect(assessMainClosure({ ...closure, commitsReachable: false }).outcome).toBe("NOT_ASSESSABLE");
  });
  it("VERIFY-C04 returns non-authorizing deterministic verification evidence", () => expect(verifyLifecycle({ outcome: "PASS" })).toEqual(verifyLifecycle({ outcome: "PASS" })));
});