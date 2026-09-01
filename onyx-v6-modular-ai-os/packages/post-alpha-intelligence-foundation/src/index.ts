export const INTELLIGENCE_FLAGS = Object.freeze({ conversation_director: "OFF", context_envelope_builder: "OFF", evidence_resolver: "OFF", conflict_engine: "OFF", memory_runtime: "OFF", model_gateway_v2: "OFF", nova_runtime: "OFF" } as const);
export const MEMORY_TIERS = ["M0", "M1", "M2", "M3", "M4", "M5"] as const;

export type ReasoningIntent = "SIMPLE_STATUS" | "CREATIVE_EXPLORATION" | "ARCHITECTURE_CHOICE" | "GOVERNANCE_READINESS" | "HIGH_IMPACT_AMBIGUOUS" | "PROTECTED_DECISION";
export type ResponseMode = "ONYX_ONLY" | "NOVA_ONLY" | "NOVA_THEN_ONYX" | "ONYX_THEN_NOVA_REVIEW" | "PARALLEL_INDEPENDENT_ANALYSIS" | "OWNER_DECISION_REQUIRED";

const ROUTES: Record<ReasoningIntent, ResponseMode> = { SIMPLE_STATUS: "ONYX_ONLY", CREATIVE_EXPLORATION: "NOVA_ONLY", ARCHITECTURE_CHOICE: "NOVA_THEN_ONYX", GOVERNANCE_READINESS: "ONYX_THEN_NOVA_REVIEW", HIGH_IMPACT_AMBIGUOUS: "PARALLEL_INDEPENDENT_ANALYSIS", PROTECTED_DECISION: "OWNER_DECISION_REQUIRED" };

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) { for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry); Object.freeze(value); }
  return value;
}

export function routeReasoning(intent: ReasoningIntent): ResponseMode {
  const route = ROUTES[intent];
  if (!route) throw new TypeError("Unknown reasoning intent");
  return route;
}

type Evidence = { readonly id: string; readonly status: "CURRENT" | "STALE" | "INVALIDATED"; readonly candidateBound: boolean; readonly hashVerified: boolean; readonly claim: string };

export function resolveEvidence(evidence: readonly Evidence[]) {
  if (evidence.length === 0) return deepFreeze({ status: "NOT_ASSESSABLE" as const, claim: null, evidenceReferences: [] as string[] });
  const verified = evidence.filter((entry) => entry.status === "CURRENT" && entry.candidateBound && entry.hashVerified);
  if (new Set(verified.map((entry) => entry.claim)).size > 1) return deepFreeze({ status: "CONFLICTING" as const, claim: null, evidenceReferences: verified.map((entry) => entry.id) });
  const firstVerified = verified[0];
  if (firstVerified) return deepFreeze({ status: "CURRENT" as const, claim: firstVerified.claim, evidenceReferences: [firstVerified.id] });
  const status = evidence.some((entry) => entry.status === "INVALIDATED") ? "INVALIDATED" : "STALE";
  return deepFreeze({ status, claim: null, evidenceReferences: evidence.map((entry) => entry.id) });
}

function normalizeMeaning(value: string): string { return value.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }

export function classifyConflict(input: { readonly onyx: string; readonly nova: string }, classification: "WORDING" | "COMPLEMENTARY" | "FACTUAL" | "ARCHITECTURE" | "SECURITY" | "GOVERNANCE" | "AUTHORITY") {
  if (normalizeMeaning(input.onyx) === normalizeMeaning(input.nova)) return "EQUIVALENT";
  if (classification === "COMPLEMENTARY") return "COMPLEMENTARY";
  if (["ARCHITECTURE", "SECURITY", "GOVERNANCE", "AUTHORITY"].includes(classification)) return "OWNER_DECISION_REQUIRED";
  return "EVIDENCE_RESOLUTION_REQUIRED";
}

export function directConversation(input: { readonly mode: ResponseMode; readonly onyx: readonly string[]; readonly nova: readonly string[] }) {
  return deepFreeze({ mode: input.mode, onyx: input.onyx.slice(0, 2), nova: input.nova.slice(0, 2), synthesisCycles: 1 as const });
}

export function buildContextEnvelope(input: { readonly evidenceReferences: readonly string[]; readonly tokenBudget: number; readonly tools: readonly string[] }) {
  if (input.tokenBudget <= 0) throw new TypeError("Token budget must be positive");
  return deepFreeze({ evidenceReferences: [...input.evidenceReferences], tokenBudget: input.tokenBudget, tools: input.tools.map((id) => ({ id, access: "READ_ONLY" as const })), cancellable: true, providerNeutral: true });
}

export type TokenBudgetClass = "SMALL" | "STANDARD" | "EXTENDED";
export interface TokenBudgetContract {
  readonly budgetClass: TokenBudgetClass;
  readonly total: number;
  readonly input: number;
  readonly output: number;
  readonly toolCalls: number;
  readonly mandatoryReserve: number;
}

const TOKEN_BUDGET_CLASSES: readonly TokenBudgetClass[] = ["SMALL", "STANDARD", "EXTENDED"];

function validBudgetNumber(value: number): boolean {
  return Number.isFinite(value) && Number.isSafeInteger(value) && value >= 0;
}

export function projectTokenBudget(contract: TokenBudgetContract): Readonly<{ readonly status: "ACCEPTED" | "REJECTED"; readonly reason: string | null; readonly remaining: number; readonly modelCallPermitted: boolean; readonly toolCallPermitted: boolean }> {
  const values = [contract.total, contract.input, contract.output, contract.toolCalls, contract.mandatoryReserve];
  const rejected = (reason: string) => deepFreeze({ status: "REJECTED" as const, reason, remaining: 0, modelCallPermitted: false, toolCallPermitted: false });
  if (!TOKEN_BUDGET_CLASSES.includes(contract.budgetClass)) return rejected("UNKNOWN_BUDGET_CLASS");
  if (!values.every(validBudgetNumber)) return rejected("INVALID_BUDGET_VALUE");
  if (contract.total <= 0 || contract.mandatoryReserve <= 0) return rejected("MISSING_MANDATORY_BUDGET");
  const allocated = contract.input + contract.output + contract.toolCalls + contract.mandatoryReserve;
  if (!Number.isSafeInteger(allocated) || allocated > contract.total) return rejected("BUDGET_EXCEEDED");
  return deepFreeze({ status: "ACCEPTED" as const, reason: null, remaining: contract.total - allocated, modelCallPermitted: true, toolCallPermitted: true });
}

export function proposeMemoryAdmission(input: { readonly tier: typeof MEMORY_TIERS[number]; readonly content: string; readonly ownerDecision: boolean }) {
  return deepFreeze({ ...input, admitted: false as const, status: input.ownerDecision ? "PROPOSAL_REQUIRES_PERSISTENCE_GATE" : "PROPOSAL_ONLY" });
}

export interface ModelCapabilityProfile { readonly modelId: string; readonly contextTokens: number; readonly capabilities: readonly string[]; readonly providerNeutral: true; }
export interface MemoryQueryPlan { readonly tiers: readonly typeof MEMORY_TIERS[number][]; readonly query: string; readonly readOnly: true; }
export const CHARACTER_CONTRACTS = Object.freeze({ ONYX: { gender: "MALE", responsibility: "SYNTHESIZE_AND_RECOMMEND", canAuthorize: false }, NOVA: { gender: "FEMALE", responsibility: "EXPLORE_AND_CHALLENGE", canAuthorize: false } } as const);

// CORR-INTEL-002: closed semantic-event vocabulary compatible with PA-AVATAR canonical states.
export const SEMANTIC_STATES = ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "WORKING", "SPEAKING", "PRESENTING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "INTERRUPTED", "RECOVERING", "OFFLINE"] as const;
export type IntelSemanticState = typeof SEMANTIC_STATES[number];
export const NON_STATE_SEMANTIC_EVENTS = ["EVIDENCE_ATTACHED", "MEMORY_PROPOSAL_CREATED", "CONFLICT_DETECTED", "TOOL_INVOKED_READ_ONLY", "CANCELLATION_REQUESTED"] as const;
export type IntelNonStateEvent = typeof NON_STATE_SEMANTIC_EVENTS[number];
export type IntelSemanticEventType = IntelSemanticState | IntelNonStateEvent;

export interface SemanticEventProjection { readonly type: IntelSemanticEventType; readonly evidenceReferences: readonly string[]; readonly executable: false; }

export function validateSemanticEventType(type: string): IntelSemanticEventType {
  if ((SEMANTIC_STATES as readonly string[]).includes(type) || (NON_STATE_SEMANTIC_EVENTS as readonly string[]).includes(type)) return type as IntelSemanticEventType;
  throw new TypeError("Unknown semantic event type: unrestricted values are rejected fail-closed");
}

export type AvatarRenderer = "AVATAR_2D" | "TEXT" | "AUDIO";

export function mapIntelEventToAvatarCompatibility(type: string, renderer: AvatarRenderer = "TEXT"): Readonly<{ avatarState: IntelSemanticState | null; rendererIndependent: true }> {
  const validated = validateSemanticEventType(type);
  void renderer; // renderer selection never changes semantic meaning
  const avatarState = (SEMANTIC_STATES as readonly string[]).includes(validated) ? (validated as IntelSemanticState) : null;
  return deepFreeze({ avatarState, rendererIndependent: true as const });
}

// CORR-INTEL-003: structural, type-only conformance to closed PA-GOV governance vocabularies (no PA-GOV/PA-ASSURE runtime import).
export const GOV_VERIFICATION_OUTCOMES = ["PASS", "FAIL", "NOT_ASSESSABLE"] as const;
export const GOV_BLOCKER_STATUSES = ["CLEAR", "BLOCKED"] as const;
export const GOV_OWNER_DISPOSITIONS = ["APPROVED", "REJECTED", "NOT_RECORDED"] as const;
export const GOV_EFFECTIVE_AUTHORIZATIONS = ["BOUNDED_ONLY", "DENIED"] as const;

export interface GovernanceDecisionContract {
  readonly verificationOutcome: typeof GOV_VERIFICATION_OUTCOMES[number];
  readonly blockerStatus: typeof GOV_BLOCKER_STATUSES[number];
  readonly ownerDisposition: typeof GOV_OWNER_DISPOSITIONS[number];
  readonly effectiveAuthorization: typeof GOV_EFFECTIVE_AUTHORIZATIONS[number];
}

export type IntelRecommendationMode = "ADVISORY_ONLY" | "OWNER_DECISION_REQUIRED";

export function consumeGovernanceDecision(decision: GovernanceDecisionContract): IntelRecommendationMode {
  const known = (GOV_VERIFICATION_OUTCOMES as readonly string[]).includes(decision.verificationOutcome)
    && (GOV_BLOCKER_STATUSES as readonly string[]).includes(decision.blockerStatus)
    && (GOV_OWNER_DISPOSITIONS as readonly string[]).includes(decision.ownerDisposition)
    && (GOV_EFFECTIVE_AUTHORIZATIONS as readonly string[]).includes(decision.effectiveAuthorization);
  if (!known) throw new TypeError("Unknown governance decision value: rejected fail-closed");
  if (decision.effectiveAuthorization === "DENIED" || decision.blockerStatus === "BLOCKED" || decision.verificationOutcome !== "PASS") return "OWNER_DECISION_REQUIRED";
  return "ADVISORY_ONLY";
}

// CORR-INTEL-001: complete freshness dependency/invalidation vocabulary, mirroring PA-GOV.
export const INTEL_FRESHNESS_DEPENDENCIES = Object.freeze([
  "CANDIDATE_HEAD_AND_TREE",
  "PROTECTED_SOURCE_AND_TEST_FINGERPRINTS",
  "POLICY_VERSION",
  "ACCEPTANCE_REGISTRY_VERSION",
  "DEPENDENCY_LOCK_BINDING",
  "TOOLCHAIN_AND_VALIDATION_PROFILE",
  "ENVIRONMENT_PROFILE",
  "FEATURE_FLAG_SNAPSHOT",
  "DEPENDENT_EVIDENCE_IDS",
  "GENERATION_TIMESTAMP",
  "VALIDITY_WINDOW",
] as const);

export const INTEL_INVALIDATION_TRIGGERS = Object.freeze([
  "CANDIDATE_HEAD_OR_TREE_CHANGE",
  "PROTECTED_HASH_CHANGE",
  "POLICY_VERSION_CHANGE",
  "ACCEPTANCE_REGISTRY_CHANGE",
  "DEPENDENCY_LOCK_CHANGE",
  "TOOLCHAIN_OR_PROFILE_CHANGE",
  "ENVIRONMENT_PROFILE_CHANGE",
  "FEATURE_FLAG_SNAPSHOT_CHANGE",
  "CONFLICTING_CURRENT_EVIDENCE",
  "SECURITY_INCIDENT",
  "OWNER_SCOPE_CHANGE",
  "SUPERSEDING_ACCEPTED_EVIDENCE",
] as const);