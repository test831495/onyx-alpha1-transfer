import { ACTION_CLASSES, PERSISTENCE_MODES, ValidationOutcome } from "./lifecycle-vocabulary";

export type ConstitutionResult = Readonly<{ outcome: ValidationOutcome; reasonCodes: readonly string[]; authority: "NON_AUTHORIZING" }>;
const result = (outcome: ValidationOutcome, reasonCodes: readonly string[] = []): ConstitutionResult => Object.freeze({ outcome, reasonCodes: Object.freeze([...reasonCodes]), authority: "NON_AUTHORIZING" });

export const validatePersistenceMode = (mode: unknown): ConstitutionResult => mode === "P0_EPHEMERAL" ? result("PASS") : result("FAIL", ["PERSISTENCE_MODE_PROHIBITED"]);
export const validateArchitectureConstitution = (input: unknown): ConstitutionResult => {
  if (input === null || typeof input !== "object") return result("NOT_ASSESSABLE", ["CONSTITUTION_INPUT_UNAVAILABLE"]);
  try {
    const candidate = input as { persistenceMode?: unknown; authority?: unknown; actions?: unknown };
    if (!PERSISTENCE_MODES.includes(candidate.persistenceMode as typeof PERSISTENCE_MODES[number])) return result("FAIL", ["PERSISTENCE_MODE_UNKNOWN"]);
    if (candidate.persistenceMode !== "P0_EPHEMERAL") return result("FAIL", ["PERSISTENCE_MODE_PROHIBITED"]);
    if (candidate.authority !== "NON_AUTHORIZING") return result("FAIL", ["AUTHORITY_PROHIBITED"]);
    if (!Array.isArray(candidate.actions) || candidate.actions.some((action) => !ACTION_CLASSES.includes(action as typeof ACTION_CLASSES[number]))) return result("FAIL", ["ACTION_CLASS_INVALID"]);
    if (candidate.actions.some((action) => action === "MERGE" || action === "EXECUTE")) return result("FAIL", ["MUTATION_ACTION_PROHIBITED"]);
    return result("PASS");
  } catch { return result("NOT_ASSESSABLE", ["CONSTITUTION_INPUT_UNAVAILABLE"]); }
};