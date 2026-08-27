import { cloneFreeze, isSafeRecord } from "./factory-constitution";
export type DecisionPackage = Readonly<Record<string, unknown>>;
export const freezeDecisionPackage = (value: Record<string, unknown>): DecisionPackage => cloneFreeze(value);
export const DECISION_FIELDS = ["decisionRequested", "recommendedOption", "alternatives", "benefits", "risks", "reversibility", "cost", "evidence", "consequencesOfDelay", "exactOwnerActionRequired"] as const;
export const DECISION_REVIEW_STATUSES = ["UNREVIEWED", "INDEPENDENTLY_REVIEWED"] as const;
export const isValidDecisionPackage = (input: unknown): boolean => {
  if (!isSafeRecord(input)) return false;
  const value = input as Record<string, unknown>;
  const required = [...DECISION_FIELDS, "scopeImpact", "authorityImpact", "privacyImpact", "securityImpact", "recoveryImpact", "performanceImpact", "uxImpact", "providerLockInImpact", "residualRisks", "reassessmentTrigger", "baseline", "provenance", "reviewStatus", "authorityStatus"];
  return Object.keys(value).length === required.length && Object.keys(value).every((key) => required.includes(key)) && required.filter((field) => !["alternatives", "evidence", "residualRisks"].includes(field)).every((field) => typeof value[field] === "string" && String(value[field]).trim() !== "") && ["alternatives", "evidence", "residualRisks"].every((field) => Array.isArray(value[field]) && (value[field] as unknown[]).length > 0 && (value[field] as unknown[]).every((item) => typeof item === "string")) && value.authorityStatus === "NON_AUTHORIZING" && DECISION_REVIEW_STATUSES.includes(value.reviewStatus as never) && /^[0-9a-f]{40}$/.test(String(value.baseline));
};
