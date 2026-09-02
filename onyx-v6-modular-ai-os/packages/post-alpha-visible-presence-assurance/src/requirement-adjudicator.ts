import type { Requirement } from "./requirements.js";

export interface RequirementAdjudication { readonly requirementId: string; readonly classification: "ACCEPTED_CONCRETE" | "REJECTED_GENERIC" | "REJECTED_DUPLICATE" | "REJECTED_UNTESTABLE" | "REJECTED_AUTHORITY_RISK"; readonly reason: string; readonly overlapReferences: readonly string[]; readonly sourceAuthority: string; readonly verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE"; readonly residualAmbiguity: null; }

const generic = /governed requirement\s+\d+|requirement\s+\d+|placeholder|\bTBD\b|\bTODO\b|generic requirement/i;
export function adjudicateRequirements(requirements: readonly Requirement[]): readonly RequirementAdjudication[] {
  const normalized = new Map<string, string>();
  return requirements.map((requirement) => {
    const key = requirement.normativeRequirement.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const duplicate = normalized.get(key);
    normalized.set(key, requirement.requirementId);
    const classification = generic.test(requirement.normativeRequirement) ? "REJECTED_GENERIC" : duplicate ? "REJECTED_DUPLICATE" : requirement.normativeRequirement.includes("must not") && !requirement.nonAuthorizing ? "REJECTED_AUTHORITY_RISK" : "ACCEPTED_CONCRETE";
    return { requirementId: requirement.requirementId, classification, reason: classification === "ACCEPTED_CONCRETE" ? "Concrete accepted-source obligation with a deterministic verification strategy." : "Requirement fails the independent quality rule.", overlapReferences: duplicate ? [duplicate] : [], sourceAuthority: requirement.sourceAuthority, verificationFeasibility: "TESTABLE_OR_EVIDENCE_VERIFIABLE", residualAmbiguity: null };
  });
}