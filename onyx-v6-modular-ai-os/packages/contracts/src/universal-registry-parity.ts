import type { RegistrySourceRecord, UniversalRegistryRecord } from "./universal-registry";

export type RegistryDriftClass =
  | "BLOCKING_DRIFT"
  | "DEFERRED_MIGRATION_DIFFERENCE"
  | "ACCEPTED_LEGACY_DIFFERENCE"
  | "UNKNOWN_REQUIRES_OWNER_DECISION";

export type RegistryParityIssue = Readonly<{
  code: "MISSING_RECORD" | "DUPLICATE_RECORD" | "LABEL_MISMATCH" | "ICON_MISMATCH" | "VISIBILITY_MISMATCH" | "LAUNCHER_ORDER_MISMATCH" | "NAVIGATION_MISMATCH" | "ALIAS_MISMATCH";
  drift: RegistryDriftClass;
  id: string;
  message: string;
}>;

export type RegistryParityReport = Readonly<{
  passed: boolean;
  issues: readonly RegistryParityIssue[];
}>;

export function compareApplicationParity(
  records: readonly UniversalRegistryRecord[],
  sources: readonly RegistrySourceRecord[],
): RegistryParityReport {
  const issues: RegistryParityIssue[] = [];
  const applications = records.filter((record) => record.recordKind === "APPLICATION");
  const counts = new Map<string, number>();
  for (const record of applications) counts.set(record.id, (counts.get(record.id) ?? 0) + 1);

  for (const [id, count] of counts) {
    if (count > 1) issues.push({ code: "DUPLICATE_RECORD", drift: "BLOCKING_DRIFT", id, message: "Application metadata contains a duplicate canonical ID." });
  }

  for (const source of sources) {
    const id = `onyx.app.${source.id}`;
    const record = applications.find((candidate) => candidate.id === id);
    if (!record) {
      issues.push({ code: "MISSING_RECORD", drift: "BLOCKING_DRIFT", id, message: "Current application source has no canonical metadata record." });
      continue;
    }
    // Compare using displayKey precedence: displayKey ?? label ?? id
    const expectedDisplayKey = source.displayKey ?? source.label ?? source.id;
    if ((source.displayKey !== undefined || source.label !== undefined) && record.displayKey !== expectedDisplayKey) {
      issues.push(mismatch("LABEL_MISMATCH", id, "Application display metadata differs from the current source."));
    }
    if (source.icon !== undefined && record.iconKey !== source.icon) issues.push(mismatch("ICON_MISMATCH", id, "Application icon metadata differs from the current source."));
    if (source.visible !== undefined && record.visible !== source.visible) issues.push(mismatch("VISIBILITY_MISMATCH", id, "Application visibility metadata differs from the current source."));
    if (source.launcherOrder !== undefined && record.launcherOrder !== source.launcherOrder) issues.push(mismatch("LAUNCHER_ORDER_MISMATCH", id, "Application launcher order differs from the current source."));
    if (source.aliases !== undefined && JSON.stringify(record.aliases) !== JSON.stringify(source.aliases)) issues.push(mismatch("ALIAS_MISMATCH", id, "Application aliases differ from the current source."));
  }
  // Freeze each issue object to prevent mutation
  const frozenIssues = issues.map((issue) => Object.freeze(issue));
  return Object.freeze({ passed: frozenIssues.length === 0, issues: Object.freeze(frozenIssues) });
}

function mismatch(code: RegistryParityIssue["code"], id: string, message: string): RegistryParityIssue {
  return { code, drift: "BLOCKING_DRIFT", id, message };
}