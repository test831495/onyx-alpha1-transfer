const json = (body: unknown, statusCode = 200) => new Response(JSON.stringify(body), { status: statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const MAX_BODY_LENGTH = 24000;
const MAX_OUTPUT_LENGTH = 1200;
const REQUEST_TIMEOUT_MS = 15000;

type ResponsesPayload = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
};

function parseResponseText(payload: ResponsesPayload): string {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => typeof content.text === "string" ? content.text : "")
    .join("\n")
    .trim();
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const alphaMode =
    process.env.ONYX_CONVERSATION_MODEL_PROVIDER === "openai" &&
    process.env.ONYX_OPENAI_ALPHA_MODE === "true";
  if (!alphaMode) return json({ error: "Conversation generation unavailable", code: "CONVERSATION_MODEL_ALPHA_DISABLED" }, 503);

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > MAX_BODY_LENGTH) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const required = ["requestId", "sessionId", "turnId", "userText", "selectedSpeaker", "selectionReason", "conversationPurpose", "responseMode", "responseObjectives"];
    if (required.some((key) => body[key] === undefined)) return json({ error: "Malformed request" }, 400);
    if (typeof body.userText !== "string" || !body.userText.trim() || body.userText.length > 2000) return json({ error: "Malformed request" }, 400);
    const apiKey = process.env.ONYX_OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) return json({ error: "Conversation generation unavailable" }, 503);

    const speaker = body.selectedSpeaker === "ONYX" ? "ONYX" : "NOVA";
    const instructions = speaker === "ONYX"
      ? "You are ONYX: strategic, analytical, concise, executive, and evidence-aware. Never claim emotion, consciousness, authority, approval, or execution. Return natural plain conversational prose. Avoid Markdown formatting, headings, tables, code fences, and decorative symbols unless formatting is explicitly requested by the user."
      : "You are NOVA: warm, collaborative, plain-language, and practical. Never claim emotion, consciousness, authority, approval, or execution. Return natural plain conversational prose. Avoid Markdown formatting, headings, tables, code fences, and decorative symbols unless formatting is explicitly requested by the user.";
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify({ userText: body.userText, selectedSpeaker: body.selectedSpeaker, purpose: body.conversationPurpose, responseMode: body.responseMode, objectives: body.responseObjectives, topic: body.currentTopic, supportedClaims: body.supportedClaims, prohibitedClaims: body.prohibitedClaims, truthStatus: body.truthStatus, language: body.language, trustedCapabilityFacts: body.trustedCapabilityFacts, sourceReferences: body.sourceReferences }) }] }],
          max_output_tokens: 300,
          store: false,
        }),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      let providerError: { error?: { code?: unknown; type?: unknown; message?: unknown } } = {};
      try {
        providerError = await response.json() as typeof providerError;
      } catch {
        providerError = {};
      }
      const providerDetails = providerError.error;
      return json({
        error: "Conversation generation unavailable",
        generationMode: "PROVIDER_FAILURE",
        selectedSpeaker: speaker,
        selectionReason: body.selectionReason,
        providerRequestSucceeded: false,
        retryable: response.status >= 500 || response.status === 429,
        providerErrorCode: typeof providerDetails?.code === "string" ? providerDetails.code : "PROVIDER_REQUEST_FAILED",
        openaiStatus: response.status,
      }, 503);
    }
    const payload = await response.json() as ResponsesPayload;
    const text = parseResponseText(payload);
    if (!text || text.length > MAX_OUTPUT_LENGTH) return json({ error: "Malformed model response" }, 502);
    return json({ requestId: body.requestId, adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text, language: body.language, finishReason: "STOP", generationReceiptVersion: "B5F-1", generationMode: "MODEL_GENERATED", selectedSpeaker: speaker, selectionReason: body.selectionReason, providerRequestSucceeded: true });
  } catch {
    return json({ error: "Conversation generation unavailable" }, 503);
  }
}
