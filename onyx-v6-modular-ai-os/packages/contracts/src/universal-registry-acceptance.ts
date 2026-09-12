export type UniversalRegistryAcceptanceFamily = Readonly<{
  family: string;
  requirement: string;
  risk: string;
  testType: "UNIT" | "PARITY" | "STATIC";
  expected: string;
  blockerSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}>;

export const B4_1_ACCEPTANCE_REGISTRY: readonly UniversalRegistryAcceptanceFamily[] = Object.freeze([
  { family: "BASELINE", requirement: "Target lineage and clean state are verified.", risk: "Unreliable baseline", testType: "STATIC", expected: "PR #95 and #97 are reachable and no unrelated mutation exists.", blockerSeverity: "CRITICAL" },
  { family: "SCHEMA", requirement: "Bounded fields and closed enums validate.", risk: "Malformed metadata", testType: "UNIT", expected: "Invalid schema values fail closed.", blockerSeverity: "HIGH" },
  { family: "IDENTITY", requirement: "Canonical IDs are stable and label-independent.", risk: "ID collision or rename", testType: "UNIT", expected: "Approved namespaces and separate aliases are enforced.", blockerSeverity: "HIGH" },
  { family: "ORDERING", requirement: "Registry output ordering is deterministic.", risk: "Nondeterministic projections", testType: "UNIT", expected: "Equivalent records serialize identically.", blockerSeverity: "MEDIUM" },
  { family: "DUPLICATE", requirement: "Duplicate canonical IDs fail closed.", risk: "Ambiguous source of truth", testType: "UNIT", expected: "Duplicate IDs produce validation errors.", blockerSeverity: "CRITICAL" },
  { family: "IMMUTABILITY", requirement: "Registry projections are immutable.", risk: "Consumer mutation", testType: "UNIT", expected: "Records, arrays, and reports are frozen.", blockerSeverity: "HIGH" },
  { family: "PARITY", requirement: "Current-source parity is measurable.", risk: "Silent divergence", testType: "PARITY", expected: "Missing and mismatched application metadata is reported.", blockerSeverity: "CRITICAL" },
  { family: "APPLICATION", requirement: "Application metadata is non-authorizing.", risk: "Runtime authority leak", testType: "UNIT", expected: "Application records contain metadata only.", blockerSeverity: "CRITICAL" },
  { family: "SURFACE", requirement: "Surface metadata is bounded.", risk: "Untracked UI surface", testType: "UNIT", expected: "Surface records use stable IDs and closed kinds.", blockerSeverity: "HIGH" },
  { family: "NAVIGATION_METADATA", requirement: "Navigation metadata cannot execute.", risk: "Navigation cutover", testType: "UNIT", expected: "Navigation records require executable=false.", blockerSeverity: "CRITICAL" },
  { family: "SETTINGS_METADATA", requirement: "Settings metadata cannot persist values.", risk: "Persistence ownership transfer", testType: "STATIC", expected: "No settings storage or writer is imported.", blockerSeverity: "CRITICAL" },
  { family: "VOICE_METADATA", requirement: "Voice metadata is provider-neutral.", risk: "Provider hardcoding", testType: "UNIT", expected: "Voice records are character-independent.", blockerSeverity: "HIGH" },
  { family: "WAKE_METADATA", requirement: "Wake metadata cannot activate listeners.", risk: "Background activation", testType: "UNIT", expected: "Wake records require activatesListener=false.", blockerSeverity: "CRITICAL" },
  { family: "PRIVACY", requirement: "Privacy classification is explicit.", risk: "Unauthorized disclosure", testType: "UNIT", expected: "Privacy enum values are validated.", blockerSeverity: "HIGH" },
  { family: "ACCESSIBILITY", requirement: "Accessibility metadata is explicit.", risk: "Presentation drift", testType: "UNIT", expected: "Accessibility enum values are validated.", blockerSeverity: "MEDIUM" },
  { family: "TRACK_ISOLATION", requirement: "Track A and Track C remain untouched.", risk: "Ownership collision", testType: "STATIC", expected: "No imports or changed files cross the protected tracks.", blockerSeverity: "CRITICAL" },
  { family: "COMPATIBILITY", requirement: "Existing consumers remain behaviorally unchanged.", risk: "Regression", testType: "PARITY", expected: "Existing package and preservation suites remain green.", blockerSeverity: "CRITICAL" },
  { family: "ROLLBACK", requirement: "The foundation is removable without data migration.", risk: "Irreversible cutover", testType: "STATIC", expected: "No persistence, activation, or consumer cutover exists.", blockerSeverity: "HIGH" },
]);