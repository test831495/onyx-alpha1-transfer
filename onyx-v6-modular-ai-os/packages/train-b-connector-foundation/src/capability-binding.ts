import type { CapabilityDefinition, CapabilityOperation, CapabilityRegistry } from "@onyx/train-b-capability-foundation";
import type { CapabilityBinding } from "./model";

export function bindCapability(registry: CapabilityRegistry, capabilityId: string, operations: readonly CapabilityOperation[], permissionReferences: readonly string[] = []): CapabilityBinding {
  const capability = registry.get(capabilityId);
  if (!capability) throw new Error("Unknown capability ID");
  if (capability.lifecycleState !== "ACTIVE") throw new Error("Capability is not active");
  if (operations.some((operation) => !capability.operations.includes(operation))) throw new Error("Capability operation is not supported");
  if (operations.some((operation) => operation === "WRITE" || operation === "EXECUTION")) throw new Error("Train B baseline is read-only");
  return Object.freeze({ capabilityId, operations: Object.freeze([...operations]), permissionReferences: Object.freeze([...permissionReferences]), attributionRequired: capability.sourceAttributionRequired, freshnessRequirement: capability.freshnessRequirement, costClass: capability.costClass });
}

export function bindingCapability(registry: CapabilityRegistry, binding: CapabilityBinding): CapabilityDefinition | undefined { return registry.get(binding.capabilityId); }