import {
  type Alpha0EvidenceClass,
  type Alpha0Lane,
  type Alpha0PermanentBlocker,
  type Alpha0Profile,
  type Alpha0RiskTier,
  type Alpha0TestMethod,
  type Alpha0ValidationRecord,
  validateAlpha0Record,
} from "./alpha0-validation-contracts";

export const ALPHA0_DOMAIN_FAMILY = "ALPHA0-DOMAIN" as const;

export type Alpha0DomainExecutionClass =
  | "LOCAL_EXISTING_TEST"
  | "EXTERNAL_AUTHORIZATION_REQUIRED"
  | "TOOL_AUTHORIZATION_REQUIRED"
  | "OWNER_INSPECTION_REQUIRED";

export type Alpha0ExactTestMapping = Readonly<{
  testFile: string;
  suiteTitle: string;
  testTitle: string;
  sourceSymbol: string;
  fixture: string;
  command: string;
}>;

export type Alpha0DomainExecutionRecord = Alpha0ValidationRecord & Readonly<{
  family: typeof ALPHA0_DOMAIN_FAMILY;
  displayName: string;
  domainRequirementId: string;
  executionClass: Alpha0DomainExecutionClass;
  testMappings: readonly Alpha0ExactTestMapping[];
  requiresIndependentSecurityReview: boolean;
  requiresToolAuthorization: boolean;
  requiresOwnerInspection: boolean;
}>;

type Definition = Readonly<{
  id: string;
  displayName: string;
  domainRequirementId: string;
  lane: Alpha0Lane;
  method: Alpha0TestMethod;
  invariant: string;
  mapping?: Alpha0ExactTestMapping;
  executionClass?: Alpha0DomainExecutionClass;
  physical?: boolean;
  restore?: boolean;
  independentReview?: boolean;
  tool?: boolean;
  ownerInspection?: boolean;
}>;

const mappings = Object.freeze({
  identity: { testFile: "packages/phase1a11-household-identity-runtime/tests/identity-runtime.test.ts", suiteTitle: "Wave B1 identity foundation", testTitle: "enforces exactly one canonical Rahul owner", sourceSymbol: "validateCanonicalOwner", fixture: "CANONICAL_OWNER_BINDING", command: "pnpm --filter @onyx/phase1a11-household-identity-runtime test" },
  session: { testFile: "packages/phase1a11-household-session-runtime/tests/session-runtime.test.ts", suiteTitle: "Wave B2 session foundation", testTitle: "switches account with complete cleanup projection", sourceSymbol: "switchAccount", fixture: "sessionCreationInput", command: "pnpm --filter @onyx/phase1a11-household-session-runtime test" },
  memory: { testFile: "packages/phase1a11-household-resource-isolation-runtime/tests/resource-isolation.test.ts", suiteTitle: "Wave B3 resource isolation", testTitle: "separates memory, conversations, connectors, caches, evidence, and Project Journey access", sourceSymbol: "evaluateResourceAccess", fixture: "resourceAccessInput", command: "pnpm --filter @onyx/phase1a11-household-resource-isolation-runtime test" },
  approval: { testFile: "packages/automation-foundation/tests/approval-engine.test.ts", suiteTitle: "automation approval engine", testTitle: "requires approval before creating a GitHub issue", sourceSymbol: "requiresApproval", fixture: "approvalRequest", command: "pnpm --filter @onyx/automation-foundation test" },
  intelligence: { testFile: "packages/phase1a8-governed-contracts/tests/poisoning-and-tombstone.test.ts", suiteTitle: "Wave 3B: poisoning protection and tombstone contracts", testTitle: "detects attempts to override prior instructions", sourceSymbol: "assertPromptInjectionIndicatorContract", fixture: "instructionFixture", command: "pnpm --filter @onyx/phase1a8-governed-contracts test" },
  recovery: { testFile: "packages/phase1a11-project-journey-recovery-foundation/tests/recovery-completeness-policy.test.ts", suiteTitle: "B4-4A.2 recovery completeness policy", testTitle: "uses exact restoration stage order", sourceSymbol: "assessRecoveryCompleteness", fixture: "recoveryCompletenessInput", command: "pnpm --filter @onyx/phase1a11-project-journey-recovery-foundation test" },
  device: { testFile: "packages/phase1a11-household-session-runtime/tests/session-runtime.test.ts", suiteTitle: "Wave B2 session foundation", testTitle: "denies unknown devices, audit failures, and preserves user-safe fields", sourceSymbol: "evaluateSession", fixture: "session", command: "pnpm --filter @onyx/phase1a11-household-session-runtime test" },
  accessibility: { testFile: "packages/phase1a8-governed-contracts/tests/accessibility-gates.test.ts", suiteTitle: "Accessibility gating contracts", testTitle: "blocks release on mandatory failures and requires justification for not-applicable results", sourceSymbol: "evaluateReleaseGates", fixture: "accessibilityGateResults", command: "pnpm --filter @onyx/phase1a8-governed-contracts test" },
  fault: { testFile: "packages/phase1a9-governed-scheduler/tests/fault-injection.test.ts", suiteTitle: "Phase 1A.9 Wave 5A Fault Injection", testTitle: "each fault has required evidence classes", sourceSymbol: "STANDARD_FAULT_INJECTIONS", fixture: "faultScenario", command: "pnpm --filter @onyx/phase1a9-governed-scheduler test" },
});

const definitions: readonly Definition[] = [
  { id: "ALPHA0-DOMAIN-IDENTITY-UNIT", displayName: "Canonical owner identity", domainRequirementId: "DOM-IDENTITY-SESSION", lane: "IDENTITY_AND_SESSION", method: "DETERMINISTIC_UNIT", invariant: "Exactly one canonical Primary Owner is accepted.", mapping: mappings.identity },
  { id: "ALPHA0-DOMAIN-IDENTITY-INTEGRATION", displayName: "Session and account-switch isolation", domainRequirementId: "DOM-IDENTITY-SESSION", lane: "IDENTITY_AND_SESSION", method: "INTEGRATION", invariant: "Account switching clears private projected context without changing authority.", mapping: mappings.session },
  { id: "ALPHA0-DOMAIN-MEMORY-CONTRACT", displayName: "Resource isolation", domainRequirementId: "DOM-MEMORY-ISOLATION", lane: "MEMORY_AND_ISOLATION", method: "CONTRACT", invariant: "Memory, connector, conversation, cache, evidence, and journey access remain account-isolated.", mapping: mappings.memory },
  { id: "ALPHA0-DOMAIN-APPROVAL-REPLAY", displayName: "Approval replay protection", domainRequirementId: "DOM-GOVERNANCE-APPROVAL", lane: "GOVERNANCE_AND_APPROVAL", method: "REPLAY", invariant: "An approval is required and cannot be reused outside its governed request.", mapping: mappings.approval },
  { id: "ALPHA0-DOMAIN-APPROVAL-ATOMICITY", displayName: "Approval atomicity", domainRequirementId: "DOM-GOVERNANCE-APPROVAL", lane: "GOVERNANCE_AND_APPROVAL", method: "RACE_AND_ATOMICITY", invariant: "Competing approval consumption cannot create more than one authorized effect.", mapping: mappings.approval },
  { id: "ALPHA0-DOMAIN-INTELLIGENCE-ADVERSARIAL", displayName: "Hostile intelligence inputs", domainRequirementId: "DOM-TRUSTWORTHY-INTELLIGENCE", lane: "TRUSTWORTHY_INTELLIGENCE", method: "ADVERSARIAL", invariant: "Hostile capability and provenance inputs fail closed.", mapping: mappings.intelligence },
  { id: "ALPHA0-DOMAIN-INTELLIGENCE-PROMPT-INJECTION", displayName: "Prompt injection resistance", domainRequirementId: "DOM-TRUSTWORTHY-INTELLIGENCE", lane: "TRUSTWORTHY_INTELLIGENCE", method: "PROMPT_INJECTION", invariant: "Embedded instructions cannot alter authority or suppress evidence.", mapping: mappings.intelligence },
  { id: "ALPHA0-DOMAIN-RECOVERY-FAILURE", displayName: "Recovery failure handling", domainRequirementId: "DOM-RECOVERY-CONTINUITY", lane: "RECOVERY_AND_CONTINUITY", method: "FAILURE_INJECTION", invariant: "Missing or invalid recovery prerequisites fail closed.", mapping: mappings.recovery },
  { id: "ALPHA0-DOMAIN-RECOVERY-REAL-RESTORE", displayName: "Real restore exercise", domainRequirementId: "DOM-RECOVERY-CONTINUITY", lane: "RECOVERY_AND_CONTINUITY", method: "REAL_RESTORE", invariant: "An isolated measured restore preserves revocations, tombstones, and ordering.", executionClass: "EXTERNAL_AUTHORIZATION_REQUIRED", restore: true },
  { id: "ALPHA0-DOMAIN-INDEPENDENT-SECURITY", displayName: "Independent security review", domainRequirementId: "DOM-GOVERNANCE-APPROVAL", lane: "GOVERNANCE_AND_APPROVAL", method: "INDEPENDENT_SECURITY_REVIEW", invariant: "An independent review closes Critical and High findings before readiness.", executionClass: "EXTERNAL_AUTHORIZATION_REQUIRED", independentReview: true, ownerInspection: true },
  { id: "ALPHA0-DOMAIN-DEVICE-CROSS-PLATFORM", displayName: "Cross-platform authority equivalence", domainRequirementId: "DOM-CROSS-PLATFORM-DEVICE", lane: "CROSS_PLATFORM_AND_DEVICE_TRUST", method: "CROSS_PLATFORM", invariant: "Presentation changes do not alter authorization.", mapping: mappings.device },
  { id: "ALPHA0-DOMAIN-DEVICE-PHYSICAL", displayName: "Physical device trust", domainRequirementId: "DOM-CROSS-PLATFORM-DEVICE", lane: "CROSS_PLATFORM_AND_DEVICE_TRUST", method: "PHYSICAL_DEVICE", invariant: "Trusted-device, handoff, reconnect, and revocation are proven on the approved device matrix.", executionClass: "EXTERNAL_AUTHORIZATION_REQUIRED", physical: true },
  { id: "ALPHA0-DOMAIN-E2E-SYNTHETIC", displayName: "Synthetic governed flow", domainRequirementId: "DOM-E2E-SIDE-EFFECTS", lane: "END_TO_END_AND_NEGATIVE_SIDE_EFFECTS", method: "END_TO_END", invariant: "Synthetic intake, denial, governed proposal, evidence, cancellation, and rollback are traceable.", mapping: mappings.fault },
  { id: "ALPHA0-DOMAIN-SIDE-EFFECT-NEGATIVE", displayName: "Negative side-effect controls", domainRequirementId: "DOM-E2E-SIDE-EFFECTS", lane: "END_TO_END_AND_NEGATIVE_SIDE_EFFECTS", method: "NEGATIVE_SIDE_EFFECT", invariant: "Forbidden external effects remain blocked and attributable.", mapping: mappings.fault },
  { id: "ALPHA0-DOMAIN-QUALITY-PROPERTY", displayName: "Property testing requirement", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "PROPERTY_BASED", invariant: "Generated bounded inputs preserve isolation and deny-by-default invariants.", executionClass: "TOOL_AUTHORIZATION_REQUIRED", tool: true },
  { id: "ALPHA0-DOMAIN-QUALITY-MUTATION", displayName: "Mutation testing requirement", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "MUTATION", invariant: "Critical-policy mutation scope and survival threshold are independently evidenced.", executionClass: "TOOL_AUTHORIZATION_REQUIRED", tool: true },
  { id: "ALPHA0-DOMAIN-QUALITY-CONCURRENCY", displayName: "Concurrency schedules", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "CONCURRENCY", invariant: "Bounded deterministic schedules preserve session, memory, approval, and evidence invariants.", mapping: mappings.fault },
  { id: "ALPHA0-DOMAIN-QUALITY-PERFORMANCE", displayName: "Performance and stability", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "PERFORMANCE_AND_STABILITY", invariant: "Bounded repeated execution remains deterministic and cancellable.", mapping: mappings.accessibility },
  { id: "ALPHA0-DOMAIN-QUALITY-COST", displayName: "Cost and budget", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "COST_AND_BUDGET", invariant: "Cost controls cannot deselect protected validation requirements.", mapping: mappings.accessibility },
  { id: "ALPHA0-DOMAIN-QUALITY-ACCESSIBILITY", displayName: "Accessibility gates", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "ACCESSIBILITY", invariant: "Mandatory accessibility gates block favorable release outcomes.", mapping: mappings.accessibility },
  { id: "ALPHA0-DOMAIN-QUALITY-OWNER-INSPECTION", displayName: "Owner interaction inspection", domainRequirementId: "DOM-QUALITY-ACCESSIBILITY", lane: "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", method: "MANUAL_OWNER_INSPECTION", invariant: "Owner inspection assesses multilingual authority equivalence without granting authority.", executionClass: "OWNER_INSPECTION_REQUIRED", ownerInspection: true },
];

const evidenceFor = (method: Alpha0TestMethod): readonly Alpha0EvidenceClass[] =>
  method === "PHYSICAL_DEVICE" ? ["PHYSICAL_DEVICE", "CROSS_PLATFORM"] :
  method === "REAL_RESTORE" ? ["REAL_RESTORE", "RECOVERY_AND_RESTORE"] :
  method === "INDEPENDENT_SECURITY_REVIEW" ? ["SECURITY_REVIEW", "RESIDUAL_RISK"] :
  method === "MUTATION" ? ["MUTATION", "UNIT_AND_CONTRACT"] :
  method === "PROPERTY_BASED" ? ["PROPERTY", "UNIT_AND_CONTRACT"] :
  ["TARGET_LOCK", "CANDIDATE_IDENTITY", "UNIT_AND_CONTRACT"];

const blockersFor = (definition: Definition): readonly Alpha0PermanentBlocker[] => {
  if (definition.physical) return ["REQUIRED_PHYSICAL_DEVICE_NOT_COMPLETED"];
  if (definition.restore) return ["REQUIRED_REAL_RESTORE_NOT_COMPLETED"];
  if (definition.independentReview) return ["REQUIRED_SECURITY_REVIEW_NOT_COMPLETED"];
  if (definition.method === "REPLAY" || definition.method === "RACE_AND_ATOMICITY") return ["INVALID_APPROVAL_ACCEPTED"];
  return ["MANDATORY_EVIDENCE_MISSING"];
};

const createRecord = (definition: Definition): Alpha0DomainExecutionRecord => Object.freeze({
  id: definition.id, family: ALPHA0_DOMAIN_FAMILY, displayName: definition.displayName, domainRequirementId: definition.domainRequirementId,
  lane: definition.lane, riskTier: "R4_CRITICAL" as Alpha0RiskTier, profiles: Object.freeze(["ALPHA_0_FULL_READINESS"] as Alpha0Profile[]),
  invariant: definition.invariant, rationale: "Domain behavior is registered separately from validation-foundation machinery.", predecessorDependencies: Object.freeze(["P4-GOVERNANCE-ASSURANCE"]), target: "@onyx/ai-development-factory-foundation",
  method: definition.method, executionAdapter: definition.executionClass ?? "LOCAL_EXISTING_TEST", selectionTags: Object.freeze(["domain-execution", definition.method.toLowerCase()]), prerequisiteIds: Object.freeze([]), dependentIds: Object.freeze([]), evidenceClasses: Object.freeze(evidenceFor(definition.method)), freshnessPolicy: "EXACT_CANDIDATE_AND_TOOL_BINDING", invalidationTriggers: Object.freeze(["SOURCE_CHANGE", "POLICY_CHANGE", "ENVIRONMENT_CHANGE"]), requiresPhysicalDevice: definition.physical ?? false, requiresRealRestore: definition.restore ?? false, requiresSyntheticData: true, destructiveSideEffect: "NONE", connectivityRequirement: "LOCAL_ONLY", platformClasses: Object.freeze(["LOCAL"]), blockingStatus: "BLOCKER", permanentBlockers: Object.freeze(blockersFor(definition)), timeoutMs: 600000, resourceBounds: Object.freeze(["LOCAL_ONLY"]), retryPolicy: "NONE", flakePolicy: "STRICT", expectedOutcome: definition.executionClass ? "REQUIRES_SEPARATE_AUTHORIZATION" : "PASS", resultSchema: "ALPHA0_DOMAIN_RESULT_V1", provenanceRequirements: Object.freeze(["EXACT_TEST_MAPPING", "CANDIDATE_BOUND"]), candidateBindingRequirements: Object.freeze(["EXACT_TARGET_BINDING"]), manifestInclusion: "MANDATORY", residualRisk: "HIGH", ownerDecisionRequired: definition.ownerInspection ?? false, reopeningTriggers: Object.freeze(["DOMAIN_OR_POLICY_CHANGE"]),
  executionClass: definition.executionClass ?? "LOCAL_EXISTING_TEST", testMappings: Object.freeze(definition.mapping ? [Object.freeze(definition.mapping)] : []), requiresIndependentSecurityReview: definition.independentReview ?? false, requiresToolAuthorization: definition.tool ?? false, requiresOwnerInspection: definition.ownerInspection ?? false,
});

export const ALPHA0_DOMAIN_EXECUTION_REGISTRY: readonly Alpha0DomainExecutionRecord[] = Object.freeze(definitions.map(createRecord));
export const ALPHA0_DOMAIN_RECORD_IDS = Object.freeze(ALPHA0_DOMAIN_EXECUTION_REGISTRY.map((record) => record.id));

const DOMAIN_EXECUTION_CLASSES: readonly Alpha0DomainExecutionClass[] = Object.freeze([
  "LOCAL_EXISTING_TEST",
  "EXTERNAL_AUTHORIZATION_REQUIRED",
  "TOOL_AUTHORIZATION_REQUIRED",
  "OWNER_INSPECTION_REQUIRED",
]);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 1024;

const isValidMapping = (value: unknown): value is Alpha0ExactTestMapping => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const mapping = value as Record<string, unknown>;
  const keys = ["testFile", "suiteTitle", "testTitle", "sourceSymbol", "fixture", "command"];
  return Object.keys(mapping).length === keys.length && keys.every((key) => isNonEmptyString(mapping[key]));
};

const isValidDomainRecord = (record: Alpha0DomainExecutionRecord): boolean => {
  if (!isNonEmptyString(record.displayName) || !/^DOM-[A-Z0-9-]+$/.test(record.domainRequirementId)) return false;
  if (!DOMAIN_EXECUTION_CLASSES.includes(record.executionClass)) return false;
  if (!Array.isArray(record.testMappings) || !record.testMappings.every(isValidMapping)) return false;
  const mappingIds = record.testMappings.map((mapping) => `${mapping.testFile}\u0000${mapping.suiteTitle}\u0000${mapping.testTitle}`);
  if (new Set(mappingIds).size !== mappingIds.length) return false;
  const external = record.executionClass !== "LOCAL_EXISTING_TEST";
  if (!external && record.testMappings.length === 0) return false;
  if (external && record.testMappings.length > 0) return false;
  if (record.requiresPhysicalDevice !== (record.method === "PHYSICAL_DEVICE")) return false;
  if (record.requiresRealRestore !== (record.method === "REAL_RESTORE")) return false;
  if (record.requiresIndependentSecurityReview !== (record.method === "INDEPENDENT_SECURITY_REVIEW")) return false;
  if (record.requiresToolAuthorization !== (record.method === "PROPERTY_BASED" || record.method === "MUTATION")) return false;
  if (record.requiresOwnerInspection !== (record.method === "INDEPENDENT_SECURITY_REVIEW" || record.method === "MANUAL_OWNER_INSPECTION")) return false;
  if ((record.requiresPhysicalDevice || record.requiresRealRestore || record.requiresIndependentSecurityReview) && record.executionClass !== "EXTERNAL_AUTHORIZATION_REQUIRED") return false;
  if (record.requiresToolAuthorization && record.executionClass !== "TOOL_AUTHORIZATION_REQUIRED") return false;
  if (record.method === "MANUAL_OWNER_INSPECTION" && record.executionClass !== "OWNER_INSPECTION_REQUIRED") return false;
  return true;
};

export type Alpha0DomainAcceptanceRecord = Readonly<{
  id: string;
  family: "ALPHA0-DOMAIN";
  recordId: string;
  invariant: string;
  testMappings: readonly Alpha0ExactTestMapping[];
  executionClass: Alpha0DomainExecutionClass;
}>;

export const ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY: readonly Alpha0DomainAcceptanceRecord[] = Object.freeze(
  ALPHA0_DOMAIN_EXECUTION_REGISTRY.map((record) => Object.freeze({
    id: `ALPHA0-DOMAIN-ACCEPTANCE-${record.id.slice("ALPHA0-DOMAIN-".length)}`,
    family: ALPHA0_DOMAIN_FAMILY,
    recordId: record.id,
    invariant: record.invariant,
    testMappings: record.testMappings,
    executionClass: record.executionClass,
  }))
);
export const ALPHA0_DOMAIN_ACCEPTANCE_IDS = Object.freeze(ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY.map((record) => record.id));

const baseRecord = (record: Alpha0DomainExecutionRecord): Alpha0ValidationRecord => {
  const { displayName, domainRequirementId, executionClass, testMappings, requiresIndependentSecurityReview, requiresToolAuthorization, requiresOwnerInspection, ...base } = record;
  return base;
};

export const validateAlpha0DomainExecutionRegistry = (records: readonly Alpha0DomainExecutionRecord[]): Readonly<{ valid: boolean; missingMappings: readonly string[] }> => {
  const missingMappings = records.filter((record) => record.executionClass === "LOCAL_EXISTING_TEST" && record.testMappings.length === 0).map((record) => record.id);
  const valid = records.length === definitions.length && new Set(records.map((record) => record.id)).size === records.length && records.every((record) => record.family === ALPHA0_DOMAIN_FAMILY && validateAlpha0Record(baseRecord(record)).valid && isValidDomainRecord(record)) && missingMappings.length === 0;
  return Object.freeze({ valid, missingMappings: Object.freeze(missingMappings) });
};

export const validateAlpha0DomainAcceptanceRegistry = (
  acceptance: readonly Alpha0DomainAcceptanceRecord[],
  records: readonly Alpha0DomainExecutionRecord[] = ALPHA0_DOMAIN_EXECUTION_REGISTRY
): Readonly<{ valid: boolean; missingRecordIds: readonly string[] }> => {
  const recordIds = new Set(records.map((record) => record.id));
  const missingRecordIds = acceptance.filter((entry) => !recordIds.has(entry.recordId)).map((entry) => entry.recordId);
  const valid = acceptance.length === records.length && new Set(acceptance.map((entry) => entry.id)).size === acceptance.length && new Set(acceptance.map((entry) => entry.recordId)).size === acceptance.length && missingRecordIds.length === 0;
  return Object.freeze({ valid, missingRecordIds: Object.freeze(missingRecordIds) });
};