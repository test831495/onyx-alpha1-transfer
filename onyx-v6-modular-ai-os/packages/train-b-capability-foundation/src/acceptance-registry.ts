import { existsSync } from "node:fs";

export const TRAIN_B_ACCEPTANCE_FAMILIES = [
  "REG",
  "GRAPH",
  "QUERY",
  "CONFLICT",
  "COMPAT",
  "SCOPE",
] as const;
export type TrainBAcceptanceFamily = (typeof TRAIN_B_ACCEPTANCE_FAMILIES)[number];

export interface TrainBAcceptanceRecord {
  readonly id: string;
  readonly family: TrainBAcceptanceFamily;
  readonly description: string;
  readonly mandatory: boolean;
  readonly implementationPath: string;
  readonly implementationSymbol: string;
  readonly evidenceClass: string;
  readonly testFile: string;
  readonly testName: string;
  readonly status: "PASS" | "DEFERRED";
  readonly nonAuthorizing: true;
  readonly notes?: string;
}

export interface TrainBAcceptanceRegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly duplicateIds: readonly string[];
  readonly missingIds: readonly string[];
  readonly unexpectedIds: readonly string[];
  readonly invalidOrder: readonly string[];
  readonly invalidFamilyCounts: Readonly<Record<TrainBAcceptanceFamily, number>>;
  readonly invalidFileMappings: readonly string[];
  readonly invalidTestMappings: readonly string[];
}

const makeRecord = (
  id: string,
  family: TrainBAcceptanceFamily,
  description: string,
  implementationPath: string,
  implementationSymbol: string,
  evidenceClass: string,
  testFile: string,
  testName: string,
  notes?: string,
): TrainBAcceptanceRecord => Object.freeze({
  id,
  family,
  description,
  mandatory: true,
  implementationPath,
  implementationSymbol,
  evidenceClass,
  testFile,
  testName,
  status: "PASS",
  nonAuthorizing: true,
  ...(notes ? { notes } : {}),
});

const EXPECTED_ID_ORDER = [
  "TB-CAP-REG-001",
  "TB-CAP-REG-002",
  "TB-CAP-REG-003",
  "TB-CAP-REG-004",
  "TB-CAP-REG-005",
  "TB-CAP-REG-006",
  "TB-CAP-REG-007",
  "TB-CAP-REG-008",
  "TB-CAP-REG-009",
  "TB-CAP-REG-010",
  "TB-CAP-REG-011",
  "TB-CAP-REG-012",
  "TB-CAP-GRAPH-001",
  "TB-CAP-GRAPH-002",
  "TB-CAP-GRAPH-003",
  "TB-CAP-GRAPH-004",
  "TB-CAP-GRAPH-005",
  "TB-CAP-GRAPH-006",
  "TB-CAP-GRAPH-007",
  "TB-CAP-GRAPH-008",
  "TB-CAP-GRAPH-009",
  "TB-CAP-GRAPH-010",
  "TB-CAP-GRAPH-011",
  "TB-CAP-GRAPH-012",
  "TB-CAP-QUERY-001",
  "TB-CAP-QUERY-002",
  "TB-CAP-QUERY-003",
  "TB-CAP-QUERY-004",
  "TB-CAP-QUERY-005",
  "TB-CAP-QUERY-006",
  "TB-CAP-QUERY-007",
  "TB-CAP-QUERY-008",
  "TB-CAP-QUERY-009",
  "TB-CAP-QUERY-010",
  "TB-CAP-QUERY-011",
  "TB-CAP-QUERY-012",
  "TB-CAP-QUERY-013",
  "TB-CAP-QUERY-014",
  "TB-CAP-CONFLICT-001",
  "TB-CAP-CONFLICT-002",
  "TB-CAP-CONFLICT-003",
  "TB-CAP-CONFLICT-004",
  "TB-CAP-CONFLICT-005",
  "TB-CAP-CONFLICT-006",
  "TB-CAP-CONFLICT-007",
  "TB-CAP-CONFLICT-008",
  "TB-CAP-CONFLICT-009",
  "TB-CAP-CONFLICT-010",
  "TB-CAP-COMPAT-001",
  "TB-CAP-COMPAT-002",
  "TB-CAP-COMPAT-003",
  "TB-CAP-COMPAT-004",
  "TB-CAP-COMPAT-005",
  "TB-CAP-COMPAT-006",
  "TB-CAP-COMPAT-007",
  "TB-CAP-COMPAT-008",
  "TB-CAP-SCOPE-001",
  "TB-CAP-SCOPE-002",
  "TB-CAP-SCOPE-003",
  "TB-CAP-SCOPE-004",
  "TB-CAP-SCOPE-005",
  "TB-CAP-SCOPE-006",
] as const;

const EXPECTED_FAMILY_COUNTS: Record<TrainBAcceptanceFamily, number> = {
  REG: 12,
  GRAPH: 12,
  QUERY: 14,
  CONFLICT: 10,
  COMPAT: 8,
  SCOPE: 6,
};

export const TRAIN_B_ACCEPTANCE_REGISTRY: readonly TrainBAcceptanceRecord[] = Object.freeze([
  makeRecord("TB-CAP-REG-001", "REG", "Registry creates immutable snapshots and stable IDs.", "src/capability-registry.ts", "createCapabilityRegistry", "REGISTRY_SNAPSHOT", "tests/capability-registry.test.ts", "registers a valid provider-neutral read capability"),
  makeRecord("TB-CAP-REG-002", "REG", "Registry rejects duplicate IDs.", "src/capability-registry.ts", "createCapabilityRegistry", "REGISTRY_DUPLICATE", "tests/capability-registry.test.ts", "rejects duplicate capability version"),
  makeRecord("TB-CAP-REG-003", "REG", "Registry rejects provider-branded IDs.", "src/validators.ts", "validateCapabilityDefinition", "PROVIDER_ID_REJECTION", "tests/capability-registry.test.ts", "rejects provider-branded canonical IDs"),
  makeRecord("TB-CAP-REG-004", "REG", "Registry preserves provider-neutral fixture IDs.", "tests/capability-registry.test.ts", "registerCapability", "FIXTURE_ACCEPTANCE", "tests/capability-registry.test.ts", "accepts the required fixture-only capability IDs without granting authority"),
  makeRecord("TB-CAP-REG-005", "REG", "Registry validation fails closed on malformed definitions.", "src/validators.ts", "validateCapabilityDefinition", "FAIL_CLOSED_VALIDATION", "tests/capability-registry.test.ts", "fails closed for malformed definitions instead of throwing"),
  makeRecord("TB-CAP-REG-006", "REG", "Capability ids must respect canonical format.", "src/validators.ts", "containsProviderReference", "ID_FORMAT_VALIDATION", "tests/adversarial.test.ts", "fails closed on hostile input"),
  makeRecord("TB-CAP-REG-007", "REG", "Registering null input fails closed.", "src/capability-registry.ts", "registerCapability", "NULL_INPUT_REJECTION", "tests/adversarial.test.ts", "rejects null-like malicious objects via fail-closed validation"),
  makeRecord("TB-CAP-REG-008", "REG", "Unknown lifecycle and risk values are rejected.", "src/validators.ts", "validateCapabilityDefinition", "VOCAB_REJECTION", "tests/adversarial.test.ts", "rejects invalid lifecycle and risk vocabulary"),
  makeRecord("TB-CAP-REG-009", "REG", "Disguised write semantics are rejected.", "src/validators.ts", "validateCapabilityDefinition", "WRITE_SEMANTIC_REJECTION", "tests/adversarial.test.ts", "rejects a disguised write semantics capability"),
  makeRecord("TB-CAP-REG-010", "REG", "Graph records remain provider-neutral.", "src/capability-graph.ts", "createCapabilityGraph", "GRAPH_INVARIANT", "tests/capability-graph.test.ts", "constructs a valid graph and dependency closure"),
  makeRecord("TB-CAP-REG-011", "REG", "Graph rejects missing and self-referential edges.", "src/capability-graph.ts", "createCapabilityGraph", "SELF_EDGE_REJECTION", "tests/capability-graph.test.ts", "rejects missing node and self-edge"),
  makeRecord("TB-CAP-REG-012", "REG", "Disabled dependencies are fail-closed.", "src/capability-graph.ts", "createCapabilityGraph", "DISABLED_DEPS_REJECTION", "tests/capability-graph.test.ts", "detects cycles and disabled dependencies"),
  makeRecord("TB-CAP-GRAPH-001", "GRAPH", "Graph accepts basic REQUIRES edges.", "src/capability-graph.ts", "createCapabilityGraph", "REQUIRES_EDGE", "tests/capability-graph.test.ts", "constructs a valid graph and dependency closure"),
  makeRecord("TB-CAP-GRAPH-002", "GRAPH", "Graph accepts OPTIONAL_REQUIRES edges without turning them into hard dependencies.", "src/capability-graph.ts", "createCapabilityGraph", "OPTIONAL_REQUIRES_EDGE", "tests/unified-query.test.ts", "ignores non-dependency edges when building dependency closure"),
  makeRecord("TB-CAP-GRAPH-003", "GRAPH", "Graph accepts REFINES edges.", "src/capability-graph.ts", "createCapabilityGraph", "REFINES_EDGE", "tests/capability-graph.test.ts", "constructs a valid graph and dependency closure"),
  makeRecord("TB-CAP-GRAPH-004", "GRAPH", "Graph accepts COMPOSES edges.", "src/capability-graph.ts", "createCapabilityGraph", "COMPOSES_EDGE", "tests/capability-graph.test.ts", "constructs a valid graph and dependency closure"),
  makeRecord("TB-CAP-GRAPH-005", "GRAPH", "Graph records CONFLICTS_WITH edges without dependency closure pollution.", "src/capability-graph.ts", "createCapabilityGraph", "CONFLICT_AND_DEPENDENCY_SEPARATION", "tests/unified-query.test.ts", "ignores non-dependency edges when building dependency closure"),
  makeRecord("TB-CAP-GRAPH-006", "GRAPH", "Graph rejects cycles in SUPERSEDES relations.", "src/capability-graph.ts", "detectCycle", "SUPERSEDES_CYCLE_REJECTION", "tests/capability-graph.test.ts", "detects cycles and disabled dependencies"),
  makeRecord("TB-CAP-GRAPH-007", "GRAPH", "Graph rejects duplicate edges deterministically.", "src/capability-graph.ts", "createCapabilityGraph", "DUPLICATE_EDGE_REJECTION", "tests/adversarial.test.ts", "fails closed on hostile input"),
  makeRecord("TB-CAP-GRAPH-008", "GRAPH", "Graph rejects missing-node references deterministically.", "src/capability-graph.ts", "createCapabilityGraph", "MISSING_NODE_REJECTION", "tests/capability-graph.test.ts", "rejects missing node and self-edge"),
  makeRecord("TB-CAP-GRAPH-009", "GRAPH", "Graph rejects self-edges deterministically.", "src/capability-graph.ts", "createCapabilityGraph", "SELF_EDGE_REJECTION", "tests/capability-graph.test.ts", "rejects missing node and self-edge"),
  makeRecord("TB-CAP-GRAPH-010", "GRAPH", "Graph rejects inactive or disabled targets.", "src/capability-graph.ts", "createCapabilityGraph", "DISABLED_TARGET_REJECTION", "tests/capability-graph.test.ts", "detects cycles and disabled dependencies"),
  makeRecord("TB-CAP-GRAPH-011", "GRAPH", "Graph traversal respects the dependency depth cap.", "src/capability-graph.ts", "collectDependencies", "TRAVERSAL_LIMIT", "tests/capability-graph.test.ts", "constructs a valid graph and dependency closure"),
  makeRecord("TB-CAP-GRAPH-012", "GRAPH", "Graph keeps dependency closure deterministic and sorted.", "src/capability-graph.ts", "collectDependencies", "DEPENDENCY_CLOSURE_SORT", "tests/unified-query.test.ts", "ignores non-dependency edges when building dependency closure"),
  makeRecord("TB-CAP-QUERY-001", "QUERY", "Query validation accepts provider-neutral requirements.", "src/unified-query.ts", "validateUnifiedQueryRequest", "VALID_REQUEST", "tests/unified-query.test.ts", "accepts provider-neutral capability requirements and creates deterministic plan"),
  makeRecord("TB-CAP-QUERY-002", "QUERY", "Query validation rejects provider-branded IDs.", "src/unified-query.ts", "validateUnifiedQueryRequest", "INVALID_PROVIDER_ID", "tests/unified-query.test.ts", "rejects malformed or provider-branded capability ids before planning"),
  makeRecord("TB-CAP-QUERY-003", "QUERY", "Query validation rejects empty requirement IDs.", "src/unified-query.ts", "validateUnifiedQueryRequest", "EMPTY_ID_REJECTION", "tests/unified-query.test.ts", "rejects malformed or provider-branded capability ids before planning"),
  makeRecord("TB-CAP-QUERY-004", "QUERY", "Query validation rejects rawPrompt, secrets, and memory payloads.", "src/unified-query.ts", "validateUnifiedQueryRequest", "PROHIBITED_INPUT_REJECTION", "tests/unified-query.test.ts", "rejects provider-selected instructions and raw secrets"),
  makeRecord("TB-CAP-QUERY-005", "QUERY", "PLAN_READY is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "PLAN_READY", "tests/unified-query.test.ts", "accepts provider-neutral capability requirements and creates deterministic plan"),
  makeRecord("TB-CAP-QUERY-006", "QUERY", "PARTIAL_PLAN is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "PARTIAL_PLAN", "tests/unified-query.test.ts", "creates partial plan when required capability is disabled or missing"),
  makeRecord("TB-CAP-QUERY-007", "QUERY", "CLARIFICATION_REQUIRED is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "CLARIFICATION_REQUIRED", "tests/unified-query.test.ts", "reaches clarification and not-assessable outcomes for bounded missing facts"),
  makeRecord("TB-CAP-QUERY-008", "QUERY", "NO_ELIGIBLE_CAPABILITY is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "NO_ELIGIBLE_CAPABILITY", "tests/unified-query.test.ts", "planUnifiedQuery returns no eligible capability for unsupported requirements"),
  makeRecord("TB-CAP-QUERY-009", "QUERY", "CONFLICTING_REQUIREMENTS is directly reachable and tested.", "src/unified-query.ts", "detectConflictingRequirements", "CONFLICTING_REQUIREMENTS", "tests/unified-query.test.ts", "rejects conflicting capability requirements before planning"),
  makeRecord("TB-CAP-QUERY-010", "QUERY", "INVALID_REQUEST is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "INVALID_REQUEST", "tests/unified-query.test.ts", "rejects unknown freshness semantics and emits invalid request on unmapped values"),
  makeRecord("TB-CAP-QUERY-011", "QUERY", "NOT_ASSESSABLE is directly reachable and tested.", "src/unified-query.ts", "planUnifiedQuery", "NOT_ASSESSABLE", "tests/unified-query.test.ts", "reaches clarification and not-assessable outcomes for bounded missing facts"),
  makeRecord("TB-CAP-QUERY-012", "QUERY", "Unified Query preserves freshness values from the authoritative vocabulary.", "src/capability-model.ts", "CAPABILITY_FRESHNESS_REQUIREMENTS", "FRESHNESS_DIRECT_REUSE", "tests/unified-query.test.ts", "rejects unknown freshness semantics and emits invalid request on unmapped values"),
  makeRecord("TB-CAP-QUERY-013", "QUERY", "Unified Query preserves source attribution requirements.", "src/unified-query.ts", "UnifiedQueryPlanStep", "ATTRIBUTION_REQUIREMENT", "tests/unified-query.test.ts", "preserves source attribution requirements in the query plan"),
  makeRecord("TB-CAP-QUERY-014", "QUERY", "Plan steps remain non-authorizing and deterministic.", "src/unified-query.ts", "planUnifiedQuery", "PLAN_STEP_NON_AUTHORIZING", "tests/unified-query.test.ts", "accepts provider-neutral capability requirements and creates deterministic plan"),
  makeRecord("TB-CAP-CONFLICT-001", "CONFLICT", "Conflict evaluation returns NO_CONFLICT for empty input.", "src/conflict-contract.ts", "evaluateConflicts", "NO_CONFLICT", "tests/conflict-contract.test.ts", "reports no conflict for clear inputs"),
  makeRecord("TB-CAP-CONFLICT-002", "CONFLICT", "Conflict evaluation blocks privacy conflicts.", "src/conflict-contract.ts", "evaluateConflicts", "PRIVACY_CONFLICT_BLOCKED", "tests/conflict-contract.test.ts", "blocks privacy conflicts and preserves non-authorizing evidence"),
  makeRecord("TB-CAP-CONFLICT-003", "CONFLICT", "Conflict ordering remains deterministic.", "src/conflict-contract.ts", "evaluateConflicts", "DETERMINISTIC_ORDER", "tests/conflict-contract.test.ts", "keeps conflict ordering deterministic"),
  makeRecord("TB-CAP-CONFLICT-004", "CONFLICT", "Account-scope conflicts fail closed.", "src/conflict-contract.ts", "evaluateConflicts", "ACCOUNT_SCOPE_CONFLICT_BLOCKED", "tests/conflict-contract.test.ts", "blocks account-scope conflicts in a fail-closed manner"),
  makeRecord("TB-CAP-CONFLICT-005", "CONFLICT", "Data-class conflicts fail closed.", "src/conflict-contract.ts", "evaluateConflicts", "DATA_CLASS_CONFLICT_BLOCKED", "tests/conflict-contract.test.ts", "blocks data-class conflicts in a fail-closed manner"),
  makeRecord("TB-CAP-CONFLICT-006", "CONFLICT", "Unknown blocking conflicts fail closed.", "src/conflict-contract.ts", "evaluateConflicts", "UNKNOWN_CONFLICT_BLOCKED", "tests/conflict-contract.test.ts", "fails closed on unknown blocking conflicts and preserves immutability"),
  makeRecord("TB-CAP-CONFLICT-007", "CONFLICT", "Conflict results preserve non-authorizing semantics.", "src/conflict-contract.ts", "evaluateConflicts", "NON_AUTHORIZING_RESULT", "tests/conflict-contract.test.ts", "blocks privacy conflicts and preserves non-authorizing evidence"),
  makeRecord("TB-CAP-CONFLICT-008", "CONFLICT", "Conflict evaluation remains fail-closed for severity BLOCKING.", "src/conflict-contract.ts", "evaluateConflicts", "SEVERITY_BLOCKING", "tests/conflict-contract.test.ts", "blocks privacy conflicts and preserves non-authorizing evidence"),
  makeRecord("TB-CAP-CONFLICT-009", "CONFLICT", "Conflict evaluation returns BLOCKED only when protection is required.", "src/conflict-contract.ts", "evaluateConflicts", "BLOCKED_DISPOSITION", "tests/conflict-contract.test.ts", "fails closed on unknown blocking conflicts and preserves immutability"),
  makeRecord("TB-CAP-CONFLICT-010", "CONFLICT", "Conflict evaluation never grants execution or authority.", "src/conflict-contract.ts", "evaluateConflicts", "NON_AUTHORIZING_CONTRACT", "tests/conflict-contract.test.ts", "blocks privacy conflicts and preserves non-authorizing evidence"),
  makeRecord("TB-CAP-COMPAT-001", "COMPAT", "Capability model reuses authoritative freshness vocabulary.", "src/capability-model.ts", "CAPABILITY_FRESHNESS_REQUIREMENTS", "FRESHNESS_REUSE", "tests/unified-query.test.ts", "rejects unknown freshness semantics and emits invalid request on unmapped values"),
  makeRecord("TB-CAP-COMPAT-002", "COMPAT", "Freshness values are mapped without introducing a competing semantic model.", "src/unified-query.ts", "validateUnifiedQueryRequest", "FRESHNESS_MAPPING", "tests/unified-query.test.ts", "rejects unknown freshness semantics and emits invalid request on unmapped values"),
  makeRecord("TB-CAP-COMPAT-003", "COMPAT", "Unknown freshness values fail closed.", "src/unified-query.ts", "validateUnifiedQueryRequest", "UNKNOWN_FRESHNESS_FAIL_CLOSED", "tests/unified-query.test.ts", "rejects unknown freshness semantics and emits invalid request on unmapped values"),
  makeRecord("TB-CAP-COMPAT-004", "COMPAT", "Attribution requirement is preserved in the query plan.", "src/unified-query.ts", "UnifiedQueryPlanStep", "ATTRIBUTION_REQUIREMENT_PRESERVED", "tests/unified-query.test.ts", "preserves source attribution requirements in the query plan"),
  makeRecord("TB-CAP-COMPAT-005", "COMPAT", "Attribution facts are not fabricated at validation time.", "src/unified-query.ts", "validateUnifiedQueryRequest", "ATTRIBUTION_FACTS_NOT_FABRICATED", "tests/unified-query.test.ts", "preserves source attribution requirements in the query plan"),
  makeRecord("TB-CAP-COMPAT-006", "COMPAT", "Provider-neutral capability IDs remain canonical across query validation.", "src/validators.ts", "containsProviderReference", "PROVIDER_NEUTRAL_CANONICAL", "tests/unified-query.test.ts", "rejects malformed or provider-branded capability ids before planning"),
  makeRecord("TB-CAP-COMPAT-007", "COMPAT", "Capability registry and query validation share the same provider-neutral assumptions.", "src/index.ts", "validateCapabilityDefinition", "SHARED_PROVIDER_RULES", "tests/unified-query.test.ts", "rejects provider-selected instructions and raw secrets"),
  makeRecord("TB-CAP-COMPAT-008", "COMPAT", "Package 1 remains directed at contracts and deterministic policy only.", "src/index.ts", "planUnifiedQuery", "NON_RUNTIME_CONTRACT_ONLY", "tests/unified-query.test.ts", "accepts provider-neutral capability requirements and creates deterministic plan"),
  makeRecord("TB-CAP-SCOPE-001", "SCOPE", "Calendar fixture is provider neutral and non-authorizing.", "tests/unified-query.test.ts", "buildRegistry", "FIXTURE_CALENDAR", "tests/unified-query.test.ts", "accepts provider-neutral capability requirements and creates deterministic plan"),
  makeRecord("TB-CAP-SCOPE-002", "SCOPE", "Mail fixture is provider neutral and non-authorizing.", "tests/capability-registry.test.ts", "registerCapability", "FIXTURE_MAIL", "tests/capability-registry.test.ts", "registers a valid provider-neutral read capability"),
  makeRecord("TB-CAP-SCOPE-003", "SCOPE", "Repository fixture is provider neutral and non-authorizing.", "tests/capability-registry.test.ts", "registerCapability", "FIXTURE_REPOSITORY", "tests/capability-registry.test.ts", "accepts the required fixture-only capability IDs without granting authority"),
  makeRecord("TB-CAP-SCOPE-004", "SCOPE", "Deployment fixture is provider neutral and non-authorizing.", "tests/unified-query.test.ts", "buildRegistry", "FIXTURE_DEPLOYMENT", "tests/unified-query.test.ts", "creates partial plan when required capability is disabled or missing"),
  makeRecord("TB-CAP-SCOPE-005", "SCOPE", "Task and application fixtures remain action-class metadata only.", "tests/capability-registry.test.ts", "registerCapability", "FIXTURE_APPLICATION", "tests/capability-registry.test.ts", "accepts the required fixture-only capability IDs without granting authority"),
  makeRecord("TB-CAP-SCOPE-006", "SCOPE", "Fixture set stays bounded to deterministic contract validation.", "tests/acceptance-registry.test.ts", "validateTrainBAcceptanceRegistry", "FIXTURE_SCOPE", "tests/acceptance-registry.test.ts", "validates the Train B acceptance registry and required fixture set"),
]);

const isRecord = (value: unknown): value is TrainBAcceptanceRecord => typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as { id?: unknown }).id === "string";
const fileExists = (relativePath: string): boolean => {
  try {
    return existsSync(relativePath);
  } catch {
    return false;
  }
};

export function validateTrainBAcceptanceRegistry(input: readonly TrainBAcceptanceRecord[] | unknown): TrainBAcceptanceRegistryValidationResult {
  if (!Array.isArray(input)) {
    return {
      valid: false,
      errors: ["acceptance registry must be an array"],
      duplicateIds: [],
      missingIds: EXPECTED_ID_ORDER,
      unexpectedIds: [],
      invalidOrder: [],
      invalidFamilyCounts: { ...EXPECTED_FAMILY_COUNTS },
      invalidFileMappings: [],
      invalidTestMappings: [],
    };
  }

  const ids = input.map((entry) => (isRecord(entry) ? entry.id : "<malformed>"));
  const seen = new Set<string>();
  const duplicateIds = ids.filter((id) => {
    if (id === "<malformed>") return false;
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
  const expectedIdSet = EXPECTED_ID_ORDER as readonly string[];
  const missingIds = expectedIdSet.filter((id) => !ids.includes(id));
  const unexpectedIds = ids.filter((id) => id !== "<malformed>" && !expectedIdSet.includes(id));
  const invalidOrder = ids.length === EXPECTED_ID_ORDER.length ? ids.map((id, index) => id === EXPECTED_ID_ORDER[index] ? null : `expected ${EXPECTED_ID_ORDER[index]} at index ${index}; received ${id}`).filter((value): value is string => value !== null) : [];

  const familyCounts = input.reduce<Record<TrainBAcceptanceFamily, number>>(
    (counts, entry) => {
      if (isRecord(entry)) {
        counts[entry.family] += 1;
      }
      return counts;
    },
    { REG: 0, GRAPH: 0, QUERY: 0, CONFLICT: 0, COMPAT: 0, SCOPE: 0 },
  );
  const invalidFamilyCounts = Object.fromEntries(
    TRAIN_B_ACCEPTANCE_FAMILIES.map((family) => [family, familyCounts[family] === EXPECTED_FAMILY_COUNTS[family] ? 0 : familyCounts[family]]),
  ) as Record<TrainBAcceptanceFamily, number>;

  const invalidFileMappings = input
    .filter((entry): entry is TrainBAcceptanceRecord => isRecord(entry))
    .filter((entry) => !fileExists(entry.implementationPath) || !fileExists(entry.testFile))
    .map((entry) => `${entry.id}:${entry.implementationPath}:${entry.testFile}`);

  const invalidTestMappings = input
    .filter((entry): entry is TrainBAcceptanceRecord => isRecord(entry))
    .filter((entry) => !entry.testName || entry.testName.trim().length === 0)
    .map((entry) => entry.id);

  const valid = ids.length === EXPECTED_ID_ORDER.length && missingIds.length === 0 && unexpectedIds.length === 0 && duplicateIds.length === 0 && invalidOrder.length === 0 && Object.values(invalidFamilyCounts).every((count) => count === 0) && invalidFileMappings.length === 0 && invalidTestMappings.length === 0;

  return Object.freeze({
    valid,
    errors: Object.freeze([
      ...(duplicateIds.length > 0 ? [`duplicate ids: ${duplicateIds.join(", ")}`] : []),
      ...(missingIds.length > 0 ? [`missing ids: ${missingIds.join(", ")}`] : []),
      ...(unexpectedIds.length > 0 ? [`unexpected ids: ${unexpectedIds.join(", ")}`] : []),
      ...(invalidOrder.length > 0 ? [`invalid ordering: ${invalidOrder.join("; ")}`] : []),
      ...(Object.values(invalidFamilyCounts).some((count) => count !== 0) ? ["family counts mismatch"] : []),
      ...(invalidFileMappings.length > 0 ? [`invalid file mappings: ${invalidFileMappings.join("; ")}`] : []),
      ...(invalidTestMappings.length > 0 ? [`invalid test mappings: ${invalidTestMappings.join(", ")}`] : []),
    ]),
    duplicateIds: Object.freeze([...new Set(duplicateIds)]),
    missingIds: Object.freeze([...missingIds]),
    unexpectedIds: Object.freeze([...unexpectedIds]),
    invalidOrder: Object.freeze([...invalidOrder]),
    invalidFamilyCounts: Object.freeze({ ...invalidFamilyCounts }),
    invalidFileMappings: Object.freeze([...invalidFileMappings]),
    invalidTestMappings: Object.freeze([...invalidTestMappings]),
  });
}
