import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "../voice-status.mjs";

const savedKey = process.env.AZURE_SPEECH_KEY;
const savedRegion = process.env.AZURE_SPEECH_REGION;

beforeEach(() => {
  delete process.env.AZURE_SPEECH_KEY;
  delete process.env.AZURE_SPEECH_REGION;
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.AZURE_SPEECH_KEY;
  else process.env.AZURE_SPEECH_KEY = savedKey;
  if (savedRegion === undefined) delete process.env.AZURE_SPEECH_REGION;
  else process.env.AZURE_SPEECH_REGION = savedRegion;
});

describe("voice-status", () => {
  it("reports exact missing Azure configuration names", async () => {
    const response = await handler(new Request("http://localhost/.netlify/functions/voice-status?provider=azure"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: "azure", ready: false, missingEnvironmentVariables: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"] });
  });
});
