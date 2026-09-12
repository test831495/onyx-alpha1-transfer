import type { UniversalRegistry, UniversalRegistryRecord } from "./universal-registry";
import { validateUniversalRegistry } from "./universal-registry-validator";

// Canonical property order for deterministic serialization
const PROPERTY_ORDER: Record<string, number> = {
  id: 0,
  schema: 1,
  schemaVersion: 2,
  displayKey: 3,
  aliases: 4,
  owner: 5,
  provenance: 6,
  availability: 7,
  featureState: 8,
  privacyClass: 9,
  accessibilityClass: 10,
  // Extended properties with assigned order
  recordKind: 100,
  icon: 101,
  iconKey: 102,
  visible: 103,
  launcherOrder: 104,
  supportsMinimize: 105,
  supportsClose: 106,
  surfaceKind: 107,
  navigationKind: 108,
  commandAliases: 109,
  valueKind: 110,
  defaultValue: 111,
  minimum: 112,
  maximum: 113,
  step: 114,
  persistenceKey: 115,
  providerId: 116,
  locales: 117,
  characterIndependent: 118,
  phrase: 119,
  candidate: 120,
  activatesListener: 121,
  settingId: 122,
  classification: 123,
  truthClass: 124,
  freshness: 125,
  executable: 126,
};

function canonicalPropertyOrder(a: string, b: string): number {
  const orderA = PROPERTY_ORDER[a] ?? 1000;
  const orderB = PROPERTY_ORDER[b] ?? 1000;
  return orderA - orderB;
}

function canonicalSerialize(obj: unknown): string {
  if (obj === null) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalSerialize(item)).join(",") + "]";
  }
  const sorted = Object.keys(obj).sort(canonicalPropertyOrder);
  const pairs = sorted.map((key) => `"${key}":${canonicalSerialize((obj as any)[key])}`);
  return "{" + pairs.join(",") + "}";
}

export function orderUniversalRegistry(
  records: readonly UniversalRegistryRecord[],
): UniversalRegistry {
  const validated = validateUniversalRegistry(records);
  // Use code-unit comparison instead of locale-dependent localeCompare
  return Object.freeze([...validated].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

export function serializeUniversalRegistry(records: readonly UniversalRegistryRecord[]): string {
  const ordered = orderUniversalRegistry(records);
  return canonicalSerialize(ordered);
}