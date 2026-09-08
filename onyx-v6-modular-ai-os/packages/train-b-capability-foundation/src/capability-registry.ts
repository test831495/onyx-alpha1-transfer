import type { CapabilityDefinition, CapabilityRegistrySnapshot } from "./capability-model";
import { assertCapabilityDefinition } from "./validators";

export const MAX_REGISTRY_ENTRIES = 128;

export interface CapabilityRegistry {
  readonly definitions: Map<string, CapabilityDefinition>;
  register(definition: CapabilityDefinition): CapabilityDefinition;
  get(id: string): CapabilityDefinition | undefined;
  has(id: string): boolean;
  list(): readonly CapabilityDefinition[];
  snapshot(): CapabilityRegistrySnapshot;
}

function sortDefinitions(entries: readonly CapabilityDefinition[]): readonly CapabilityDefinition[] {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id) || left.version.localeCompare(right.version));
}

export function createCapabilityRegistry(): CapabilityRegistry {
  const definitions = new Map<string, CapabilityDefinition>();

  if (definitions.size >= MAX_REGISTRY_ENTRIES) {
    throw new Error("Registry has reached the maximum entry limit");
  }

  return {
    definitions,
    register(definition: CapabilityDefinition): CapabilityDefinition {
      if (definitions.size >= MAX_REGISTRY_ENTRIES) {
        throw new Error("Registry has reached the maximum entry limit");
      }
      const normalized = assertCapabilityDefinition(definition);
      const existing = definitions.get(normalized.id);
      if (existing) {
        throw new Error(`Duplicate capability ID: ${normalized.id}`);
      }
      const next = Object.freeze({ ...normalized });
      definitions.set(normalized.id, next);
      return next;
    },
    get(id: string): CapabilityDefinition | undefined {
      return definitions.get(id);
    },
    has(id: string): boolean {
      return definitions.has(id);
    },
    list(): readonly CapabilityDefinition[] {
      return sortDefinitions([...definitions.values()]);
    },
    snapshot(): CapabilityRegistrySnapshot {
      const entries = sortDefinitions([...definitions.values()]);
      const byId = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])) as Record<string, CapabilityDefinition>);
      return Object.freeze({
        entries: Object.freeze(entries),
        byId,
        ids: Object.freeze(entries.map((entry) => entry.id)),
      });
    },
  };
}

export function registerCapability(registry: CapabilityRegistry, definition: CapabilityDefinition): CapabilityRegistry {
  registry.register(definition);
  return registry;
}

export function capabilityRegistrySnapshot(registry: CapabilityRegistry): CapabilityRegistrySnapshot {
  return registry.snapshot();
}
