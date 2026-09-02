export function validateNoDuplicateIds(ids: string[]): boolean {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("Duplicate acceptance IDs found");
  }
  return true;
}

export function validateNoMissingIds(families: Record<string, any>): boolean {
  const allIds = new Set<string>();

  for (const family of Object.values(families)) {
    const [start, end] = family.idRange;
    const familyPrefix = family.family;
    for (let i = start; i <= end; i++) {
      const id = `${familyPrefix}-${String(i).padStart(3, "0")}`;
      if (allIds.has(id)) {
        throw new Error(`Duplicate ID across families: ${id}`);
      }
      allIds.add(id);
    }
  }

  return allIds.size === 100;
}

export function validateNoUnexplainedRanges(families: Record<string, any>): boolean {
  for (const family of Object.values(families)) {
    const [start, end] = family.idRange;
    const expected = end - start + 1;
    if (family.totalIds !== expected) {
      throw new Error(
        `Family ${family.family} range mismatch: expected ${expected}, got ${family.totalIds}`
      );
    }
  }
  return true;
}

export function validateNoMaskedGaps(
  dispositions: Record<
    | "EXECUTABLE_TEST"
    | "EVIDENCE_VALIDATION"
    | "CONDITIONAL_NOT_APPLICABLE"
    | "DEFERRED_FUTURE_EVIDENCE",
    number
  >
): boolean {
  const total =
    dispositions.EXECUTABLE_TEST +
    dispositions.EVIDENCE_VALIDATION +
    dispositions.CONDITIONAL_NOT_APPLICABLE +
    dispositions.DEFERRED_FUTURE_EVIDENCE;

  if (total !== 100) {
    throw new Error(`Disposition total mismatch: ${total} !== 100`);
  }

  return true;
}
