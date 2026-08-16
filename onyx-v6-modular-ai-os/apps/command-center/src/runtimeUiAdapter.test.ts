import { describe, expect, it } from "vitest";
import { createIntelligenceRuntime } from "@onyx/intelligence-runtime";
const run = (text: string) => createIntelligenceRuntime().processInput({ text, source: "typed" });
describe("Command Center runtime adapter contract", () => {
  it("maps Calendar to a module intent", async () => expect((await run("Open Calendar")).intent).toMatchObject({ kind: "module.open", target: "calendar" }));
  it("keeps YouTube separate from Finance", async () => { const value = await run("Open YouTube"); expect(value.intent).toMatchObject({ kind: "app.launch", target: "youtube" }); expect(value.result).toMatchObject({ status: "unsupported", code: "APP_NOT_IMPLEMENTED" }); });
  it("prepares document search without selecting a panel", async () => expect((await run("Find architecture baseline")).intent).toMatchObject({ kind: "document.search", query: "architecture baseline" }));
  it("switches assistants", async () => expect((await run("Switch to Onyx")).intent).toEqual({ kind: "assistant.switch", assistant: "onyx" }));
  it("rejects unknown input", async () => expect((await run("Perform an unknown action")).result).toMatchObject({ status: "unsupported" }));
});
