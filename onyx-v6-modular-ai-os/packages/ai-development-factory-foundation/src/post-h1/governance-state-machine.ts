import { LIFECYCLE_STATES, type LifecycleState } from "./lifecycle-registry";

export type TransitionResult = Readonly<{ outcome: "ALLOWED" | "BLOCKED" | "NOT_ASSESSABLE"; authority: "NON_AUTHORIZING" }>;
export type TransitionEvidence = Readonly<{ targetLocked: boolean; ownerDecision: boolean; reopeningRecord?: boolean }>;
const result = (outcome: TransitionResult["outcome"]): TransitionResult => Object.freeze({ outcome, authority: "NON_AUTHORIZING" });

export const validateTransition = (current: LifecycleState, proposed: LifecycleState, evidence: TransitionEvidence): TransitionResult => {
  if (!LIFECYCLE_STATES.includes(current) || !LIFECYCLE_STATES.includes(proposed) || !evidence?.targetLocked) return result("NOT_ASSESSABLE");
  if (current === "MAIN_CLOSED" && proposed === "REOPENED") return evidence.reopeningRecord === true && evidence.ownerDecision === true ? result("ALLOWED") : result("BLOCKED");
  const currentIndex = LIFECYCLE_STATES.indexOf(current); const proposedIndex = LIFECYCLE_STATES.indexOf(proposed);
  if (proposedIndex !== currentIndex + 1 || evidence.ownerDecision !== true) return result("BLOCKED");
  return result("ALLOWED");
};