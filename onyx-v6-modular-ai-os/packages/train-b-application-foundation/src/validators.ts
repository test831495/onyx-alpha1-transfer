import { APPROVED_APPLICATION_IDS, APPLICATION_ACTIONS, type ApplicationDefinition } from "./application-model";
const MAX_STRING = 128; const MAX_ALIASES = 16; const MAX_CAPABILITIES = 32; const MAX_ACTIONS = 11; const PROVIDER_WORDS = /google|microsoft|yahoo|github|netlify|spotify|youtube/i;
export function normalizeAlias(value: unknown): string { if (typeof value !== "string" || value.length > MAX_STRING) throw new Error("INVALID_ALIAS"); const normalized = value.trim().toLowerCase().replace(/\s+/g, " "); if (normalized.length === 0 || !/[a-z0-9]/.test(normalized)) throw new Error("INVALID_ALIAS"); if (normalized.length > MAX_STRING) throw new Error("INVALID_ALIAS"); return normalized; }
export function validateApplicationDefinition(input: unknown): ApplicationDefinition {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("Application definition must be an object");
  const value = input as ApplicationDefinition;
  if (!APPROVED_APPLICATION_IDS.includes(value.applicationId) || PROVIDER_WORDS.test(value.applicationId)) throw new Error("Invalid application ID");
  if (typeof value.displayName !== "string" || value.displayName.length > MAX_STRING || value.aliases.length > MAX_ALIASES || value.requiredCapabilities.length > MAX_CAPABILITIES || value.optionalCapabilities.length > MAX_CAPABILITIES || value.supportedActions.length > MAX_ACTIONS) throw new Error("Application definition exceeds bounds");
  if (value.aliases.some((alias) => PROVIDER_WORDS.test(alias))) throw new Error("Provider-branded alias rejected");
  return Object.freeze({ ...value, aliases: Object.freeze([...value.aliases].map(normalizeAlias)), requiredCapabilities: Object.freeze([...value.requiredCapabilities]), optionalCapabilities: Object.freeze([...value.optionalCapabilities]), supportedActions: Object.freeze([...value.supportedActions]) });
}
export const APPLICATION_BOUNDS = Object.freeze({ maxApplications: 128, maxAliases: MAX_ALIASES, maxCapabilities: MAX_CAPABILITIES, maxActions: MAX_ACTIONS });
export function isApplicationAction(value: string): value is typeof APPLICATION_ACTIONS[number] { return (APPLICATION_ACTIONS as readonly string[]).includes(value); }