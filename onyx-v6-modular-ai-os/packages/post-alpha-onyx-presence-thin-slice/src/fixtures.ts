import type { PresenceContextInput } from "./context";
import type { MemoryRecord, OrchestrationInput } from "./orchestrator";
import type { SyntheticModelRequest } from "./adapters";

const candidate = { head: "d8c93d5a9cfccb2cb2fb9a0beef0961ed6ff2714", tree: "35173f8f2b9ede4171c559900199e1f86f8dd46d" } as const;
const evidence = [{ id: "pa-intel-01", status: "CURRENT", candidateBound: true, hashVerified: true, claim: "foundations integration eligible" }] as const;

const contextInput: PresenceContextInput = {
  interactionId: "interaction-001",
  correlationId: "correlation-001",
  currentTurn: "Summarize project status.",
  semanticState: "THINKING",
  evidence,
  tokenBudget: { budgetClass: "SMALL", total: 500, input: 150, output: 150, toolCalls: 50, mandatoryReserve: 50 },
  cancelled: false,
  candidate,
};

const memoryRecords: readonly MemoryRecord[] = [
  { id: "m0-current", tier: "M0", content: "Current status request", provenance: "CURRENT_TURN", freshness: "CURRENT", sensitivity: "LOW", tokenEstimate: 4, ownerScope: "OWNER_PRIVATE", accountId: "rahul-kumar" },
  { id: "m1-recent", tier: "M1", content: "Recent synthetic context", provenance: "SYNTHETIC_FIXTURE", freshness: "CURRENT", sensitivity: "LOW", tokenEstimate: 4, ownerScope: "OWNER_PRIVATE", accountId: "rahul-kumar" },
  { id: "m4-project", tier: "M4", content: "Presence preflight accepted", provenance: "REPOSITORY_LOCAL_FIXTURE", freshness: "CURRENT", sensitivity: "LOW", tokenEstimate: 4, ownerScope: "OWNER_PRIVATE", accountId: "rahul-kumar" },
];

const modelRequest: SyntheticModelRequest = { interactionId: "interaction-001", prompt: "Summarize project status.", evidenceReferences: ["pa-intel-01"], cancelled: false, maxOutputCharacters: 80 };

export const FIXTURES: { readonly contextInput: PresenceContextInput; readonly memoryRecords: readonly MemoryRecord[]; readonly modelRequest: SyntheticModelRequest; readonly orchestrationInput: OrchestrationInput } = {
  contextInput,
  memoryRecords,
  modelRequest,
  orchestrationInput: { request: modelRequest, memory: memoryRecords, tool: { projectId: "onyx", cancelled: false, available: true } },
};