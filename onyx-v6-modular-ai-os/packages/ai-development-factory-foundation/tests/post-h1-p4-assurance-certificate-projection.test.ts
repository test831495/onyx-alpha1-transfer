import { describe, expect, it } from "vitest";
import {
  computeAcceptanceRegistryFingerprint,
  evaluateP4GovernanceAssurance,
  type P4GovernanceAssuranceResult,
} from "../src/post-h1/p4-governance-assurance";
import {
  P4_ACCEPTANCE_REGISTRY,
} from "../src/post-h1/p4-acceptance-registry";
import {
  projectP4AssuranceReport,
  projectP4MainClosureCertificate,
  projectP4MergeReadinessCertificate,
} from "../src/post-h1/p4-assurance-certificate-projection";
import type { P4CandidateIdentity, P4GovernanceAssuranceInput } from "../src/post-h1/p4-governance-assurance-contracts";

describe("Post-H1 P4 Assurance Certificate & Report Projection (Wave P4-C & P4-D)", () => {
  const canonicalFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);

  const testCandidate: P4CandidateIdentity = Object.freeze({
    repository: "test831495/onyx-alpha1-transfer",
    baseBranch: "main",
    baseSha: "05155a33209de25ba7805d61bf337366b82ff730",
    headBranch: "feature/post-h1-p4-governance-assurance-foundation",
    headSha: "05155a33209de25ba7805d61bf337366b82ff730",
    prNumber: 30,
    commits: ["05155a33209de25ba7805d61bf337366b82ff730"],
    changedPaths: [
      "packages/ai-development-factory-foundation/src/post-h1/p4-governance-assurance.ts",
    ],
    targetLockFingerprint: "fingerprint-001",
  });

  const createAssuranceInput = (
    profile: P4GovernanceAssuranceInput["profile"]
  ): P4GovernanceAssuranceInput => ({
    evaluationEpochMilliseconds: 1756512000000,
    profile,
    candidate: testCandidate,
    acceptanceRegistry: {
      id: "P4_ACCEPTANCE_REGISTRY",
      count: 20,
      fingerprint: canonicalFingerprint,
    },
    evidenceItems: [
      {
        id: "ev-1",
        evidenceClass: "FOCUSED_TESTS",
        hash: "hash-focused-1",
        provenance: "vitest",
        observedAtEpochMilliseconds: 1756512000000,
        fresh: true,
      },
    ],
    provenance: [{ id: "prov-1", agent: "p4-runner" }],
  });

  it("POSTH1-P4-ASSURE-002: projects merge-readiness assurance certificate summarizing sealed predecessor results", () => {
    const assurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("PR_MERGE_READINESS_ASSURANCE")
    );

    const cert = projectP4MergeReadinessCertificate(assurance, {
      outcome: "TECHNICALLY_READY",
      authority: "NON_AUTHORIZING",
    });

    expect(cert.authority).toBe("NON_AUTHORIZING");
    expect(cert.candidate.repository).toBe("test831495/onyx-alpha1-transfer");
    expect(cert.readinessOutcome).toBe("TECHNICALLY_READY");
    expect(cert.certificateHash).toBeDefined();
    expect(cert.certificateHash.length).toBe(64);
  });

  it("POSTH1-P4-ASSURE-003: projects main-closure assurance certificate summarizing closure topology and sync", () => {
    const assurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("MAIN_CLOSURE_ASSURANCE")
    );

    const closureCert = projectP4MainClosureCertificate(
      assurance,
      {
        outcome: "MAIN_CLOSED",
        authority: "NON_AUTHORIZING",
      },
      {
        mergeCommit: "05155a33209de25ba7805d61bf337366b82ff730",
        mainLineage: true,
        commitsReachable: true,
        fileScopeIncorporated: true,
        localMainSha: "05155a33209de25ba7805d61bf337366b82ff730",
        originMainSha: "05155a33209de25ba7805d61bf337366b82ff730",
        packageTestsPassed: true,
        monorepoTypecheckPassed: true,
      }
    );

    expect(closureCert.authority).toBe("NON_AUTHORIZING");
    expect(closureCert.closureOutcome).toBe("MAIN_CLOSED");
    expect(closureCert.closureTopology.mergeCommit).toBe(
      "05155a33209de25ba7805d61bf337366b82ff730"
    );
    expect(closureCert.mainSynchronization.synchronized).toBe(true);
    expect(closureCert.certificateHash).toBeDefined();
    expect(closureCert.certificateHash.length).toBe(64);
  });

  it("POSTH1-P4-ASSURE-004: projects bounded residual risk records requiring Owner decisions without accepting risk", () => {
    const inputWithRisks: P4GovernanceAssuranceInput = {
      ...createAssuranceInput("PR_MERGE_READINESS_ASSURANCE"),
      residualRisks: [
        {
          riskId: "RISK-001",
          description: "Deferred non-critical telemetry validation",
          affectedProfile: "PR_MERGE_READINESS_ASSURANCE",
          supportingEvidenceReferences: ["ev-1"],
          severity: "LOW",
          treatmentStatus: "UNRESOLVED",
          ownerDecisionRequired: true,
          reassessmentTrigger: "NEXT_MINOR_RELEASE",
          reopeningTrigger: "TELEMETRY_FAILURE",
        },
      ],
    };

    const assurance = evaluateP4GovernanceAssurance(inputWithRisks);
    expect(assurance.residualRisks.length).toBe(1);
    expect(assurance.residualRisks[0]?.riskId).toBe("RISK-001");
    expect(assurance.ownerDecisions).toContain(
      "RESIDUAL_RISK_OWNER_DECISION_REQUIRED:RISK-001"
    );
    // Residual risk is projected, but P4 does not accept risk
    expect(assurance.residualRisks[0]?.treatmentStatus).toBe("UNRESOLVED");
  });

  it("POSTH1-P4-ASSURE-005: projects deterministic non-authorizing assurance report free of raw secrets", () => {
    const assurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("LOCAL_IMPLEMENTATION_ASSURANCE")
    );

    const report = projectP4AssuranceReport(assurance);
    expect(report.authority).toBe("NON_AUTHORIZING");
    expect(report.profile).toBe("LOCAL_IMPLEMENTATION_ASSURANCE");
    expect(report.reportHash).toBeDefined();
    expect(report.reportHash.length).toBe(64);

    // Verify deterministic reportHash for identical input
    const report2 = projectP4AssuranceReport(assurance);
    expect(report.reportHash).toBe(report2.reportHash);
  });

  it("P4-PR30-FINDING-006: certificate acceptance coverage dynamically computes profile-required totals", () => {
    const localAssurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("LOCAL_IMPLEMENTATION_ASSURANCE")
    );
    const prAssurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("PR_MERGE_READINESS_ASSURANCE")
    );
    const closureAssurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("MAIN_CLOSURE_ASSURANCE")
    );

    const localCert = projectP4MergeReadinessCertificate(localAssurance);
    const prCert = projectP4MergeReadinessCertificate(prAssurance);
    const closureCert = projectP4MainClosureCertificate(closureAssurance);

    // Local profile has 7 not applicable classes -> 13 required
    expect(localCert.acceptanceCoverage.totalRequired).toBe(13);

    // PR merge readiness profile has 4 not applicable classes -> 16 required
    expect(prCert.acceptanceCoverage.totalRequired).toBe(16);

    // Main closure profile has 0 not applicable classes -> 20 required
    expect(closureCert.acceptanceCoverage.totalRequired).toBe(20);
  });

  it("POSTH1-P4-SAFE-001: attaches NON_AUTHORIZING authority marker to every public P4 output", () => {
    const assurance = evaluateP4GovernanceAssurance(
      createAssuranceInput("LOCAL_IMPLEMENTATION_ASSURANCE")
    );
    const mergeCert = projectP4MergeReadinessCertificate(assurance);
    const closureCert = projectP4MainClosureCertificate(assurance);
    const report = projectP4AssuranceReport(assurance);

    expect(assurance.authority).toBe("NON_AUTHORIZING");
    expect(assurance.evidenceBundle.authority).toBe("NON_AUTHORIZING");
    expect(assurance.evidenceCompletenessMatrix.authority).toBe("NON_AUTHORIZING");
    expect(mergeCert.authority).toBe("NON_AUTHORIZING");
    expect(closureCert.authority).toBe("NON_AUTHORIZING");
    expect(report.authority).toBe("NON_AUTHORIZING");
  });

  it("POSTH1-P4-SAFE-004: uses caller-supplied epoch executes no ambient time or IO and returns recursively frozen output", () => {
    const epoch = 1756512000000;
    const input: P4GovernanceAssuranceInput = {
      ...createAssuranceInput("LOCAL_IMPLEMENTATION_ASSURANCE"),
      evaluationEpochMilliseconds: epoch,
    };

    const assurance = evaluateP4GovernanceAssurance(input);
    expect(assurance.evaluationEpochMilliseconds).toBe(epoch);

    // Test recursive immutability
    expect(Object.isFrozen(assurance)).toBe(true);
    expect(Object.isFrozen(assurance.candidate)).toBe(true);
    expect(Object.isFrozen(assurance.evidenceBundle)).toBe(true);
    expect(Object.isFrozen(assurance.blockers)).toBe(true);

    const report = projectP4AssuranceReport(assurance);
    expect(Object.isFrozen(report)).toBe(true);
  });
});
