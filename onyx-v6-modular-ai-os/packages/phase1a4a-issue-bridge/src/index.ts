import type { ApprovalRecord } from "@onyx/automation-foundation";
import { createScopeHash, isCurrentScopeHash } from "@onyx/automation-foundation";
import { idempotencyKey, type WriteResult, type WriteRequest } from "@onyx/github-automation";

export const ISSUE_CAPABILITY = "CREATE_GITHUB_ISSUE" as const;
export const ISSUE_REPOSITORY = "test831495/onyx-alpha1-transfer" as const;
export type IssueBridgeState = "AWAITING_ISSUE_APPROVAL" | "APPROVED_FOR_ISSUE_CREATION" | "ISSUE_CREATION_IN_PROGRESS" | "ISSUE_CREATED" | "ISSUE_CREATION_FAILED_SAFE" | "ISSUE_RECONCILIATION_REQUIRED";
export interface E10DryRunReadyRun { runId: string; state: string; scopeHash: string; repository: string; branchCreated: false; draftPrCreated: false; mergeAllowed: false; productionDeployAllowed: false; }
export interface IssueApproval extends ApprovalRecord { approver: "Rahul Kumar"; capability: typeof ISSUE_CAPABILITY; reason: string; idempotencyKey: string; consumed: boolean; }
export interface IssueBridgeRequest { run: E10DryRunReadyRun; title: string; body: string; reason: string; expiresAt?: string; }
export interface IssueEvidence { event: string; detail: string; timestamp: string; }
export interface IssueBridgeResult { issueNumber?: number; issueUrl?: string; newIssueCreated: boolean; idempotentlyReused: boolean; evidence: IssueEvidence[]; finalState: IssueBridgeState; }
export interface IssueWriter { execute(request: WriteRequest): Promise<WriteResult>; }

export function issueScopeHash(title: string, body: string): string {
  return createScopeHash({ repository: ISSUE_REPOSITORY, capability: ISSUE_CAPABILITY, title: title.trim(), body: body.trim() });
}

function assertRequest(request: IssueBridgeRequest, approval: IssueApproval, now: number) {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY.");
  if (request.run.repository !== ISSUE_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  if (approval.approver !== "Rahul Kumar") throw new Error("Issue approval authority must be Rahul Kumar.");
  if (approval.capability !== ISSUE_CAPABILITY) throw new Error("Issue capability must be CREATE_GITHUB_ISSUE.");
  const expectedScopeHash = issueScopeHash(request.title, request.body);
  if (!isCurrentScopeHash(request.run.scopeHash) || !isCurrentScopeHash(approval.scopeHash)) throw new Error("Issue approval uses an unsupported scope hash version.");
  if (request.run.scopeHash !== expectedScopeHash) throw new Error("Issue run scope hash does not match the approved request.");
  if (approval.scopeHash !== request.run.scopeHash) throw new Error("Issue approval scope hash mismatch.");
  if (approval.expiresAt && Date.parse(approval.expiresAt) <= now) throw new Error("Issue approval has expired.");
  if (!request.title.trim()) throw new Error("Issue title must not be empty.");
  if (!request.body.trim()) throw new Error("Issue body must not be empty.");
  const expectedKey = idempotencyKey(ISSUE_REPOSITORY, ISSUE_CAPABILITY, { title: request.title.trim(), body: request.body.trim() });
  if (approval.idempotencyKey !== expectedKey) throw new Error("Issue idempotency key does not match the approved request.");
}

export function requestIssueApproval(request: IssueBridgeRequest, now = new Date()): IssueApproval {
  if (request.run.state !== "DRY_RUN_READY") throw new Error("E.10 run must be DRY_RUN_READY before issue approval.");
  if (request.run.repository !== ISSUE_REPOSITORY) throw new Error("Repository must be test831495/onyx-alpha1-transfer.");
  if (request.reason.trim().length < 12) throw new Error("Issue approval reason must contain at least 12 characters.");
  const title = request.title.trim();
  const body = request.body.trim();
  if (!title) throw new Error("Issue title must not be empty.");
  if (!body) throw new Error("Issue body must not be empty.");
  const issued = now.getTime();
  return { planId: request.run.runId, scopeHash: issueScopeHash(title, body), approver: "Rahul Kumar", approvedAt: now.toISOString(), expiresAt: request.expiresAt ?? new Date(issued + 900000).toISOString(), capability: ISSUE_CAPABILITY, reason: request.reason.trim(), idempotencyKey: idempotencyKey(ISSUE_REPOSITORY, ISSUE_CAPABILITY, { title, body }), consumed: false };
}

function issuePlan(request: IssueBridgeRequest) { const title = request.title.trim(); const body = request.body.trim(); return { id: request.run.runId, capabilityId: ISSUE_CAPABILITY, repository: ISSUE_REPOSITORY, payload: { title, body }, dryRun: true as const, approvalRequired: true, scopeHash: request.run.scopeHash, createdAt: new Date().toISOString() }; }
function evidence(event: string, detail: string): IssueEvidence { return { event, detail: detail.replace(/token|secret|password/gi, "[REDACTED]"), timestamp: new Date().toISOString() }; }

export async function createApprovedIssue(request: IssueBridgeRequest, approval: IssueApproval | undefined, writer: IssueWriter, now = Date.now()): Promise<IssueBridgeResult> {
  const records: IssueEvidence[] = [evidence("ISSUE_CREATION_REQUESTED", "Capability and E.10 state received.")];
  if (!approval) throw new Error("A CREATE_GITHUB_ISSUE approval is required.");
  assertRequest(request, approval, now);
  const plan = issuePlan(request);
  const writeRequest: WriteRequest = { kind: "issue", plan, approval, execute: true, idempotencyKey: approval.idempotencyKey };
  records.push(evidence("APPROVED_FOR_ISSUE_CREATION", "Rahul Kumar approval, repository, scope, expiry, and idempotency key verified."));
  try {
    const result = await writer.execute(writeRequest);
    approval.consumed = true;
    const reused = !result.remoteMutationPerformed;
    const issueUrl = result.resourceUrl;
    const match = issueUrl?.match(/\/issues\/(\d+)(?:$|[?#])/);
    records.push(evidence(reused ? "ISSUE_IDEMPOTENT_REUSE" : "ISSUE_CREATED", reused ? "Existing approved result reused." : "Approved issue creation completed."));
    return { issueNumber: match ? Number(match[1]) : undefined, issueUrl, newIssueCreated: !reused, idempotentlyReused: reused, evidence: records, finalState: "ISSUE_CREATED" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Provider failure.";
    const uncertain = /uncertain|timeout|timed out|unknown response|reconcil/i.test(detail);
    records.push(evidence(uncertain ? "ISSUE_RECONCILIATION_REQUIRED" : "ISSUE_CREATION_FAILED_SAFE", uncertain ? "Provider outcome is uncertain; no retry was performed." : "Provider failure recorded; no retry was performed."));
    return { newIssueCreated: false, idempotentlyReused: false, evidence: records, finalState: uncertain ? "ISSUE_RECONCILIATION_REQUIRED" : "ISSUE_CREATION_FAILED_SAFE" };
  }
}