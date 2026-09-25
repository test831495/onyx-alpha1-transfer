import type { Handler } from "@netlify/functions";
import { createProductionAuthenticationProvider } from "./google-runtime-entry";

const json = (body: unknown, statusCode = 200) => ({ statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) });
const MAX_BODY_LENGTH = 24000;
const MAX_OUTPUT_LENGTH = 1200;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Method not allowed" }, 405);
  const modelProvider = process.env.ONYX_CONVERSATION_MODEL_PROVIDER;
  const alphaMode = modelProvider === "openai" && process.env.ONYX_OPENAI_ALPHA_MODE === "true";
  const authorization = event.headers.authorization ?? event.headers.Authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const authenticationProvider = createProductionAuthenticationProvider(process.env);
  const decision = alphaMode
    ? undefined
    : token && authenticationProvider
      ? authenticationProvider.verifyProof(token, Math.floor(Date.now() / 1000))
      : undefined;
  if (!alphaMode && (!token || !authenticationProvider)) return json({ error: "Authentication unavailable" }, 503);
  if (!alphaMode && (!decision?.allowed || !decision.proof)) return json({ error: "Authentication required" }, 401);

  try {
    if (!event.body || event.body.length > MAX_BODY_LENGTH) return json({ error: "Request too large" }, 413);
    const request = JSON.parse(event.body) as Record<string, unknown>;
    const required = ["requestId", "sessionId", "turnId", "selectedSpeaker", "conversationPurpose", "responseMode", "responseObjectives"];
    if (required.some((key) => request[key] === undefined)) return json({ error: "Malformed request" }, 400);
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (modelProvider !== "openai" || !apiKey || !model) return json({ error: "Conversation generation unavailable" }, 503);

    const speaker = request.selectedSpeaker === "ONYX" ? "ONYX" : "NOVA";
    const system = speaker === "ONYX"
      ? "You are ONYX: strategic, analytical, concise, executive, and evidence-aware. Never claim emotion, consciousness, authority, approval, or execution."
      : "You are NOVA: warm, collaborative, plain-language, and practical. Never claim emotion, consciousness, authority, approval, or execution.";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 300,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ purpose: request.conversationPurpose, responseMode: request.responseMode, objectives: request.responseObjectives, topic: request.currentTopic, supportedClaims: request.supportedClaims, prohibitedClaims: request.prohibitedClaims, truthStatus: request.truthStatus, language: request.language }) },
        ],
      }),
    });
    if (!response.ok) return json({ error: "Conversation generation unavailable" }, 503);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || text.length > MAX_OUTPUT_LENGTH) return json({ error: "Malformed model response" }, 502);
    if (decision?.proof && authenticationProvider) authenticationProvider.deriveAuthenticatedContext(decision.proof, `request_${crypto.randomUUID()}` as `request_${string}`);
    return json({ requestId: request.requestId, adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text, language: request.language, finishReason: "STOP", generationReceiptVersion: "B5F-1" });
  } catch {
    return json({ error: "Conversation generation unavailable" }, 503);
  }
};
