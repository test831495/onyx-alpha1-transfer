import { createHash } from "node:crypto";

export type RiskTier = "LOW" | "MEDIUM" | "HIGH";
export type ContractDescriptor = Readonly<Record<string, string | readonly string[]>>;
export interface ContractInventoryEntry {
  readonly name: string;
  readonly schemaVersion: "VP_CONTRACT_V1";
  readonly ownerPackage: "@onyx/post-alpha-visible-presence-contracts";
  readonly producerLanes: readonly string[];
  readonly consumerLanes: readonly string[];
  readonly predecessorDependencies: readonly string[];
  readonly riskTier: RiskTier;
  readonly descriptor: ContractDescriptor;
  readonly compatibilityPolicy: "ADDITIVE_ONLY";
  readonly reopeningTrigger: string;
  readonly acceptanceIds: readonly string[];
}

export interface VisiblePresenceRenderModel { readonly schemaVersion: "VP_CONTRACT_V1"; readonly characterBinding: string; readonly deviceBinding: string; }
export interface CharacterStageInput { readonly schemaVersion: "VP_CONTRACT_V1"; readonly characterBinding: string; }
export interface CharacterStageProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly characterBinding: string; }
export interface SemanticPresentationState { readonly schemaVersion: "VP_CONTRACT_V1"; readonly state: string; }
export interface SemanticTransitionIntent { readonly schemaVersion: "VP_CONTRACT_V1"; readonly transition: string; }
export interface DevicePresentationProfile { readonly schemaVersion: "VP_CONTRACT_V1"; readonly deviceBinding: string; }
export interface DesktopPresentationProfile extends DevicePresentationProfile { readonly density: "STANDARD" | "COMPACT"; }
export interface TvPresentationProfile extends DevicePresentationProfile { readonly aspectRatio: "16:9"; }
export interface AccessibilityPresentationProfile { readonly schemaVersion: "VP_CONTRACT_V1"; readonly reducedMotion: boolean; readonly highContrast: boolean; readonly captions: boolean; }
export interface PrivacyPresentationProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly privacyState: "PRIVATE_ALLOWED" | "SHARED_ROOM_RESTRICTED" | "PRIVACY_UNKNOWN" | "PRIVACY_MALFORMED" | "PRIVACY_STALE" | "PRIVACY_CONFLICTING"; }
export interface GovernancePresentationProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly nonAuthorizing: true; }
export interface IntelligencePresentationProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly nonAuthorizing: true; }
export interface PresenceCompositionInput { readonly schemaVersion: "VP_CONTRACT_V1"; readonly characterBinding: string; readonly deviceBinding: string; }
export interface PresenceCompositionOutput { readonly schemaVersion: "VP_CONTRACT_V1"; readonly safeFallback: boolean; }
export interface WorldPresentationIntent { readonly schemaVersion: "VP_CONTRACT_V1"; readonly worldId: string; }
export interface WorldRegistryCandidate { readonly schemaVersion: "VP_CONTRACT_V1"; readonly worldId: string; }
export interface WorldSceneProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly worldId: string; }
export interface AmbientAudioIntent { readonly schemaVersion: "VP_CONTRACT_V1"; readonly audioId: string; }
export interface AmbientAudioProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly audioId: string; }
export interface TransitionOrchestrationPlan { readonly schemaVersion: "VP_CONTRACT_V1"; readonly transition: string; }
export interface PerformanceBudgetProfile { readonly schemaVersion: "VP_CONTRACT_V1"; readonly budgetClass: string; }
export interface PerformanceDegradationDecision { readonly schemaVersion: "VP_CONTRACT_V1"; readonly safeFallback: boolean; }
export interface SafeFallbackProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly mode: "LOW_POWER" | "TEXT_ONLY"; }
export interface RendererCapabilityProfile { readonly schemaVersion: "VP_CONTRACT_V1"; readonly available: boolean; }
export interface RendererAdapterContract { readonly schemaVersion: "VP_CONTRACT_V1"; readonly adapterId: string; }
export interface WorldRendererAdapterContract { readonly schemaVersion: "VP_CONTRACT_V1"; readonly adapterId: string; }
export interface AudioRendererAdapterContract { readonly schemaVersion: "VP_CONTRACT_V1"; readonly adapterId: string; }
export interface FocusNavigationProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly focusModel: "KEYBOARD" | "REMOTE"; }
export interface CaptionPresentationProjection { readonly schemaVersion: "VP_CONTRACT_V1"; readonly captionsEnabled: boolean; }
export interface VisualEvidenceDescriptor { readonly schemaVersion: "VP_CONTRACT_V1"; readonly descriptorId: string; }
export interface IntegratedExperienceFixture { readonly schemaVersion: "VP_CONTRACT_V1"; readonly fixtureId: string; }
export interface TrainEvidenceEnvelope { readonly schemaVersion: "VP_CONTRACT_V1"; readonly evidenceId: string; readonly nonAuthorizing: true; }
export interface LaneContractFingerprint { readonly schemaVersion: "VP_CONTRACT_V1"; readonly fingerprint: string; }
export interface LaneIntegrationManifest { readonly schemaVersion: "VP_CONTRACT_V1"; readonly laneId: string; }
export interface DriftFinding { readonly schemaVersion: "VP_CONTRACT_V1"; readonly category: string; readonly outcome: string; }

export const CANONICAL_CONTRACT_NAMES = [
  "AccessibilityPresentationProfile", "AmbientAudioIntent", "AmbientAudioProjection", "AudioRendererAdapterContract", "CaptionPresentationProjection", "CharacterStageInput", "CharacterStageProjection", "DesktopPresentationProfile", "DevicePresentationProfile", "DriftFinding", "FocusNavigationProjection", "GovernancePresentationProjection", "IntegratedExperienceFixture", "IntelligencePresentationProjection", "LaneContractFingerprint", "LaneIntegrationManifest", "PerformanceBudgetProfile", "PerformanceDegradationDecision", "PresenceCompositionInput", "PresenceCompositionOutput", "PrivacyPresentationProjection", "RendererAdapterContract", "RendererCapabilityProfile", "SafeFallbackProjection", "SemanticPresentationState", "SemanticTransitionIntent", "TrainEvidenceEnvelope", "TransitionOrchestrationPlan", "TvPresentationProfile", "VisiblePresenceRenderModel", "VisualEvidenceDescriptor", "WorldPresentationIntent", "WorldRegistryCandidate", "WorldRendererAdapterContract", "WorldSceneProjection",
] as const;

export const CONTRACT_INVENTORY: readonly ContractInventoryEntry[] = CANONICAL_CONTRACT_NAMES.map((name) => ({
  name,
  schemaVersion: "VP_CONTRACT_V1",
  ownerPackage: "@onyx/post-alpha-visible-presence-contracts",
  producerLanes: ["VISIBLE-RUNTIME-01"],
  consumerLanes: ["VISIBLE-RUNTIME-01", "VISIBLE-ASSURE-01"],
  predecessorDependencies: [],
  riskTier: name.includes("Privacy") || name.includes("Governance") ? "HIGH" : "MEDIUM",
  descriptor: { contract: name, fields: ["schemaVersion", "nonAuthorizing"] },
  compatibilityPolicy: "ADDITIVE_ONLY",
  reopeningTrigger: "contract schema or invariant changes",
  acceptanceIds: [`VP-CONTRACT-${String(CANONICAL_CONTRACT_NAMES.indexOf(name) + 1).padStart(2, "0")}`],
}));

function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new Error("unsupported hashable descriptor value");
  return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function canonicalContractRecords(entries: readonly ContractInventoryEntry[]): string {
  return [...entries].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0).map(canonical).join("\n");
}

export function compatibilityFingerprint(entries: readonly ContractInventoryEntry[]): string {
  return createHash("sha256").update(canonicalContractRecords(entries), "utf8").digest("hex");
}

export function validateContractInventory(entries: readonly ContractInventoryEntry[]): string[] {
  const names = entries.map((entry) => entry.name);
  const errors: string[] = [];
  if (names.length !== 35) errors.push("contract count must be 35");
  if (new Set(names).size !== names.length) errors.push("contract names must be unique");
  if (JSON.stringify(names) !== JSON.stringify(CANONICAL_CONTRACT_NAMES)) errors.push("contract names must be canonical and complete");
  for (const entry of entries) {
    if (entry.compatibilityPolicy !== "ADDITIVE_ONLY" || !entry.reopeningTrigger || !entry.descriptor) errors.push(`invalid descriptor: ${entry.name}`);
    try { canonical(entry.descriptor); } catch { errors.push(`unhashable descriptor: ${entry.name}`); }
  }
  return errors;
}