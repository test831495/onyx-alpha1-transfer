import { buildCharacterResponseEnvelope } from "@onyx/conversation-response-envelope";
import { validateCharacterBibleConformance } from "@onyx/conversation-character-validation";
import { composeCharacterResponse, planResponse, resolveTruthRequirement } from "@onyx/conversation-first-response-runtime";
import { ConversationSession } from "@onyx/conversation-continuity-runtime";
import { ConversationDispatcher, type FinalSpeaker, type InputSource } from "@onyx/conversation-first-final-runtime";
import { ConversationalPurposeResolver, type ConversationPurpose } from "./conversationPurpose";
import { DialogueContextBuilder } from "./dialogueContext";
import { parseConversationalRequest } from "./conversationIntentGrammar";
import { ConversationModelRegistry, OpenAIConversationAdapter, type ConversationModelRequest } from "@onyx/conversation-model-runtime";
import { freezeCandidate } from "@onyx/conversation-first-response-runtime";
import { validateCharacterResponseCandidate } from "@onyx/conversation-first-response-runtime";

export type LiveConversationInput = Readonly<{
  source: InputSource;
  rawText: string;
  sessionId: string;
  turnId: string;
  utteranceGeneration: number;
  requestedSpeaker?: FinalSpeaker;
  currentTopic?: string;
  suppliedTruthReferences?: readonly string[];
  offline?: boolean;
  localCapabilityAvailable?: boolean;
}>;

export type LiveConversationDispatchReceipt = Readonly<{
  dispatchId: string;
  sessionId: string;
  turnId: string;
  utteranceGeneration: number;
  source: InputSource;
  purpose: ConversationPurpose;
  speaker: FinalSpeaker;
  truthPolicy: "NO_EXTERNAL_TRUTH_REQUIRED" | "SUPPLIED_CONTEXT_ONLY" | "OPERATIONAL_TRUTH_REQUIRED" | "NOT_ASSESSABLE";
  responseMode: string;
  text: string;
  spokenText: string;
  envelopeStatus: "VALID" | "INVALID";
  characterValidationStatus: "VALID" | "INVALID";
  continuityStatus: string;
  presenceSequence: readonly string[];
  actionProposalStatus: "NONE" | "PROPOSED" | "CLARIFICATION_REQUIRED" | "NOT_AVAILABLE";
  deterministicCommandPreserved: boolean;
  registeredIntentFailureAvoided: boolean;
  nonAuthorizing: true;
  executionAuthorized: false;
  approvalGranted: false;
  dispatchVersion: "B5D-ADAPTER-1";
}>;

export function createConversationRuntimeAdapter(ownerReference = "command-center"): (input: LiveConversationInput) => Promise<LiveConversationDispatchReceipt> {
  const purposeResolver = new ConversationalPurposeResolver();
  const contextBuilder = new DialogueContextBuilder();
  const finalDispatcher = new ConversationDispatcher();
  let sessionId = "";
  let session = new ConversationSession("uninitialized", ownerReference);
  const modelRegistry = new ConversationModelRegistry([new OpenAIConversationAdapter()]);
  let activeGeneration = -1;
  let activeAbortController: AbortController | null = null;

  return async (input) => {
    if (input.utteranceGeneration < activeGeneration) return fallbackReceipt(input, "STALE_TURN");
    activeAbortController?.abort();
    activeAbortController = new AbortController();
    activeGeneration = input.utteranceGeneration;
    if (input.sessionId !== sessionId) {
      sessionId = input.sessionId;
      session = new ConversationSession(input.sessionId, ownerReference);
    }
    const context = contextBuilder.build({ currentTopic: input.currentTopic, suppliedTruthReferences: input.suppliedTruthReferences, operatingMode: input.source === "VOICE" ? "VOICE" : "TEXT" });
    const purposeResolution = purposeResolver.resolve({ rawText: input.rawText, hasActiveTopic: context.currentTopic !== null });
    const envelope = parseConversationalRequest(input.rawText);
    const operational = /\b(?:calendar|meeting|mail|file|note|task|account|connector|provider|tomorrow)\b/i.test(input.rawText) || purposeResolution.purpose === "ACTION_REQUEST";
    const truthPolicy = envelope.kind === "CALENDAR_PROVIDER_LIMITATION" || input.offline === true && input.localCapabilityAvailable !== true
      ? "NOT_ASSESSABLE"
      : operational ? "OPERATIONAL_TRUTH_REQUIRED" : input.suppliedTruthReferences?.length ? "SUPPLIED_CONTEXT_ONLY" : "NO_EXTERNAL_TRUTH_REQUIRED";
    const continuity = session.accept({ sessionId: input.sessionId, ownerReference, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, purpose: purposeResolution.purpose, timestamp: Date.now(), topicLabel: input.currentTopic, speaker: input.requestedSpeaker, summary: input.rawText });
    const finalResult = finalDispatcher.dispatch({ source: input.source, rawText: input.rawText, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, requestedSpeaker: input.requestedSpeaker, purpose: purposeResolution.purpose, topic: input.currentTopic, truthPolicy, suppliedTruthReferences: input.suppliedTruthReferences, offline: input.offline, localCapabilityAvailable: input.localCapabilityAvailable });
    const speaker = finalResult.speaker;
    const truth = resolveTruthRequirement({ purpose: purposeResolution.purpose, rawText: input.rawText, suppliedContext: Boolean(input.suppliedTruthReferences?.length), suppliedTruthReferences: input.suppliedTruthReferences, operationalTruthAvailable: false });
    const plan = planResponse({ requestId: input.turnId, planId: `plan-${input.turnId}`, purpose: purposeResolution.purpose, truth, currentTopic: input.currentTopic, speakerDecision: { selectedSpeaker: speaker === "ONYX" || speaker === "NOVA" ? speaker : undefined } });
    const candidate = plan ? composeCharacterResponse(plan) : null;
    let selectedCandidate = candidate;
    if (plan && candidate && (speaker === "ONYX" || speaker === "NOVA")) {
      const modelRequest: ConversationModelRequest = {
        requestId: input.turnId, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration,
        language: "ENGLISH", selectedSpeaker: speaker, characterProfileVersion: candidate.characterProfileVersion,
        conversationPurpose: purposeResolution.purpose, responseMode: plan.responseMode, responseObjectives: plan.objectives,
        recentTurnSummaries: context.recentTurnSummaries, currentTopic: context.currentTopic, supportedClaims: plan.supportedClaims,
        prohibitedClaims: plan.prohibitedClaims, truthStatus: candidate.truthStatus, sourceReferences: plan.requiredTruthReferences,
        uncertaintyPolicy: plan.uncertaintyPolicy, responseLengthPolicy: "STANDARD", followUpPolicy: plan.followUpPolicy,
        operatingMode: input.source, privacyClass: "STANDARD", trustedCapabilityFacts: [], requestVersion: "B5F-1",
      };
      const modelAdapter = modelRegistry.decide(modelRequest, true, { offline: input.offline === true, localCapabilityAvailable: input.localCapabilityAvailable === true });
      if (modelAdapter) {
        try {
          const result = await Promise.race([
            modelAdapter.generate(modelRequest, activeAbortController.signal),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 8000)),
          ]);
          if (input.utteranceGeneration === activeGeneration && result.text.trim()) {
            const generated = freezeCandidate({ ...candidate, text: result.text.trim(), spokenText: result.spokenText?.trim() || result.text.trim(), captionText: result.text.trim() });
            if (validateCharacterResponseCandidate(generated).status === "VALID") selectedCandidate = generated;
          }
        } catch {
          selectedCandidate = candidate;
        }
      }
    }
    const envelopeResult = selectedCandidate && (speaker === "ONYX" || speaker === "NOVA") ? buildCharacterResponseEnvelope({ candidateVersion: "B4B-1", suppliedSpeaker: speaker, displayCandidate: input.offline ? finalResult.text : selectedCandidate.text, spokenCandidate: input.offline ? finalResult.spokenText : selectedCandidate.spokenText, contentClass: "GENERAL_EXPLANATION", generatedOrGroundedClass: "GENERATED_GENERAL", truthSourceClass: truth.truthPolicy === "OPERATIONAL_TRUTH_REQUIRED" ? "UNAVAILABLE" : "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT", responseLanguageClass: "ENGLISH", criticalFacts: truth.truthPolicy === "NOT_ASSESSABLE" ? ["LIMITATION"] : [], limitations: truth.limitationCodes, followUpClass: "NONE" }) : { ok: false as const };
    const characterValidation = validateCharacterBibleConformance();
    return Object.freeze({ dispatchId: `dispatch-${input.turnId}-${input.utteranceGeneration}`, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, source: input.source, purpose: purposeResolution.purpose, speaker, truthPolicy, responseMode: finalResult.responseMode, text: input.offline ? finalResult.text : selectedCandidate?.text ?? finalResult.text, spokenText: input.offline ? finalResult.spokenText : selectedCandidate?.spokenText ?? finalResult.spokenText, envelopeStatus: envelopeResult.ok ? "VALID" : "INVALID", characterValidationStatus: characterValidation.passed ? "VALID" : "INVALID", continuityStatus: continuity.status, presenceSequence: finalResult.presenceSequence, actionProposalStatus: plan?.actionProposal?.status ?? "NONE", deterministicCommandPreserved: false, registeredIntentFailureAvoided: true, nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const, dispatchVersion: "B5D-ADAPTER-1" as const });
  };
}

function fallbackReceipt(input: LiveConversationInput, continuityStatus: string): LiveConversationDispatchReceipt {
  return Object.freeze({ dispatchId: `dispatch-${input.turnId}-${input.utteranceGeneration}`, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, source: input.source, purpose: "UNKNOWN" as const, speaker: "NONE" as const, truthPolicy: "NOT_ASSESSABLE" as const, responseMode: "SAFE_LIMITATION", text: "I need a little more context before I can answer safely.", spokenText: "I need a little more context before I can answer safely.", envelopeStatus: "VALID" as const, characterValidationStatus: "VALID" as const, continuityStatus, presenceSequence: ["THINKING"], actionProposalStatus: "NONE" as const, deterministicCommandPreserved: false, registeredIntentFailureAvoided: true, nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const, dispatchVersion: "B5D-ADAPTER-1" as const });
}
