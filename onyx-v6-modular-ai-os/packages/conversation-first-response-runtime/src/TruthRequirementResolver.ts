import type { ConversationPurpose } from "@onyx/conversation-first-contracts";
import { freeze, type TruthPolicy } from "./constants";

export type TruthRequirement = Readonly<{
  truthPolicy: TruthPolicy;
  requiredTruthReferences: readonly string[];
  limitationCodes: readonly string[];
  uncertaintyPolicy: "NONE" | "STATE_LIMITATION" | "REQUEST_CLARIFICATION" | "NOT_ASSESSABLE";
}>;

export type TruthRequirementInput = Readonly<{
  purpose: ConversationPurpose;
  rawText?: string;
  suppliedContext?: boolean;
  suppliedTruthReferences?: readonly string[];
  operationalTruthAvailable?: boolean;
  truthStaleOrConflicting?: boolean;
}>;

const OPERATIONAL_PATTERN = /\b(?:calendar|meetings?|mail|email|files?|notes?|tasks?|account|connector|provider|health|deployment|project state|tomorrow)\b/i;
const LIMITATION_CODES = Object.freeze({ missing: "REQUIRED_TRUTH_MISSING", unavailable: "OPERATIONAL_TRUTH_UNAVAILABLE", stale: "TRUTH_STALE_OR_CONFLICTING", supplied: "SUPPLIED_CONTEXT_REQUIRED" });

export function resolveTruthRequirement(input: TruthRequirementInput): TruthRequirement {
  const references = Object.freeze((input.suppliedTruthReferences ?? []).filter((value) => typeof value === "string" && value.length > 0).slice(0, 16));
  const operational = input.purpose === "ACTION_REQUEST" || OPERATIONAL_PATTERN.test(input.rawText ?? "");
  let truthPolicy: TruthPolicy;
  if (input.truthStaleOrConflicting === true || (operational && input.operationalTruthAvailable === false)) truthPolicy = "NOT_ASSESSABLE";
  else if (operational) truthPolicy = input.operationalTruthAvailable === false ? "NOT_ASSESSABLE" : "OPERATIONAL_TRUTH_REQUIRED";
  else if (input.suppliedContext === true) truthPolicy = "SUPPLIED_CONTEXT_ONLY";
  else truthPolicy = "NO_EXTERNAL_TRUTH_REQUIRED";

  const limitationCodes = truthPolicy === "NOT_ASSESSABLE"
    ? [input.truthStaleOrConflicting === true ? LIMITATION_CODES.stale : operational ? LIMITATION_CODES.unavailable : LIMITATION_CODES.missing]
    : truthPolicy === "SUPPLIED_CONTEXT_ONLY" && references.length === 0 ? [LIMITATION_CODES.supplied] : [];
  const uncertaintyPolicy = truthPolicy === "NOT_ASSESSABLE" ? "NOT_ASSESSABLE" : truthPolicy === "SUPPLIED_CONTEXT_ONLY" && references.length === 0 ? "REQUEST_CLARIFICATION" : "NONE";
  return freeze({ truthPolicy, requiredTruthReferences: references, limitationCodes: Object.freeze(limitationCodes), uncertaintyPolicy });
}