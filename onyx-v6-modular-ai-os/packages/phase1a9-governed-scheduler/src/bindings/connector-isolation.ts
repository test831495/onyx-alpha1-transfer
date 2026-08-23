import type { ConnectorBindingResult } from "./connector-binding";

export function evaluateConnectorIsolation(result: ConnectorBindingResult): ConnectorBindingResult {
  if (result.mutationSerializationRequired || result.accountExclusiveMutationRequired) {
    return {
      ...result,
      decision: "SERIALIZATION_REQUIRED",
      mutationSerializationRequired: true,
      accountExclusiveMutationRequired: true,
      remoteUncertaintyDetected: result.remoteUncertaintyDetected || true,
      reconciliationRequired: true,
    };
  }

  if (!result.accountIsolationPreserved) {
    return {
      ...result,
      decision: "DENIED_ACCOUNT_ISOLATION",
      reconciliationRequired: true,
    };
  }

  return result;
}
