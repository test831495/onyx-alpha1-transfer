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
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";

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
  workspaceSnapshot?: WorkspaceSnapshot;
}>;

export type WorkspaceConversationProjection = Readonly<{
  providerFacts: readonly string[];
  sourceReferences: readonly string[];
  freshness: "CURRENT" | "UNKNOWN";
}>;

export function buildWorkspaceConversationProjection(snapshot?: WorkspaceSnapshot): WorkspaceConversationProjection | undefined {
  if (!snapshot) return undefined;
  const providerFacts = snapshot.providers.slice(0, 4).map((provider) => `${provider.label}: ${provider.state}.`);
  return Object.freeze({ providerFacts: Object.freeze(providerFacts), sourceReferences: Object.freeze(["WORKSPACE_SNAPSHOT"]), freshness: "CURRENT" as const });
}

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
  generationMode: "MODEL_GENERATED" | "DETERMINISTIC_FALLBACK" | "SAFE_LIMITATION";
  providerRequestSucceeded: boolean;
  fallbackReason?: string;
  selectedSpeaker: FinalSpeaker;
  selectionReason: string;
  manualOverrideApplied: boolean;
  previousSpeakerPreserved: boolean;
  dispatchVersion: "B5D-ADAPTER-1";
}>;

type SpeakerSelection = Readonly<{
  speaker: FinalSpeaker;
  selectionReason: string;
  manualOverrideApplied: boolean;
  previousSpeakerPreserved: boolean;
}>;

export function selectConversationSpeaker(rawText: string, purpose: ConversationPurpose, requestedSpeaker?: FinalSpeaker, previousSpeaker?: FinalSpeaker): SpeakerSelection {
  if (purpose === "COUNCIL_REQUEST") return { speaker: "COUNCIL", selectionReason: "COUNCIL_ELIGIBILITY", manualOverrideApplied: false, previousSpeakerPreserved: false };
  if (requestedSpeaker === "ONYX" || requestedSpeaker === "NOVA") return { speaker: requestedSpeaker, selectionReason: "MANUAL_OVERRIDE", manualOverrideApplied: true, previousSpeakerPreserved: false };
  if (/\b(?:ask\s+)?onyx\b|\bwhat\s+does\s+onyx\b/i.test(rawText)) return { speaker: "ONYX", selectionReason: "EXPLICIT_ONYX", manualOverrideApplied: false, previousSpeakerPreserved: false };
  if (/\b(?:ask\s+)?nova\b|\bwhat\s+does\s+nova\b/i.test(rawText)) return { speaker: "NOVA", selectionReason: "EXPLICIT_NOVA", manualOverrideApplied: false, previousSpeakerPreserved: false };
  if ((purpose === "FOLLOW_UP" || /^(?:why|how so|what do you mean|and then what|what next|tell me more|can you explain that|what about that)\??$/i.test(rawText.trim())) && (previousSpeaker === "ONYX" || previousSpeaker === "NOVA")) return { speaker: previousSpeaker, selectionReason: "FOLLOW_UP_PRESERVED", manualOverrideApplied: false, previousSpeakerPreserved: true };
  if (purpose === "ADVICE_REQUEST") return { speaker: "ONYX", selectionReason: "POLICY_ADVICE", manualOverrideApplied: false, previousSpeakerPreserved: false };
  return { speaker: "NOVA", selectionReason: "POLICY_DEFAULT", manualOverrideApplied: false, previousSpeakerPreserved: false };
}

function detectConversationLanguage(
  rawText: string,
  currentLanguage: ConversationModelRequest["language"] = "ENGLISH",
): ConversationModelRequest["language"] {
  const normalized = rawText.normalize("NFKC").trim();

  if (/[\u0900-\u097F]/u.test(normalized)) {
    return "HINDI";
  }

  if (
    /\b(?:hinglish|hindi\s+(?:and|plus)\s+english|hindi\s+english)\b/i.test(
      normalized,
    )
  ) {
    return "HINGLISH";
  }

  if (
    /\b(?:hindi\s+mein|hindi\s+me)\b/i.test(normalized) ||
    /\b(?:speak|talk|reply|respond|answer|continue)\b[\s\S]{0,40}\b(?:in\s+)?hindi\b/i.test(
      normalized,
    )
  ) {
    return "HINDI";
  }

  if (
    /\b(?:english\s+mein|english\s+me)\b/i.test(normalized) ||
    /\b(?:speak|talk|reply|respond|answer|continue)\b[\s\S]{0,40}\b(?:in\s+)?english\b/i.test(
      normalized,
    )
  ) {
    return "ENGLISH";
  }

  return currentLanguage;
}

export function createConversationRuntimeAdapter(ownerReference = "command-center"): (input: LiveConversationInput) => Promise<LiveConversationDispatchReceipt> {
  const purposeResolver = new ConversationalPurposeResolver();
  const contextBuilder = new DialogueContextBuilder();
  const finalDispatcher = new ConversationDispatcher();
  let sessionId = "";
  let session = new ConversationSession("uninitialized", ownerReference);
  const modelRegistry = new ConversationModelRegistry([new OpenAIConversationAdapter()]);
  let previousSpeaker: FinalSpeaker | undefined;
  let previousTopic: string | null = null;
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
    const activeTopic = input.currentTopic ?? previousTopic;
    if (input.currentTopic) previousTopic = input.currentTopic;
    const purposeResolution = purposeResolver.resolve({ rawText: input.rawText, hasActiveTopic: activeTopic !== null && activeTopic !== undefined });
    const continuity = session.accept({ sessionId: input.sessionId, ownerReference, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, purpose: purposeResolution.purpose, timestamp: Date.now(), topicLabel: input.currentTopic ?? activeTopic ?? undefined, speaker: input.requestedSpeaker, summary: input.rawText });
    const continuityFrame = continuity.frame;
    const continuityTopic = continuityFrame.topic?.label ?? activeTopic ?? null;
    const continuitySummaries = continuityFrame.turns
      .map((turn) => turn.summary)
      .filter((summary) => typeof summary === "string" && summary.trim().length > 0)
      .slice(-5);
    const context = contextBuilder.build({
      recentTurnSummaries: continuitySummaries,
      currentTopic: continuityTopic ?? undefined,
      suppliedTruthReferences: input.suppliedTruthReferences,
      operatingMode: input.source === "VOICE" ? "VOICE" : "TEXT",
    });
    const speakerSelection = selectConversationSpeaker(input.rawText, purposeResolution.purpose, input.requestedSpeaker, previousSpeaker);
    const envelope = parseConversationalRequest(input.rawText);
    const operational = /\b(?:calendar|meeting|mail|file|note|task|account|connector|provider|tomorrow)\b/i.test(input.rawText) || purposeResolution.purpose === "ACTION_REQUEST";
    const truthPolicy = envelope.kind === "CALENDAR_PROVIDER_LIMITATION" || input.offline === true && input.localCapabilityAvailable !== true
      ? "NOT_ASSESSABLE"
      : operational ? "OPERATIONAL_TRUTH_REQUIRED" : input.suppliedTruthReferences?.length ? "SUPPLIED_CONTEXT_ONLY" : "NO_EXTERNAL_TRUTH_REQUIRED";
    const finalResult = finalDispatcher.dispatch({ source: input.source, rawText: input.rawText, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, requestedSpeaker: speakerSelection.speaker, purpose: purposeResolution.purpose, topic: continuityTopic ?? undefined, truthPolicy, suppliedTruthReferences: input.suppliedTruthReferences, offline: input.offline, localCapabilityAvailable: input.localCapabilityAvailable });
    const speaker = finalResult.speaker;
    if (speaker === "ONYX" || speaker === "NOVA") previousSpeaker = speaker;
    const truth = resolveTruthRequirement({ purpose: purposeResolution.purpose, rawText: input.rawText, suppliedContext: Boolean(input.suppliedTruthReferences?.length), suppliedTruthReferences: input.suppliedTruthReferences, operationalTruthAvailable: false });
    const plan = planResponse({ requestId: input.turnId, planId: `plan-${input.turnId}`, purpose: purposeResolution.purpose, truth, currentTopic: activeTopic ?? undefined, speakerDecision: { selectedSpeaker: speaker === "ONYX" || speaker === "NOVA" ? speaker : undefined } });
    const candidate = plan ? composeCharacterResponse(plan) : null;
    let selectedCandidate = candidate;
    const workspaceProjection = buildWorkspaceConversationProjection(input.workspaceSnapshot);
    const workspaceRequest = /\bworkspace\b/i.test(input.rawText);
    let generationMode: LiveConversationDispatchReceipt["generationMode"] = truth.truthPolicy === "NOT_ASSESSABLE" ? "SAFE_LIMITATION" : "DETERMINISTIC_FALLBACK";
    let providerRequestSucceeded = false;
    let fallbackReason: string | undefined;
    const userText = input.rawText.trim().slice(0, 2000);
    if (workspaceRequest && !workspaceProjection) {
      fallbackReason = "WORKSPACE_SNAPSHOT_UNAVAILABLE";
      if (candidate) selectedCandidate = freezeCandidate({ ...candidate, text: "I can see that Workspace is open, but its current contents are not available to summarize yet.", spokenText: "I can see that Workspace is open, but its current contents are not available to summarize yet.", captionText: "I can see that Workspace is open, but its current contents are not available to summarize yet." });
    } else if (plan && candidate && userText && (speaker === "ONYX" || speaker === "NOVA")) {
      const modelRequest: ConversationModelRequest = {
        requestId: input.turnId, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration,
        userText,
        language: detectConversationLanguage(
        input.rawText,
        "ENGLISH",
      ), selectedSpeaker: speaker, selectionReason: speakerSelection.selectionReason, characterProfileVersion: candidate.characterProfileVersion,
        conversationPurpose: purposeResolution.purpose, responseMode: plan.responseMode, responseObjectives: plan.objectives,
        recentTurnSummaries: continuitySummaries.length > 0 ? continuitySummaries : context.recentTurnSummaries, currentTopic: continuityTopic ?? context.currentTopic, supportedClaims: plan.supportedClaims,
        prohibitedClaims: plan.prohibitedClaims, truthStatus: candidate.truthStatus,
        uncertaintyPolicy: plan.uncertaintyPolicy, responseLengthPolicy: "STANDARD", followUpPolicy: plan.followUpPolicy,
        operatingMode: input.source, privacyClass: "STANDARD", trustedCapabilityFacts: workspaceProjection?.providerFacts ?? [], requestVersion: "B5F-1",
        sourceReferences: [...plan.requiredTruthReferences, ...(workspaceProjection?.sourceReferences ?? [])],
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
            if (validateCharacterResponseCandidate(generated).status === "VALID") {
              selectedCandidate = generated;
              generationMode = result.generationMode ?? "MODEL_GENERATED";
              providerRequestSucceeded = result.providerRequestSucceeded ?? true;
            }
          }
        } catch (error) {
          fallbackReason = error instanceof Error ? error.message : "MODEL_PROVIDER_FAILURE";
          selectedCandidate = candidate;
        }
      }
    }
    const envelopeResult = selectedCandidate && (speaker === "ONYX" || speaker === "NOVA") ? buildCharacterResponseEnvelope({ candidateVersion: "B4B-1", suppliedSpeaker: speaker, displayCandidate: input.offline ? finalResult.text : selectedCandidate.text, spokenCandidate: input.offline ? finalResult.spokenText : selectedCandidate.spokenText, contentClass: "GENERAL_EXPLANATION", generatedOrGroundedClass: "GENERATED_GENERAL", truthSourceClass: truth.truthPolicy === "OPERATIONAL_TRUTH_REQUIRED" ? "UNAVAILABLE" : "GENERATED_GENERAL", provenanceClass: "SUPPLIED_SAFE_CONTENT", responseLanguageClass: "ENGLISH", criticalFacts: truth.truthPolicy === "NOT_ASSESSABLE" ? ["LIMITATION"] : [], limitations: truth.limitationCodes, followUpClass: "NONE" }) : { ok: false as const };
    const characterValidation = validateCharacterBibleConformance();
    return Object.freeze({ dispatchId: `dispatch-${input.turnId}-${input.utteranceGeneration}`, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, source: input.source, purpose: purposeResolution.purpose, speaker, truthPolicy, responseMode: finalResult.responseMode, text: input.offline ? finalResult.text : selectedCandidate?.text ?? finalResult.text, spokenText: input.offline ? finalResult.spokenText : selectedCandidate?.spokenText ?? finalResult.spokenText, envelopeStatus: envelopeResult.ok ? "VALID" : "INVALID", characterValidationStatus: characterValidation.passed ? "VALID" : "INVALID", continuityStatus: continuity.status, presenceSequence: finalResult.presenceSequence, actionProposalStatus: plan?.actionProposal?.status ?? "NONE", deterministicCommandPreserved: false, registeredIntentFailureAvoided: true, nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const, selectedSpeaker: speakerSelection.speaker, selectionReason: speakerSelection.selectionReason, manualOverrideApplied: speakerSelection.manualOverrideApplied, previousSpeakerPreserved: speakerSelection.previousSpeakerPreserved, generationMode, providerRequestSucceeded, ...(fallbackReason ? { fallbackReason } : {}), dispatchVersion: "B5D-ADAPTER-1" as const });
  };
}

function fallbackReceipt(input: LiveConversationInput, continuityStatus: string): LiveConversationDispatchReceipt {
  return Object.freeze({ dispatchId: `dispatch-${input.turnId}-${input.utteranceGeneration}`, sessionId: input.sessionId, turnId: input.turnId, utteranceGeneration: input.utteranceGeneration, source: input.source, purpose: "UNKNOWN" as const, speaker: "NONE" as const, truthPolicy: "NOT_ASSESSABLE" as const, responseMode: "SAFE_LIMITATION", text: "I need a little more context before I can answer safely.", spokenText: "I need a little more context before I can answer safely.", envelopeStatus: "VALID" as const, characterValidationStatus: "VALID" as const, continuityStatus, presenceSequence: ["THINKING"], actionProposalStatus: "NONE" as const, deterministicCommandPreserved: false, registeredIntentFailureAvoided: true, nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const, selectedSpeaker: "NONE" as const, selectionReason: "STALE_TURN", manualOverrideApplied: false, previousSpeakerPreserved: false, generationMode: "SAFE_LIMITATION" as const, providerRequestSucceeded: false, fallbackReason: "STALE_TURN", dispatchVersion: "B5D-ADAPTER-1" as const });
}
