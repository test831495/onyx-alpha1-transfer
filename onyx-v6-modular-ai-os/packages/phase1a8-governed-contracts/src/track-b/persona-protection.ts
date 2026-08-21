import { PERSONA_PROTECTION_CONTRACT_VERSION } from "../shared/versions";
export const PERSONA_IDS = ["ONYX", "NOVA"] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];
export const COUNCIL_PRESENCE_MODE = "ONYX_NOVA_COUNCIL" as const;
export interface PersonaMetadata { personaId: PersonaId; baselineVersion: string; contractVersion: string; immutable: true; }
export function readPersonaMetadata(personaId: unknown): PersonaMetadata { if (!PERSONA_IDS.includes(personaId as PersonaId)) throw new Error("Unknown persona identifier."); return { personaId: personaId as PersonaId, baselineVersion: "1.0.0", contractVersion: PERSONA_PROTECTION_CONTRACT_VERSION, immutable: true }; }
export function assertNoPersonaWriteTarget(targetTier: string): void { if (targetTier === "P0") throw new Error("P0 has no generic writer path."); }
export function assertPersonaBoundary(operation: string, targetTier: string): void { assertNoPersonaWriteTarget(targetTier); if (["CORRECTION", "SUPERSESSION", "DELETION", "PROMOTION", "LEDGER_APPEND", "SELF_MODIFICATION"].includes(operation) && targetTier === "P0") throw new Error("Operation cannot mutate P0."); }
export function assertCouncilKeepsPersonasDistinct(personaIds: readonly string[]): void { if (new Set(personaIds).size !== personaIds.length || personaIds.length !== 2 || !personaIds.includes("ONYX") || !personaIds.includes("NOVA")) throw new Error("Council presence must keep ONYX and NOVA distinct."); }
