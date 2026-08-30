import { cloneFreeze, inspectRecordSnapshot } from "../factory-constitution";
import { sha256 } from "./p2-evidence-normalization";
import type {
  P4AssuranceProfile,
  P4CandidateIdentity,
  P4EvidenceCompletenessMatrix,
  P4ResidualRisk,
} from "./p4-governance-assurance-contracts";
import type { P4GovernanceAssuranceResult } from "./p4-governance-assurance";
import type { MainClosureResult, MergeReadinessResult } from "./verification-engine";

export type P4MergeReadinessCertificate = Readonly<{
  authority: "NON_AUTHORIZING";
  disposition: "ASSURED" | "NOT_ASSESSABLE";
  candidate: P4CandidateIdentity;
  candidateHash: string;
  readinessOutcome: string;
  readinessReasons: readonly string[];
  freshnessState: Readonly<{
    isFresh: boolean;
    maxAgeMilliseconds: number;
  }>;
  projectedGate: string;
  reopeningTriggers: readonly string[];
  evidenceCompletenessMatrix: P4EvidenceCompletenessMatrix;
  acceptanceCoverage: Readonly<{
    totalRequired: number;
    validatedCount: number;
    complete: boolean;
  }>;
  blockers: readonly string[];
  warnings: readonly string[];
  requiredHumanActions: readonly string[];
  ownerDecisions: readonly string[];
  evidenceSetHash: string;
  certificateHash: string;
  evaluationEpochMilliseconds: number;
  provenance: readonly unknown[];
}>;

export type P4MainClosureCertificate = Readonly<{
  authority: "NON_AUTHORIZING";
  disposition: "ASSURED" | "NOT_ASSESSABLE";
  candidate: P4CandidateIdentity;
  candidateHash: string;
  closureOutcome: string;
  closureTopology: Readonly<{
    mergeCommit: string;
    mainLineage: boolean;
    commitsReachable: boolean;
    fileScopeIncorporated: boolean;
  }>;
  mainSynchronization: Readonly<{
    localMainSha: string;
    originMainSha: string;
    synchronized: boolean;
  }>;
  postMergeValidation: Readonly<{
    packageTestsPassed: boolean;
    monorepoTypecheckPassed: boolean;
  }>;
  acceptanceCoverage: Readonly<{
    totalRequired: number;
    validatedCount: number;
    complete: boolean;
  }>;
  residualRisks: readonly P4ResidualRisk[];
  blockers: readonly string[];
  warnings: readonly string[];
  invalidationTriggers: readonly string[];
  evidenceSetHash: string;
  certificateHash: string;
  evaluationEpochMilliseconds: number;
  provenance: readonly unknown[];
}>;

export type P4AssuranceReport = Readonly<{
  authority: "NON_AUTHORIZING";
  profile: P4AssuranceProfile;
  candidateHash: string;
  targetSummary: string;
  disposition: "ASSURED" | "NOT_ASSESSABLE";
  readinessSummary?: string;
  closureSummary?: string;
  evidenceCompletenessSummary: string;
  blockers: readonly string[];
  warnings: readonly string[];
  residualRisks: readonly P4ResidualRisk[];
  reportHash: string;
  evaluationEpochMilliseconds: number;
}>;

export const projectP4MergeReadinessCertificate = (
  assuranceResult: P4GovernanceAssuranceResult,
  predecessorReadiness?: MergeReadinessResult,
  predecessorGate?: string
): P4MergeReadinessCertificate => {
  try {
    const candidate = assuranceResult.candidate;
    const disposition = assuranceResult.disposition;
    const readinessOutcome = predecessorReadiness?.outcome ?? "NOT_ASSESSABLE";
    const readinessReasons = assuranceResult.blockers;
    const projectedGate = predecessorGate ?? (disposition === "ASSURED" ? "OWNER_REVIEW" : "PROVIDE_CURRENT_EVIDENCE");

    const matrix = assuranceResult.evidenceCompletenessMatrix;
    const isFresh = matrix.staleCount === 0;

    const certPayload = {
      authority: "NON_AUTHORIZING" as const,
      disposition,
      candidate,
      candidateHash: assuranceResult.candidateHash,
      readinessOutcome,
      readinessReasons,
      freshnessState: {
        isFresh,
        maxAgeMilliseconds: 86400000,
      },
      projectedGate,
      reopeningTriggers: assuranceResult.invalidationTriggers,
      evidenceCompletenessMatrix: matrix,
      acceptanceCoverage: {
        totalRequired: 20,
        validatedCount: matrix.presentCount,
        complete: matrix.missingCount === 0,
      },
      blockers: assuranceResult.blockers,
      warnings: assuranceResult.warnings,
      requiredHumanActions: assuranceResult.requiredHumanActions,
      ownerDecisions: assuranceResult.ownerDecisions,
      evidenceSetHash: assuranceResult.evidenceBundle.evidenceSetHash,
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
      provenance: assuranceResult.provenance,
    };

    const certificateHash = sha256(JSON.stringify(certPayload));

    return cloneFreeze({
      ...certPayload,
      certificateHash,
    });
  } catch {
    return cloneFreeze({
      authority: "NON_AUTHORIZING" as const,
      disposition: "NOT_ASSESSABLE" as const,
      candidate: assuranceResult.candidate,
      candidateHash: "",
      readinessOutcome: "NOT_ASSESSABLE",
      readinessReasons: ["CERTIFICATE_PROJECTION_FAILED"],
      freshnessState: {
        isFresh: false,
        maxAgeMilliseconds: 0,
      },
      projectedGate: "PROVIDE_CURRENT_EVIDENCE",
      reopeningTriggers: ["EVIDENCE_UNAVAILABLE"],
      evidenceCompletenessMatrix: assuranceResult.evidenceCompletenessMatrix,
      acceptanceCoverage: {
        totalRequired: 20,
        validatedCount: 0,
        complete: false,
      },
      blockers: ["CERTIFICATE_PROJECTION_FAILED"],
      warnings: [],
      requiredHumanActions: ["Re-evaluate with valid inputs."],
      ownerDecisions: [],
      evidenceSetHash: "",
      certificateHash: sha256("MERGE_READINESS_CERTIFICATE_NOT_ASSESSABLE"),
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
      provenance: [],
    });
  }
};

export const projectP4MainClosureCertificate = (
  assuranceResult: P4GovernanceAssuranceResult,
  predecessorClosure?: MainClosureResult,
  suppliedClosureFacts?: unknown
): P4MainClosureCertificate => {
  try {
    const candidate = assuranceResult.candidate;
    const disposition = assuranceResult.disposition;
    const closureOutcome = predecessorClosure?.outcome ?? "NOT_ASSESSABLE";

    const inspected = inspectRecordSnapshot(suppliedClosureFacts);
    const facts = inspected.valid
      ? (inspected.snapshot as Record<string, unknown>)
      : {};

    const mergeCommit = typeof facts.mergeCommit === "string" ? facts.mergeCommit : "";
    const mainLineage = facts.mainLineage === true;
    const commitsReachable = facts.commitsReachable === true;
    const fileScopeIncorporated = facts.fileScopeIncorporated === true;

    const localMainSha = typeof facts.localMainSha === "string" ? facts.localMainSha : "";
    const originMainSha = typeof facts.originMainSha === "string" ? facts.originMainSha : "";
    const synchronized =
      localMainSha.length === 40 &&
      originMainSha.length === 40 &&
      localMainSha === originMainSha &&
      localMainSha === mergeCommit;

    const packageTestsPassed = facts.packageTestsPassed === true;
    const monorepoTypecheckPassed = facts.monorepoTypecheckPassed === true;

    const matrix = assuranceResult.evidenceCompletenessMatrix;

    const certPayload = {
      authority: "NON_AUTHORIZING" as const,
      disposition,
      candidate,
      candidateHash: assuranceResult.candidateHash,
      closureOutcome,
      closureTopology: {
        mergeCommit,
        mainLineage,
        commitsReachable,
        fileScopeIncorporated,
      },
      mainSynchronization: {
        localMainSha,
        originMainSha,
        synchronized,
      },
      postMergeValidation: {
        packageTestsPassed,
        monorepoTypecheckPassed,
      },
      acceptanceCoverage: {
        totalRequired: 20,
        validatedCount: matrix.presentCount,
        complete: matrix.missingCount === 0,
      },
      residualRisks: assuranceResult.residualRisks,
      blockers: assuranceResult.blockers,
      warnings: assuranceResult.warnings,
      invalidationTriggers: assuranceResult.invalidationTriggers,
      evidenceSetHash: assuranceResult.evidenceBundle.evidenceSetHash,
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
      provenance: assuranceResult.provenance,
    };

    const certificateHash = sha256(JSON.stringify(certPayload));

    return cloneFreeze({
      ...certPayload,
      certificateHash,
    });
  } catch {
    return cloneFreeze({
      authority: "NON_AUTHORIZING" as const,
      disposition: "NOT_ASSESSABLE" as const,
      candidate: assuranceResult.candidate,
      candidateHash: "",
      closureOutcome: "NOT_ASSESSABLE",
      closureTopology: {
        mergeCommit: "",
        mainLineage: false,
        commitsReachable: false,
        fileScopeIncorporated: false,
      },
      mainSynchronization: {
        localMainSha: "",
        originMainSha: "",
        synchronized: false,
      },
      postMergeValidation: {
        packageTestsPassed: false,
        monorepoTypecheckPassed: false,
      },
      acceptanceCoverage: {
        totalRequired: 20,
        validatedCount: 0,
        complete: false,
      },
      residualRisks: [],
      blockers: ["CLOSURE_CERTIFICATE_PROJECTION_FAILED"],
      warnings: [],
      invalidationTriggers: ["EVIDENCE_UNAVAILABLE"],
      evidenceSetHash: "",
      certificateHash: sha256("MAIN_CLOSURE_CERTIFICATE_NOT_ASSESSABLE"),
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
      provenance: [],
    });
  }
};

export const projectP4AssuranceReport = (
  assuranceResult: P4GovernanceAssuranceResult,
  mergeCert?: P4MergeReadinessCertificate,
  closureCert?: P4MainClosureCertificate
): P4AssuranceReport => {
  try {
    const candidate = assuranceResult.candidate;
    const targetSummary = `Target: ${candidate.repository} (head: ${candidate.headSha.slice(0, 7)}, base: ${candidate.baseBranch})`;
    const evidenceCompletenessSummary = `Evidence: ${assuranceResult.evidenceCompletenessMatrix.presentCount}/${assuranceResult.evidenceCompletenessMatrix.totalClasses} classes present, ${assuranceResult.evidenceCompletenessMatrix.missingCount} missing`;

    const readinessSummary = mergeCert
      ? `Readiness: ${mergeCert.readinessOutcome} (Gate: ${mergeCert.projectedGate})`
      : undefined;

    const closureSummary = closureCert
      ? `Closure: ${closureCert.closureOutcome} (Merge commit: ${closureCert.closureTopology.mergeCommit.slice(0, 7)})`
      : undefined;

    const reportPayload = {
      authority: "NON_AUTHORIZING" as const,
      profile: assuranceResult.profile,
      candidateHash: assuranceResult.candidateHash,
      targetSummary,
      disposition: assuranceResult.disposition,
      readinessSummary,
      closureSummary,
      evidenceCompletenessSummary,
      blockers: assuranceResult.blockers,
      warnings: assuranceResult.warnings,
      residualRisks: assuranceResult.residualRisks,
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
    };

    const reportHash = sha256(JSON.stringify(reportPayload));

    return cloneFreeze({
      ...reportPayload,
      reportHash,
    });
  } catch {
    return cloneFreeze({
      authority: "NON_AUTHORIZING" as const,
      profile: assuranceResult.profile,
      candidateHash: "",
      targetSummary: "TARGET_UNAVAILABLE",
      disposition: "NOT_ASSESSABLE" as const,
      evidenceCompletenessSummary: "EVIDENCE_UNAVAILABLE",
      blockers: ["ASSURANCE_REPORT_PROJECTION_FAILED"],
      warnings: [],
      residualRisks: [],
      reportHash: sha256("ASSURANCE_REPORT_NOT_ASSESSABLE"),
      evaluationEpochMilliseconds: assuranceResult.evaluationEpochMilliseconds,
    });
  }
};
