import { createSyntheticModelAdapter, type SyntheticModelRequest } from "./adapters";
import { deepFreeze } from "./contracts";
import { projectPrivacy, type PrivacyInput } from "./privacy";

export interface MemoryRecord {
  readonly id: string;
  readonly tier: "M0" | "M1" | "M4";
  readonly content: string;
  readonly provenance: "CURRENT_TURN" | "SYNTHETIC_FIXTURE" | "REPOSITORY_LOCAL_FIXTURE";
  readonly freshness: "CURRENT" | "STALE" | "CONFLICTING";
  readonly sensitivity: "LOW";
  readonly tokenEstimate: number;
  readonly ownerScope: "OWNER_PRIVATE";
  readonly accountId: "rahul-kumar";
}

export interface MemoryProjectionRecord {
  readonly id: string;
  readonly tier: MemoryRecord["tier"];
  readonly reference: string;
  readonly boundedSummary: string;
  readonly provenance: MemoryRecord["provenance"];
  readonly freshness: "CURRENT";
  readonly sensitivity: MemoryRecord["sensitivity"];
  readonly tokenEstimate: number;
}

export function composeMemoryFixture(records: readonly MemoryRecord[]) {
  if (records.filter((record) => record.tier === "M4").length > 1) throw new TypeError("At most one M4 project-memory record is permitted");
  if (records.some((record) => record.freshness === "CONFLICTING")) throw new TypeError("Conflicting memory fails closed");
  const current: MemoryProjectionRecord[] = records.filter((record) => record.freshness === "CURRENT" && record.ownerScope === "OWNER_PRIVATE" && record.accountId === "rahul-kumar").map((record) => ({
    id: record.id,
    tier: record.tier,
    reference: `${record.tier}:${record.id}`,
    boundedSummary: record.content.slice(0, 32),
    provenance: record.provenance,
    freshness: "CURRENT",
    sensitivity: record.sensitivity,
    tokenEstimate: Math.min(record.tokenEstimate, 32),
  }));
  return deepFreeze({ records: current, ownerScope: "OWNER_PRIVATE" as const, persisted: false as const, admitted: false as const, rawTransfer: false as const, crossAccountData: false as const, authorizing: false as const });
}

export interface ProjectStatusToolInput {
  readonly projectId: string;
  readonly cancelled: boolean;
  readonly available: boolean;
  readonly freshness?: "CURRENT" | "STALE";
}

export function projectStatusTool(input: ProjectStatusToolInput) {
  if (!input.projectId || input.projectId.length > 64) throw new TypeError("Bounded project ID required");
  const status = input.cancelled ? "CANCELLED" as const : input.available && input.freshness !== "STALE" ? "CURRENT" as const : input.freshness === "STALE" ? "STALE" as const : "NOT_ASSESSABLE" as const;
  return deepFreeze({ tool: "ProjectStatusTool" as const, projectId: input.projectId, status, summary: status === "CURRENT" ? "Synthetic local project status is available." : null, provenance: "REPOSITORY_LOCAL_SYNTHETIC_FIXTURE" as const, freshness: status === "CURRENT" ? "CURRENT" as const : "NOT_ASSESSABLE" as const, access: "READ_ONLY" as const, authorizing: false as const, externalEffect: false as const, fileWrite: false as const, gitWrite: false as const, settingsWrite: false as const, memoryWrite: false as const, connectorCall: false as const, deploymentEffect: false as const });
}

export interface OrchestrationInput {
  readonly request: SyntheticModelRequest;
  readonly memory?: readonly MemoryRecord[];
  readonly tool?: ProjectStatusToolInput;
  readonly privacy?: PrivacyInput;
}

export function orchestratePresence(input: OrchestrationInput) {
  const cancelled = input.request.cancelled;
  // Absence of a privacy envelope is treated as MISSING so Presence fails closed instead of inferring trust.
  const privacyProjection = projectPrivacy(input.privacy ?? { disposition: "MISSING", text: "" });
  const privacyRestricted = privacyProjection.mode === "PRIVACY_RESTRICTED";
  const closed = cancelled || privacyRestricted;
  const memoryProjection = closed || !input.memory ? null : composeMemoryFixture(input.memory);
  const toolProjection = closed || !input.tool ? null : projectStatusTool(input.tool);
  const toolNotAssessable = toolProjection ? toolProjection.status !== "CURRENT" : false;
  const model = closed
    ? deepFreeze({ status: cancelled ? "CANCELLED" as const : "PRIVACY_RESTRICTED" as const, text: null, evidenceReferences: [] as string[], uncertainty: "UNKNOWN" as const, toolAuthority: false as const, memoryAuthority: false as const, usage: { inputCharacters: 0, outputCharacters: 0 } })
    : toolNotAssessable
      ? deepFreeze({ status: "NOT_ASSESSABLE" as const, text: null, evidenceReferences: [] as string[], uncertainty: "TOOL_NOT_ASSESSABLE" as const, toolAuthority: false as const, memoryAuthority: false as const, usage: { inputCharacters: input.request.prompt.length, outputCharacters: 0 } })
      : createSyntheticModelAdapter("Project status is locally assessable.").respond(input.request);
  const suppressed = closed || toolNotAssessable || model.status !== "COMPLETE";
  return deepFreeze({ mode: "ONYX_ONLY" as const, role: "ONYX" as const, owner: "rahul-kumar" as const, approval: "NOT_INFERRED" as const, novaRuntime: false as const, requests: 1 as const, modelResponses: model.status === "COMPLETE" ? 1 as const : 0 as const, memoryProjections: memoryProjection ? 1 as const : 0 as const, toolCalls: toolProjection ? 1 as const : 0 as const, autonomousLoop: false as const, model, memoryProjection, toolProjection, privacyProjection, responseSuppressed: suppressed, presentationSuppressed: suppressed, speechSuppressed: suppressed, errorsFailClosed: true as const, authorizing: false as const });
}