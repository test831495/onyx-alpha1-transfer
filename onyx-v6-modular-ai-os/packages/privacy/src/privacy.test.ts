import { describe, expect, it } from "vitest";
import type { AssistantMode, CommandEnvelope } from "@onyx/contracts";
import { classifyCommand } from "./index";

function command(
  mode: AssistantMode,
  text: string,
): CommandEnvelope {
  return {
    id: "test-command",
    mode,
    text,
    timestamp: new Date().toISOString(),
    context: {},
    requestedScopes: [],
  };
}

describe("ONYX privacy routing", () => {
  it("routes local-file requests to NOVA local processing", () => {
    const decision = classifyCommand(
      command("nova", "Search my files for the architecture document"),
    );

    expect(decision.allowed).toBe(true);
    expect(decision.route).toBe("local");
  });

  it("does not silently route live cloud requests from NOVA", () => {
    const decision = classifyCommand(
      command("nova", "Show me the latest market news"),
    );

    expect(decision.allowed).toBe(false);
    expect(decision.route).toBe("ask-user");
  });

  it("allows an explicit ONYX cloud-intelligence request", () => {
    const decision = classifyCommand(
      command("onyx", "Show me the latest market news"),
    );

    expect(decision.allowed).toBe(true);
    expect(decision.route).toBe("cloud");
  });

  it("blocks secret-like content from assistant processing", () => {
    const decision = classifyCommand(
      command("onyx", "Show my API key"),
    );

    expect(decision.allowed).toBe(false);
    expect(decision.route).toBe("ask-user");
  });
});
