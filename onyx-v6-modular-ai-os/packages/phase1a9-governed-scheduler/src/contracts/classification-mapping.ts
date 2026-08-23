import { OPERATION_CLASSES, type OperationClass, PARALLEL_SAFETY_CLASSES, type ParallelSafetyClass, assertParallelSafetyClass } from "@onyx/phase1a8-governed-contracts";
import { RISK_CLASSES, type RiskClass, assertRiskClass, requiresFreshApproval } from "@onyx/phase1a8-governed-contracts/shared";
export const PREPARATION_ALIASES = ["ISOLATED", "READ_SHARED", "WRITE_DISJOINT", "WRITE_SERIALIZED", "PROMOTION_ONLY"] as const;
export type PreparationAlias = (typeof PREPARATION_ALIASES)[number];
export function assertOperationClass(value: string): asserts value is OperationClass { if (!(OPERATION_CLASSES as readonly string[]).includes(value)) throw new Error("Unknown operation class."); }
export function validateRiskClass(value: string): RiskClass { assertRiskClass(value); return value; }
export interface AliasContext { domain?: "CONTEXT" | "CONNECTOR" | "GENERIC"; scopeDisjoint?: boolean; sequentialClass?: ParallelSafetyClass; }
export function resolvePreparationAlias(alias: string, context: AliasContext = {}): ParallelSafetyClass {
  if (!(PREPARATION_ALIASES as readonly string[]).includes(alias)) throw new Error("Unknown preparation alias.");
  if (alias === "ISOLATED") return "ISOLATED_COMPUTE_PARALLEL_SAFE";
  if (alias === "PROMOTION_ONLY") return "PROTECTED_PROMOTION_ONLY";
  if (alias === "READ_SHARED") {
    if (!context.domain) throw new Error("READ_SHARED requires explicit domain context.");
    return context.domain === "CONTEXT" ? "CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL" : context.domain === "CONNECTOR" ? "CONNECTOR_READ_PARALLEL_CONDITIONAL" : "READ_ONLY_PARALLEL_SAFE";
  }
  if (alias === "WRITE_DISJOINT") { if (!context.scopeDisjoint) throw new Error("WRITE_DISJOINT requires validated scope proof."); return context.sequentialClass ?? "SEQUENTIAL_CHECKPOINT_REQUIRED"; }
  if (!context.sequentialClass || !context.sequentialClass.startsWith("SEQUENTIAL_")) throw new Error("WRITE_SERIALIZED requires an applicable sequential class.");
  assertParallelSafetyClass(context.sequentialClass); return context.sequentialClass;
}
export { PARALLEL_SAFETY_CLASSES, RISK_CLASSES, assertParallelSafetyClass, assertRiskClass, requiresFreshApproval };
export type { OperationClass, ParallelSafetyClass, RiskClass };