export const PARALLEL_SAFETY_CLASSES = [
  "READ_ONLY_PARALLEL_SAFE",
  "ISOLATED_COMPUTE_PARALLEL_SAFE",
  "DOCUMENTATION_PARALLEL_SAFE",
  "TEST_GENERATION_PARALLEL_SAFE",
  "SECURITY_REVIEW_PARALLEL_SAFE",
  "EVIDENCE_GENERATION_PARALLEL_SAFE",
  "CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL",
  "CONNECTOR_READ_PARALLEL_CONDITIONAL",
  "SEQUENTIAL_CHECKPOINT_REQUIRED",
  "SEQUENTIAL_APPROVAL_REQUIRED",
  "SEQUENTIAL_MEMORY_WRITE_REQUIRED",
  "SEQUENTIAL_CONNECTOR_MUTATION",
  "SEQUENTIAL_GITHUB_MUTATION",
  "PROTECTED_PROMOTION_ONLY",
  "PROHIBITED",
] as const;
export type ParallelSafetyClass = (typeof PARALLEL_SAFETY_CLASSES)[number];

const UNCONDITIONALLY_PARALLEL_SAFE: ReadonlySet<ParallelSafetyClass> = new Set([
  "READ_ONLY_PARALLEL_SAFE",
  "ISOLATED_COMPUTE_PARALLEL_SAFE",
  "DOCUMENTATION_PARALLEL_SAFE",
  "TEST_GENERATION_PARALLEL_SAFE",
  "SECURITY_REVIEW_PARALLEL_SAFE",
  "EVIDENCE_GENERATION_PARALLEL_SAFE",
]);

const CONDITIONALLY_PARALLEL_SAFE: ReadonlySet<ParallelSafetyClass> = new Set([
  "CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL",
  "CONNECTOR_READ_PARALLEL_CONDITIONAL",
]);

/** No operation defaults to parallel-safe: an explicit, recognized class is always required. */
export function assertParallelSafetyClass(value: string): asserts value is ParallelSafetyClass {
  if (!(PARALLEL_SAFETY_CLASSES as readonly string[]).includes(value)) {
    throw new Error(`Unknown parallel-safety class: ${value}`);
  }
}

export function isUnconditionallyParallelSafe(parallelSafetyClass: ParallelSafetyClass): boolean {
  return UNCONDITIONALLY_PARALLEL_SAFE.has(parallelSafetyClass);
}

export function isConditionallyParallelSafe(parallelSafetyClass: ParallelSafetyClass): boolean {
  return CONDITIONALLY_PARALLEL_SAFE.has(parallelSafetyClass);
}

export function requiresSequentialLock(parallelSafetyClass: ParallelSafetyClass): boolean {
  return parallelSafetyClass.startsWith("SEQUENTIAL_") || parallelSafetyClass === "PROTECTED_PROMOTION_ONLY";
}

export function isProhibitedParallelSafetyClass(parallelSafetyClass: ParallelSafetyClass): boolean {
  return parallelSafetyClass === "PROHIBITED";
}
