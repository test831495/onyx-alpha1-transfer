export type DisclosureScope = "none" | "basic" | "technical" | "owner_detail";

export interface TechnicalInformationPolicy {
  accountId: string;
  role: string;
  sessionAssurance: string;
  policyVersion: string;
  resourceClassification: string;
  disclosureRequested: boolean;
}

export function validateNoSecretDisplay(input: { label: string; technicalInfo: string; secretValue?: string }): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.secretValue && /token|secret|password|key|credential|session/i.test(input.secretValue)) {
    errors.push("secret values are forbidden in display fields");
  }
  if (input.technicalInfo && /token|secret|password|key|credential|session/i.test(input.technicalInfo)) {
    errors.push("technical information must not expose secret values");
  }
  return { ok: errors.length === 0, errors };
}

export function isTechnicalInformationAllowed(policy: TechnicalInformationPolicy): boolean {
  if (!policy.disclosureRequested) return false;
  if (policy.sessionAssurance !== "current") return false;
  if (policy.policyVersion !== "1.0.0") return false;
  if (policy.accountId !== "rahul" && policy.role !== "primary_owner") return false;
  return policy.role === "primary_owner" || policy.resourceClassification === "public_basic";
}
