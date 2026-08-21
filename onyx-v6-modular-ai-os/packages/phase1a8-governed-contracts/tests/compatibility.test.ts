import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  WORKFLOW_CONTRACT_VERSION as SOURCE_WORKFLOW_CONTRACT_VERSION,
  WORKFLOW_STATES as SOURCE_WORKFLOW_STATES,
} from "@onyx/phase1a5-workflow-engine";
import { RUNTIME_CONTRACT_VERSION as SOURCE_RUNTIME_CONTRACT_VERSION } from "@onyx/phase1a6-workflow-runtime";
import {
  ACTIVE_PHASE1A8_RUNTIME_LIMIT,
  AGENT_COORDINATION_CONTRACT_VERSION,
  APPROVAL_RISK_CONTRACT_VERSION,
  AGENT_PERMISSION_CONTRACT_VERSION,
  CONNECTOR_SCOPE_CONTRACT_VERSION,
  BUDGET_CONTRACT_VERSION,
  MEMORY_CONTRACT_VERSION,
  CONTEXT_CONTRACT_VERSION,
  PERSONA_PROTECTION_CONTRACT_VERSION,
  COUNCIL_MODE_CONTRACT_VERSION,
  SAVED_DRAFT_CONTRACT_VERSION,
  AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  ACCESSIBILITY_GATE_CONTRACT_VERSION,
  COMPATIBLE_WORKFLOW_CONTRACT_VERSION,
  COMPATIBLE_RUNTIME_CONTRACT_VERSION,
  COMPATIBLE_UI_CONTRACT_VERSION,
  WORKFLOW_STATES,
  P18_ACCEPTANCE_IDS,
} from "../src/shared/versions";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("Phase 1A.8 contract versions", () => {
  it("starts every new Phase 1A.8 contract group at 1.0.0", () => {
    for (const version of [
      AGENT_COORDINATION_CONTRACT_VERSION,
      APPROVAL_RISK_CONTRACT_VERSION,
      AGENT_PERMISSION_CONTRACT_VERSION,
      CONNECTOR_SCOPE_CONTRACT_VERSION,
      BUDGET_CONTRACT_VERSION,
      MEMORY_CONTRACT_VERSION,
      CONTEXT_CONTRACT_VERSION,
      PERSONA_PROTECTION_CONTRACT_VERSION,
      COUNCIL_MODE_CONTRACT_VERSION,
      SAVED_DRAFT_CONTRACT_VERSION,
      AUTOMATION_CENTER_V2_CONTRACT_VERSION,
      ACCESSIBILITY_GATE_CONTRACT_VERSION,
    ]) {
      expect(version).toBe("1.0.0");
    }
  });

  it("binds to the real Phase 1A.5 workflow contract version without forking it", () => {
    expect(COMPATIBLE_WORKFLOW_CONTRACT_VERSION).toBe(SOURCE_WORKFLOW_CONTRACT_VERSION);
    expect(WORKFLOW_STATES).toBe(SOURCE_WORKFLOW_STATES);
  });

  it("binds to the real Phase 1A.6 runtime contract version without forking it", () => {
    expect(COMPATIBLE_RUNTIME_CONTRACT_VERSION).toBe(SOURCE_RUNTIME_CONTRACT_VERSION);
  });

  it("preserves all 32 Phase 1A.5 workflow states by reference", () => {
    expect(WORKFLOW_STATES).toHaveLength(32);
    expect(WORKFLOW_STATES).toContain("WORKFLOW_CREATED");
    expect(WORKFLOW_STATES).toContain("WORKFLOW_ROLLED_BACK");
  });

  it("keeps the active Phase 1A.8 runtime lane limit at exactly 1", () => {
    expect(ACTIVE_PHASE1A8_RUNTIME_LIMIT).toBe(1);
  });

  it("declares exactly 29 stable P18 acceptance IDs", () => {
    expect(P18_ACCEPTANCE_IDS).toHaveLength(29);
    expect(P18_ACCEPTANCE_IDS).toContain("P18-CONTRACT");
    expect(P18_ACCEPTANCE_IDS).toContain("P18-SIMULATION");
  });

  it("verifies the pinned Phase 1A.7 UI contract version against the actual command-center source", () => {
    const uiContractsPath = path.resolve(here, "../../../apps/command-center/src/automationRuntimeContracts.ts");
    const source = readFileSync(uiContractsPath, "utf8");
    expect(source).toContain(`AUTOMATION_RUNTIME_UI_CONTRACT_VERSION = "${COMPATIBLE_UI_CONTRACT_VERSION}"`);
  });
});
