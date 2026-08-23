export interface CanonicalResourceOrderResult {
  resourceKeys: readonly string[];
  canonicalResourceOrder: readonly string[];
  valid: boolean;
  denialReasons: readonly string[];
}

const RESOURCE_KEY = /^[a-z][a-z0-9]*(?::[a-z0-9._-]+)+$/;

export function canonicalizeResourceKeys(resourceKeys: readonly string[]): CanonicalResourceOrderResult {
  const reasons: string[] = [];
  if (resourceKeys.length === 0) reasons.push("missing-resource-key");
  if (resourceKeys.some((key) => key.trim() !== key || key.length === 0)) reasons.push("empty-resource-key");
  if (resourceKeys.some((key) => !RESOURCE_KEY.test(key))) reasons.push("malformed-resource-key");
  if (new Set(resourceKeys).size !== resourceKeys.length) reasons.push("duplicate-resource-key");
  const canonical = [...resourceKeys].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return { resourceKeys, canonicalResourceOrder: canonical, valid: reasons.length === 0, denialReasons: reasons };
}

export function assertCanonicalResourceOrder(resourceKeys: readonly string[]): readonly string[] {
  const result = canonicalizeResourceKeys(resourceKeys);
  if (!result.valid) throw new Error(result.denialReasons.join(","));
  return result.canonicalResourceOrder;
}

export function isCanonicalResourceOrder(resourceKeys: readonly string[]): boolean {
  const result = canonicalizeResourceKeys(resourceKeys);
  return result.valid && result.resourceKeys.every((key, index) => key === result.canonicalResourceOrder[index]);
}

export function evaluateDeadlockPrevention(requests: readonly (readonly string[])[]): boolean {
  const orders = requests.map(assertCanonicalResourceOrder).map((keys) => keys.join("|"));
  return new Set(orders).size === orders.length;
}