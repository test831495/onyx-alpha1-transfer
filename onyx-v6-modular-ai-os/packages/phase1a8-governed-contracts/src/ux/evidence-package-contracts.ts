import { AUTOMATION_CENTER_V2_CONTRACT_VERSION } from "../shared/versions";

export interface EvidenceViewerContract {
  request: string;
  contextPackage: string;
  plan: string;
  approvals: string[];
  changes: string[];
  tests: string[];
  reviews: string[];
  audit: string[];
  recovery: string[];
  reconciliation: string[];
  releaseRecommendation: string;
  agentActivity: string[];
  memoryDecisions: string[];
  connectorDecisions: string[];
  budgetDecisions: string[];
  modelRoutingDecisions: string[];
  accessibilityResults: string[];
  redactionStatus: string;
  provenanceStatus: string;
  contractVersion: string;
}

export function createEvidenceViewerContract(input: Partial<EvidenceViewerContract> & { request?: string; contextPackage?: string; plan?: string; approvals?: string[]; changes?: string[]; tests?: string[]; reviews?: string[]; audit?: string[]; recovery?: string[]; reconciliation?: string[]; releaseRecommendation?: string; agentActivity?: string[]; memoryDecisions?: string[]; connectorDecisions?: string[]; budgetDecisions?: string[]; modelRoutingDecisions?: string[]; accessibilityResults?: string[]; redactionStatus?: string; provenanceStatus?: string; contractVersion?: string }): EvidenceViewerContract {
  const approvals = input.approvals ?? [];
  if (approvals.length === 0) {
    throw new Error("Evidence package requires approval references.");
  }
  return {
    request: input.request ?? "request-1",
    contextPackage: input.contextPackage ?? "context-1",
    plan: input.plan ?? "plan-1",
    approvals,
    changes: input.changes ?? ["change-1"],
    tests: input.tests ?? ["test-1"],
    reviews: input.reviews ?? ["review-1"],
    audit: input.audit ?? ["audit-1"],
    recovery: input.recovery ?? ["recovery-1"],
    reconciliation: input.reconciliation ?? ["reconciliation-1"],
    releaseRecommendation: input.releaseRecommendation ?? "RECOMMEND",
    agentActivity: input.agentActivity ?? ["activity-1"],
    memoryDecisions: input.memoryDecisions ?? ["memory-1"],
    connectorDecisions: input.connectorDecisions ?? ["connector-1"],
    budgetDecisions: input.budgetDecisions ?? ["budget-1"],
    modelRoutingDecisions: input.modelRoutingDecisions ?? ["route-1"],
    accessibilityResults: input.accessibilityResults ?? ["gate-pass"],
    redactionStatus: input.redactionStatus ?? "REDACTED",
    provenanceStatus: input.provenanceStatus ?? "VERIFIED",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export function assertEvidencePackageComplete(evidence: EvidenceViewerContract): void {
  if (!evidence.request || !evidence.contextPackage || !evidence.plan) {
    throw new Error("Evidence package must include request, context package, and plan references.");
  }
  if (evidence.approvals.length === 0 || evidence.changes.length === 0 || evidence.tests.length === 0 || evidence.accessibilityResults.length === 0) {
    throw new Error("Evidence package cannot be complete without approvals, changes, tests, and accessibility results.");
  }
  if (evidence.redactionStatus === "UNREDACTED") {
    throw new Error("Evidence package must be redacted before release recommendation.");
  }
}
