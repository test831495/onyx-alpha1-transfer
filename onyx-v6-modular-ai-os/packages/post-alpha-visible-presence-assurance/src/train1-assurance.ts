export const TRAIN1_STATES = Object.freeze(["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"] as const);
export const TRAIN1_CHARACTERS = Object.freeze(["ONYX", "NOVA"] as const);
export const TRAIN1_WORLDS = Object.freeze(["OPERATIONS_CENTER", "FUTURE_CITY"] as const);
export const PERFORMANCE_BUDGETS = Object.freeze({ startup: ["STARTUP_FAST", "STARTUP_BALANCED", "STARTUP_CONSTRAINED"], frame: ["FRAME_FULL", "FRAME_REDUCED", "FRAME_STATIC"], memory: ["MEMORY_DESKTOP", "MEMORY_TV", "MEMORY_MOBILE", "MEMORY_CONSTRAINED"], measured: false });
export type LaneEvidence = { readonly lane: string; readonly allowlist: string; readonly changedPaths: readonly string[]; readonly lockfileDrift: "accepted-importer-only" | "none" | "material"; readonly tests: "PASS" | "FAIL"; readonly typecheck: "PASS" | "FAIL"; readonly flags: "OFF"; readonly activation: "NONE" };
export type AssuranceResult = { readonly accepted: boolean; readonly requirements: 110; readonly states: 8; readonly characters: 2; readonly worlds: 2; readonly noAuthority: true; readonly noExternalIo: true; readonly flags: "OFF"; readonly activation: "NONE"; readonly errors: readonly string[] };
export function assureTrain1(lanes: readonly LaneEvidence[]): AssuranceResult {
  const errors: string[] = [];
  if (lanes.length !== 5) errors.push("five Train 1 lane records required");
  for (const lane of lanes) {
    if (lane.tests !== "PASS" || lane.typecheck !== "PASS") errors.push(`${lane.lane} validation incomplete`);
    if (lane.flags !== "OFF" || lane.activation !== "NONE") errors.push(`${lane.lane} activation boundary changed`);
    if (lane.lockfileDrift === "material") errors.push(`${lane.lane} material lockfile drift`);
    if (lane.changedPaths.some((path) => path === "pnpm-lock.yaml" || path.endsWith("/pnpm-lock.yaml"))) errors.push(`${lane.lane} lockfile included in candidate paths`);
    if (!lane.allowlist.includes(lane.lane)) errors.push(`${lane.lane} allowlist mismatch`);
  }
  return Object.freeze({ accepted: errors.length === 0, requirements: 110, states: TRAIN1_STATES.length, characters: TRAIN1_CHARACTERS.length, worlds: TRAIN1_WORLDS.length, noAuthority: true, noExternalIo: true, flags: "OFF", activation: "NONE", errors: Object.freeze(errors) });
}
