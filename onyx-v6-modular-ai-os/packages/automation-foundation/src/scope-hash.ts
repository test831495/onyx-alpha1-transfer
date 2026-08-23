import { createHash } from "node:crypto";

export const SCOPE_HASH_VERSION = "sha256-v1" as const;
const CURRENT_SCOPE_HASH = /^sha256-v1-[0-9a-f]{64}$/;
const LEGACY_SCOPE_HASH = /^fnv1a-/;

function canonicalize(value: unknown, ancestors: Set<object>): string {
	if (value === null) return "null";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new TypeError("Scope hash input must use finite numbers.");
		return JSON.stringify(value);
	}
	if (typeof value !== "object") throw new TypeError("Scope hash input must be JSON-compatible.");
	if (ancestors.has(value)) throw new TypeError("Scope hash input must not be circular.");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			const keys = Reflect.ownKeys(value);
				if (keys.length !== value.length + 1 || !keys.includes("length") || keys.some(key => key !== "length" && (typeof key !== "string" || !/^\d+$/.test(key) || Number(key) >= value.length))) {
				throw new TypeError("Scope hash input arrays must be dense JSON arrays.");
			}
			return `[${value.map(item => canonicalize(item, ancestors)).join(",")}]`;
		}
		if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
			throw new TypeError("Scope hash input objects must use a plain object prototype.");
		}
		const keys = Reflect.ownKeys(value);
		if (keys.some(key => {
			if (typeof key !== "string") return true;
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			return !descriptor?.enumerable || !("value" in descriptor);
		})) {
			throw new TypeError("Scope hash input objects must contain enumerable string properties only.");
		}
		const stringKeys = keys as string[];
		return `{${stringKeys.sort().map(key => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key], ancestors)}`).join(",")}}`;
	} finally {
		ancestors.delete(value);
	}
}

export function canonicalizeScopeValue(value: unknown): string {
	return canonicalize(value, new Set<object>());
}

export function createScopeHash(value: unknown): string {
	const digest = createHash("sha256").update(canonicalizeScopeValue(value), "utf8").digest("hex");
	return `${SCOPE_HASH_VERSION}-${digest}`;
}

export function isCurrentScopeHash(value: unknown): value is string {
	return typeof value === "string" && CURRENT_SCOPE_HASH.test(value);
}

export function isLegacyScopeHash(value: unknown): value is string {
	return typeof value === "string" && LEGACY_SCOPE_HASH.test(value);
}

export function isSupportedScopeHash(value: unknown): value is string {
	return isCurrentScopeHash(value) || isLegacyScopeHash(value);
}
