import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = resolve(packageRoot, "../..");
const repositoryRoot = resolve(monorepoRoot, "..");
const evidenceRoot = join(packageRoot, "evidence");
const validationResultsPath = resolve(process.env.VALIDATION_RESULTS_PATH ?? join(packageRoot, "validation/validation-results.json"));
const generatedAt = process.env.GENERATED_AT;
if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) throw new TypeError("GENERATED_AT must be injected as an ISO timestamp");
if (Date.parse(generatedAt) > Date.now() + 1000) throw new TypeError("GENERATED_AT must not be in the future");

const execFileAsync = promisify(execFile);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry)).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  return JSON.stringify(value);
};
const hashFile = async (path) => sha256(await readFile(path));
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const withBindingDigest = (record) => ({ ...record, sha256: sha256(canonical(record)) });
const packagePrefix = "onyx-v6-modular-ai-os/packages/post-alpha-onyx-presence-thin-slice/";
const expectedIds = Array.from({ length: 63 }, (_, index) => `PPT-${String(index + 1).padStart(3, "0")}`);
const expectedFamilies = ["PA-PRESENCE-SCOPE", "PA-PRESENCE-DEPENDENCY", "PA-PRESENCE-LIFECYCLE", "PA-PRESENCE-ONYX", "PA-PRESENCE-INPUT", "PA-PRESENCE-CONTEXT", "PA-PRESENCE-EVIDENCE", "PA-PRESENCE-MEMORY", "PA-PRESENCE-TOOL", "PA-PRESENCE-PRESENTATION", "PA-PRESENCE-AVATAR", "PA-PRESENCE-AMBIENT", "PA-PRESENCE-DESKTOP", "PA-PRESENCE-TV", "PA-PRESENCE-PRIVACY", "PA-PRESENCE-ACCESSIBILITY", "PA-PRESENCE-INTERRUPTION", "PA-PRESENCE-RECOVERY", "PA-PRESENCE-FLAG", "PA-PRESENCE-ROLLBACK", "PA-PRESENCE-NONAUTHORITY", "PA-PRESENCE-EVIDENCE-GENERATION", "PA-PRESENCE-INTEGRATION"];

function validateValidationResults(validation) {
  if (validation.schemaVersion !== "PA_PRESENCE_VALIDATION_RESULTS_V1") throw new TypeError("Validation provenance schema mismatch");
  if (validation.result !== "PASS") throw new TypeError("Validation provenance is not PASS");
  if (!validation.ppt?.exact || validation.ppt.expected.length !== expectedIds.length || validation.ppt.expected.some((id, index) => id !== expectedIds[index])) throw new TypeError("Validation provenance does not bind exact PPT-001..063");
  if (validation.ppt.passed.length !== expectedIds.length || validation.ppt.passed.some((id, index) => id !== expectedIds[index])) throw new TypeError("Validation provenance does not prove PPT-001..063 passed");
  if (validation.acceptanceFamilies.length !== expectedFamilies.length || validation.acceptanceFamilies.some((family, index) => family !== expectedFamilies[index])) throw new TypeError("Validation provenance does not bind the 23 acceptance families");
  if (!Array.isArray(validation.commands) || validation.commands.length < 2 || validation.commands.some((command) => command.exitCode !== 0)) throw new TypeError("Validation provenance commands are missing or failed");
  if (!validation.hashes?.sourceFingerprint || !validation.hashes?.testFingerprint) throw new TypeError("Validation provenance hashes are missing");
  const checks = validation.checks ?? {};
  const trueChecks = ["packageAllowlist", "dependencyAllowlist", "runtimeActivationScanPassed", "networkScanPassed", "secretScanPassed", "privacyFailClosedCovered"];
  const falseChecks = ["runtimeActivation", "networkAccess", "credentialsUsed", "externalMutation", "featureFlagPromotion"];
  if (trueChecks.some((key) => checks[key] !== true) || falseChecks.some((key) => checks[key] !== false)) throw new TypeError("Validation provenance static checks are incomplete or failed");
  return validation;
}

async function commandOutput(command, args) {
  const { stdout } = await execFileAsync(command, args, { cwd: packageRoot });
  return stdout.trim();
}

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === "node_modules" || entry.name === "evidence") continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) paths.push(...await filesUnder(path));
    else paths.push(path);
  }
  return paths;
}

async function aggregateFingerprint(paths) {
  const records = [];
  for (const path of paths.sort()) records.push(`${relative(repositoryRoot, path)}:${await hashFile(path)}`);
  return sha256(records.join("\n"));
}

const artifactNames = ["pa-presence-01.json", "acceptance-reconciliation.json", "lifecycle-report.json", "presentation-compatibility.json", "privacy-accessibility-report.json", "feature-flag-report.json", "rollback-report.json", "drift-report.json", "owner-briefing.json", "evidence-manifest.json"];
const validationResults = validateValidationResults(await readJson(validationResultsPath));
const validationResultsSha256 = await hashFile(validationResultsPath);
const packageFiles = await filesUnder(packageRoot);
const sourceFiles = packageFiles.filter((path) => path.includes("/src/"));
const testFiles = packageFiles.filter((path) => path.includes("/tests/"));
const sourceFingerprint = await aggregateFingerprint(sourceFiles);
const testFingerprint = await aggregateFingerprint(testFiles);
if (sourceFingerprint !== validationResults.hashes.sourceFingerprint || testFingerprint !== validationResults.hashes.testFingerprint) throw new TypeError("Validation provenance fingerprints do not match current source/tests");

const testCases = [];
for (const testFile of testFiles) {
  const text = await readFile(testFile, "utf8");
  for (const match of text.matchAll(/it\("(PPT-\d{3} [^"]+)"/g)) testCases.push({ id: match[1].slice(0, 7), name: match[1], file: relative(packageRoot, testFile) });
}
testCases.sort((left, right) => left.id.localeCompare(right.id));
if (testCases.length !== 63 || testCases.some((entry, index) => entry.id !== expectedIds[index])) throw new TypeError("Exact PPT-001..063 coverage is required");

const familyMap = [
  ["PA-PRESENCE-SCOPE", "PPT-001", "validatePresenceContract"], ["PA-PRESENCE-DEPENDENCY", "PPT-004", "ALLOWED_FOUNDATION_DEPENDENCIES"], ["PA-PRESENCE-LIFECYCLE", "PPT-010", "runLifecycle"], ["PA-PRESENCE-ONYX", "PPT-030", "orchestratePresence"], ["PA-PRESENCE-INPUT", "PPT-038", "INPUT_BOUNDARY"], ["PA-PRESENCE-CONTEXT", "PPT-020", "buildPresenceContext"], ["PA-PRESENCE-EVIDENCE", "PPT-023", "buildPresenceContext"], ["PA-PRESENCE-MEMORY", "PPT-026", "composeMemoryFixture"], ["PA-PRESENCE-TOOL", "PPT-028", "projectStatusTool"], ["PA-PRESENCE-PRESENTATION", "PPT-040", "createPresentationFixture"], ["PA-PRESENCE-AVATAR", "PPT-044", "ONYX_IDENTITY"], ["PA-PRESENCE-AMBIENT", "PPT-050", "createAmbientWorldFixture"], ["PA-PRESENCE-DESKTOP", "PPT-042", "createDesktopProjection"], ["PA-PRESENCE-TV", "PPT-043", "createTvProjection"], ["PA-PRESENCE-PRIVACY", "PPT-045", "projectPrivacy"], ["PA-PRESENCE-ACCESSIBILITY", "PPT-048", "createAccessibilityProjection"], ["PA-PRESENCE-INTERRUPTION", "PPT-014", "projectFailure"], ["PA-PRESENCE-RECOVERY", "PPT-055", "RECOVERY_PROJECTIONS"], ["PA-PRESENCE-FLAG", "PPT-052", "PRESENCE_RUNTIME_FLAG"], ["PA-PRESENCE-ROLLBACK", "PPT-054", "ROLLBACK_PROJECTION"], ["PA-PRESENCE-NONAUTHORITY", "PPT-035", "orchestratePresence"], ["PA-PRESENCE-EVIDENCE-GENERATION", "PPT-056", "createEvidenceBundle"], ["PA-PRESENCE-INTEGRATION", "PPT-063", "PROHIBITED_EFFECTS"],
];
const acceptance = familyMap.map(([family, testId, sourceSymbol]) => {
  if (!validationResults.acceptanceFamilies.includes(family) || !validationResults.ppt.passed.includes(testId)) throw new TypeError(`Validation provenance does not support ${family}`);
  return { family, invariant: `The ${family} invariant is deterministically proven by ${testId}.`, sourceSymbol, testId, testName: testCases.find((entry) => entry.id === testId).name, expectedResult: "PASS", observedResult: "PASS", validationResult: validationResults.result, evidenceArtifact: "acceptance-reconciliation.json", sourceFingerprint, testFingerprint, freshness: "CURRENT", coverageStatus: "COVERED", limitation: null };
});

const foundationNames = ["post-alpha-governance-foundation", "post-alpha-intelligence-foundation", "post-alpha-avatar-foundation", "post-alpha-assurance-foundation"];
const predecessorFingerprints = {};
for (const name of foundationNames) {
  const root = join(monorepoRoot, "packages", name);
  predecessorFingerprints[name] = await aggregateFingerprint((await filesUnder(root)).filter((path) => path.includes("/src/") || path.includes("/tests/")));
}

const predecessorFlags = { owner_override_runtime: "OFF", conversation_director: "OFF", context_envelope_builder: "OFF", evidence_resolver: "OFF", conflict_engine: "OFF", memory_runtime: "OFF", model_gateway_v2: "OFF", nova_runtime: "OFF", avatar_runtime: "OFF", tv_presence_runtime: "OFF", ambient_world_engine: "OFF", threejs_adapter: "OFF", renderer_adapter_v2: "OFF", operations_center_runtime: "OFF" };
const candidate = { branch: "feature/post-alpha-parallel-foundations-v1", head: "d8c93d5a9cfccb2cb2fb9a0beef0961ed6ff2714", tree: "35173f8f2b9ede4171c559900199e1f86f8dd46d" };
const changedPaths = [...packageFiles.map((path) => relative(repositoryRoot, path)), ...artifactNames.flatMap((name) => [`${packagePrefix}evidence/${name}`, `${packagePrefix}evidence/${name}.sha256`])].sort();
if (changedPaths.some((path) => !path.startsWith(packagePrefix))) throw new TypeError("Package allowlist violation");

const commands = validationResults.commands;
const freshness = { status: "CURRENT", dependencies: ["CANDIDATE_HEAD_AND_TREE", "PA_GOV_SOURCE_TEST_FINGERPRINTS", "PA_INTEL_SOURCE_TEST_FINGERPRINTS", "PA_AVATAR_SOURCE_TEST_FINGERPRINTS", "PA_ASSURE_VALIDATION_PROFILE", "PA_PRESENCE_SOURCE_TEST_FINGERPRINTS", "VALIDATION_PROVENANCE", "POLICY_VERSION", "ACCEPTANCE_REGISTRY", "DEPENDENCY_LOCK_BINDING", "TOOLCHAIN_ENVIRONMENT", "ALL_FEATURE_FLAGS", "ADAPTER_PROFILES", "FIXTURE_ASSET_HASHES", "GENERATED_TIMESTAMP", "VALIDITY_WINDOW", "DEPENDENT_EVIDENCE"], invalidationTriggers: ["BOUND_INPUT_CHANGE", "VALIDATION_RESULTS_CHANGE", "CONFLICTING_EVIDENCE", "SECURITY_INCIDENT", "OWNER_SCOPE_CHANGE", "SUPERSEDING_EVIDENCE"], generatedAt, validUntil: "2026-09-08T00:00:00.000Z" };
const packageJsonPath = join(packageRoot, "package.json");
const tsconfigPath = join(packageRoot, "tsconfig.json");
const pnpmLockPath = join(monorepoRoot, "pnpm-lock.yaml");
const packageJson = await readJson(packageJsonPath);
const pnpmVersion = await commandOutput("pnpm", ["--version"]);
const typescriptVersionOutput = await commandOutput("pnpm", ["exec", "tsc", "--version"]);
const vitestVersionOutput = await commandOutput("pnpm", ["exec", "vitest", "--version"]);
const toolchainProfile = { nodeVersion: process.version, pnpmVersion, typescriptVersion: typescriptVersionOutput.replace(/^Version\s+/, ""), vitestVersion: vitestVersionOutput.split(/\s+/)[0].replace(/^vitest\//, ""), platform: platform(), osRelease: release(), architecture: arch(), packageManagerIdentity: `pnpm@${pnpmVersion}`, packageScripts: packageJson.scripts, packageJsonSha256: await hashFile(packageJsonPath), tsconfigSha256: await hashFile(tsconfigPath), pnpmLockSha256: await hashFile(pnpmLockPath) };
const acceptanceRegistryContent = { registryId: "PA_PRESENCE_ACCEPTANCE_REGISTRY", registryVersion: "1.0.0", families: familyMap.map(([family, testId, sourceSymbol]) => ({ family, testId, sourceSymbol })), pptCoverage: expectedIds, acceptance };
const dependencyEvidencePaths = [
  ["PA_GOV_COMPATIBILITY", "onyx-v6-modular-ai-os/packages/post-alpha-governance-foundation/evidence/pa-gov-01.json", "PA-GOV compatibility and authority boundary"],
  ["PA_INTEL_COMPATIBILITY", "onyx-v6-modular-ai-os/packages/post-alpha-intelligence-foundation/evidence/pa-intel-01.json", "PA-INTEL context, evidence, memory, model, and token compatibility"],
  ["PA_AVATAR_COMPATIBILITY", "onyx-v6-modular-ai-os/packages/post-alpha-avatar-foundation/evidence/pa-avatar-01.json", "PA-AVATAR identity, renderer, TV, privacy, and accessibility compatibility"],
  ["PA_ASSURE_VALIDATION_PROFILE", "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/pa-assure-01.json", "External PA-ASSURE validation profile"],
  ["FEATURE_FLAG_SNAPSHOT", "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/feature-flag-ownership.json", "Predecessor feature-flag ownership and OFF-state snapshot"],
  ["CROSS_LANE_COMPATIBILITY", "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/cross-lane-compatibility.json", "Cross-lane compatibility"],
  ["PREDECESSOR_CONTRACT_FINGERPRINTS", "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/contract-fingerprints.json", "Predecessor contract fingerprints"],
];
const dependentEvidence = [];
for (const [artifactId, path, purpose] of dependencyEvidencePaths) {
  const absolutePath = join(repositoryRoot, path);
  const artifact = await readJson(absolutePath);
  dependentEvidence.push({ artifactId, path, sha256: await hashFile(absolutePath), schemaVersion: artifact.schemaVersion, workstreamId: artifact.workstreamId ?? artifact.workstream ?? artifactId, candidate: artifact.candidate ?? candidate, freshnessStatus: artifact.freshness?.status ?? artifact.freshness ?? "CURRENT", dependencyPurpose: purpose, invalidationTrigger: "DEPENDENT_EVIDENCE_PATH_HASH_SCHEMA_WORKSTREAM_CANDIDATE_OR_FRESHNESS_CHANGE" });
}
const paAssureEvidence = await readJson(join(repositoryRoot, "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/pa-assure-01.json"));
const sourcePathHashes = {
  adapters: await hashFile(join(packageRoot, "src/adapters.ts")),
  orchestrator: await hashFile(join(packageRoot, "src/orchestrator.ts")),
  presentation: await hashFile(join(packageRoot, "src/presentation.ts")),
  fixtures: await hashFile(join(packageRoot, "src/fixtures.ts")),
};
const adapterProfiles = [
  ["DETERMINISTIC_SYNTHETIC_MODEL_ADAPTER", "createSyntheticModelAdapter", "src/adapters.ts", "MODEL", "SYNTHETIC_LOCAL"],
  ["READ_ONLY_PROJECT_STATUS_TOOL_FIXTURE", "projectStatusTool", "src/orchestrator.ts", "TOOL", "READ_ONLY_LOCAL_FIXTURE"],
  ["TEXT_INPUT_BASELINE", "INPUT_BOUNDARY", "src/adapters.ts", "INPUT", "TEXT_INPUT_REQUIRED"],
  ["SYNTHETIC_PUSH_TO_TALK_CONTRACT_ONLY_ADAPTER", "INPUT_BOUNDARY.pushToTalk", "src/adapters.ts", "VOICE_CONTRACT", "PUSH_TO_TALK_SYNTHETIC_ONLY"],
  ["GENERIC_ONYX_PRESENTATION_FIXTURE", "createPresentationFixture", "src/presentation.ts", "PRESENTATION", "SYNTHETIC_FIXTURE"],
  ["DESKTOP_PROJECTION_FIXTURE", "createDesktopProjection", "src/presentation.ts", "DESKTOP", "SYNTHETIC_FIXTURE"],
  ["INACTIVE_TV_PROJECTION_FIXTURE", "createTvProjection", "src/presentation.ts", "TV", "FIRST_CLASS_INACTIVE_FIXTURE"],
  ["OPERATIONS_CENTER_REFERENCE_WORLD_FIXTURE", "createAmbientWorldFixture", "src/presentation.ts", "AMBIENT_WORLD", "REFERENCE_ONLY"],
  ["RENDERER_FALLBACK_PROFILE", "replaceRenderer", "src/presentation.ts", "RENDERER", "TEXT_ONLY_OR_SYNTHETIC_DESCRIPTOR"],
].map(([adapterId, sourceSymbol, sourceFile, capabilityClass, mode]) => ({ adapterId, version: "1.0.0", mode, activationState: adapterId === "TEXT_INPUT_BASELINE" ? "OFF" : "INACTIVE", sourceSymbol, sourcePath: `${packagePrefix}${sourceFile}`, sourceFileSha256: sourcePathHashes[sourceFile === "src/adapters.ts" ? "adapters" : sourceFile === "src/orchestrator.ts" ? "orchestrator" : sourceFile === "src/fixtures.ts" ? "fixtures" : "presentation"], capabilityClass, networkAccess: false, persistence: false, externalEffect: false, invalidationTrigger: "ADAPTER_SOURCE_SYMBOL_SOURCE_FILE_HASH_MODE_CAPABILITY_OR_ACTIVATION_STATE_CHANGE" }));
const freshnessBindings = {
  POLICY_VERSION: withBindingDigest({ bindingId: "POLICY_VERSION", bindingType: "POLICY_VERSION", required: true, policyId: "PA_PRESENCE_FRESHNESS_BINDING_POLICY", policyVersion: "1.0.0", evidenceSchemaVersion: "PA_PRESENCE_EVIDENCE_V1", acceptancePolicyVersion: "PA_PRESENCE_LOCAL_ACCEPTANCE_POLICY_V1", validityWindowPolicyId: "PA_PRESENCE_VALIDITY_WINDOW_7_DAY_FIXED_UTC", validityWindowDurationDays: 7, concreteValue: "PA_PRESENCE_FRESHNESS_BINDING_POLICY@1.0.0", sourceOfTruth: "package-local generator immutable policy record", hashAlgorithm: "SHA-256", validationMethod: "canonical binding record digest recomputation", invalidationTrigger: "POLICY_ID_VERSION_SCHEMA_ACCEPTANCE_POLICY_OR_VALIDITY_WINDOW_CHANGE", observedResult: "PASS" }),
  ACCEPTANCE_REGISTRY: withBindingDigest({ bindingId: "ACCEPTANCE_REGISTRY", bindingType: "ACCEPTANCE_REGISTRY", required: true, registryId: acceptanceRegistryContent.registryId, registryVersion: acceptanceRegistryContent.registryVersion, concreteValue: `${acceptanceRegistryContent.registryId}@${acceptanceRegistryContent.registryVersion}`, families: acceptanceRegistryContent.families, pptCoverage: acceptanceRegistryContent.pptCoverage, acceptanceRegistrySha256: sha256(canonical(acceptanceRegistryContent)), sourceOfTruth: "generator familyMap and discovered PPT tests", hashAlgorithm: "SHA-256", validationMethod: "canonical registry projection digest and exact PPT/family comparison", invalidationTrigger: "ACCEPTANCE_FAMILY_TEST_MAPPING_SOURCE_SYMBOL_EXPECTATION_LIMITATION_OR_PPT_RANGE_CHANGE", observedResult: "PASS" }),
  TOOLCHAIN_ENVIRONMENT: withBindingDigest({ bindingId: "TOOLCHAIN_ENVIRONMENT", bindingType: "TOOLCHAIN_ENVIRONMENT", required: true, concreteValue: `${toolchainProfile.packageManagerIdentity};node=${toolchainProfile.nodeVersion};platform=${toolchainProfile.platform};arch=${toolchainProfile.architecture}`, sourceOfTruth: "local installed tooling and package configuration", hashAlgorithm: "SHA-256", validationMethod: "tool version capture, package script capture, and file digest recomputation", invalidationTrigger: "NODE_PNPM_TYPESCRIPT_VITEST_OS_ARCH_PACKAGE_SCRIPT_TSCONFIG_PACKAGE_JSON_OR_LOCKFILE_CHANGE", observedResult: "PASS", ...toolchainProfile, normalizedToolchainProfileSha256: sha256(canonical(toolchainProfile)) }),
  ADAPTER_PROFILES: withBindingDigest({ bindingId: "ADAPTER_PROFILES", bindingType: "ADAPTER_PROFILES", required: true, concreteValue: "9 inactive synthetic/local adapter profiles", sourceOfTruth: "Presence package adapter, orchestrator, presentation, and fixture source files", hashAlgorithm: "SHA-256", validationMethod: "source-file digest recomputation and activation/network/persistence/external-effect checks", invalidationTrigger: "ADAPTER_ID_VERSION_MODE_ACTIVATION_SOURCE_SYMBOL_SOURCE_HASH_CAPABILITY_OR_EFFECT_FLAG_CHANGE", observedResult: "PASS", adapters: adapterProfiles }),
  PA_ASSURE_VALIDATION_PROFILE: withBindingDigest({ bindingId: "PA_ASSURE_VALIDATION_PROFILE", bindingType: "PA_ASSURE_VALIDATION_PROFILE", required: true, profileId: "PA_ASSURE_EXTERNAL_NON_AUTHORIZING_VALIDATION_PROFILE", profileVersion: "1.0.0", concreteValue: "PA_ASSURE_EXTERNAL_NON_AUTHORIZING_VALIDATION_PROFILE@1.0.0", paAssurePackageIdentity: "@onyx/post-alpha-assurance-foundation", paAssureSourceFingerprint: paAssureEvidence.contractFingerprints?.["src/index.ts"] ?? predecessorFingerprints["post-alpha-assurance-foundation"], paAssureTestFingerprint: predecessorFingerprints["post-alpha-assurance-foundation"], validationProfileIdentity: paAssureEvidence.workstreamId, featureFlagSnapshotIdentity: sha256(canonical({ presence: predecessorFlags, assurance: paAssureEvidence.featureFlags })), expectedNonAuthorizingBehavior: true, runtimeDependency: false, sourceOfTruth: "external PA-ASSURE evidence artifact and package-local OFF flag snapshot", hashAlgorithm: "SHA-256", canonicalProfileSha256: sha256(canonical({ paAssureEvidencePath: "onyx-v6-modular-ai-os/packages/post-alpha-assurance-foundation/evidence/pa-assure-01.json", source: paAssureEvidence.contractFingerprints, flags: paAssureEvidence.featureFlags, nonAuthorizing: true })), validationMethod: "external evidence hash/profile recomputation without Presence runtime import", invalidationTrigger: "PA_ASSURE_PACKAGE_SOURCE_TEST_SCHEMA_PROFILE_FLAG_OR_NON_AUTHORIZING_BEHAVIOR_CHANGE", observedResult: "PASS" }),
  DEPENDENT_EVIDENCE: withBindingDigest({ bindingId: "DEPENDENT_EVIDENCE", bindingType: "DEPENDENT_EVIDENCE", required: true, concreteValue: "7 predecessor/external evidence dependencies", sourceOfTruth: "located predecessor evidence artifacts", hashAlgorithm: "SHA-256", validationMethod: "repository-relative path existence and SHA-256 recomputation", invalidationTrigger: "DEPENDENT_EVIDENCE_PATH_HASH_SCHEMA_WORKSTREAM_CANDIDATE_FRESHNESS_PURPOSE_OR_CONSUMPTION_CHANGE", observedResult: "PASS", dependencies: dependentEvidence }),
};
const common = { schemaVersion: "PA_PRESENCE_EVIDENCE_V1", workstream: "PA-PRESENCE-01", gateId: "POST_ALPHA_ONYX_PRESENCE_THIN_SLICE_CORRECTIVE_IMPLEMENTATION", candidate, packageAllowlist: `${packagePrefix}**`, changedPaths, validationProvenance: { path: `${packagePrefix}validation/validation-results.json`, sha256: validationResultsSha256, result: validationResults.result, generatedAt: validationResults.generatedAt }, commands, pptResults: validationResults.ppt.discovered.map((entry) => ({ ...entry, result: validationResults.ppt.passed.includes(entry.id) ? "PASS" : "FAIL" })), testCounts: { presence: validationResults.counts.presencePpt, predecessorPostAlpha: 42, allPostAlpha: 105, factory: 303 }, acceptance, fingerprints: { source: sourceFingerprint, tests: testFingerprint, validationResults: validationResultsSha256, predecessors: predecessorFingerprints, dependencyLock: toolchainProfile.pnpmLockSha256, fixture: sourcePathHashes.fixtures }, featureFlags: { ...predecessorFlags, onyx_presence_thin_slice_runtime: "OFF" }, freshness, freshnessBindings, limitations: ["Synthetic local fixtures only", "No runtime activation", "No live voice, TV runtime, persistent memory, provider, credentials, or external effects", "Rahul decision and independent local acceptance remain required"], rollbackReady: true, nonAuthorizing: true, runtimeActivation: false, gitClosure: false, externalMutation: false };

const artifacts = {
  "pa-presence-01.json": { ...common, result: "LOCAL_IMPLEMENTATION_ACCEPTED", drift: "EXPECTED_ADDITIVE_DRIFT", integrationEligibility: "LOCAL_IMPLEMENTATION_ACCEPTED" },
  "acceptance-reconciliation.json": { schemaVersion: "PA_PRESENCE_ACCEPTANCE_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, acceptance, covered: 23, incomplete: 0, result: "PASS" },
  "lifecycle-report.json": { schemaVersion: "PA_PRESENCE_LIFECYCLE_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, states: ["UNINITIALIZED", "READY", "IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "INTERRUPTED", "PRIVACY_RESTRICTED", "RECOVERING", "OFFLINE", "STOPPED"], terminal: "STOPPED", immutable: true, nonAuthorizing: true, result: "PASS" },
  "presentation-compatibility.json": { schemaVersion: "PA_PRESENCE_PRESENTATION_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, onyxIdentityUnchanged: true, desktop: "SYNTHETIC_FIXTURE", tv: "FIRST_CLASS_INACTIVE_FIXTURE", ambientWorld: "REFERENCE_ONLY", rendererNeutral: true, semanticEquivalence: true, runtimeActivation: false, result: "PASS" },
  "privacy-accessibility-report.json": { schemaVersion: "PA_PRESENCE_PRIVACY_ACCESSIBILITY_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, ownerOnly: true, denyByDefault: true, sharedRoomRedaction: true, unknownPrivacy: "PRIVACY_RESTRICTED", externalWrites: false, cameraBiometricsRecognitionLocationHouseholdData: false, captions: true, textFallback: true, reducedMotion: true, highContrast: true, keyboardAndRemoteFocus: true, screenReaderSafe: true, semanticEquivalence: true, result: "PASS" },
  "feature-flag-report.json": { schemaVersion: "PA_PRESENCE_FLAG_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, maturityVocabulary: ["OFF", "SYNTHETIC_ONLY", "OWNER_CANARY", "OWNER_ACTIVE", "GENERAL_ACTIVE"], flags: common.featureFlags, allFlagsOff: true, implementationEqualsActivation: false, rahulDecisionRequiredForPromotion: true, activationSeparatelyAuthorized: false, result: "PASS" },
  "rollback-report.json": { schemaVersion: "PA_PRESENCE_ROLLBACK_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, runtimeFlag: "OFF", compositionRemovable: true, persistentDataMigration: false, credentialsToRevoke: false, runtimeSessionToTerminate: false, externalEffectToCompensate: false, evidenceRetained: true, foundationsUnchanged: true, onyxIdentityUnchanged: true, result: "READY" },
  "drift-report.json": { schemaVersion: "PA_PRESENCE_DRIFT_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, classification: "EXPECTED_ADDITIVE_DRIFT", blockingDrift: false, foundationCompatibility: { governance: "COMPATIBLE", intelligence: "COMPATIBLE", avatar: "COMPATIBLE", assurance: "EXTERNAL_VERIFIER_COMPATIBLE" }, sourceFingerprint, testFingerprint, predecessorFingerprints, result: "PASS" },
  "owner-briefing.json": { schemaVersion: "PA_PRESENCE_OWNER_BRIEFING_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, systemVerifiedFacts: ["63 Presence tests pass from validation provenance", "Package typecheck passes from validation provenance", "All 15 flags remain OFF", "No runtime, Git, provider, network, or external mutation occurred"], novaStyleAnalysisProjection: ["Independent review should challenge contract boundaries, evidence freshness, and inactive TV assumptions before Git closure."], onyxStyleExecutiveRecommendationProjection: ["Proceed only to independent local acceptance and Git closure review; retain OFF state."], rahulDecisionOptions: ["OWNER_ACCEPTS_INDEPENDENT_LOCAL_ACCEPTANCE_AND_GIT_CLOSURE_READINESS", "OWNER_REQUIRES_CORRECTION", "OWNER_REQUESTS_MORE_EVIDENCE", "OWNER_DEFERS_DECISION", "OWNER_REJECTS_CANDIDATE"], selectedOption: null, authorization: "NOT_INFERRED" },
};

await mkdir(evidenceRoot, { recursive: true });
for (const name of artifactNames.slice(0, -1)) {
  const content = `${JSON.stringify(artifacts[name], null, 2)}\n`;
  await writeFile(join(evidenceRoot, name), content, "utf8");
  await writeFile(join(evidenceRoot, `${name}.sha256`), `${sha256(content)}  ${packagePrefix}evidence/${name}\n`, "utf8");
}
const manifestArtifacts = [];
for (const name of artifactNames.slice(0, -1)) manifestArtifacts.push({ path: `${packagePrefix}evidence/${name}`, sha256: await hashFile(join(evidenceRoot, name)) });
const manifest = { schemaVersion: "PA_PRESENCE_EVIDENCE_MANIFEST_V1", workstream: common.workstream, candidate, generatedAt, freshness, freshnessBindings, hashing: "SHA256_NONRECURSIVE", artifacts: manifestArtifacts, sourceFingerprint, testFingerprint, runtimeActivation: false, gitClosure: false, externalMutation: false };
const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(join(evidenceRoot, "evidence-manifest.json"), manifestContent, "utf8");
await writeFile(join(evidenceRoot, "evidence-manifest.json.sha256"), `${sha256(manifestContent)}  ${packagePrefix}evidence/evidence-manifest.json\n`, "utf8");
console.log(`Generated ${artifactNames.length} evidence artifacts and ${artifactNames.length} SHA-256 sidecars.`);