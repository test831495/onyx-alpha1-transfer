import { ALPHA0_BOUNDS, ALPHA0_PROFILES, ALPHA0_RISK_TIERS, type Alpha0Profile } from "./alpha0-validation-contracts";
import type { Alpha0TestRecord } from "./alpha0-test-registry";

export type Alpha0SelectionInput = Readonly<{
  candidate: Readonly<{
    repository: string;
    branch: string;
    baseSha: string;
    headSha: string;
    changedPaths: readonly string[];
    profiles: readonly string[];
  }>;
  registry: readonly Alpha0TestRecord[];
  profiles: readonly Alpha0Profile[];
  blockers: readonly string[];
  evidence: readonly { id: string; evidenceClass: string; hash: string; fresh: boolean; valid: boolean }[];
}>;

export type Alpha0SelectionResult = Readonly<{
  authority: "NON_AUTHORIZING";
  selectedIds: readonly string[];
  selectionReasons: readonly string[];
  excludedIds: readonly string[];
  requiredPhysicalDeviceIds: readonly string[];
  requiredRestoreIds: readonly string[];
  requiredOwnerDecisionIds: readonly string[];
  blockers: readonly string[];
}>;

const stableOrder = <T>(items: readonly T[]): readonly T[] => [...items].sort((left, right) => String(left).localeCompare(String(right)));

export const selectAlpha0Tests = (input: Alpha0SelectionInput): Alpha0SelectionResult => {
  const registry = [...input.registry].filter((entry) => input.profiles.some((profile) => entry.profiles.includes(profile)) || input.profiles.length === 0);
  const selected = registry
    .filter((entry) => !input.blockers.length || !entry.permanentBlockers.some((blocker) => input.blockers.includes(blocker)))
    .filter((entry) => {
      if (input.profiles.includes("ALPHA_0_FULL_READINESS")) return true;
      if (input.profiles.includes("ALPHA_0_HIGH_RISK")) return entry.riskTier === "R3_HIGH" || entry.riskTier === "R4_CRITICAL" || entry.profiles.includes("ALPHA_0_STANDARD");
      return true;
    })
    .map((entry) => entry.id);

  const requiredPhysicalDeviceIds = stableOrder(
    registry.filter((entry) => entry.requiresPhysicalDevice).map((entry) => entry.id)
  );
  const requiredRestoreIds = stableOrder(
    registry.filter((entry) => entry.requiresRealRestore).map((entry) => entry.id)
  );
  const requiredOwnerDecisionIds = stableOrder(
    registry.filter((entry) => entry.ownerDecisionRequired).map((entry) => entry.id)
  );

  const orderedSelected = stableOrder(selected).slice(0, ALPHA0_BOUNDS.MAX_SELECTED_IDS);
  const reasons = orderedSelected.map((id) => `selected:${id}`);
  const excluded = stableOrder(registry.filter((entry) => !orderedSelected.includes(entry.id)).map((entry) => entry.id));

  if (input.profiles.includes("ALPHA_0_FULL_READINESS")) {
    return Object.freeze({
      authority: "NON_AUTHORIZING",
      selectedIds: orderedSelected,
      selectionReasons: Object.freeze(reasons),
      excludedIds: Object.freeze(excluded),
      requiredPhysicalDeviceIds: Object.freeze(requiredPhysicalDeviceIds),
      requiredRestoreIds: Object.freeze(requiredRestoreIds),
      requiredOwnerDecisionIds: Object.freeze(requiredOwnerDecisionIds),
      blockers: Object.freeze([...input.blockers]),
    });
  }

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    selectedIds: orderedSelected,
    selectionReasons: Object.freeze(reasons),
    excludedIds: Object.freeze(excluded),
    requiredPhysicalDeviceIds: Object.freeze(requiredPhysicalDeviceIds),
    requiredRestoreIds: Object.freeze(requiredRestoreIds),
    requiredOwnerDecisionIds: Object.freeze(requiredOwnerDecisionIds),
    blockers: Object.freeze([...input.blockers]),
  });
};

export type Alpha0DependencyPlanInput = Readonly<{
  selectedIds: readonly string[];
  registry: readonly Alpha0TestRecord[];
}>;

export type Alpha0DependencyPlan = Readonly<{
  authority: "NON_AUTHORIZING";
  stages: readonly string[][];
  parallelGroups: readonly string[][];
  planFingerprint: string;
  serialIds: readonly string[];
  parallelIds: readonly string[];
}>;

export const buildAlpha0DependencyPlan = (
  input: Alpha0DependencyPlanInput
): Alpha0DependencyPlan => {
  const map = new Map(input.registry.map((entry) => [entry.id, entry]));
  const selected = [...input.selectedIds].filter((id) => map.has(id));
  const selectedSet = new Set(selected);

  for (const id of selected) {
    const record = map.get(id)!;
    for (const dep of record.prerequisiteIds) {
      if (dep === id) {
        throw new Error("ALPHA0_SELF_DEPENDENCY_FORBIDDEN");
      }
      if (!map.has(dep)) {
        throw new Error("ALPHA0_MISSING_DEPENDENCY_FORBIDDEN");
      }
    }
  }

  const stageIndex = new Map<string, number>();
  const visiting = new Set<string>();
  const resolveStageIndex = (id: string): number => {
    if (stageIndex.has(id)) return stageIndex.get(id)!;
    if (visiting.has(id)) throw new Error("ALPHA0_DEPENDENCY_CYCLE_FORBIDDEN");
    visiting.add(id);
    const record = map.get(id)!;
    const prerequisiteStageIndices = record.prerequisiteIds
      .filter((dep) => selectedSet.has(dep))
      .map((dep) => resolveStageIndex(dep));
    const resolved = prerequisiteStageIndices.length === 0 ? 0 : Math.max(...prerequisiteStageIndices) + 1;
    visiting.delete(id);
    stageIndex.set(id, resolved);
    return resolved;
  };

  for (const id of selected) resolveStageIndex(id);

  const maxStageIndex = selected.reduce((max, id) => Math.max(max, stageIndex.get(id)!), -1);
  const stages: string[][] = [];
  for (let level = 0; level <= maxStageIndex; level += 1) {
    stages.push(Object.freeze(stableOrder(selected.filter((id) => stageIndex.get(id) === level))) as string[]);
  }

  const serialIds = [...selected].filter((id) => !id.includes("ALPHA0-REGISTRY-017") && !id.includes("ALPHA0-REGISTRY-018"));
  const parallelIds = [...selected].filter((id) => id.includes("ALPHA0-REGISTRY-017") || id.includes("ALPHA0-REGISTRY-018"));
  const planFingerprint = `alpha0-plan:${selected.sort().join("|")}`;

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    stages: Object.freeze(stages),
    parallelGroups: Object.freeze([parallelIds.length ? parallelIds : serialIds]),
    planFingerprint,
    serialIds: Object.freeze(serialIds),
    parallelIds: Object.freeze(parallelIds),
  });
};
