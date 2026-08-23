import { MEMORY_CONTRACT_VERSION } from "../shared/versions";

export const MEMORY_TIERS = ["M0", "M1", "M2", "M3", "M4", "M5", "P0"] as const;
export type MemoryTier = (typeof MEMORY_TIERS)[number];

export const SOURCE_TYPES = [
  "USER_AUTHORED", "REPOSITORY", "ADR", "ARCHITECTURE_DOCUMENT", "CONNECTOR_SOURCE",
  "EXTERNAL_DOCUMENT", "WEB_SOURCE", "AGENT_OUTPUT", "GENERATED_SUMMARY", "INFERENCE",
  "RECOMMENDATION", "HYPOTHESIS", "OPERATIONAL_EVENT", "PERSONA_BASELINE",
] as const;
export type MemorySourceType = (typeof SOURCE_TYPES)[number];

export const TRUST_CLASSIFICATIONS = [
  "TRUSTED_USER_INSTRUCTION", "GOVERNED_REPOSITORY", "APPROVED_ARCHITECTURE", "APPROVED_ADR",
  "GOVERNED_DURABLE_MEMORY", "SESSION_MEMORY", "UNTRUSTED_EXTERNAL", "UNTRUSTED_CONNECTOR_CONTENT",
  "UNTRUSTED_AGENT_OUTPUT", "UNTRUSTED_GENERATED_OUTPUT", "QUARANTINED",
] as const;
export type MemoryTrustClassification = (typeof TRUST_CLASSIFICATIONS)[number];

export const M2_SOURCE_AUTHORITY_CLASSES = [
  "USER_CANONICAL_STATEMENT", "CANONICAL_SOURCE_REFERENCE", "GOVERNED_RETAINED_FACT",
  "DERIVED_INFERENCE", "DERIVED_RECOMMENDATION", "DERIVED_HYPOTHESIS", "DERIVED_SUMMARY",
] as const;
export type M2SourceAuthorityClass = (typeof M2_SOURCE_AUTHORITY_CLASSES)[number];

export interface MemoryTierContract {
  memoryTier: MemoryTier;
  description: string;
  durable: boolean;
  authoritative: false;
  approvalAuthority: false;
  executionAuthority: false;
  contractVersion: string;
}

const TIER_DESCRIPTIONS: Record<MemoryTier, string> = {
  M0: "request-scoped, short-lived working context",
  M1: "session and conversation continuity",
  M2: "governed retained user and project memory",
  M3: "indexed references to canonical sources",
  M4: "separate operational ledger",
  M5: "long-term archived source material",
  P0: "immutable canonical persona baseline",
};

export function isMemoryTier(value: unknown): value is MemoryTier {
  return typeof value === "string" && (MEMORY_TIERS as readonly string[]).includes(value);
}

export function assertMemoryTier(value: unknown): asserts value is MemoryTier {
  if (!isMemoryTier(value)) throw new Error("A valid, explicit memory tier is required.");
}

export function createMemoryTierContract(memoryTier: unknown): MemoryTierContract {
  assertMemoryTier(memoryTier);
  return {
    memoryTier,
    description: TIER_DESCRIPTIONS[memoryTier],
    durable: memoryTier === "M2" || memoryTier === "M5" || memoryTier === "P0",
    authoritative: false,
    approvalAuthority: false,
    executionAuthority: false,
    contractVersion: MEMORY_CONTRACT_VERSION,
  };
}
