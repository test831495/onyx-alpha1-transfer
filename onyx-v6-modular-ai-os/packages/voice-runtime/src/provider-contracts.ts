export const ADAPTER_KINDS = ["MODEL", "STT", "TTS", "WAKE_WORD"] as const;
export type AdapterKind = (typeof ADAPTER_KINDS)[number];
export type AdapterHealth = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN";
export type PrivacyClass = "LOCAL_ONLY" | "PRIVATE" | "STANDARD";
export type AdapterCapability = "CHAT" | "TRANSCRIBE" | "SYNTHESIZE" | "DETECT_WAKE_WORD";

export interface AdapterHealthProjection {
  readonly state: AdapterHealth;
  readonly observedAt: string;
  readonly evidenceReference: string;
}

export interface AdapterCostProjection {
  readonly costScore: number;
  readonly budgetCompatible: boolean;
  readonly evidenceReference: string;
}

export interface AdapterEvidence {
  readonly observedAt: string;
  readonly expiresAt: string;
  readonly evidenceReference: string;
}

export interface CostEvidence {
  readonly known: boolean;
  readonly budgetCompatible: boolean;
  readonly evidenceReference: string;
}

export interface CancellationProjection {
  readonly requestId: string;
  readonly cancelled: boolean;
  readonly reason?: string;
}

export interface ProviderAdapter<K extends AdapterKind = AdapterKind> {
  readonly id: string;
  readonly kind: K;
  readonly enabled: false;
  readonly declared?: boolean;
  readonly providerReference: string;
  readonly capabilities: readonly AdapterCapability[];
  readonly health: AdapterHealth;
  readonly quality: number;
  readonly privacy: PrivacyClass;
  readonly reliability: number;
  readonly latencyMs: number;
  readonly costScore: number;
  readonly expiresAt?: string;
  readonly healthEvidence?: AdapterEvidence;
  readonly costEvidence?: CostEvidence;
  readonly region?: "LOCAL" | "BROWSER" | "PRIVATE_REGION";
}

export type ModelAdapter = ProviderAdapter<"MODEL">;
export type STTAdapter = ProviderAdapter<"STT">;
export type TTSAdapter = ProviderAdapter<"TTS">;
export type WakeWordAdapter = ProviderAdapter<"WAKE_WORD">;

export interface AdapterReceipt {
  readonly requestId: string;
  readonly adapterId?: string;
  readonly policyVersion: string;
  readonly trustedTime: string;
  readonly selectionReason: string;
  readonly fallback: boolean;
  readonly nonAuthorizing: true;
}

export interface AdapterRegistry<K extends AdapterKind> {
  readonly kind: K;
  readonly candidates: readonly ProviderAdapter<K>[];
  readonly byId: (id: string) => ProviderAdapter<K> | undefined;
  readonly enabled: () => readonly ProviderAdapter<K>[];
}

export function createAdapterRegistry<K extends AdapterKind>(kind: K, candidates: readonly ProviderAdapter<K>[]): AdapterRegistry<K> {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.kind !== kind) throw new Error("Adapter kind mismatch");
    if (!candidate.id || ids.has(candidate.id)) throw new Error("Duplicate adapter id");
    ids.add(candidate.id);
    if (candidate.expiresAt && !Number.isFinite(new Date(candidate.expiresAt).getTime())) throw new Error("Invalid expiry evidence");
    if (candidate.healthEvidence && (!Number.isFinite(new Date(candidate.healthEvidence.observedAt).getTime()) || !Number.isFinite(new Date(candidate.healthEvidence.expiresAt).getTime()))) throw new Error("Invalid health evidence");
  }
  const frozen = Object.freeze([...candidates].map((candidate) => Object.freeze({ ...candidate, capabilities: Object.freeze([...candidate.capabilities]) })));
  const byId = new Map(frozen.map((candidate) => [candidate.id, candidate]));
  return Object.freeze({
    kind,
    candidates: frozen,
    byId: (id: string) => byId.get(id),
    enabled: () => frozen.filter((candidate) => candidate.enabled),
  });
}

export const createModelRegistry = (candidates: readonly ModelAdapter[]) => createAdapterRegistry("MODEL", candidates);
export const createSTTRegistry = (candidates: readonly STTAdapter[]) => createAdapterRegistry("STT", candidates);
export const createTTSRegistry = (candidates: readonly TTSAdapter[]) => createAdapterRegistry("TTS", candidates);
export const createWakeWordRegistry = (candidates: readonly WakeWordAdapter[]) => createAdapterRegistry("WAKE_WORD", candidates);

export interface ModelRouteRequest {
  readonly requestId: string;
  readonly privacy: PrivacyClass;
  readonly budgetMs: number;
  readonly trustedTime?: string;
  readonly cancellation?: CancellationProjection;
  readonly preferredAdapterId?: string;
  readonly fallback?: boolean;
}

export type ModelRouteResult =
  | Readonly<{ ok: true; value: { readonly adapter: ModelAdapter; readonly receipt: AdapterReceipt } }>
  | Readonly<{ ok: false; error: "TRUSTED_TIME_REQUIRED" | "CANCELLED" | "NO_ELIGIBLE_MODEL_ADAPTER" | "FAILOVER_LIMIT_REACHED"; receipt?: AdapterReceipt }>;

const privacyRank: Readonly<Record<PrivacyClass, number>> = Object.freeze({ LOCAL_ONLY: 3, PRIVATE: 2, STANDARD: 1 });
const validTrustedTime = (trustedTime: string | undefined) => Boolean(trustedTime && Number.isFinite(new Date(trustedTime).getTime()));

export function createDeterministicModelRouter({ policyVersion }: { readonly policyVersion: string }) {
  return Object.freeze({
    route(request: ModelRouteRequest, registry: AdapterRegistry<"MODEL">): ModelRouteResult {
      if (!validTrustedTime(request.trustedTime)) return Object.freeze({ ok: false, error: "TRUSTED_TIME_REQUIRED" });
      if (request.cancellation?.cancelled) return Object.freeze({
        ok: false,
        error: "CANCELLED",
        receipt: Object.freeze({ requestId: request.requestId, policyVersion, trustedTime: request.trustedTime!, selectionReason: "request-cancelled", fallback: false, nonAuthorizing: true }),
      });
      const trustedTime = new Date(request.trustedTime!).getTime();
      const eligible = registry.candidates.filter((candidate) =>
        candidate.declared && candidate.health === "HEALTHY" && candidate.capabilities.includes("CHAT") &&
        privacyRank[candidate.privacy] >= privacyRank[request.privacy] && candidate.latencyMs <= request.budgetMs &&
        (!candidate.expiresAt || new Date(candidate.expiresAt).getTime() > trustedTime) &&
        (!candidate.healthEvidence || new Date(candidate.healthEvidence.expiresAt).getTime() > trustedTime) &&
        (!candidate.costEvidence || (candidate.costEvidence.known && candidate.costEvidence.budgetCompatible)),
      );
      if (eligible.length === 0) return Object.freeze({ ok: false, error: "NO_ELIGIBLE_MODEL_ADAPTER" });
      const ranked = [...eligible].sort((left, right) => {
        const score = (candidate: ModelAdapter) => candidate.quality * 0.4 + candidate.reliability * 0.3 + privacyRank[candidate.privacy] * 0.1 + candidate.costScore * 0.1 - candidate.latencyMs / 10000;
        const preferred = request.preferredAdapterId;
        if (preferred && (left.id === preferred || right.id === preferred)) return left.id === preferred ? -1 : 1;
        return score(right) - score(left) || left.id.localeCompare(right.id);
      });
      const adapter = ranked[0]!;
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          adapter,
          receipt: Object.freeze({ requestId: request.requestId, adapterId: adapter.id, policyVersion, trustedTime: request.trustedTime!, selectionReason: "eligible-ranked-local-baseline", fallback: request.fallback ?? false, nonAuthorizing: true }),
        }),
      });
    },
    failover(receipt: AdapterReceipt, registry: AdapterRegistry<"MODEL">): ModelRouteResult {
      if (receipt.fallback) return Object.freeze({ ok: false, error: "FAILOVER_LIMIT_REACHED" });
      return this.route({ requestId: receipt.requestId, privacy: "LOCAL_ONLY", budgetMs: Number.MAX_SAFE_INTEGER, trustedTime: receipt.trustedTime, fallback: true }, createAdapterRegistry("MODEL", registry.candidates.filter((candidate) => candidate.id !== receipt.adapterId)));
    },
  });
}