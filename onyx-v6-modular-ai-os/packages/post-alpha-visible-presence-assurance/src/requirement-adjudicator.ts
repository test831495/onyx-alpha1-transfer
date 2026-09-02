import type { Requirement } from "./requirements.js";

export interface RequirementAdjudication { readonly requirementId: string; readonly classification: "ACCEPTED_CONCRETE" | "REJECTED_GENERIC" | "REJECTED_DUPLICATE" | "REJECTED_UNTESTABLE" | "REJECTED_AUTHORITY_RISK"; readonly reason: string; readonly overlapReferences: readonly string[]; readonly sourceAuthority: string; readonly verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE"; readonly residualAmbiguity: null; }

const generic = /governed requirement\s+\d+|requirement\s+\d+|placeholder|\bTBD\b|\bTODO\b|generic requirement/i;
export function adjudicateRequirements(requirements: readonly unknown[]): readonly RequirementAdjudication[] {
  const normalized = new Map<string, string>();
  return requirements.map((input, index) => {
    if (!input || typeof input !== "object") return { requirementId: `MALFORMED-${index + 1}`, classification: "REJECTED_UNTESTABLE", reason: "Malformed requirement input fails closed.", overlapReferences: [], sourceAuthority: "UNKNOWN", verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE", residualAmbiguity: null };
    const requirement = input as Partial<Requirement>;
    if (requirement.nonAuthorizing !== true) return { requirementId: requirement.requirementId ?? `MALFORMED-${index + 1}`, classification: "REJECTED_AUTHORITY_RISK", reason: "Requirement boundary input is not non-authorizing.", overlapReferences: [], sourceAuthority: requirement.sourceAuthority ?? "UNKNOWN", verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE", residualAmbiguity: null };
    if (!requirement.requirementId || !requirement.normativeRequirement || !requirement.sourceAuthority) return { requirementId: requirement.requirementId ?? `MALFORMED-${index + 1}`, classification: "REJECTED_UNTESTABLE", reason: "Malformed requirement input fails closed.", overlapReferences: [], sourceAuthority: requirement.sourceAuthority ?? "UNKNOWN", verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE", residualAmbiguity: null };
    const key = requirement.normativeRequirement.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const duplicate = normalized.get(key);
    normalized.set(key, requirement.requirementId);
    const classification = generic.test(requirement.normativeRequirement) ? "REJECTED_GENERIC" : duplicate ? "REJECTED_DUPLICATE" : "ACCEPTED_CONCRETE";
    return { requirementId: requirement.requirementId, classification, reason: classification === "ACCEPTED_CONCRETE" ? "Concrete accepted-source obligation with a deterministic verification strategy." : "Requirement fails the independent quality rule.", overlapReferences: duplicate ? [duplicate] : [], sourceAuthority: requirement.sourceAuthority, verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE", residualAmbiguity: null };
  });
}