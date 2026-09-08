import type {
  AdapterOperationRequest,
  AdapterResult,
  ConnectorAdapter,
  AdapterRegistration,
} from "./model.js";
import { validateAdapterRegistration, validateAdapterRequest, validateAdapterResult } from "./validators.js";

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export class ConnectorAdapterRegistry {
  private readonly adapters = new Map<string, ConnectorAdapter>();

  register(adapter: ConnectorAdapter): void {
    const errors = validateAdapterRegistration(adapter.registration);
    if (errors.length > 0) throw new Error(`INVALID_ADAPTER_REGISTRATION:${errors.join("|")}`);
    if (this.adapters.has(adapter.registration.metadata.adapterId)) throw new Error("DUPLICATE_ADAPTER_ID");
    this.adapters.set(adapter.registration.metadata.adapterId, adapter);
  }

  get(adapterId: string): ConnectorAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  snapshot(): readonly AdapterRegistration[] {
    return Object.freeze([...this.adapters.values()].map((adapter) => adapter.registration));
  }

  async execute(adapterId: string, request: AdapterOperationRequest): Promise<AdapterResult> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error("ADAPTER_NOT_REGISTERED");
    const requestErrors = validateAdapterRequest(request);
    if (requestErrors.length > 0) throw new Error(`INVALID_ADAPTER_REQUEST:${requestErrors.join("|")}`);
    const advertised = adapter.registration.capabilities.some((capability) => capability.operations.includes(request.operation));
    if (!advertised) throw new Error("UNSUPPORTED_ADAPTER_OPERATION");
    const result = await adapter.execute(Object.freeze(request));
    if (result.connectorId !== request.context.connectorId) throw new Error("CONNECTOR_BINDING_MISMATCH");
    if (result.accountScopeReference !== request.context.accountScopeReference) throw new Error("ACCOUNT_BINDING_MISMATCH");
    if (result.adapterReference !== adapter.registration.metadata.adapterId) throw new Error("ADAPTER_REFERENCE_MISMATCH");
    const resultErrors = validateAdapterResult(result, adapter.registration.metadata.adapterId, request.operation);
    if (resultErrors.length > 0) throw new Error(`INVALID_ADAPTER_RESULT:${resultErrors.join("|")}`);
    return deepFreeze(result);
  }
}
