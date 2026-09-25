import type { PlanSpeaker, ResponsePlan } from "./ResponsePlan";
import { freeze, type CandidateFollowUp, type CandidateTruthStatus, COMPOSITION_VERSION, CHARACTER_PROFILE_VERSION } from "./constants";

export type CharacterResponseCandidate = Readonly<{
  candidateId: string;
  planId: string;
  speaker: PlanSpeaker;
  purpose: ResponsePlan["purpose"];
  responseMode: ResponsePlan["responseMode"];
  text: string;
  spokenText: string;
  captionText: string;
  truthStatus: CandidateTruthStatus;
  sourceReferences: readonly string[];
  uncertainty: string;
  proposedActions: readonly string[];
  followUp: CandidateFollowUp;
  characterProfileVersion: typeof CHARACTER_PROFILE_VERSION;
  compositionVersion: typeof COMPOSITION_VERSION;
  validationStatus: "UNVALIDATED" | "VALID" | "INVALID";
}>;

export function freezeCandidate(candidate: Omit<CharacterResponseCandidate, "characterProfileVersion" | "compositionVersion" | "validationStatus">): CharacterResponseCandidate {
  return freeze({ ...candidate, characterProfileVersion: CHARACTER_PROFILE_VERSION, compositionVersion: COMPOSITION_VERSION, validationStatus: "UNVALIDATED" });
}