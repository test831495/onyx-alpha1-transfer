import { boundedFreeze } from "./capture-policy";
import type { ContinuityState, EvidenceSufficiencyState, HistoricalConfidenceBand, SafeNextAction } from "./continuity-policy";

export interface ContinuityLabel {
  readonly title: string;
  readonly explanation: string;
  readonly safeNextAction: SafeNextAction;
  readonly createsAuthority: false;
}

const label = (
  title: string,
  explanation: string,
  safeNextAction: SafeNextAction,
): ContinuityLabel =>
  boundedFreeze({
    title,
    explanation,
    safeNextAction,
    createsAuthority: false,
  });

export const CONTINUITY_LABELS: Readonly<Record<ContinuityState, ContinuityLabel>> = boundedFreeze({
  COMPLETE_CONTINUITY: label("Complete continuity", "The record has sufficient required evidence and valid provenance.", "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE"),
  PARTIAL_CONTINUITY: label("Partial continuity", "Some required evidence is present, but the condition is not yet complete.", "KEEP_GAPS_VISIBLE"),
  GAP_PRESENT: label("Gap present", "A required fact remains missing or unresolved.", "KEEP_GAPS_VISIBLE"),
  INSUFFICIENT_EVIDENCE: label("Insufficient evidence", "Mandatory evidence is missing for a required continuity fact.", "REQUEST_OWNER_REVIEW"),
  CONFLICTED_CONTINUITY: label("Conflicted continuity", "Evidence exists but competing records remain unresolved.", "REQUIRE_FRESH_PROVENANCE"),
  UNKNOWN_CONTINUITY: label("Unknown continuity", "The record cannot be treated as sufficient without valid owner scope and provenance.", "REQUEST_OWNER_REVIEW"),
  MALFORMED_ASSESSMENT: label("Malformed assessment", "The continuity assessment is not valid enough to rely on.", "DO_NOT_CREATE_AUTHORITY"),
});

export const EVIDENCE_SUFFICIENCY_LABELS: Readonly<Record<EvidenceSufficiencyState, ContinuityLabel>> = boundedFreeze({
  SUFFICIENT: label("Sufficient evidence", "All required evidence is present and suitable.", "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE"),
  PARTIALLY_SUFFICIENT: label("Partially sufficient", "Some evidence is present, but not all required evidence is available.", "KEEP_GAPS_VISIBLE"),
  INSUFFICIENT: label("Insufficient", "The available evidence does not satisfy the required threshold.", "REQUEST_OWNER_REVIEW"),
  MISSING: label("Missing evidence", "Evidence required for continuity is absent.", "KEEP_GAPS_VISIBLE"),
  PROHIBITED: label("Prohibited evidence", "Prohibited or unsafe evidence is excluded from continuity assessment.", "DENY_PROHIBITED_CONTENT"),
  STALE: label("Stale evidence", "Evidence is too stale or materially changed to satisfy current continuity.", "REQUIRE_FRESH_PROVENANCE"),
  CONFLICTED: label("Conflicted evidence", "Competing evidence remains unresolved and visible.", "REQUIRE_FRESH_PROVENANCE"),
  NOT_ASSESSABLE: label("Not assessable", "The evidence cannot be confidently evaluated under the current policy.", "REQUEST_OWNER_REVIEW"),
});

export const HISTORICAL_CONFIDENCE_LABELS: Readonly<Record<HistoricalConfidenceBand, ContinuityLabel>> = boundedFreeze({
  HIGH_CONFIDENCE: label("High confidence", "The continuity assessment is complete and supported by valid evidence.", "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE"),
  MEDIUM_CONFIDENCE: label("Medium confidence", "The continuity assessment is incomplete but not contradicted.", "KEEP_GAPS_VISIBLE"),
  LOW_CONFIDENCE: label("Low confidence", "The continuity assessment is not complete enough for reliance.", "REQUEST_OWNER_REVIEW"),
  UNVERIFIED: label("Unverified", "The continuity basis is not yet verified by policy.", "REQUEST_OWNER_REVIEW"),
  CONFLICTED: label("Conflicted", "Current evidence conflicts and remains visible.", "REQUIRE_FRESH_PROVENANCE"),
  NOT_ASSESSABLE: label("Not assessable", "Confidence cannot be assigned under the current continuity policy.", "DO_NOT_CREATE_AUTHORITY"),
});

export const SAFE_NEXT_ACTION_LABELS: Readonly<Record<SafeNextAction, ContinuityLabel>> = boundedFreeze({
  KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE: label("Keep evidence visible", "Keep the supporting evidence visible with provenance.", "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE"),
  KEEP_GAPS_VISIBLE: label("Keep gaps visible", "Keep the unresolved gap visible and do not silently fill it.", "KEEP_GAPS_VISIBLE"),
  REQUEST_OWNER_REVIEW: label("Request owner review", "Request the verified owner review before claiming continuity.", "REQUEST_OWNER_REVIEW"),
  DENY_PROHIBITED_CONTENT: label("Deny prohibited content", "Exclude prohibited content and keep it outside the continuity boundary.", "DENY_PROHIBITED_CONTENT"),
  REQUIRE_FRESH_PROVENANCE: label("Require fresh provenance", "Require fresh provenance before treating the claim as current.", "REQUIRE_FRESH_PROVENANCE"),
  DO_NOT_CREATE_AUTHORITY: label("No authority created", "This result remains descriptive and does not create authority.", "DO_NOT_CREATE_AUTHORITY"),
});
