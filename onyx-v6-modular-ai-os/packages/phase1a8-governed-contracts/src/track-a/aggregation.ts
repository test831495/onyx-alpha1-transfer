import { createHash } from "node:crypto";

export const AGGREGATION_CONFLICT_POLICIES = [
  "FAIL_ON_CONFLICT",
  "PRESERVE_ALL_CONFLICTS",
  "REQUIRE_RECONCILIATION",
  "REQUIRE_RAHUL_DECISION",
] as const;
export type AggregationConflictPolicy = (typeof AGGREGATION_CONFLICT_POLICIES)[number];

export const PARTIAL_RESULT_POLICIES = [
  "REJECT_PARTIAL",
  "ALLOW_VALIDATED_PARTIAL",
  "ALLOW_READ_ONLY_PARTIAL",
  "REQUIRE_ALL",
] as const;
export type PartialResultPolicy = (typeof PARTIAL_RESULT_POLICIES)[number];

export const RESULT_CLASSIFICATIONS = [
  "COMPLETE",
  "PARTIAL_VALIDATED",
  "CONFLICTED",
  "RECONCILIATION_REQUIRED",
  "FAILED_SAFE",
  "PROHIBITED",
] as const;
export type ResultClassification = (typeof RESULT_CLASSIFICATIONS)[number];

export interface AggregatedTaskOutput {
  taskId: string;
  output: Record<string, unknown>;
}

export interface ResultAggregation {
  aggregationId: string;
  workflowId: string;
  runtimeId: string;
  barrierId: string;
  orderedTaskOutputs: AggregatedTaskOutput[];
  outputDigests: string[];
  evidenceReferences: string[];
  conflictPolicy: AggregationConflictPolicy;
  partialResultPolicy: PartialResultPolicy;
  aggregateDigest: string;
  resultClassification: ResultClassification;
  agreementPoints: string[];
  disagreementPoints: string[];
  openQuestions: string[];
  escalationRequired: boolean;
  createdAt: string;
  contractVersion: string;
  dependencyOrder?: string[];
  barrierTaskOrder?: string[];
  evidenceOrder?: string[];
}

function canonicalTaskOutput(value: AggregatedTaskOutput): string {
  return JSON.stringify({ taskId: value.taskId, output: value.output });
}

export function createResultAggregation(input: Omit<ResultAggregation, "contractVersion" | "orderedTaskOutputs" | "outputDigests"> & {
  orderedTaskOutputs: AggregatedTaskOutput[];
  outputDigests?: string[];
  contractVersion?: string;
}): ResultAggregation {
  if (!input.aggregationId || !input.workflowId || !input.runtimeId || !input.barrierId) {
    throw new Error("Result aggregation requires aggregationId, workflowId, runtimeId, and barrierId.");
  }
  if (!Array.isArray(input.orderedTaskOutputs) || input.orderedTaskOutputs.length === 0) {
    throw new Error("Result aggregation requires at least one ordered task output.");
  }

  const dependencyOrder = input.dependencyOrder ?? input.orderedTaskOutputs.map((entry) => entry.taskId).sort();
  const barrierTaskOrder = input.barrierTaskOrder ?? [...dependencyOrder];
  const orderedTaskOutputs = [...input.orderedTaskOutputs].sort((left, right) => {
    const leftIndex = barrierTaskOrder.indexOf(left.taskId);
    const rightIndex = barrierTaskOrder.indexOf(right.taskId);
    if (leftIndex !== rightIndex) return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    return left.taskId.localeCompare(right.taskId);
  });

  const outputDigests = input.outputDigests ?? orderedTaskOutputs.map((entry) => createHash("sha256").update(canonicalTaskOutput(entry)).digest("hex"));
  const aggregateDigest = input.aggregateDigest ?? deriveAggregateDigest({
    orderedTaskOutputs,
    outputDigests,
    evidenceReferences: [...input.evidenceReferences],
    agreementPoints: [...input.agreementPoints],
    disagreementPoints: [...input.disagreementPoints],
    openQuestions: [...input.openQuestions],
  });

  return {
    ...input,
    orderedTaskOutputs,
    outputDigests,
    aggregateDigest,
    contractVersion: input.contractVersion ?? "1.0.0",
    evidenceReferences: [...input.evidenceReferences],
    agreementPoints: [...input.agreementPoints],
    disagreementPoints: [...input.disagreementPoints],
    openQuestions: [...input.openQuestions],
  };
}

export function deriveAggregateDigest(aggregation: Pick<ResultAggregation, "orderedTaskOutputs" | "outputDigests" | "evidenceReferences" | "agreementPoints" | "disagreementPoints" | "openQuestions">): string {
  const canonical = JSON.stringify({
    orderedTaskOutputs: aggregation.orderedTaskOutputs.map((entry) => ({ taskId: entry.taskId, output: entry.output })),
    outputDigests: [...aggregation.outputDigests].sort(),
    evidenceReferences: [...aggregation.evidenceReferences].sort(),
    agreementPoints: [...aggregation.agreementPoints].sort(),
    disagreementPoints: [...aggregation.disagreementPoints].sort(),
    openQuestions: [...aggregation.openQuestions].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function evaluateAggregation(aggregation: ResultAggregation): ResultAggregation {
  const escalationRequired = aggregation.conflictPolicy === "REQUIRE_RAHUL_DECISION" || aggregation.disagreementPoints.length > 0;
  let resultClassification: ResultClassification = aggregation.resultClassification;

  if (aggregation.partialResultPolicy === "REJECT_PARTIAL" && aggregation.resultClassification === "PARTIAL_VALIDATED") {
    throw new Error("Partial results are rejected by policy.");
  }
  if (aggregation.conflictPolicy === "FAIL_ON_CONFLICT" && aggregation.disagreementPoints.length > 0) {
    resultClassification = "CONFLICTED";
  }
  if (aggregation.conflictPolicy === "REQUIRE_RECONCILIATION" && aggregation.disagreementPoints.length > 0) {
    resultClassification = "RECONCILIATION_REQUIRED";
  }
  if (aggregation.conflictPolicy === "REQUIRE_RAHUL_DECISION" && aggregation.disagreementPoints.length > 0) {
    resultClassification = "CONFLICTED";
  }

  return {
    ...aggregation,
    escalationRequired,
    resultClassification,
    aggregateDigest: deriveAggregateDigest(aggregation),
  };
}
