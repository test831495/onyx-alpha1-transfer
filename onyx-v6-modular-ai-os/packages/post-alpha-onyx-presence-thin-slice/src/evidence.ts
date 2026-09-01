import { deepFreeze } from "./contracts";

export const ACCEPTANCE_FAMILIES = Object.freeze([
  "PA-PRESENCE-SCOPE", "PA-PRESENCE-DEPENDENCY", "PA-PRESENCE-LIFECYCLE", "PA-PRESENCE-ONYX", "PA-PRESENCE-INPUT", "PA-PRESENCE-CONTEXT", "PA-PRESENCE-EVIDENCE", "PA-PRESENCE-MEMORY", "PA-PRESENCE-TOOL", "PA-PRESENCE-PRESENTATION", "PA-PRESENCE-AVATAR", "PA-PRESENCE-AMBIENT", "PA-PRESENCE-DESKTOP", "PA-PRESENCE-TV", "PA-PRESENCE-PRIVACY", "PA-PRESENCE-ACCESSIBILITY", "PA-PRESENCE-INTERRUPTION", "PA-PRESENCE-RECOVERY", "PA-PRESENCE-FLAG", "PA-PRESENCE-ROLLBACK", "PA-PRESENCE-NONAUTHORITY", "PA-PRESENCE-EVIDENCE-GENERATION", "PA-PRESENCE-INTEGRATION",
] as const);

export const EXPECTED_PPT_IDS = Object.freeze(Array.from({ length: 63 }, (_, index) => `PPT-${String(index + 1).padStart(3, "0")}`));

export interface ValidationProvenance {
  readonly result: "PASS" | "FAIL" | "NOT_ASSESSABLE";
  readonly ppt: { readonly expected: readonly string[]; readonly passed: readonly string[] };
  readonly acceptanceFamilies: readonly string[];
  readonly commands: readonly { readonly command: string; readonly exitCode: number }[];
}

function validateProvenance(validation: ValidationProvenance | undefined): ValidationProvenance {
  if (!validation) throw new TypeError("validation provenance is required");
  if (validation.result !== "PASS") throw new TypeError("validation provenance must pass before evidence can claim coverage");
  if (validation.ppt.expected.length !== EXPECTED_PPT_IDS.length || validation.ppt.expected.some((id, index) => id !== EXPECTED_PPT_IDS[index])) throw new TypeError("validation provenance must bind exact PPT IDs");
  if (validation.ppt.passed.length !== EXPECTED_PPT_IDS.length || validation.ppt.passed.some((id, index) => id !== EXPECTED_PPT_IDS[index])) throw new TypeError("validation provenance must prove all PPT IDs passed");
  if (validation.acceptanceFamilies.length !== ACCEPTANCE_FAMILIES.length || validation.acceptanceFamilies.some((family) => !(ACCEPTANCE_FAMILIES as readonly string[]).includes(family))) throw new TypeError("validation provenance must bind all acceptance families");
  if (validation.commands.length === 0 || validation.commands.some((command) => command.exitCode !== 0)) throw new TypeError("validation provenance commands must pass");
  return validation;
}

const FAMILY_TESTS: Readonly<Record<typeof ACCEPTANCE_FAMILIES[number], readonly [string, string, string]>> = {
  "PA-PRESENCE-SCOPE": ["PPT-001", "PPT-001 schema validation", "Presence schema is package-local, owner-bound, inactive, and non-authorizing"],
  "PA-PRESENCE-DEPENDENCY": ["PPT-004", "PPT-004 dependency allowlist", "Only accepted product foundation dependencies are allowed"],
  "PA-PRESENCE-LIFECYCLE": ["PPT-010", "PPT-010 baseline lifecycle flow", "The closed baseline lifecycle projects deterministically"],
  "PA-PRESENCE-ONYX": ["PPT-030", "PPT-030 ONYX role", "Conversation Director is ONYX_ONLY"],
  "PA-PRESENCE-INPUT": ["PPT-038", "PPT-038 text input baseline", "Text input is required and voice remains synthetic-contract-only"],
  "PA-PRESENCE-CONTEXT": ["PPT-020", "PPT-020 bounded Context Envelope", "Context is bounded, current, owner-private, and candidate-bound"],
  "PA-PRESENCE-EVIDENCE": ["PPT-023", "PPT-023 evidence current path", "Only current candidate-bound verified evidence is consumed"],
  "PA-PRESENCE-MEMORY": ["PPT-026", "PPT-026 one-memory maximum", "At most one M4 fixture is projected without persistence"],
  "PA-PRESENCE-TOOL": ["PPT-028", "PPT-028 read-only tool success", "ProjectStatusTool is local, read-only, and non-authorizing"],
  "PA-PRESENCE-PRESENTATION": ["PPT-040", "PPT-040 ONYX presentation fixture", "Presentation layers are synthetic and semantic"],
  "PA-PRESENCE-AVATAR": ["PPT-044", "PPT-044 canonical identity desktop/TV", "Desktop and TV preserve canonical ONYX identity"],
  "PA-PRESENCE-AMBIENT": ["PPT-050", "PPT-050 ambient world presentation-only", "Ambient world cannot affect operational truth"],
  "PA-PRESENCE-DESKTOP": ["PPT-042", "PPT-042 desktop projection", "Desktop supplies required private accessible controls"],
  "PA-PRESENCE-TV": ["PPT-043", "PPT-043 TV first-class inactive projection", "TV is first-class, inactive, readable, and not mirrored"],
  "PA-PRESENCE-PRIVACY": ["PPT-045", "PPT-045 shared-room privacy", "Unknown privacy restricts and shared rooms redact"],
  "PA-PRESENCE-ACCESSIBILITY": ["PPT-048", "PPT-048 high contrast/text fallback", "Accessible variants preserve semantic meaning"],
  "PA-PRESENCE-INTERRUPTION": ["PPT-014", "PPT-014 interruption", "Interruption suppresses subsequent presentation"],
  "PA-PRESENCE-RECOVERY": ["PPT-055", "PPT-055 recovery projections", "All required failures have closed safe projections"],
  "PA-PRESENCE-FLAG": ["PPT-052", "PPT-052 Presence flag OFF", "The proposed Presence runtime flag remains OFF"],
  "PA-PRESENCE-ROLLBACK": ["PPT-054", "PPT-054 rollback projection", "Composition is removable without migration or compensation"],
  "PA-PRESENCE-NONAUTHORITY": ["PPT-035", "PPT-035 no model/tool authorization", "Presence, model, memory, tool, avatar, and device convey no authority"],
  "PA-PRESENCE-EVIDENCE-GENERATION": ["PPT-056", "PPT-056 evidence deterministic generation", "Evidence generation is deterministic for fixed inputs"],
  "PA-PRESENCE-INTEGRATION": ["PPT-063", "PPT-063 no runtime activation, Git action, PA-PRESENCE external composition, or paid provider", "Local integration eligibility creates no external or runtime effect"],
};

export function createAcceptanceRegistry(sourceFingerprint: string, testFingerprint: string, validation?: ValidationProvenance) {
  const proven = validateProvenance(validation);
  return deepFreeze(ACCEPTANCE_FAMILIES.map((family) => {
    const [testId, testName, invariant] = FAMILY_TESTS[family];
    return { family, invariant, sourceSymbol: family === "PA-PRESENCE-INTEGRATION" ? "PROHIBITED_EFFECTS" : "package public contract", testId, testName, expectedResult: "PASS", observedResult: "PASS", validationResult: proven.result, evidenceArtifact: "acceptance-reconciliation.json", sourceFingerprint, testFingerprint, freshness: "CURRENT" as const, coverageStatus: "COVERED" as const, limitation: null };
  }));
}

export const PREDECESSOR_FLAGS = deepFreeze({ owner_override_runtime: "OFF", conversation_director: "OFF", context_envelope_builder: "OFF", evidence_resolver: "OFF", conflict_engine: "OFF", memory_runtime: "OFF", model_gateway_v2: "OFF", nova_runtime: "OFF", avatar_runtime: "OFF", tv_presence_runtime: "OFF", ambient_world_engine: "OFF", threejs_adapter: "OFF", renderer_adapter_v2: "OFF", operations_center_runtime: "OFF" } as const);

export const ROLLBACK_PROJECTION = deepFreeze({ runtimeFlag: "OFF" as const, compositionRemovable: true as const, persistentDataMigration: false as const, credentialsToRevoke: false as const, runtimeSessionToTerminate: false as const, externalEffectToCompensate: false as const, evidenceRetained: true as const, foundationsUnchanged: true as const, onyxIdentityUnchanged: true as const });

export const RECOVERY_PROJECTIONS = deepFreeze({ modelUnavailable: "SAFE_TEXT", toolUnavailable: "NOT_ASSESSABLE", memoryUnavailable: "EXCLUDE_AND_CONTINUE", rendererUnavailable: "SAFE_TEXT", tvUnavailable: "SAFE_TEXT", audioUnavailable: "TEXT_ONLY", evidenceUnavailable: "NOT_ASSESSABLE", privacyUnavailable: "PRIVACY_RESTRICTED" } as const);

export const FOUNDATION_BINDINGS = deepFreeze({ governance: "CONTRACT_SAFE" as const, intelligence: "CONTRACT_SAFE" as const, avatar: "CONTRACT_SAFE" as const, assurance: "EXTERNAL_VERIFIER_ONLY" as const });
export const VALIDATION_COMMANDS = Object.freeze(["pnpm --filter @onyx/post-alpha-onyx-presence-thin-slice test", "pnpm --filter @onyx/post-alpha-onyx-presence-thin-slice typecheck", "pnpm --filter @onyx/post-alpha-* test", "pnpm --filter @onyx/post-alpha-* typecheck", "pnpm typecheck", "pnpm --filter @onyx/ai-development-factory-foundation test", "pnpm --filter @onyx/ai-development-factory-foundation typecheck"] as const);
export const POST_ALPHA_VALIDATION_PROFILE = deepFreeze({ packageTests: "ALL_POST_ALPHA" as const, packageTypechecks: "ALL_POST_ALPHA" as const, expectedPredecessorTests: 42, expectedPresenceTests: 63, expectedFactoryTests: 303 });
export const PROHIBITED_EFFECTS = deepFreeze({ runtimeActivation: false as const, gitAction: false as const, externalComposition: false as const, paidProvider: false as const, networkAccess: false as const, externalMutation: false as const, persistence: false as const, liveVoice: false as const, tvRuntime: false as const });

const PACKAGE_PREFIX = "onyx-v6-modular-ai-os/packages/post-alpha-onyx-presence-thin-slice/";
export function validatePackagePaths(paths: readonly string[]): true {
  if (paths.some((path) => !path.startsWith(PACKAGE_PREFIX))) throw new TypeError("Path escapes the PA-PRESENCE package allowlist");
  return true;
}

export function createEvidenceBundle(input: { readonly sourceFingerprint: string; readonly testFingerprint: string; readonly generatedAt: string; readonly validation?: ValidationProvenance }) {
  const validation = validateProvenance(input.validation);
  const artifacts = ["pa-presence-01.json", "acceptance-reconciliation.json", "lifecycle-report.json", "presentation-compatibility.json", "privacy-accessibility-report.json", "feature-flag-report.json", "rollback-report.json", "drift-report.json", "owner-briefing.json"];
  return deepFreeze({
    validation,
    acceptance: createAcceptanceRegistry(input.sourceFingerprint, input.testFingerprint, validation),
    manifest: { schemaVersion: "PA_PRESENCE_EVIDENCE_MANIFEST_V1" as const, workstream: "PA-PRESENCE-01" as const, generatedAt: input.generatedAt, artifacts, hashing: "SHA256_NONRECURSIVE" as const, runtimeActivation: false as const, gitClosure: false as const, externalMutation: false as const },
  });
}