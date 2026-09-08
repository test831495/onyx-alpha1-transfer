export interface AdapterAcceptanceEntry {
  readonly id: string;
  readonly family: string;
  readonly implementationSymbol: string;
  readonly implementationPath: string;
  readonly validationName: string;
  readonly validationPath: string;
  readonly nonAuthorizing: true;
}

const definitions: readonly [string, number, string, string, string, string][] = [
  ["IDENTITY", 4, "AdapterMetadata", "src/model.ts", "registration and metadata", "tests/adapter-foundation.test.ts"],
  ["BINDING", 5, "validateAdapterRequest", "src/validators.ts", "binding validation", "tests/adapter-foundation.test.ts"],
  ["OAUTH", 6, "validateOAuthAuthorizationRequest", "src/validators.ts", "OAuth contract boundary", "tests/adapter-foundation.test.ts"],
  ["ENVELOPES", 5, "AdapterOperationRequest", "src/model.ts", "operation envelopes", "tests/adapter-foundation.test.ts"],
  ["NORMALIZATION", 6, "normalizeAdapterRecord", "src/validators.ts", "payload normalization", "tests/adapter-foundation.test.ts"],
  ["PAGINATION", 6, "validateCursorBinding", "src/validators.ts", "pagination and cursors", "tests/adapter-foundation.test.ts"],
  ["OBSERVABILITY", 5, "AdapterAttribution", "src/model.ts", "attribution and projections", "tests/adapter-foundation.test.ts"],
  ["COST", 4, "AdapterUsageProjection", "src/model.ts", "usage and cost projections", "tests/adapter-foundation.test.ts"],
  ["RECOVERY", 5, "AdapterProposal", "src/model.ts", "recovery proposals", "tests/adapter-foundation.test.ts"],
  ["CONFORMANCE", 4, "runAdapterConformance", "src/conformance.ts", "conformance order", "tests/adapter-foundation.test.ts"],
];

const entries: AdapterAcceptanceEntry[] = definitions.flatMap(([family, count, symbol, implementationPath, validationName, validationPath]) =>
  Array.from({ length: count }, (_, index) => ({ id: `P6A-${family}-${String(index + 1).padStart(3, "0")}`, family, implementationSymbol: symbol, implementationPath, validationName, validationPath, nonAuthorizing: true as const })),
);

export const ADAPTER_ACCEPTANCE_REGISTRY = Object.freeze(entries.map((entry) => Object.freeze(entry)));
export const ADAPTER_ACCEPTANCE_ID_COUNT = ADAPTER_ACCEPTANCE_REGISTRY.length;

export function validateAcceptanceRegistry(): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of ADAPTER_ACCEPTANCE_REGISTRY) {
    if (ids.has(entry.id)) errors.push(`duplicate:${entry.id}`);
    ids.add(entry.id);
    if (!entry.implementationSymbol || !entry.implementationPath || !entry.validationName || !entry.validationPath || entry.nonAuthorizing !== true) errors.push(`unmapped:${entry.id}`);
  }
  return Object.freeze(errors);
}