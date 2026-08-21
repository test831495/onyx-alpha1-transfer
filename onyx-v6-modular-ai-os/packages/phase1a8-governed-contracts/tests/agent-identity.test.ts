import { describe, expect, it } from "vitest";
import {
  AGENT_STATUSES,
  CHARACTER_ATTRIBUTIONS,
  assertCharacterAttribution,
  assertLegalAgentTransition,
  assertNewAgentIdAfterTerminal,
  assertNoSelfModification,
  canTransitionAgentStatus,
  createDraftAgentIdentity,
  transitionAgentStatus,
  type AgentIdentity,
} from "../src/track-a/agent-identity";

const NOW = new Date("2026-08-21T00:00:00.000Z");

function draftAgent(overrides: Partial<Parameters<typeof createDraftAgentIdentity>[0]> = {}): AgentIdentity {
  return createDraftAgentIdentity({
    agentId: "agent-1",
    agentType: "EXECUTOR",
    displayName: "Executor Agent",
    engineeringIdentity: "engine-1",
    runtimeIdentity: "runtime-identity-1",
    characterAttribution: "SYSTEM",
    presenceMode: "SYSTEM",
    supervisingUserId: "Rahul Kumar",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    workflowId: "workflow-1",
    permissionProfileId: "profile-1",
    memoryAccessProfileId: "memory-profile-1",
    modelRoutingProfileId: "routing-1",
    tokenBudgetId: "token-budget-1",
    costBudgetId: "cost-budget-1",
    now: NOW,
    ...overrides,
  });
}

describe("agent identity registration", () => {
  it("declares exactly the 8 approved registration states", () => {
    expect(AGENT_STATUSES).toHaveLength(8);
  });

  it("starts a new agent identity in DRAFT", () => {
    const agent = draftAgent();
    expect(agent.status).toBe("DRAFT");
    expect(agent.capabilityDeclarationIds).toEqual([]);
  });

  it("permits the approved registration path", () => {
    let agent = draftAgent();
    agent = transitionAgentStatus(agent, "PENDING_VALIDATION", "governance-actor", NOW);
    agent = transitionAgentStatus(agent, "REGISTERED", "governance-actor", NOW);
    agent = transitionAgentStatus(agent, "ACTIVE", "governance-actor", NOW);
    expect(agent.status).toBe("ACTIVE");
  });

  it("rejects illegal transitions", () => {
    const agent = draftAgent();
    expect(canTransitionAgentStatus("DRAFT", "ACTIVE")).toBe(false);
    expect(() => assertLegalAgentTransition("DRAFT", "ACTIVE")).toThrow();
    expect(() => transitionAgentStatus(agent, "ACTIVE", "governance-actor", NOW)).toThrow();
  });

  it("treats REJECTED, REVOKED, and DEREGISTERED as terminal", () => {
    expect(canTransitionAgentStatus("REJECTED", "DRAFT")).toBe(false);
    expect(canTransitionAgentStatus("REVOKED", "ACTIVE")).toBe(false);
    expect(canTransitionAgentStatus("DEREGISTERED", "ACTIVE")).toBe(false);
  });

  it("requires a new agentId after REVOKED or DEREGISTERED", () => {
    expect(() => assertNewAgentIdAfterTerminal("REVOKED", "agent-1", "agent-1")).toThrow();
    expect(() => assertNewAgentIdAfterTerminal("REVOKED", "agent-1", "agent-2")).not.toThrow();
    expect(() => assertNewAgentIdAfterTerminal("DEREGISTERED", "agent-1", "agent-1")).toThrow();
    expect(() => assertNewAgentIdAfterTerminal("ACTIVE", "agent-1", "agent-1")).not.toThrow();
  });
});

describe("self-modification rejection", () => {
  it("rejects an agent transitioning its own status", () => {
    const agent = transitionAgentStatus(draftAgent(), "PENDING_VALIDATION", "governance-actor", NOW);
    expect(() => transitionAgentStatus(agent, "REGISTERED", "agent-1", NOW)).toThrow();
  });

  it("permits a distinct governance actor to transition the status", () => {
    const agent = transitionAgentStatus(draftAgent(), "PENDING_VALIDATION", "governance-actor", NOW);
    expect(() => transitionAgentStatus(agent, "REGISTERED", "governance-actor", NOW)).not.toThrow();
  });

  it("rejects self-modification of any protected field, not only status", () => {
    expect(() => assertNoSelfModification("agent-1", "agent-1", ["permissionProfileId"])).toThrow();
    expect(() => assertNoSelfModification("agent-1", "agent-1", ["capabilityDeclarationIds", "contractVersion"])).toThrow();
    expect(() => assertNoSelfModification("agent-2", "agent-1", ["permissionProfileId"])).not.toThrow();
  });
});

describe("character attribution and presence mode grant no authority", () => {
  it("recognizes exactly the five approved values", () => {
    expect(CHARACTER_ATTRIBUTIONS).toEqual(["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"]);
  });

  it("rejects an unrecognized attribution value", () => {
    expect(() => assertCharacterAttribution("SUPERUSER")).toThrow();
  });

  it("never exposes an approval, permission-grant, or authority field on the identity record itself", () => {
    const agent = draftAgent({ characterAttribution: "ONYX_NOVA_COUNCIL", presenceMode: "ONYX_NOVA_COUNCIL" });
    const keys = Object.keys(agent);
    expect(keys).not.toContain("approvalId");
    expect(keys).not.toContain("approved");
    expect(keys).not.toContain("authority");
    // character attribution alone changes no other field: permission/memory/budget profile ids are unaffected.
    const baseline = draftAgent();
    expect(agent.permissionProfileId).toBe(baseline.permissionProfileId);
    expect(agent.memoryAccessProfileId).toBe(baseline.memoryAccessProfileId);
  });
});
