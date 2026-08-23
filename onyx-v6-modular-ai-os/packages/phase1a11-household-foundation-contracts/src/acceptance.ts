export type AcceptanceStatus =
  | "proposed"
  | "contract-defined"
  | "fixture-defined"
  | "validator-defined"
  | "focused-tested"
  | "integration-tested"
  | "accepted"
  | "deferred"
  | "blocked";

export interface AcceptanceEntry {
  id: string;
  title: string;
  requirement: string;
  technicalRequirement: string;
  riskCategory: string;
  applicableContract: string;
  positiveTestReference: string;
  negativeTestReference: string;
  evidenceRequirement: string;
  implementationWave: string;
  status: AcceptanceStatus;
  sourceDecision: string;
  rollbackRelevance: string;
}

export function ensureUniqueAcceptanceIds(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

export function buildAcceptanceRegistry(): AcceptanceEntry[] {
  const ids = [] as string[];
  const entries: AcceptanceEntry[] = [];
  const base = [
    "GOV-001","GOV-002","GOV-003","GOV-004",
    "SESSION-001","SESSION-002","SESSION-003","SESSION-004","SESSION-005","SESSION-006",
    "PRIV-001","PRIV-002","PRIV-003","PRIV-004","PRIV-005",
    "CHAR-001","CHAR-002","CHAR-003","CHAR-004",
    "COUNCIL-001","COUNCIL-002","COUNCIL-003","COUNCIL-004","COUNCIL-005",
    "HIST-001","HIST-002","HIST-003","HIST-004","HIST-005","HIST-006","HIST-007","HIST-008","HIST-009","HIST-010","HIST-011","HIST-012","HIST-013","HIST-014","HIST-015","HIST-016",
    "BG-001","BG-002","BG-003","BG-004","BG-005","BG-006",
    "UX-001","UX-002","UX-003","UX-004","UX-005","UX-006","UX-007","UX-008",
    "TECH-001","TECH-002","TECH-003","TECH-004","TECH-005","TECH-006","TECH-007","TECH-008",
    "A11Y-001","A11Y-002","A11Y-003","A11Y-004","A11Y-005","A11Y-006","A11Y-007","A11Y-008",
    "DOC-001","DOC-002","DOC-003","DOC-004","DOC-005","DOC-006","DOC-007","DOC-008"
  ];

  for (const id of base) {
    ids.push(id);
    entries.push({
      id,
      title: `${id} contract requirement`,
      requirement: "Freeze the contract boundary for the related household identity or governance requirement.",
      technicalRequirement: "Model the contract explicitly with validation and evidence rules.",
      riskCategory: "governance",
      applicableContract: "household-foundation",
      positiveTestReference: "contract fixture covers the permissive path",
      negativeTestReference: "contract fixture covers the deny path",
      evidenceRequirement: "Evidence is stored as contract-only documentation and validation input.",
      implementationWave: "Wave A",
      status: "contract-defined",
      sourceDecision: "Phase 1A.11 household identity, privacy, and owner history freeze",
      rollbackRelevance: "Preserves the non-runtime contract baseline for future implementation.",
    });
  }

  return entries;
}
