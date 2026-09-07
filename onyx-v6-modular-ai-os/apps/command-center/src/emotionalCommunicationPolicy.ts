export type ExplicitCommunicationSignal =
  | "USER_EXPLICIT_FRUSTRATION"
  | "USER_EXPLICIT_CONFUSION"
  | "USER_REQUESTS_SIMPLIFICATION"
  | "USER_REQUESTS_MORE_DETAIL"
  | "USER_REQUESTS_FASTER_RESPONSE"
  | "USER_REQUESTS_SLOWER_RESPONSE"
  | "REPEATED_FAILURE_IN_CURRENT_SESSION"
  | "USER_CORRECTS_SYSTEM"
  | "USER_ACKNOWLEDGES_SUCCESS"
  | "NEUTRAL";

export interface EmotionalCommunicationDecision {
  readonly signal: ExplicitCommunicationSignal;
  readonly evidenceSource: "USER_EXPLICIT" | "SESSION_EVENT";
  readonly detailMode: "BRIEF" | "NORMAL" | "DETAILED";
  readonly acknowledgementRequired: boolean;
  readonly repetitionSuppressed: boolean;
  readonly speechRate: "NORMAL" | "SLOWER" | "FASTER";
  readonly noAuthorityEffect: true;
  readonly noPersistence: true;
}

export function decideCommunicationStyle(text: string, repeatedFailure = false): EmotionalCommunicationDecision {
  const normalized = text.toLowerCase().replace(/[\u0027\u2018\u2019\u201B]/g, "");
  let signal: ExplicitCommunicationSignal = "NEUTRAL";
  let detailMode: EmotionalCommunicationDecision["detailMode"] = "NORMAL";
  let speechRate: EmotionalCommunicationDecision["speechRate"] = "NORMAL";
  if (/frustrat|this is hard|this isnt working|this is not working/.test(normalized)) signal = "USER_EXPLICIT_FRUSTRATION";
  else if (/confus|dont understand|do not understand|cannot understand/.test(normalized)) signal = "USER_EXPLICIT_CONFUSION";
  else if (/keep it short|simplif|be brief/.test(normalized)) { signal = "USER_REQUESTS_SIMPLIFICATION"; detailMode = "BRIEF"; }
  else if (/in detail|explain more|more detail/.test(normalized)) { signal = "USER_REQUESTS_MORE_DETAIL"; detailMode = "DETAILED"; }
  else if (/speak slower|slow down/.test(normalized)) { signal = "USER_REQUESTS_SLOWER_RESPONSE"; speechRate = "SLOWER"; }
  else if (/speak faster|speed up/.test(normalized)) { signal = "USER_REQUESTS_FASTER_RESPONSE"; speechRate = "FASTER"; }
  if (repeatedFailure && signal === "NEUTRAL") signal = "REPEATED_FAILURE_IN_CURRENT_SESSION";
  return {
    signal,
    evidenceSource: signal === "REPEATED_FAILURE_IN_CURRENT_SESSION" ? "SESSION_EVENT" : "USER_EXPLICIT",
    detailMode,
    acknowledgementRequired: signal === "USER_EXPLICIT_FRUSTRATION" || signal === "USER_EXPLICIT_CONFUSION" || signal === "REPEATED_FAILURE_IN_CURRENT_SESSION",
    repetitionSuppressed: repeatedFailure,
    speechRate,
    noAuthorityEffect: true,
    noPersistence: true,
  };
}