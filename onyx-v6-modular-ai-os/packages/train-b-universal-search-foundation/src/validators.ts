import { BOUNDS, KNOWN_APPLICATIONS, KNOWN_CAPABILITIES, SEARCH_MODES } from "./search-model";

const SECRET_KEYS = new Set([
  "accesstoken",
  "refreshtoken",
  "apikey",
  "password",
  "privatekey",
  "clientsecret",
  "authorizationcode",
  "cookie",
  "credential",
  "secret",
  "token",
  "rawprompt",
  "memory",
  "notes",
  "payload",
]);

export function ensureSafePrimitive(value: unknown, field: string): void {
  if (value === null || value === undefined) return;
  if (field === "queryTextReference" && typeof value === "string") {
    if (value.trim().length === 0) throw new TypeError("empty query rejected");
    if (value.length > BOUNDS.queryTextMaxLength) throw new TypeError("query length exceeds bounds");
  }
  if (typeof value === "string" && field !== "queryTextReference" && value.length > 256) {
    throw new TypeError(`${field} exceeds safe length`);
  }
  if (typeof value === "object" && value !== null) {
    throw new TypeError(`${field} must be a primitive or array`);
  }
}

export function validString(value: unknown, max = 256): string | null {
  if (typeof value !== "string") return null;
  return value.trim().length > 0 && value.length <= max ? value : null;
}

const ALLOWED_REQUEST_KEYS = new Set([
  "requestId",
  "accountScopeReference",
  "householdScopeReference",
  "actorSessionReference",
  "purposeReference",
  "queryTextReference",
  "searchModes",
  "applicationScopes",
  "capabilityRequirements",
  "connectorAccountScopes",
  "dataClasses",
  "exactPhrases",
  "tags",
  "projectReferences",
  "dateTimeRangeReferences",
  "calendarYear",
  "calendarMonth",
  "isoWeek",
  "contentTypes",
  "privacyRequirements",
  "freshnessRequirements",
  "regionRequirements",
  "maximumResults",
  "maxResults",
  "pageSize",
  "deadlineReference",
  "costCeilingReference",
  "detailLevel",
  "requestedSortPolicy",
  "explicitFallbackPolicy",
  "cancellationReference",
  "idempotencyKey",
  "scopeExpansionPolicy",
  "hostile",
]);

export function assertClosedInput(input: unknown): void {
  if (input === null || input === undefined) return;
  if (typeof input !== "object") return;
  try {
    const entries = Object.entries(input as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (!ALLOWED_REQUEST_KEYS.has(key)) {
        throw new TypeError("unknown field rejected");
      }
      const normalized = key.replace(/[_-]/g, "").toLowerCase();
      if (SECRET_KEYS.has(normalized) || normalized.includes("memory") || normalized.includes("token") || normalized.includes("secret")) {
        throw new TypeError("private payload rejected");
      }
      if (Array.isArray(value) && value.length > 64) throw new TypeError("array exceeds safe bounds");
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const nested = Object.entries(value as Record<string, unknown>);
        if (nested.length > 16) throw new TypeError("object nesting exceeds safe bounds");
      }
    }
  } catch (error) {
    throw new TypeError((error as Error).message || "hostile input rejected");
  }
}

export function validateSearchMode(mode: string): boolean {
  return Object.values(SEARCH_MODES).includes(mode as (typeof SEARCH_MODES)[keyof typeof SEARCH_MODES]);
}

export function isKnownCapability(capabilityId: string): boolean {
  return KNOWN_CAPABILITIES.has(capabilityId);
}

export function isKnownApplication(applicationId: string): boolean {
  return KNOWN_APPLICATIONS.has(applicationId);
}

export function normalizedTokens(value: readonly string[] | undefined, max: number): readonly string[] {
  if (!value) return Object.freeze([]);
  const out = value.filter((entry) => typeof entry === "string" && entry.trim().length > 0).slice(0, max).map((entry) => entry.trim());
  return Object.freeze(out);
}
