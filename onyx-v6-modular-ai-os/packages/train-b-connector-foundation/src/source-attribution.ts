import { MAX_ATTRIBUTION_EVIDENCE_REFERENCES, MAX_EVIDENCE_REFERENCE_LENGTH, type SourceAttributionRuntime } from "./model";
import { assertSafeRecord } from "./validators";

export function createSourceAttribution(value: unknown): SourceAttributionRuntime {
	const record = assertSafeRecord(value, ["sourceType", "connectorId", "accountReference", "adapterReference", "providerRecordReference", "observationTimeReference", "freshnessState", "evidenceReferences", "partial", "conflicting", "complete"]);
	if (!["CURRENT", "STALE", "UNKNOWN", "NOT_ASSESSABLE"].includes(String(record.freshnessState))) throw new Error("Invalid freshness state");
	if (!Array.isArray(record.evidenceReferences) || record.evidenceReferences.length === 0 || record.evidenceReferences.length > MAX_ATTRIBUTION_EVIDENCE_REFERENCES) throw new Error("Invalid attribution evidence");
	const evidence = record.evidenceReferences.map((reference) => { if (typeof reference !== "string" || reference.length === 0 || reference.length > MAX_EVIDENCE_REFERENCE_LENGTH) throw new Error("Invalid attribution evidence"); return reference; });
	if (new Set(evidence).size !== evidence.length) throw new Error("Duplicate attribution evidence");
	if (typeof record.partial !== "boolean" || typeof record.conflicting !== "boolean" || typeof record.complete !== "boolean") throw new Error("Invalid attribution flags");
	for (const key of ["sourceType", "connectorId", "accountReference", "adapterReference", "providerRecordReference", "observationTimeReference"]) if (typeof record[key] !== "string" || record[key].length === 0 || record[key].length > MAX_EVIDENCE_REFERENCE_LENGTH) throw new Error("Invalid attribution reference");
	return Object.freeze({ ...record, evidenceReferences: Object.freeze(evidence) } as SourceAttributionRuntime);
}