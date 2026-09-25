export const TRUTH_POLICIES = Object.freeze([
  "NO_EXTERNAL_TRUTH_REQUIRED",
  "SUPPLIED_CONTEXT_ONLY",
  "OPERATIONAL_TRUTH_REQUIRED",
  "NOT_ASSESSABLE",
] as const);
export type TruthPolicy = (typeof TRUTH_POLICIES)[number];

export const RESPONSE_MODES = Object.freeze([
  "CONVERSATION", "EXPLANATION", "RECOMMENDATION", "CLARIFICATION",
  "ACTION_PROPOSAL", "ACTION_RESULT", "SAFE_LIMITATION", "COUNCIL_SYNTHESIS",
] as const);
export type ResponseMode = (typeof RESPONSE_MODES)[number];

export const UNCERTAINTY_POLICIES = Object.freeze(["NONE", "STATE_LIMITATION", "REQUEST_CLARIFICATION", "NOT_ASSESSABLE"] as const);
export type UncertaintyPolicy = (typeof UNCERTAINTY_POLICIES)[number];
export const FOLLOW_UP_POLICIES = Object.freeze(["NO_FOLLOW_UP", "OPTIONAL_FOLLOW_UP", "CLARIFICATION_REQUIRED", "BOUNDED_CONTINUATION"] as const);
export type FollowUpPolicy = (typeof FOLLOW_UP_POLICIES)[number];
export const ACTION_PROPOSAL_STATUSES = Object.freeze(["PROPOSED", "CLARIFICATION_REQUIRED", "NOT_AVAILABLE"] as const);
export type ActionProposalStatus = (typeof ACTION_PROPOSAL_STATUSES)[number];
export const CANDIDATE_TRUTH_STATUSES = Object.freeze(["GROUNDED", "SUPPLIED_CONTEXT", "CREATIVE", "LIMITED", "NOT_ASSESSABLE"] as const);
export type CandidateTruthStatus = (typeof CANDIDATE_TRUTH_STATUSES)[number];
export const CANDIDATE_FOLLOW_UPS = Object.freeze(["NONE", "OPTIONAL", "REQUIRED"] as const);
export type CandidateFollowUp = (typeof CANDIDATE_FOLLOW_UPS)[number];

export const MAX_RESPONSE_TEXT = 1200;
export const MAX_ITEMS = 16;
export const COMPOSITION_VERSION = "B5B-1" as const;
export const CHARACTER_PROFILE_VERSION = "B5B-1" as const;

export function freeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  return Object.freeze(value);
}