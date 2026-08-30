import { cloneFreeze, inspectRecordSnapshot } from "../factory-constitution";
import { validateLifecycleRegistry } from "./lifecycle-registry";
import { projectEvidenceManifest, projectReadOnlyAutomationPlan, reconcileGovernanceState } from "./p2-governance-projection";
import { reconcileTargetAndDrift, type ReconciliationEngineInput } from "./p2-reconciliation-engine";
import { validateTargetLock } from "./target-lock";
import { assessMainClosure, assessMergeReadiness } from "./verification-engine";
import { validateP3GovernanceAutomationInput, type P3ProjectionDisposition } from "./p3-governance-automation-contracts";

type P3PredecessorSummary = Readonly<{ drift: ReturnType<typeof reconcileTargetAndDrift>; readiness: ReturnType<typeof assessMergeReadiness>; closure: ReturnType<typeof assessMainClosure>; manifest?: ReturnType<typeof projectEvidenceManifest> }>;
export type P3GovernanceAutomationResult = Readonly<{ authority: "NON_AUTHORIZING"; disposition: P3ProjectionDisposition; evaluationEpochMilliseconds: number; target: Readonly<{ repository: string; baseBranch: string; headSha: string; prNumber: number }>; lifecycle: Readonly<{ state: string; currentGate: string; authoritativeTransitionPerformed: false }>; predecessor: P3PredecessorSummary; blockers: readonly string[]; warnings: readonly string[]; nextGate: string; reopeningTriggers: readonly string[]; requiredHumanActions: readonly string[]; ownerDecisions: readonly string[]; evidenceReferences: readonly unknown[]; provenance: readonly unknown[] }>;

const unavailable = (): P3GovernanceAutomationResult => cloneFreeze({ authority: "NON_AUTHORIZING" as const, disposition: "NOT_ASSESSABLE" as const, evaluationEpochMilliseconds: 0, target: { repository: "", baseBranch: "", headSha: "", prNumber: 0 }, lifecycle: { state: "NOT_ASSESSABLE", currentGate: "EVIDENCE_REQUIRED", authoritativeTransitionPerformed: false as const }, predecessor: { drift: { outcome: "NOT_ASSESSABLE" as const, driftCount: 0, details: [], reasons: ["EVIDENCE_UNAVAILABLE"] as const, authority: "NON_AUTHORIZING" as const }, readiness: { outcome: "NOT_ASSESSABLE" as const, authority: "NON_AUTHORIZING" as const }, closure: { outcome: "NOT_ASSESSABLE" as const, authority: "NON_AUTHORIZING" as const } }, blockers: ["EVIDENCE_UNAVAILABLE"], warnings: [], nextGate: "PROVIDE_CURRENT_EVIDENCE", reopeningTriggers: ["EVIDENCE_UNAVAILABLE"], requiredHumanActions: ["Provide complete verified supplied facts."], ownerDecisions: [], evidenceReferences: [], provenance: [] });

const governanceFactsComplete = (input: ReconciliationEngineInput): boolean => {
  const facts = input.governanceFacts;
  return Boolean(facts && typeof facts.conflicts === "boolean" && typeof facts.rulesetVisible === "boolean" && typeof facts.findingsClosed === "boolean" && typeof facts.ownerAuthorization === "boolean" && typeof facts.prMergedClosed === "boolean" && typeof facts.handoff === "boolean" && typeof input.isPaginationComplete === "boolean");
};

export const evaluateP3GovernanceAutomation = (rawInput: unknown): P3GovernanceAutomationResult => {
  if (validateP3GovernanceAutomationInput(rawInput).outcome !== "PASS") return unavailable();
  try {
    const inspected = inspectRecordSnapshot(rawInput, ["evaluationEpochMilliseconds", "purpose", "lifecycleRegistry", "reconciliationInput", "evidenceReferences", "provenance"]);
    if (!inspected.valid) return unavailable();
    const input = inspected.snapshot as unknown as Record<string, unknown>;
    const reconciliationInput = input.reconciliationInput as ReconciliationEngineInput;
    if (!governanceFactsComplete(reconciliationInput) || validateLifecycleRegistry(input.lifecycleRegistry).outcome !== "PASS" || validateTargetLock(reconciliationInput.targetLock, new Date(input.evaluationEpochMilliseconds as number)).outcome !== "PASS") return unavailable();
    const drift = reconcileTargetAndDrift(reconciliationInput);
    const governance = reconcileGovernanceState(reconciliationInput, drift);
    const governanceFacts = reconciliationInput.governanceFacts!;
    const targetExact = !drift.reasons.includes("TARGET_MISMATCH");
    const isMatch = drift.outcome === "MATCH";
    const readiness = assessMergeReadiness({
      prOpen: reconciliationInput.pullRequestFacts.state === "OPEN",
      draft: reconciliationInput.pullRequestFacts.isDraft,
      conflicts: governanceFacts.conflicts!,
      rulesetVisible: governanceFacts.rulesetVisible!,
      targetExact,
      headFresh: reconciliationInput.freshness.isFresh,
      commitScopeValid: targetExact,
      checksPassed: reconciliationInput.checkFacts.overallStatus === "SUCCESS",
      threadsResolved: reconciliationInput.reviewThreadFacts.unresolvedThreads === 0,
      findingsClosed: governanceFacts.findingsClosed!,
      coverageComplete: reconciliationInput.acceptanceFacts.coverageComplete,
      evidenceFresh: reconciliationInput.freshness.isFresh,
      approvalsPresent: reconciliationInput.reviewFacts.reviewState === "APPROVED",
      ownerAuthorization: governanceFacts.ownerAuthorization!,
    });
    const closure = assessMainClosure({
      prMergedClosed: governanceFacts.prMergedClosed!,
      mainLineage: isMatch,
      commitsReachable: isMatch,
      fileScopeIncorporated: isMatch,
      validationCurrent: isMatch,
      finalMarker: isMatch,
      handoff: governanceFacts.handoff!,
      unauthorizedReleaseClaim: false,
    });
    const manifest = projectEvidenceManifest(reconciliationInput, drift, governance);
    const plan = projectReadOnlyAutomationPlan(drift, governance);
    const lifecycle = input.lifecycleRegistry as Record<string, unknown>;
    const blockers = [...drift.reasons].sort();
    const unavailableEvidence = drift.outcome === "NOT_ASSESSABLE";
    const targetInvalid = drift.reasons.includes("TARGET_MISMATCH");
    const nextGate = unavailableEvidence ? "PROVIDE_CURRENT_EVIDENCE" : targetInvalid ? "RECONCILE_TARGET" : readiness.outcome !== "TECHNICALLY_READY" ? "REMEDIATE_GOVERNANCE_BLOCKERS" : "OWNER_REVIEW";
    return cloneFreeze({ authority: "NON_AUTHORIZING" as const, disposition: unavailableEvidence || targetInvalid ? "NOT_ASSESSABLE" as const : "PROJECTED" as const, evaluationEpochMilliseconds: input.evaluationEpochMilliseconds as number, target: { repository: `${reconciliationInput.repositoryFacts.owner}/${reconciliationInput.repositoryFacts.repository}`, baseBranch: reconciliationInput.pullRequestFacts.baseBranch, headSha: reconciliationInput.pullRequestFacts.headSha, prNumber: reconciliationInput.pullRequestFacts.prNumber }, lifecycle: { state: String(lifecycle.state), currentGate: String(lifecycle.currentGateId), authoritativeTransitionPerformed: false as const }, predecessor: { drift, readiness, closure, manifest }, blockers, warnings: plan.disclaimers, nextGate, reopeningTriggers: blockers.length > 0 ? blockers : ["PR_STATE_CHANGE", "HEAD_DRIFT", "EVIDENCE_STALE"], requiredHumanActions: plan.pendingActions.map((action) => String((action as Record<string, unknown>).requiredOwnerDecision ?? "MANUAL_REVIEW_REQUIRED")), ownerDecisions: readiness.outcome === "TECHNICALLY_READY" ? ["OWNER_APPROVAL_REMAINS_REQUIRED"] : [], evidenceReferences: input.evidenceReferences as unknown[], provenance: input.provenance as unknown[] });
  } catch {
    return unavailable();
  }
};