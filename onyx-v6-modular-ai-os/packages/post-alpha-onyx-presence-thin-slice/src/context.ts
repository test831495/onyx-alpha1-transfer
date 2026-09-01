import { deepFreeze, type PresenceLifecycleState } from "./contracts";

export interface TokenBudgetContract {
  readonly budgetClass: "SMALL" | "MEDIUM" | "LARGE";
  readonly total: number;
  readonly input: number;
  readonly output: number;
  readonly toolCalls: number;
  readonly mandatoryReserve: number;
}

function projectTokenBudget(contract: TokenBudgetContract) {
  const accepted = contract.total > 0 && contract.input + contract.output + contract.toolCalls + contract.mandatoryReserve <= contract.total;
  return deepFreeze({ ...structuredClone(contract), status: accepted ? "ACCEPTED" as const : "REJECTED" as const });
}

function resolveEvidence(evidence: readonly PresenceEvidenceInput[]) {
  if (evidence.length === 0) return deepFreeze({ status: "NOT_ASSESSABLE" as const, evidenceReferences: [] as string[] });
  if (evidence.some((entry) => entry.status !== "CURRENT" || !entry.candidateBound || !entry.hashVerified)) return deepFreeze({ status: "STALE" as const, evidenceReferences: [] as string[] });
  const claims = new Set(evidence.map((entry) => entry.claim));
  if (claims.size !== 1) return deepFreeze({ status: "CONFLICTING" as const, evidenceReferences: [] as string[] });
  return deepFreeze({ status: "CURRENT" as const, evidenceReferences: evidence.map((entry) => entry.id) });
}

export interface PresenceEvidenceInput {
  readonly id: string;
  readonly status: "CURRENT" | "STALE" | "INVALIDATED";
  readonly candidateBound: boolean;
  readonly hashVerified: boolean;
  readonly claim: string;
}

export interface PresenceContextInput {
  readonly interactionId: string;
  readonly correlationId: string;
  readonly currentTurn: string;
  readonly semanticState: PresenceLifecycleState;
  readonly evidence: readonly PresenceEvidenceInput[];
  readonly tokenBudget: TokenBudgetContract;
  readonly cancelled: boolean;
  readonly candidate: { readonly head: string; readonly tree: string };
}

export function buildPresenceContext(input: PresenceContextInput) {
  if (!input.interactionId || !input.correlationId || !input.currentTurn || input.cancelled) throw new TypeError("Context requires a current, uncancelled interaction");
  const tokenBudget = projectTokenBudget(input.tokenBudget);
  if (tokenBudget.status !== "ACCEPTED") throw new TypeError("Token budget rejected");
  const evidence = resolveEvidence(input.evidence);
  if (evidence.status !== "CURRENT") throw new TypeError(`Evidence ${evidence.status}`);
  return deepFreeze({
    interactionId: input.interactionId,
    correlationId: input.correlationId,
    ownerScope: "OWNER_PRIVATE" as const,
    currentTurn: input.currentTurn,
    role: "ONYX" as const,
    semanticState: input.semanticState,
    memoryProjection: null,
    toolResult: null,
    evidenceReferences: evidence.evidenceReferences,
    privacyProjection: "TRUSTED_PRIVATE" as const,
    tokenBudget,
    cancelled: false as const,
    candidate: structuredClone(input.candidate),
    freshness: "CURRENT" as const,
    authorizing: false as const,
  });
}