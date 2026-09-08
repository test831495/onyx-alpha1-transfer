import {
  PROHIBITED_INITIAL_OPERATIONS,
  type AdapterConformanceCheck,
  type AdapterConformanceResult,
  type ConnectorAdapter,
} from "./model.js";
import { validateAdapterRegistration } from "./validators.js";

export function runAdapterConformance(adapter: ConnectorAdapter): AdapterConformanceResult {
  const checks: AdapterConformanceCheck[] = [];
  const registrationErrors = validateAdapterRegistration(adapter.registration);
  checks.push({ id: "registration-without-activation", passed: registrationErrors.length === 0, reason: registrationErrors.join("|") || undefined });
  checks.push({ id: "non-authority-registration", passed: adapter.registration.metadata.nonAuthorizing === true });
  checks.push({ id: "capability-advertisement-bounded", passed: adapter.registration.capabilities.every((capability) => capability.capabilityId.length > 0 && capability.operations.length > 0) });
  checks.push({ id: "no-prohibited-initial-operation", passed: adapter.registration.capabilities.every((capability) => capability.operations.every((operation) => !PROHIBITED_INITIAL_OPERATIONS.includes(operation as never))) });
  return Object.freeze({ passed: checks.every((check) => check.passed), checks: Object.freeze(checks.map((check) => Object.freeze(check))) });
}
