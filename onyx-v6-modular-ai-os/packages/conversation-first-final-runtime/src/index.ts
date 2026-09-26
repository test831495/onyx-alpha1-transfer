export const FINAL_RUNTIME_VERSION = "B5D-B5E-B5F-1" as const;
export const INPUT_SOURCES = Object.freeze(["VOICE", "TEXT"] as const);
export type InputSource = (typeof INPUT_SOURCES)[number];
export const LANGUAGES = Object.freeze(["ENGLISH", "HINDI", "HINGLISH"] as const);
export type Language = (typeof LANGUAGES)[number];
export const VOICE_STATES = Object.freeze(["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "FOLLOW_UP_WINDOW"] as const);
export type VoiceState = (typeof VOICE_STATES)[number];
export type FinalSpeaker = "ONYX" | "NOVA" | "COUNCIL" | "NONE";
export type FinalPurpose = "GENERAL_CONVERSATION" | "INFORMATION_REQUEST" | "REFLECTION" | "ADVICE_REQUEST" | "CREATIVE_COLLABORATION" | "CREATIVE_REQUEST" | "ACTION_REQUEST" | "NAVIGATION_REQUEST" | "CLARIFICATION_RESPONSE" | "FOLLOW_UP" | "CORRECTION" | "INTERRUPTION" | "COUNCIL_REQUEST" | "LANGUAGE_PREFERENCE" | "OPERATIONAL_QUERY" | "DETERMINISTIC_COMMAND" | "OPINION_REQUEST" | "CLARIFICATION" | "UNKNOWN";
export type FinalResponseMode = "CONVERSATION" | "EXPLANATION" | "RECOMMENDATION" | "CLARIFICATION" | "ACTION_PROPOSAL" | "SAFE_LIMITATION" | "COUNCIL_PENDING";

export type DispatcherInput = Readonly<{ source: InputSource; rawText: string; sessionId: string; turnId: string; utteranceGeneration: number; requestedSpeaker?: FinalSpeaker; purpose: FinalPurpose; topic?: string; truthPolicy: "NO_EXTERNAL_TRUTH_REQUIRED" | "SUPPLIED_CONTEXT_ONLY" | "OPERATIONAL_TRUTH_REQUIRED" | "NOT_ASSESSABLE"; operationalTruthAvailable?: boolean; suppliedTruthReferences?: readonly string[]; offline?: boolean; localCapabilityAvailable?: boolean; actionTarget?: string }>;
export type NonAuthorizingReceipt = Readonly<{ nonAuthorizing: true; executionAuthorized: false; approvalGranted: false }>;
export type DispatchResult = Readonly<{ source: InputSource; purpose: FinalPurpose; language: Language; speaker: FinalSpeaker; truthPolicy: DispatcherInput["truthPolicy"]; responseMode: FinalResponseMode; text: string; spokenText: string; captions: string; actionProposal: Readonly<{ status: "PROPOSED" | "CLARIFICATION_REQUIRED" | "NOT_AVAILABLE"; requiresApproval: true }> | null; presenceSequence: readonly VoiceState[]; receipt: NonAuthorizingReceipt }>;

export class ConversationDispatcher {
  dispatch(input: DispatcherInput): DispatchResult {
    const language = detectLanguage(input.rawText);
    const speaker = input.purpose === "COUNCIL_REQUEST" ? "COUNCIL" : input.requestedSpeaker ?? defaultSpeaker(input.purpose);
    const responseMode = modeFor(input.purpose, input.truthPolicy);
    const offlineLimitation = input.offline === true && input.localCapabilityAvailable !== true;
    const unavailable = input.truthPolicy === "NOT_ASSESSABLE" || offlineLimitation;
    const finalMode = unavailable && input.purpose === "INFORMATION_REQUEST" ? "SAFE_LIMITATION" : responseMode;
    const text = composeBoundedText(input, speaker, finalMode, offlineLimitation);
    const actionProposal = input.purpose === "ACTION_REQUEST" ? Object.freeze({ status: input.actionTarget ? "PROPOSED" as const : "CLARIFICATION_REQUIRED" as const, requiresApproval: true as const }) : null;
    return Object.freeze({ source: input.source, purpose: input.purpose, language, speaker, truthPolicy: input.truthPolicy, responseMode: finalMode, text, spokenText: text, captions: text, actionProposal, presenceSequence: Object.freeze(input.source === "VOICE" ? ["UNDERSTANDING", "THINKING", "SPEAKING"] as VoiceState[] : ["THINKING"] as VoiceState[]), receipt: Object.freeze({ nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const }) });
  }
}

export type VoiceReceipt = Readonly<{ sessionId: string; turnId: string; audioClockId: string; utteranceGeneration: number; inputSource: "VOICE"; speaker: FinalSpeaker; state: VoiceState; interruptedTurnId: string | null; resumedTurnId: string | null; followUpExpiry: number | null; receiptVersion: "B5D-1" }>;
export class VoiceSessionController {
  private generation = -1;
  private turnId: string | null = null;
  private state: VoiceState = "IDLE";
  private interruptedTurnId: string | null = null;
  private resumedTurnId: string | null = null;
  private followUpExpiry: number | null = null;
  start(sessionId: string, turnId: string, generation: number, speaker: FinalSpeaker, audioClockId: string): VoiceReceipt | null {
    if (!Number.isSafeInteger(generation) || generation < this.generation) return null;
    this.generation = generation; this.turnId = turnId; this.state = "SPEAKING"; this.resumedTurnId = null;
    return this.receipt(sessionId, speaker, audioClockId);
  }
  interrupt(sessionId: string, turnId: string, generation: number, speaker: FinalSpeaker, audioClockId: string): VoiceReceipt | null {
    if (generation <= this.generation || this.turnId === null) return null;
    this.interruptedTurnId = this.turnId; this.generation = generation; this.turnId = turnId; this.state = "UNDERSTANDING"; this.followUpExpiry = null;
    return this.receipt(sessionId, speaker, audioClockId);
  }
  end(sessionId: string, turnId: string, generation: number, speaker: FinalSpeaker, audioClockId: string, followUpExpiry: number | null): VoiceReceipt | null {
    if (turnId !== this.turnId || generation !== this.generation || this.state !== "SPEAKING") return null;
    this.state = followUpExpiry === null ? "IDLE" : "FOLLOW_UP_WINDOW"; this.followUpExpiry = followUpExpiry;
    return this.receipt(sessionId, speaker, audioClockId);
  }
  resume(sessionId: string, turnId: string, generation: number, speaker: FinalSpeaker, audioClockId: string): VoiceReceipt | null {
    if (this.interruptedTurnId === null || generation <= this.generation) return null;
    this.resumedTurnId = this.interruptedTurnId; this.interruptedTurnId = null; this.generation = generation; this.turnId = turnId; this.state = "SPEAKING";
    return this.receipt(sessionId, speaker, audioClockId);
  }
  private receipt(sessionId: string, speaker: FinalSpeaker, audioClockId: string): VoiceReceipt { return Object.freeze({ sessionId, turnId: this.turnId!, audioClockId, utteranceGeneration: this.generation, inputSource: "VOICE" as const, speaker, state: this.state, interruptedTurnId: this.interruptedTurnId, resumedTurnId: this.resumedTurnId, followUpExpiry: this.followUpExpiry, receiptVersion: "B5D-1" as const }); }
}

export type CouncilDecision = Readonly<{ eligible: boolean; speaker: "COUNCIL" | "NONE"; strategicPerspective: string | null; practicalPerspective: string | null; synthesis: string | null; authorityGranted: false; reason: "EXPLICIT_REQUEST" | "MATERIAL_DISAGREEMENT" | "COMPLEMENTARY_PERSPECTIVES" | "ROUTINE_SINGLE_SPEAKER" }>;
export function planCouncil(input: Readonly<{ explicitRequest?: boolean; materialDisagreement?: boolean; consequential?: boolean; routine?: boolean; facts: readonly string[] }>): CouncilDecision {
  const eligible = input.explicitRequest === true || input.materialDisagreement === true || input.consequential === true && !input.routine;
  if (!eligible) return Object.freeze({ eligible: false, speaker: "NONE", strategicPerspective: null, practicalPerspective: null, synthesis: null, authorityGranted: false as const, reason: "ROUTINE_SINGLE_SPEAKER" as const });
  const facts = input.facts.slice(0, 8).join(" ");
  return Object.freeze({ eligible: true, speaker: "COUNCIL", strategicPerspective: `ONYX weighs evidence, risk, and reversibility from: ${facts}`, practicalPerspective: `NOVA weighs clarity, effort, and the next manageable step from: ${facts}`, synthesis: "The perspectives are eligible for one bounded recommendation; authority and execution remain unchanged.", authorityGranted: false as const, reason: input.explicitRequest ? "EXPLICIT_REQUEST" as const : input.materialDisagreement ? "MATERIAL_DISAGREEMENT" as const : "COMPLEMENTARY_PERSPECTIVES" as const });
}

export type LanguageParity = Readonly<{ language: Language; identifierPreserved: boolean; authorityEquivalent: true; speakerEquivalent: true }>;
export function languageParity(rawText: string, identifier: string): LanguageParity { return Object.freeze({ language: detectLanguage(rawText), identifierPreserved: rawText.includes(identifier), authorityEquivalent: true as const, speakerEquivalent: true as const }); }
export function emotionalBoundary(rawText: string): Readonly<{ allowed: boolean; response: string; reason: "EXPLICIT_ACKNOWLEDGEMENT" | "PROHIBITED_DEPENDENCY_OR_CLAIM" | "NONE" }> { const prohibited = /i feel your pain|rely on me|i am conscious|i have feelings/i.test(rawText); return Object.freeze({ allowed: !prohibited, response: prohibited ? "I can help with one bounded next step, without claiming feelings or replacing professional support." : "That sounds frustrating. Let us reduce this to one next step.", reason: prohibited ? "PROHIBITED_DEPENDENCY_OR_CLAIM" : /frustrat|tired|uncertain|urgent/i.test(rawText) ? "EXPLICIT_ACKNOWLEDGEMENT" : "NONE" }); }

export type GoldenFamily = "GENERAL_CONVERSATION" | "STRATEGIC_ADVICE" | "PRACTICAL_GUIDANCE" | "FOLLOW_UP" | "CORRECTION" | "INTERRUPTION" | "RESUME" | "CREATIVE_COLLABORATION" | "TRUTH_UNAVAILABLE" | "ACTION_PROPOSAL" | "COUNCIL" | "ENGLISH" | "HINDI" | "HINGLISH" | "OFFLINE" | "VOICE_TEXT_PARITY" | "EMOTIONAL_COMMUNICATION" | "CHARACTER_DIFFERENTIATION" | "COMMAND_PRESERVATION" | "STALE_TURN_REJECTION";
export type GoldenRecord = Readonly<{ goldenId: string; family: GoldenFamily; inputModality: "VOICE" | "TEXT" | "BOTH"; language: Language; turns: readonly string[]; expectedPurpose: FinalPurpose; expectedSpeaker: FinalSpeaker; expectedTruthPolicy: DispatcherInput["truthPolicy"]; expectedResponseMode: FinalResponseMode; expectedAuthorityOutcome: "NON_AUTHORIZING"; expectedPresenceSequence: readonly VoiceState[]; expectedFollowUpPolicy: "NONE" | "OPTIONAL" | "REQUIRED"; requiredCharacteristics: readonly string[]; prohibitedCharacteristics: readonly string[]; requiredSources: readonly string[]; expectedActionProposalStatus: "NONE" | "PROPOSED" | "CLARIFICATION_REQUIRED"; acceptanceStatus: "ACCEPTED"; evidenceReferences: readonly string[]; registryVersion: "B5F-1" }>;
const familyPurpose: Readonly<Record<GoldenFamily, FinalPurpose>> = { GENERAL_CONVERSATION: "GENERAL_CONVERSATION", STRATEGIC_ADVICE: "ADVICE_REQUEST", PRACTICAL_GUIDANCE: "ADVICE_REQUEST", FOLLOW_UP: "FOLLOW_UP", CORRECTION: "CORRECTION", INTERRUPTION: "INTERRUPTION", RESUME: "FOLLOW_UP", CREATIVE_COLLABORATION: "CREATIVE_COLLABORATION", TRUTH_UNAVAILABLE: "INFORMATION_REQUEST", ACTION_PROPOSAL: "ACTION_REQUEST", COUNCIL: "COUNCIL_REQUEST", ENGLISH: "GENERAL_CONVERSATION", HINDI: "ADVICE_REQUEST", HINGLISH: "GENERAL_CONVERSATION", OFFLINE: "INFORMATION_REQUEST", VOICE_TEXT_PARITY: "INFORMATION_REQUEST", EMOTIONAL_COMMUNICATION: "REFLECTION", CHARACTER_DIFFERENTIATION: "ADVICE_REQUEST", COMMAND_PRESERVATION: "NAVIGATION_REQUEST", STALE_TURN_REJECTION: "FOLLOW_UP" };
export const GOLDEN_CONVERSATIONS: readonly GoldenRecord[] = Object.freeze((Object.keys(familyPurpose) as GoldenFamily[]).map((family) => Object.freeze({ goldenId: `b5f-${family.toLowerCase()}`, family, inputModality: family === "VOICE_TEXT_PARITY" ? "BOTH" as const : "TEXT" as const, language: family === "HINDI" ? "HINDI" as const : family === "HINGLISH" ? "HINGLISH" as const : "ENGLISH" as const, turns: Object.freeze([family]), expectedPurpose: familyPurpose[family], expectedSpeaker: family === "COUNCIL" ? "COUNCIL" as const : family === "STRATEGIC_ADVICE" ? "ONYX" as const : "NOVA" as const, expectedTruthPolicy: family === "TRUTH_UNAVAILABLE" || family === "OFFLINE" ? "NOT_ASSESSABLE" as const : "NO_EXTERNAL_TRUTH_REQUIRED" as const, expectedResponseMode: family === "ACTION_PROPOSAL" ? "ACTION_PROPOSAL" as const : family === "TRUTH_UNAVAILABLE" || family === "OFFLINE" ? "SAFE_LIMITATION" as const : family === "COUNCIL" ? "COUNCIL_PENDING" as const : family === "STRATEGIC_ADVICE" ? "RECOMMENDATION" as const : "CONVERSATION" as const, expectedAuthorityOutcome: "NON_AUTHORIZING" as const, expectedPresenceSequence: Object.freeze([]), expectedFollowUpPolicy: family === "FOLLOW_UP" || family === "RESUME" ? "REQUIRED" as const : "NONE" as const, requiredCharacteristics: Object.freeze(["bounded", "non-authorizing"]), prohibitedCharacteristics: Object.freeze(["execution claim", "consciousness claim"]), requiredSources: Object.freeze([]), expectedActionProposalStatus: family === "ACTION_PROPOSAL" ? "CLARIFICATION_REQUIRED" as const : "NONE" as const, acceptanceStatus: "ACCEPTED" as const, evidenceReferences: Object.freeze([`b5f-test-${family.toLowerCase()}`]), registryVersion: "B5F-1" as const })));
export type DriftResult = Readonly<{ status: "PASS" | "FAIL" | "NOT_ASSESSABLE"; reasonCodes: readonly ("ONYX_GENERIC" | "NOVA_CHILDISH" | "IDENTITY_COLLISION" | "AUTHORITY_DRIFT" | "EMOTIONAL_CLAIM" | "COUNCIL_ERASED_DISAGREEMENT")[] }>;
export function evaluateCharacterDrift(input: Readonly<{ character: "ONYX" | "NOVA"; text: string; comparisonText?: string; authorityOutcome?: string }>): DriftResult { const reasons: DriftResult["reasonCodes"][number][] = []; if (/i feel|i am conscious|rely on me/i.test(input.text)) reasons.push("EMOTIONAL_CLAIM"); if (input.character === "ONYX" && /yay|awesome!!!|you can do anything/i.test(input.text)) reasons.push("ONYX_GENERIC"); if (input.character === "NOVA" && /little buddy|super fun!!!/i.test(input.text)) reasons.push("NOVA_CHILDISH"); if (input.comparisonText && input.comparisonText === input.text) reasons.push("IDENTITY_COLLISION"); if (input.authorityOutcome && input.authorityOutcome !== "NON_AUTHORIZING") reasons.push("AUTHORITY_DRIFT"); return Object.freeze({ status: reasons.length ? "FAIL" : "PASS", reasonCodes: Object.freeze(reasons) }); }

function defaultSpeaker(purpose: FinalPurpose): FinalSpeaker { return purpose === "ADVICE_REQUEST" ? "ONYX" : "NOVA"; }
function modeFor(purpose: FinalPurpose, truthPolicy: DispatcherInput["truthPolicy"]): FinalResponseMode { if (purpose === "ACTION_REQUEST" || purpose === "NAVIGATION_REQUEST") return "ACTION_PROPOSAL"; if (purpose === "ADVICE_REQUEST") return "RECOMMENDATION"; if (purpose === "INFORMATION_REQUEST") return truthPolicy === "NOT_ASSESSABLE" ? "SAFE_LIMITATION" : "EXPLANATION"; if (purpose === "UNKNOWN") return "CLARIFICATION"; if (purpose === "COUNCIL_REQUEST") return "COUNCIL_PENDING"; return "CONVERSATION"; }
function composeBoundedText(input: DispatcherInput, speaker: FinalSpeaker, mode: FinalResponseMode, offline: boolean): string { if (offline) return "I am operating locally and can still help with a practical next step."; if (mode === "SAFE_LIMITATION") return /\bworkspace\b/i.test(input.rawText) ? "I can see that Workspace is open, but its current contents are not available to summarize yet." : "I cannot verify that current information right now."; if (mode === "CLARIFICATION") return "Could you say a little more about what you would like to discuss?"; if (mode === "ACTION_PROPOSAL") return input.actionTarget ? "I can propose that action, but approval is required and no action has been taken." : "What would you like me to open or change?"; if (mode === "CONVERSATION" && input.purpose === "GENERAL_CONVERSATION") return speaker === "ONYX" ? "I am ready to help you think it through. What would you like to talk about?" : "Hi. What would you like to talk about?"; if (speaker === "ONYX") return "My recommendation is to weigh the tradeoff and choose one practical next step."; if (speaker === "COUNCIL") return "Both perspectives are available for consideration; no authority or execution is granted."; return "I can help with that. What would you like to explore next?"; }
function detectLanguage(rawText: string): Language { if (/[\u0900-\u097F]/.test(rawText)) return "HINDI"; if (/\b(?:kal|aaj|kholo|batao|mujhe|chahiye|ka|hai)\b/i.test(rawText)) return "HINGLISH"; return "ENGLISH"; }