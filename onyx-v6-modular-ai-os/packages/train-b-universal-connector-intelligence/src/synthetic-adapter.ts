import {
  ADAPTER_BOUNDS,
  type AdapterOperation,
  type AdapterOperationRequest,
  type AdapterResult,
  type ConnectorAdapter,
  type NormalizedAdapterRecord,
} from "@onyx/train-b-connector-adapter-foundation";
import { normalizeAdapterRecord } from "@onyx/train-b-connector-adapter-foundation";

export type SyntheticRecord = Readonly<{
  recordReference: string;
  dataClass: string;
  fields: readonly Readonly<{ key: string; value: string | number | boolean | null }>[];
}>;

export type SyntheticAdapterDefinition = Readonly<{
  adapterId: string;
  providerMetadataReference: string;
  capabilities: readonly Readonly<{
    capabilityId: string;
    permissionReference: string;
    dataClass: string;
    operations: readonly AdapterOperation[];
  }>[];
  records: readonly SyntheticRecord[];
}>;

const READ_OPERATIONS = ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES"] as const;

function receipt(request: AdapterOperationRequest, adapterId: string, partial = false) {
  return Object.freeze({
    requestIdReference: request.context.idempotencyKey ?? `${adapterId}:${request.operation}`,
    operation: request.operation,
    completed: true,
    cancelled: false,
    partial,
    nonAuthorizing: true as const,
  });
}

function attribution(request: AdapterOperationRequest, adapterId: string, recordReference: string, partial = false) {
  return Object.freeze({
    connectorId: request.context.connectorId,
    accountScopeReference: request.context.accountScopeReference,
    adapterReference: adapterId,
    providerRecordReference: recordReference,
    observationTimeReference: request.context.trustedTimeReference,
    freshnessState: "CURRENT" as const,
    evidenceReferences: Object.freeze([`${adapterId}:observation:${request.context.trustedTimeReference}`]),
    partial,
    complete: !partial,
  });
}

function resultBase(request: AdapterOperationRequest, adapterId: string, partial = false): Pick<AdapterResult, "operation" | "adapterReference" | "connectorId" | "accountScopeReference" | "receipt" | "nonAuthorizing"> {
  return {
    operation: request.operation,
    adapterReference: adapterId,
    connectorId: request.context.connectorId,
    accountScopeReference: request.context.accountScopeReference,
    receipt: receipt(request, adapterId, partial),
    nonAuthorizing: true,
  };
}

function pageRecords(definition: SyntheticAdapterDefinition, request: AdapterOperationRequest): readonly NormalizedAdapterRecord[] {
  const pageSize = Math.min(request.pageSize ?? 20, ADAPTER_BOUNDS.pageSizeMax);
  const page = request.cursor ? Number.parseInt(request.cursor.split(":").at(-1) ?? "1", 10) : 1;
  const start = Number.isFinite(page) && page > 0 ? (page - 1) * pageSize : 0;
  const selected = request.operation === "GET_BY_ID"
    ? definition.records.filter((record) => record.recordReference === request.itemReference)
    : definition.records.slice(start, start + pageSize);
  return selected.map((record) => normalizeAdapterRecord(record, request.context.trustedTimeReference));
}

export function createSyntheticReadAdapter(definition: SyntheticAdapterDefinition): ConnectorAdapter {
  const registration = Object.freeze({
    metadata: Object.freeze({
      adapterId: definition.adapterId,
      version: "1.0.0",
      providerMetadataReference: definition.providerMetadataReference,
      nonAuthorizing: true as const,
    }),
    capabilities: Object.freeze(definition.capabilities.map((capability) => Object.freeze({
      ...capability,
      operations: Object.freeze([...capability.operations]),
      freshnessRequirement: "CURRENT",
      costClass: "SYNTHETIC",
    }))),
    enabled: false,
  });

  return Object.freeze({
    registration,
    async execute(request: AdapterOperationRequest): Promise<AdapterResult> {
      if (!request.context.vaultReferenceId && request.operation !== "DISCOVER_CAPABILITIES") {
        return Object.freeze({
          ...resultBase(request, definition.adapterId),
          error: Object.freeze({ code: "VAULT_REFERENCE_INVALID" as const, retryable: false, safe: true as const }),
        });
      }
      if (!READ_OPERATIONS.includes(request.operation as typeof READ_OPERATIONS[number])) {
        return Object.freeze({
          ...resultBase(request, definition.adapterId),
          usage: Object.freeze({ quotaState: "AVAILABLE" as const, costState: "KNOWN" as const, amountReference: `${definition.adapterId}:synthetic:0` }),
        });
      }
      const items = pageRecords(definition, request);
      const pageSize = Math.min(request.pageSize ?? 20, ADAPTER_BOUNDS.pageSizeMax);
      const page = request.cursor ? Number.parseInt(request.cursor.split(":").at(-1) ?? "1", 10) : 1;
      const hasNext = request.operation !== "GET_BY_ID" && page * pageSize < definition.records.length;
      const firstReference = items[0]?.recordReference ?? `${definition.adapterId}:empty`;
      return Object.freeze({
        ...resultBase(request, definition.adapterId, hasNext),
        page: Object.freeze({
          items: Object.freeze(items),
          nextCursor: hasNext ? `${request.context.connectorId}:${request.context.accountScopeReference}:${page + 1}` : undefined,
          complete: !hasNext,
          pageNumber: page,
        }),
        attribution: attribution(request, definition.adapterId, firstReference, hasNext),
        usage: Object.freeze({ quotaState: "AVAILABLE" as const, costState: "KNOWN" as const, requestCountReference: `${definition.adapterId}:requests:1`, amountReference: `${definition.adapterId}:synthetic:0` }),
      });
    },
  });
}
