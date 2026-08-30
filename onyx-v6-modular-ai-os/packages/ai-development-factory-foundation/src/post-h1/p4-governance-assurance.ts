import { cloneFreeze, inspectRecordSnapshot } from "../factory-constitution";
import { sha256 } from "./p2-evidence-normalization";
import { P4_ACCEPTANCE_REGISTRY } from "./p4-acceptance-registry";
import {
  P4_BOUNDS,
  P4_EVIDENCE_CLASSES,
  validateP4GovernanceAssuranceInput,
  type P4AssuranceProfile,
  type P4CandidateIdentity,
  type P4EvidenceBundle,
  type P4EvidenceBundleItem,
  type P4EvidenceClass,
  type P4EvidenceCompletenessEntry,
  type P4EvidenceCompletenessMatrix,
  type P4GovernanceAssuranceInput,
  type P4ResidualRisk,
} from "./p4-governance-assurance-contracts";

export type P4GovernanceAssuranceDisposition = "ASSURED" | "NOT_ASSESSABLE";

export type P4GovernanceAssuranceResult = Readonly<{
  authority: "NON_AUTHORIZING";
  disposition: P4GovernanceAssuranceDisposition;
  evaluationEpochMilliseconds: number;
  profile: P4AssuranceProfile;
  candidate: P4CandidateIdentity;
  candidateHash: string;
  evidenceCompletenessMatrix: P4EvidenceCompletenessMatrix;
  evidenceBundle: P4EvidenceBundle;
  blockers: readonly string[];
  warnings: readonly string[];
  invalidationTriggers: readonly string[];
  requiredHumanActions: readonly string[];
  ownerDecisions: readonly string[];
  residualRisks: readonly P4ResidualRisk[];
  provenance: readonly unknown[];
}>;

const stableStrings = (items: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(items)].sort());

export const computeAcceptanceRegistryFingerprint = (
  registry: readonly unknown[]
): string => {
  const canonical = [...registry]
    .map((item) => {
      const inspected = inspectRecordSnapshot(item);
      if (!inspected.valid) return { id: "" };
      const r = inspected.snapshot as Record<string, unknown>;
      return {
        id: typeof r.id === "string" ? r.id : "",
        family: typeof r.family === "string" ? r.family : "",
        invariant: typeof r.invariant === "string" ? r.invariant : "",
        predecessorDependency:
          typeof r.predecessorDependency === "string"
            ? r.predecessorDependency
            : "",
        implementationWave:
          typeof r.implementationWave === "string" ? r.implementationWave : "",
        testTitles: Array.isArray(r.testTitles) ? [...r.testTitles].sort() : [],
        testFiles: Array.isArray(r.testFiles) ? [...r.testFiles].sort() : [],
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sha256(JSON.stringify(canonical));
};

export const computeCandidateIdentityHash = (candidate: P4CandidateIdentity): string => {
  const canonical = {
    repository: candidate.repository,
    baseBranch: candidate.baseBranch,
    baseSha: candidate.baseSha,
    headBranch: candidate.headBranch,
    headSha: candidate.headSha,
    prNumber: candidate.prNumber ?? 0,
    commits: [...(candidate.commits ?? [])].sort(),
    changedPaths: [...(candidate.changedPaths ?? [])].sort(),
    targetLockFingerprint: candidate.targetLockFingerprint ?? "",
  };
  return sha256(JSON.stringify(canonical));
};

export const computeEvidenceSetHash = (
  items: readonly P4EvidenceBundleItem[]
): string => {
  const canonical = [...items]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((item) => ({
      id: item.id,
      evidenceClass: item.evidenceClass,
      hash: item.hash,
      provenance: item.provenance,
      observedAtEpochMilliseconds: item.observedAtEpochMilliseconds,
      fresh: item.fresh,
    }));
  return sha256(JSON.stringify(canonical));
};

const getApplicableClasses = (profile: P4AssuranceProfile): Set<P4EvidenceClass> => {
  switch (profile) {
    case "LOCAL_IMPLEMENTATION_ASSURANCE":
      return new Set<P4EvidenceClass>([
        "TARGET_LOCK",
        "CANDIDATE_IDENTITY",
        "FILE_DIFF_MANIFEST",
        "FOCUSED_TESTS",
        "PACKAGE_TESTS",
        "PREDECESSOR_REGRESSION_TESTS",
        "PACKAGE_TYPECHECK",
        "MONOREPO_TYPECHECK",
        "ACCEPTANCE_COVERAGE",
        "DETERMINISTIC_BEHAVIOR",
        "HOSTILE_INPUT_TESTS",
        "PROHIBITED_CAPABILITY_SCAN",
        "SECURITY_AND_SECRET_SCAN",
      ]);
    case "PR_MERGE_READINESS_ASSURANCE":
      return new Set<P4EvidenceClass>([
        "TARGET_LOCK",
        "CANDIDATE_IDENTITY",
        "FILE_DIFF_MANIFEST",
        "FOCUSED_TESTS",
        "PACKAGE_TESTS",
        "PREDECESSOR_REGRESSION_TESTS",
        "PACKAGE_TYPECHECK",
        "MONOREPO_TYPECHECK",
        "ACCEPTANCE_COVERAGE",
        "DETERMINISTIC_BEHAVIOR",
        "HOSTILE_INPUT_TESTS",
        "PROHIBITED_CAPABILITY_SCAN",
        "SECURITY_AND_SECRET_SCAN",
        "REVIEW_FINDINGS",
        "REVIEW_THREAD_RESOLUTION",
        "APPROVAL_EVIDENCE",
      ]);
    case "MAIN_CLOSURE_ASSURANCE":
      return new Set<P4EvidenceClass>(P4_EVIDENCE_CLASSES);
  }
};

export const projectEvidenceCompletenessMatrix = (
  profile: P4AssuranceProfile,
  _candidate: P4CandidateIdentity,
  evidenceItems: readonly unknown[],
  suppliedFacts?: unknown
): P4EvidenceCompletenessMatrix => {
  const applicable = getApplicableClasses(profile);
  const classCountMap = new Map<string, number>();
  const itemsMap = new Map<string, Record<string, unknown>>();

  for (const item of evidenceItems) {
    const inspected = inspectRecordSnapshot(item);
    if (inspected.valid && typeof inspected.snapshot.evidenceClass === "string") {
      const cls = inspected.snapshot.evidenceClass as string;
      classCountMap.set(cls, (classCountMap.get(cls) ?? 0) + 1);
      if (!itemsMap.has(cls)) {
        itemsMap.set(cls, inspected.snapshot as Record<string, unknown>);
      }
    }
  }

  const supplied = inspectRecordSnapshot(suppliedFacts).valid
    ? (inspectRecordSnapshot(suppliedFacts).snapshot as Record<string, unknown>)
    : undefined;

  const entries: P4EvidenceCompletenessEntry[] = [];
  let presentCount = 0;
  let missingCount = 0;
  let staleCount = 0;
  let contradictoryCount = 0;
  let mismatchedCount = 0;
  let invalidatedCount = 0;
  let notApplicableCount = 0;

  for (const evidenceClass of P4_EVIDENCE_CLASSES) {
    if (!applicable.has(evidenceClass)) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "NOT_APPLICABLE",
          details: `Not required for profile ${profile}`,
        })
      );
      notApplicableCount += 1;
      continue;
    }

    const count = classCountMap.get(evidenceClass) ?? 0;
    if (count > 1) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "CONTRADICTORY",
          details: `Duplicate evidence items supplied for single-cardinality class ${evidenceClass}`,
        })
      );
      contradictoryCount += 1;
      continue;
    }

    const item = itemsMap.get(evidenceClass);
    if (!item) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "MISSING",
          details: `Mandatory evidence class ${evidenceClass} not provided`,
        })
      );
      missingCount += 1;
      continue;
    }

    if (item.fresh === false) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "STALE",
          referenceId: typeof item.id === "string" ? item.id : undefined,
          hash: typeof item.hash === "string" ? item.hash : undefined,
          details: `Evidence item ${item.id} is stale`,
        })
      );
      staleCount += 1;
      continue;
    }

    if (item.mismatched === true) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "TARGET_MISMATCHED",
          referenceId: typeof item.id === "string" ? item.id : undefined,
          hash: typeof item.hash === "string" ? item.hash : undefined,
          details: `Evidence item ${item.id} has target mismatch`,
        })
      );
      mismatchedCount += 1;
      continue;
    }

    // Check contradictory facts if supplied
    if (
      evidenceClass === "REVIEW_FINDINGS" &&
      supplied &&
      supplied.findingsClosed === true &&
      typeof supplied.unresolvedFindingCount === "number" &&
      supplied.unresolvedFindingCount > 0
    ) {
      entries.push(
        Object.freeze({
          evidenceClass,
          classification: "CONTRADICTORY",
          referenceId: typeof item.id === "string" ? item.id : undefined,
          hash: typeof item.hash === "string" ? item.hash : undefined,
          details: "Supplied findingsClosed contradicts unresolved finding count",
        })
      );
      contradictoryCount += 1;
      continue;
    }

    entries.push(
      Object.freeze({
        evidenceClass,
        classification: "PRESENT",
        referenceId: typeof item.id === "string" ? item.id : undefined,
        hash: typeof item.hash === "string" ? item.hash : undefined,
        details: `Evidence item ${item.id} present and verified`,
      })
    );
    presentCount += 1;
  }

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    totalClasses: P4_EVIDENCE_CLASSES.length,
    presentCount,
    missingCount,
    staleCount,
    contradictoryCount,
    mismatchedCount,
    invalidatedCount,
    notApplicableCount,
    entries: Object.freeze(entries),
  });
};

export const projectP4EvidenceBundle = (
  input: P4GovernanceAssuranceInput
): P4EvidenceBundle => {
  const candidateHash = computeCandidateIdentityHash(input.candidate);
  const items: P4EvidenceBundleItem[] = [];
  const seenIds = new Set<string>();
  const contradictions: string[] = [];
  const gaps: string[] = [];

  const regInspected = inspectRecordSnapshot(input.acceptanceRegistry);
  const registryId =
    regInspected.valid && typeof regInspected.snapshot.id === "string"
      ? (regInspected.snapshot.id as string)
      : "";
  const registryFingerprint =
    regInspected.valid && typeof regInspected.snapshot.fingerprint === "string"
      ? (regInspected.snapshot.fingerprint as string)
      : "";

  for (const rawItem of input.evidenceItems) {
    const inspected = inspectRecordSnapshot(rawItem);
    if (!inspected.valid) {
      contradictions.push("MALFORMED_EVIDENCE_ITEM");
      continue;
    }
    const item = inspected.snapshot as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (seenIds.has(id)) {
      contradictions.push("DUPLICATE_EVIDENCE_ID");
      continue;
    }
    seenIds.add(id);

    items.push(
      Object.freeze({
        id,
        evidenceClass: item.evidenceClass as P4EvidenceClass,
        hash: typeof item.hash === "string" ? item.hash : "",
        provenance: typeof item.provenance === "string" ? item.provenance : "",
        observedAtEpochMilliseconds:
          typeof item.observedAtEpochMilliseconds === "number"
            ? item.observedAtEpochMilliseconds
            : 0,
        fresh: item.fresh === true,
      })
    );
  }

  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const evidenceSetHash = computeEvidenceSetHash(items);

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    candidateHash,
    profile: input.profile,
    registryId,
    registryFingerprint,
    evaluationEpochMilliseconds: input.evaluationEpochMilliseconds,
    items: Object.freeze(items),
    evidenceSetHash,
    gaps: stableStrings(gaps),
    contradictions: stableStrings(contradictions),
  });
};

export const projectP4AssuranceInvalidation = (
  input: P4GovernanceAssuranceInput,
  matrix: P4EvidenceCompletenessMatrix
): readonly string[] => {
  const triggers: string[] = [];

  const canonicalFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);
  const regInspected = inspectRecordSnapshot(input.acceptanceRegistry);
  if (
    !regInspected.valid ||
    regInspected.snapshot.id !== "P4_ACCEPTANCE_REGISTRY" ||
    regInspected.snapshot.fingerprint !== canonicalFingerprint
  ) {
    triggers.push("ACCEPTANCE_REGISTRY_FINGERPRINT_CHANGED");
  }

  if (matrix.missingCount > 0) {
    triggers.push("MANDATORY_EVIDENCE_MISSING");
  }

  if (matrix.staleCount > 0) {
    triggers.push("EVIDENCE_STALE");
  }

  if (matrix.contradictoryCount > 0) {
    triggers.push("CONTRADICTORY_EVIDENCE_DETECTED");
  }

  if (matrix.mismatchedCount > 0) {
    triggers.push("TARGET_OR_SCOPE_MISMATCH");
  }

  const supplied = inspectRecordSnapshot(input.suppliedFacts).valid
    ? (inspectRecordSnapshot(input.suppliedFacts).snapshot as Record<string, unknown>)
    : undefined;

  if (supplied) {
    if (supplied.mainMovedBeyondClosureTarget === true) {
      triggers.push("MAIN_MOVED_BEYOND_CLOSURE_TARGET");
    }
    if (supplied.approvalDismissed === true) {
      triggers.push("APPROVAL_DISMISSED_OR_INVALIDATED");
    }
    if (supplied.reviewFindingAdded === true) {
      triggers.push("REVIEW_FINDING_ADDED");
    }
    if (supplied.mergeCommitMismatch === true) {
      triggers.push("MERGE_COMMIT_MISMATCH");
    }
  }

  return stableStrings(triggers);
};

export const evaluateP4GovernanceAssurance = (
  rawInput: unknown
): P4GovernanceAssuranceResult => {
  const validation = validateP4GovernanceAssuranceInput(rawInput);
  if (validation.outcome !== "PASS") {
    return cloneFreeze({
      authority: "NON_AUTHORIZING" as const,
      disposition: "NOT_ASSESSABLE" as const,
      evaluationEpochMilliseconds: 0,
      profile: "LOCAL_IMPLEMENTATION_ASSURANCE" as const,
      candidate: {
        repository: "",
        baseBranch: "",
        baseSha: "",
        headBranch: "",
        headSha: "",
        commits: [],
        changedPaths: [],
      },
      candidateHash: "",
      evidenceCompletenessMatrix: {
        authority: "NON_AUTHORIZING" as const,
        totalClasses: P4_EVIDENCE_CLASSES.length,
        presentCount: 0,
        missingCount: P4_EVIDENCE_CLASSES.length,
        staleCount: 0,
        contradictoryCount: 0,
        mismatchedCount: 0,
        invalidatedCount: 0,
        notApplicableCount: 0,
        entries: [],
      },
      evidenceBundle: {
        authority: "NON_AUTHORIZING" as const,
        candidateHash: "",
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE" as const,
        registryId: "",
        registryFingerprint: "",
        evaluationEpochMilliseconds: 0,
        items: [],
        evidenceSetHash: "",
        gaps: [],
        contradictions: [],
      },
      blockers: ["P4_INPUT_UNVERIFIABLE"],
      warnings: [],
      invalidationTriggers: ["P4_INPUT_UNVERIFIABLE"],
      requiredHumanActions: ["Provide complete verified input facts."],
      ownerDecisions: [],
      residualRisks: [],
      provenance: [],
    });
  }

  const inspected = inspectRecordSnapshot(rawInput);
  const input = inspected.snapshot as unknown as P4GovernanceAssuranceInput;

  const candidate = input.candidate;
  const candidateHash = computeCandidateIdentityHash(candidate);

  let isCrossTarget = false;
  if (!candidate.headSha || candidate.headSha.length !== 40) {
    isCrossTarget = true;
  }
  if (input.targetLock !== undefined) {
    const tlInspected = inspectRecordSnapshot(input.targetLock);
    if (tlInspected.valid) {
      const tl = tlInspected.snapshot as Record<string, unknown>;
      if (typeof tl.repository === "string" && tl.repository.length > 0 && tl.repository !== candidate.repository) {
        isCrossTarget = true;
      }
      if (typeof tl.baseBranch === "string" && tl.baseBranch.length > 0 && tl.baseBranch !== candidate.baseBranch) {
        isCrossTarget = true;
      }
      if (typeof tl.headSha === "string" && tl.headSha.length === 40 && tl.headSha !== candidate.headSha) {
        isCrossTarget = true;
      }
    }
  }
  if (input.reconciliationInput !== undefined) {
    const reconInspected = inspectRecordSnapshot(input.reconciliationInput);
    if (reconInspected.valid) {
      const recon = reconInspected.snapshot as Record<string, unknown>;
      const repoFactsInspected = inspectRecordSnapshot(recon.repositoryFacts);
      if (repoFactsInspected.valid) {
        const rf = repoFactsInspected.snapshot as Record<string, unknown>;
        const expectedRepo = `${rf.owner}/${rf.repository}`;
        if (rf.owner && rf.repository && candidate.repository !== expectedRepo) {
          isCrossTarget = true;
        }
      }
    }
  }

  const canonicalFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);
  const regInspected = inspectRecordSnapshot(input.acceptanceRegistry);
  const isRegistryUnverified =
    !regInspected.valid ||
    regInspected.snapshot.id !== "P4_ACCEPTANCE_REGISTRY" ||
    regInspected.snapshot.fingerprint !== canonicalFingerprint;

  const matrix = projectEvidenceCompletenessMatrix(
    input.profile,
    candidate,
    input.evidenceItems,
    input.suppliedFacts
  );

  const bundle = projectP4EvidenceBundle(input);
  const invalidationTriggers = projectP4AssuranceInvalidation(input, matrix);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const humanActions: string[] = [];
  const ownerDecisions: string[] = [];

  if (isCrossTarget) {
    blockers.push("CROSS_CANDIDATE_OR_TARGET_MISMATCH");
  }
  if (isRegistryUnverified) {
    blockers.push("ACCEPTANCE_REGISTRY_UNVERIFIED");
  }
  if (matrix.contradictoryCount > 0 || bundle.contradictions.length > 0) {
    blockers.push("CONTRADICTORY_SUPPLIED_FACTS");
  }
  if (matrix.staleCount > 0) {
    blockers.push("EVIDENCE_STALE");
  }
  if (matrix.missingCount > 0) {
    blockers.push("MANDATORY_EVIDENCE_MISSING");
  }

  const rawRisks = Array.isArray(input.residualRisks) ? input.residualRisks : [];
  const residualRisks: P4ResidualRisk[] = [];
  for (const risk of rawRisks) {
    const rInspected = inspectRecordSnapshot(risk);
    if (rInspected.valid) {
      const r = rInspected.snapshot as Record<string, unknown>;
      const riskId = typeof r.riskId === "string" && r.riskId.trim().length > 0 ? r.riskId.trim() : "";
      if (!riskId) {
        blockers.push("MALFORMED_RESIDUAL_RISK_ID");
        continue;
      }
      residualRisks.push(
        Object.freeze({
          riskId,
          description: typeof r.description === "string" ? r.description : "",
          affectedProfile: (typeof r.affectedProfile === "string"
            ? r.affectedProfile
            : input.profile) as P4AssuranceProfile,
          supportingEvidenceReferences: Array.isArray(r.supportingEvidenceReferences)
            ? (r.supportingEvidenceReferences as string[])
            : [],
          severity: (typeof r.severity === "string" ? r.severity : "MEDIUM") as
            | "LOW"
            | "MEDIUM"
            | "HIGH"
            | "CRITICAL",
          treatmentStatus: (typeof r.treatmentStatus === "string"
            ? r.treatmentStatus
            : "UNRESOLVED") as "ACCEPTED_BY_OWNER" | "UNRESOLVED" | "DEFERRED",
          ownerDecisionRequired: r.ownerDecisionRequired === true,
          reassessmentTrigger:
            typeof r.reassessmentTrigger === "string" ? r.reassessmentTrigger : "",
          reopeningTrigger:
            typeof r.reopeningTrigger === "string" ? r.reopeningTrigger : "",
        })
      );
      if (r.ownerDecisionRequired === true) {
        ownerDecisions.push(`RESIDUAL_RISK_OWNER_DECISION_REQUIRED:${riskId}`);
      }
    } else {
      blockers.push("MALFORMED_RESIDUAL_RISK");
    }
  }

  const isAssured = blockers.length === 0;

  return cloneFreeze({
    authority: "NON_AUTHORIZING" as const,
    disposition: isAssured ? ("ASSURED" as const) : ("NOT_ASSESSABLE" as const),
    evaluationEpochMilliseconds: input.evaluationEpochMilliseconds,
    profile: input.profile,
    candidate,
    candidateHash,
    evidenceCompletenessMatrix: matrix,
    evidenceBundle: bundle,
    blockers: stableStrings(blockers),
    warnings: stableStrings(warnings),
    invalidationTriggers: stableStrings(invalidationTriggers),
    requiredHumanActions: stableStrings(humanActions),
    ownerDecisions: stableStrings(ownerDecisions),
    residualRisks: Object.freeze(residualRisks),
    provenance: input.provenance,
  });
};
