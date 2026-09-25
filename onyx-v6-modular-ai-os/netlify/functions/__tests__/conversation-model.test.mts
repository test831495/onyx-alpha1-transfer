import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { default: handler } = await import("../conversation-model.mts");

const SOURCE_PATH = fileURLToPath(new URL("../conversation-model.mts", import.meta.url));

const ENV_KEYS = ["ONYX_CONVERSATION_MODEL_PROVIDER", "ONYX_OPENAI_ALPHA_MODE", "ONYX_OPENAI_API_KEY", "OPENAI_MODEL"] as const;
const savedEnv: Record<string, string | undefined> = {};

const VALID_BODY = {
  requestId: "r1", sessionId: "s1", turnId: "t1", userText: "Hello", selectedSpeaker: "ONYX", selectionReason: "EXPLICIT_ONYX",
  conversationPurpose: "p", responseMode: "m", responseObjectives: [],
};

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

function postRequest(body: unknown) {
  return handler(new Request("http://localhost/.netlify/functions/conversation-model", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

function enableAlphaMode() {
  process.env.ONYX_CONVERSATION_MODEL_PROVIDER = "openai";
  process.env.ONYX_OPENAI_ALPHA_MODE = "true";
}

describe("conversation-model static source shape", () => {
  it("has no dependency path to the auth/database dependency graph", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).not.toMatch(/google-runtime-entry/);
    expect(source).not.toMatch(/account-authentication-server-authority/);
    expect(source).not.toMatch(/@netlify\/database/);
    expect(source).not.toMatch(/google-auth-library/);
    expect(source).not.toMatch(/module\.exports/);
    expect(source).not.toMatch(/exports\.handler/);
    expect(source).not.toMatch(/require\(/);
  });

  it("uses an ESM default export", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).toMatch(/export default async function handler/);
  });

  it("uses the Responses API without legacy completion parameters", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).toContain("https://api.openai.com/v1/responses");
    expect(source).toContain("max_output_tokens");
    expect(source).toContain("store: false");
    expect(source).not.toMatch(/\bmax_tokens\b/);
    expect(source).not.toMatch(/max_completion_tokens/);
    expect(source).not.toContain("chat/completions");
  });
});

describe("conversation-model handler", () => {
  it("rejects non-POST methods with 405", async () => {
    const response = await handler(new Request("http://localhost/.netlify/functions/conversation-model", { method: "GET" }));
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(405);
    const payload = await response.json();
    expect(payload).toEqual({ error: "Method not allowed" });
  });

  it("fails closed with 503 and a stable code when alpha mode is disabled, without any external import", async () => {
    delete process.env.ONYX_CONVERSATION_MODEL_PROVIDER;
    delete process.env.ONYX_OPENAI_ALPHA_MODE;
    const response = await postRequest(VALID_BODY);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload).toEqual({ error: "Conversation generation unavailable", code: "CONVERSATION_MODEL_ALPHA_DISABLED" });
  });

  it("returns 503 when the provider is anything other than exact 'openai'", async () => {
    process.env.ONYX_CONVERSATION_MODEL_PROVIDER = "azure";
    process.env.ONYX_OPENAI_ALPHA_MODE = "true";
    const response = await postRequest(VALID_BODY);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload).toEqual({ error: "Conversation generation unavailable", code: "CONVERSATION_MODEL_ALPHA_DISABLED" });
  });

  it("returns 503 when the alpha flag is anything other than exact 'true'", async () => {
    process.env.ONYX_CONVERSATION_MODEL_PROVIDER = "openai";
    process.env.ONYX_OPENAI_ALPHA_MODE = "TRUE";
    const response = await postRequest(VALID_BODY);
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload).toEqual({ error: "Conversation generation unavailable", code: "CONVERSATION_MODEL_ALPHA_DISABLED" });
  });

  it("rejects an invalid body with 400 when alpha mode is enabled", async () => {
    enableAlphaMode();
    process.env.ONYX_OPENAI_API_KEY = "sk-test-key";
    process.env.OPENAI_MODEL = "gpt-test";
    const response = await postRequest({ text: "hello" });
    expect([400, 422]).toContain(response.status);
  });

  it("rejects empty or oversized userText", async () => {
    enableAlphaMode();
    process.env.ONYX_OPENAI_API_KEY = "sk-test-key";
    process.env.OPENAI_MODEL = "gpt-test";
    expect((await postRequest({ ...VALID_BODY, userText: "   " })).status).toBe(400);
    expect((await postRequest({ ...VALID_BODY, userText: "x".repeat(2001) })).status).toBe(400);
  });

  it("fails safely when ONYX_OPENAI_API_KEY is missing", async () => {
    enableAlphaMode();
    delete process.env.ONYX_OPENAI_API_KEY;
    process.env.OPENAI_MODEL = "gpt-test";
    const response = await postRequest(VALID_BODY);
    expect(response.status).toBe(503);
    const rawBody = await response.text();
    expect(rawBody).not.toContain("ONYX_OPENAI_API_KEY");
  });

  it("fails safely when OPENAI_MODEL is missing", async () => {
    enableAlphaMode();
    process.env.ONYX_OPENAI_API_KEY = "sk-super-secret-value";
    delete process.env.OPENAI_MODEL;
    const response = await postRequest(VALID_BODY);
    expect(response.status).toBe(503);
    const rawBody = await response.text();
    expect(rawBody).not.toContain("sk-super-secret-value");
  });

  it("reaches the mocked OpenAI fetch path and returns a provider-neutral result when alpha mode is true", async () => {
    enableAlphaMode();
    process.env.ONYX_OPENAI_API_KEY = "sk-super-secret-value";
    process.env.OPENAI_MODEL = "gpt-test";
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: "hi" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const response = await postRequest(VALID_BODY);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    const openAiRequest = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(openAiRequest.input[0].content[0].text).toContain('"userText":"Hello"');
    expect(openAiRequest.store).toBe(false);
    expect(openAiRequest.max_output_tokens).toBe(300);
    expect(openAiRequest.max_tokens).toBeUndefined();
    expect(openAiRequest.max_completion_tokens).toBeUndefined();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      requestId: "r1", adapterId: "openai-conversation-server", modelReferenceSafe: "configured",
      text: "hi", language: undefined, finishReason: "STOP", generationReceiptVersion: "B5F-1", generationMode: "MODEL_GENERATED", selectedSpeaker: "ONYX", selectionReason: "EXPLICIT_ONYX", providerRequestSucceeded: true,
    });
    const rawBody = JSON.stringify(payload);
    expect(rawBody).not.toContain("sk-super-secret-value");
  });

  it("returns a sanitized provider failure receipt", async () => {
    enableAlphaMode();
    process.env.ONYX_OPENAI_API_KEY = "sk-super-secret-value";
    process.env.OPENAI_MODEL = "gpt-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_request_error", type: "invalid_request", message: "safe diagnostic" } }), { status: 400 })));
    const response = await postRequest(VALID_BODY);
    const payload = await response.json();
    expect(payload).toMatchObject({ generationMode: "PROVIDER_FAILURE", selectedSpeaker: "ONYX", providerRequestSucceeded: false, providerErrorCode: "invalid_request_error", retryable: false });
    expect(payload.openaiType).toBeUndefined();
    expect(payload.openaiMessage).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("sk-super-secret-value");
    expect(JSON.stringify(payload)).not.toContain("authorization");
  });
});

