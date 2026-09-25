import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../voice-synthesize.mjs";

const ENV_KEYS = ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
});

function request(body: unknown) {
  return handler(new Request("http://localhost/.netlify/functions/voice-synthesize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("voice-synthesize", () => {
  it("reports exact missing Azure variables without values", async () => {
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
    const response = await request({ provider: "azure", text: "hello" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "VOICE_PROVIDER_NOT_CONFIGURED", missingEnvironmentVariables: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"] });
  });

  it.each([
    ["ONYX", "ONYX_AZURE_EN_IN_PRABHAT", "en-IN-PrabhatNeural", "-5%", "-2%"],
    ["NOVA", "NOVA_AZURE_EN_IN_NEERJA", "en-IN-NeerjaNeural", "0%", "0%"],
  ] as const)("creates safe expressive SSML for %s", async (_character, voiceProfileId, voiceId, rate, pitch) => {
    process.env.AZURE_SPEECH_KEY = "azure-test-key";
    process.env.AZURE_SPEECH_REGION = "eastus";
    let azureRequest: Request | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      azureRequest = new Request(input, init);
      return new Response(new Blob(["audio"]), { status: 200 });
    }));
    const response = await request({ provider: "azure", text: "A <safe> & clear.", voiceId, voiceProfileId, language: "en-IN" });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("audio/mpeg");
    const ssml = await azureRequest!.text();
    expect(ssml).toContain(`<voice name='${voiceId}'>`);
    expect(ssml).toContain(`rate='${rate}'`);
    expect(ssml).toContain(`pitch='${pitch}'`);
    expect(ssml).toContain("&lt;safe&gt; &amp; clear.");
    expect(ssml).not.toContain("A <safe>");
    expect(azureRequest!.headers.get("Ocp-Apim-Subscription-Key")).toBe("azure-test-key");
  });
});
