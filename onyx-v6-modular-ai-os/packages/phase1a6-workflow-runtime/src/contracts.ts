import { digest } from "@onyx/phase1a5-workflow-engine";
import { type Workflow } from "./browser";

export * from "./browser";

export function makeRuntimeId(workflow: Pick<Workflow, "workflowId" | "repository" | "scopeHash" | "contractVersion">): string {
  return `p16rt-${digest({
    runtimeContractVersion: "1.0.0",
    workflowContractVersion: workflow.contractVersion,
    repository: workflow.repository,
    workflowId: workflow.workflowId,
    scopeHash: workflow.scopeHash,
  }).slice(0, 24)}`;
}

export function makeRuntimeSessionId(runtimeId: string, approvalDigest: string): string {
  return `p16sess-${digest({ runtimeId, approvalDigest }).slice(0, 24)}`;
}

export class RuntimeSecurityError extends Error {}

export function rejectArbitraryRuntimeCommand(input: unknown): never {
  if (typeof input === "string" || (input && typeof input === "object" && ("command" in input || "shell" in input))) {
    throw new RuntimeSecurityError("Arbitrary commands and shell strings are unavailable on the runtime.");
  }
  throw new RuntimeSecurityError("Unsupported runtime adapter input.");
}
