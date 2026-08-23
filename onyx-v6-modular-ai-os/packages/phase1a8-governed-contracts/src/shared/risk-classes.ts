export const RISK_CLASSES = ["R0", "R1", "R2", "R3", "R4", "R5"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export const RISK_CLASS_DESCRIPTIONS: Record<RiskClass, string> = {
  R0: "Read-only",
  R1: "Local and reversible",
  R2: "Branch, Issue, Draft PR",
  R3: "External productivity actions",
  R4: "Merge, production, secrets, permissions",
  R5: "Prohibited",
};

export function assertRiskClass(value: string): asserts value is RiskClass {
  if (!(RISK_CLASSES as readonly string[]).includes(value)) {
    throw new Error(`Unknown risk class: ${value}`);
  }
}

export function requiresFreshApproval(riskClass: RiskClass): boolean {
  return riskClass === "R4";
}

export function isProhibitedRiskClass(riskClass: RiskClass): boolean {
  return riskClass === "R5";
}

/** R5 remains prohibited regardless of any submitted approval data. */
export function assertNotProhibited(riskClass: RiskClass): void {
  if (isProhibitedRiskClass(riskClass)) {
    throw new Error("R5 actions are prohibited regardless of submitted approval data.");
  }
}

/** R5 is always rejected; R4 requires the caller to prove a fresh approval. */
export function isActionPermitted(riskClass: RiskClass, hasFreshApproval: boolean): boolean {
  if (riskClass === "R5") return false;
  if (riskClass === "R4") return hasFreshApproval;
  return true;
}
