export type B1Acceptance = Readonly<{
  id: string;
  invariant: string;
  evidence: string;
}>;

export const B1_ACCEPTANCE_REGISTRY: readonly B1Acceptance[] = Object.freeze([
  Object.freeze({ id: "B1-ISO-001", invariant: "Cross-account evidence is excluded before synthesis admission.", evidence: "convergence.cross-account" }),
  Object.freeze({ id: "B1-ATTR-001", invariant: "Every factual result carries source attribution and observation evidence.", evidence: "convergence.attribution" }),
  Object.freeze({ id: "B1-PART-001", invariant: "Unavailable providers produce truthful partial coverage.", evidence: "convergence.partial-results" }),
  Object.freeze({ id: "B1-CURSOR-001", invariant: "Cursors are bound to connector and account scope.", evidence: "convergence.cursor-isolation" }),
  Object.freeze({ id: "B1-BUDGET-001", invariant: "Provider, result, evidence, claim, citation, retry, and deadline budgets are bounded.", evidence: "convergence.budgets" }),
  Object.freeze({ id: "B1-RECOVERY-001", invariant: "Revoked or disabled providers remain non-authorizing and cannot reactivate.", evidence: "governance.revocation" }),
  Object.freeze({ id: "B1-FLAG-001", invariant: "B1 provider flags remain off and activation is not implied by merge.", evidence: "governance.feature-flags" }),
  Object.freeze({ id: "B1-PROVIDER-001", invariant: "Four provider lanes are synthetic-only and read-only.", evidence: "assurance.hero-scenario" }),
]);