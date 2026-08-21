import { CAPABILITIES, type Capability } from "./contracts";
import type { ExecutorResult, StepInput } from "@onyx/phase1a5-workflow-engine";

/**
 * Capability-specific adapter contract. There is no generic command or shell execution
 * method: each adapter exposes exactly one deterministic capability invocation.
 */
export interface CapabilityAdapter {
  readonly capability: Capability;
  invoke(input: StepInput): Promise<ExecutorResult>;
}

const CAPABILITY_SET = new Set<Capability>(CAPABILITIES);

/**
 * Registry of capability-specific adapters. Registration and resolution are both
 * capability-specific: there is no arbitrary command or shell-string entry point.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<Capability, CapabilityAdapter>();

  register(adapter: CapabilityAdapter): void {
    if (!CAPABILITY_SET.has(adapter.capability)) {
      throw new Error(`Unsupported capability: ${adapter.capability}`);
    }
    if (this.adapters.has(adapter.capability)) {
      throw new Error(`Duplicate adapter registration for capability: ${adapter.capability}`);
    }
    this.adapters.set(adapter.capability, adapter);
  }

  resolve(capability: Capability): CapabilityAdapter {
    if (!CAPABILITY_SET.has(capability)) {
      throw new Error(`Unsupported capability: ${capability}`);
    }
    const adapter = this.adapters.get(capability);
    if (!adapter) {
      throw new Error(`Missing adapter for capability: ${capability}`);
    }
    return adapter;
  }

  has(capability: Capability): boolean {
    return this.adapters.has(capability);
  }

  registeredCapabilities(): Capability[] {
    return [...this.adapters.keys()];
  }
}
