import { createHash } from "node:crypto";
import {
	WORKFLOW_CONTRACT_VERSION,
	type WorkflowInput,
	type WorkflowFlags,
	type Capability,
} from "./browser";

export * from "./browser";

export function digest(value: unknown): string {
	return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function stableJson(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",\n")}}`;
}

export function makeWorkflowId(input: WorkflowInput): string {
	return `wf-${digest({ contractVersion: WORKFLOW_CONTRACT_VERSION, repository: input.repository, input }).slice(0, 24)}`;
}

export function makeIdempotencyKey(workflowId: string, capability: Capability, inputDigest: string): string {
	return `${workflowId}:${capability}:${inputDigest}`;
}

export function defaultFlags(): WorkflowFlags {
	return { issueCreated: "governed", localBranchCreated: "governed", remoteBranchPushed: "governed", validationPassed: "governed", evidenceReady: "governed", draftPrCreated: "governed", mergeAllowed: false, productionDeployAllowed: false, forcePushAllowed: false, branchDeletionAllowed: false };
}
