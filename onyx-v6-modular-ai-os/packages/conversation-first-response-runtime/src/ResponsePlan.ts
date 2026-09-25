import type { ConversationPurpose } from "@onyx/conversation-first-contracts";
import { freeze, type FollowUpPolicy, type ResponseMode, type TruthPolicy, type UncertaintyPolicy, MAX_ITEMS } from "./constants";

export type PlanSpeaker = "ONYX" | "NOVA" | "COUNCIL" | "NONE";
export type ActionProposal = Readonly<{
  proposalId: string;
  kind: string;
  targetRef: string | null;
  summary: string;
  requiresApproval: boolean;
  riskClass: "LOW" | "MEDIUM" | "HIGH";
  sourcePurpose: "ACTION_REQUEST";
  status: "PROPOSED" | "CLARIFICATION_REQUIRED" | "NOT_AVAILABLE";
}>;

export type ResponsePlan = Readonly<{
  planId: string;
  requestId: string;
  purpose: ConversationPurpose;
  responseMode: ResponseMode;
  speaker: PlanSpeaker;
  truthPolicy: TruthPolicy;
  objectives: readonly string[];
  supportedClaims: readonly string[];
  prohibitedClaims: readonly string[];
  requiredTruthReferences: readonly string[];
  uncertaintyPolicy: UncertaintyPolicy;
  followUpPolicy: FollowUpPolicy;
  actionProposal?: ActionProposal;
  limitationCodes: readonly string[];
  planVersion: "B5B-1";
  nonAuthorizing: true;
  executionAuthorized: false;
  approvalGranted: false;
}>;

export function makeResponsePlan(input: Omit<ResponsePlan, "planVersion" | "nonAuthorizing" | "executionAuthorized" | "approvalGranted">): ResponsePlan | null {
  if (!input.planId || !input.requestId || !input.speaker || !input.responseMode || input.objectives.length > MAX_ITEMS) return null;
  if (input.responseMode === "ACTION_RESULT" || input.speaker === "COUNCIL" && input.responseMode === "ACTION_PROPOSAL") return null;
  return freeze({ ...input, planVersion: "B5B-1", nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const });
}