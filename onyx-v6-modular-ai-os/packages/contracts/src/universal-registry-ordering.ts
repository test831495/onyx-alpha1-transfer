import type { UniversalRegistry, UniversalRegistryRecord } from "./universal-registry";
import { validateUniversalRegistry } from "./universal-registry-validator";

export function orderUniversalRegistry(
  records: readonly UniversalRegistryRecord[],
): UniversalRegistry {
  const validated = validateUniversalRegistry(records);
  return Object.freeze([...validated].sort((left, right) => left.id.localeCompare(right.id)));
}

export function serializeUniversalRegistry(records: readonly UniversalRegistryRecord[]): string {
  return JSON.stringify(orderUniversalRegistry(records));
}