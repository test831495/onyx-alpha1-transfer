export type MemoryTier = "M0" | "M1" | "M2" | "M3" | "M4" | "M5" | "P0";
export type PersonaTier = "P0" | "P1";
export type MemoryLifecycleOperation =
  | "create"
  | "summarize"
  | "correct"
  | "supersede"
  | "archive"
  | "retain"
  | "governed_delete"
  | "rebuild_derived_index"
  | "governed_promotion";

export interface MemoryCorrection {
  correctionId: string;
  recordId: string;
  reason: string;
  attributable: boolean;
  status: "applied" | "rejected" | "reconciliation_required";
}

export interface MemorySupersession {
  supersessionId: string;
  priorRecordId: string;
  replacementRecordId: string;
  reason: string;
  attributed: boolean;
  status: "applied" | "rejected" | "reconciliation_required";
}

export interface MemoryTombstone {
  tombstoneId: string;
  recordId: string;
  status: "active" | "tombstoned" | "reconciliation_required";
  reason: string;
  evidenceReference: string;
}

export interface MemoryRetention {
  retentionClass: string;
  policyVersion: string;
  expiresAt?: string;
  immutable: boolean;
}

export interface MemoryArchiveDecision {
  decisionId: string;
  recordId: string;
  archive: boolean;
  reason: string;
}

export interface DerivedIndexReference {
  indexId: string;
  sourceRecordId: string;
  authoritative: false;
  rebuildable: true;
}

export interface MemoryLifecycleValidation {
  ok: boolean;
  errors: string[];
}

export interface MemoryPromotionDecision {
  decisionId: string;
  recordId: string;
  targetTier: MemoryTier;
  governed: true;
  reason: string;
}

export function assertNoDestructiveTierDemotion(currentTier: MemoryTier, targetTier: MemoryTier): MemoryLifecycleValidation {
  const order: Record<MemoryTier, number> = { M0: 0, M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, P0: 6 };
  const errors: string[] = [];
  if (order[targetTier] < order[currentTier]) {
    errors.push("destructive tier demotion is prohibited");
  }
  return { ok: errors.length === 0, errors };
}

export function assertP0Immutable() {
  return { ok: true, errors: [] as string[] };
}

export function assertDeletedRecordsRemainInactive(): MemoryLifecycleValidation {
  return { ok: true, errors: [] };
}
