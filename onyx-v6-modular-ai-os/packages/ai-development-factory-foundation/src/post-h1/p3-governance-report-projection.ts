import { cloneFreeze, inspectRecordSnapshot } from "../factory-constitution";
import { sha256 } from "./p2-evidence-normalization";
import type { P3GovernanceAutomationResult } from "./p3-governance-automation";
import { P3_BOUNDS, type P3ProjectionDisposition } from "./p3-governance-automation-contracts";

export type P3PrBodyProposal = Readonly<{ authority: "NON_AUTHORIZING"; status: "PROPOSED"; body: string; hash: string }>;
export type P3GovernanceReportProjection = Readonly<{ authority: "NON_AUTHORIZING"; disposition: P3ProjectionDisposition; target: Readonly<{ repository: string; baseBranch: string; headSha: string; prNumber: number }>; lifecycleState: string; readinessOutcome: string; closureOutcome: string; blockers: readonly string[]; warnings: readonly string[]; nextGate: string; reopeningTriggers: readonly string[]; evidenceReferences: readonly unknown[]; provenance: readonly unknown[]; evidenceManifestHash?: string; prBodyProposal?: P3PrBodyProposal; reportHash: string }>;

const stableById = (items: readonly unknown[]): readonly unknown[] => [...items].sort((left, right) => {
  const leftRecord = inspectRecordSnapshot(left); const rightRecord = inspectRecordSnapshot(right);
  const leftId = leftRecord.valid && typeof leftRecord.snapshot.id === "string" ? leftRecord.snapshot.id : "";
  const rightId = rightRecord.valid && typeof rightRecord.snapshot.id === "string" ? rightRecord.snapshot.id : "";
  return leftId.localeCompare(rightId);
});
const stableStrings = (items: readonly string[]): readonly string[] => [...new Set(items)].sort();

export const projectP3GovernanceReport = (candidate: P3GovernanceAutomationResult): P3GovernanceReportProjection => {
  try {
    const evidenceReferences = stableById(candidate.evidenceReferences);
    const provenance = stableById(candidate.provenance);
    const blockers = stableStrings(candidate.blockers);
    const warnings = stableStrings(candidate.warnings);
    const reopeningTriggers = stableStrings(candidate.reopeningTriggers);
    const manifest = candidate.predecessor.manifest;
    const proposalSafe = candidate.disposition === "PROJECTED" && candidate.predecessor.drift.outcome === "MATCH" && candidate.predecessor.readiness.outcome === "TECHNICALLY_READY" && candidate.target.repository.length > 0 && candidate.target.headSha.length === 40;
    const proposalText = proposalSafe ? [
      "## Governance Automation Proposal",
      `Repository: ${candidate.target.repository}`,
      `Base branch: ${candidate.target.baseBranch}`,
      `Head SHA: ${candidate.target.headSha}`,
      `Pull request: #${candidate.target.prNumber}`,
      "This is a non-authorizing proposal. Approval and merge remain separate Owner-controlled actions.",
    ].join("\n") : undefined;
    const prBodyProposal = proposalText && proposalText.length <= P3_BOUNDS.MAX_PR_BODY_LENGTH ? { authority: "NON_AUTHORIZING" as const, status: "PROPOSED" as const, body: proposalText, hash: sha256(proposalText) } : undefined;
    const hashInput = { authority: "NON_AUTHORIZING" as const, disposition: candidate.disposition, target: candidate.target, lifecycleState: candidate.lifecycle.state, readinessOutcome: candidate.predecessor.readiness.outcome, closureOutcome: candidate.predecessor.closure.outcome, blockers, warnings, nextGate: candidate.nextGate, reopeningTriggers, evidenceReferences, provenance, evidenceManifestHash: manifest?.manifestHash, prBodyProposal };
    return cloneFreeze({ ...hashInput, evidenceManifestHash: manifest?.manifestHash, prBodyProposal, reportHash: sha256(JSON.stringify(hashInput)) });
  } catch {
    return cloneFreeze({ authority: "NON_AUTHORIZING" as const, disposition: "NOT_ASSESSABLE" as const, target: { repository: "", baseBranch: "", headSha: "", prNumber: 0 }, lifecycleState: "NOT_ASSESSABLE", readinessOutcome: "NOT_ASSESSABLE", closureOutcome: "NOT_ASSESSABLE", blockers: ["EVIDENCE_UNAVAILABLE"], warnings: [], nextGate: "PROVIDE_CURRENT_EVIDENCE", reopeningTriggers: ["EVIDENCE_UNAVAILABLE"], evidenceReferences: [], provenance: [], reportHash: sha256("P3_REPORT_NOT_ASSESSABLE") });
  }
};