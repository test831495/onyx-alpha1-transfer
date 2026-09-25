const json = (value, status = 400) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[character]));
const addSentencePauses = (value) => value.replace(/([.!?])\s+/g, "$1<break time='180ms'/>");

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { provider, text, voiceId, voiceProfileId, language } = await request.json();
  if (!text || text.length > 2000) return json({ error: "Invalid text" });

  if (provider === "azure") {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    const missingEnvironmentVariables = [
      ...(key ? [] : ["AZURE_SPEECH_KEY"]),
      ...(region ? [] : ["AZURE_SPEECH_REGION"]),
    ];
    if (missingEnvironmentVariables.length > 0) return json({ code: "VOICE_PROVIDER_NOT_CONFIGURED", missingEnvironmentVariables }, 503);
    const voice = voiceId || process.env.AZURE_SPEECH_DEFAULT_VOICE || "en-IN-NeerjaNeural";
    const isOnyx = voiceProfileId === "ONYX_AZURE_EN_IN_PRABHAT" || voice === "en-IN-PrabhatNeural";
    const content = addSentencePauses(escapeXml(text));
    const body = `<speak version='1.0' xml:lang='${escapeXml(language || "en-IN")}'><voice name='${escapeXml(voice)}'><prosody rate='${isOnyx ? "-5%" : "0%"}' pitch='${isOnyx ? "-2%" : "0%"}'>${content}</prosody></voice></speak>`;
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "ONYX" },
      body,
    });
    if (!response.ok) return json({ code: "AZURE_SPEECH_FAILED", message: `Azure Speech failed (${response.status}).` }, 502);
    return new Response(response.body, { headers: { "content-type": "audio/mpeg", "x-voice-provider": "azure" } });
  }

  if (provider === "elevenlabs") {
    const key = process.env.ELEVENLABS_API_KEY;
    const id = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID;
    const missingEnvironmentVariables = [
      ...(key ? [] : ["ELEVENLABS_API_KEY"]),
      ...(id ? [] : ["ELEVENLABS_DEFAULT_VOICE_ID"]),
    ];
    if (missingEnvironmentVariables.length > 0) return json({ code: "VOICE_PROVIDER_NOT_CONFIGURED", missingEnvironmentVariables }, 503);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5" }),
    });
    if (!response.ok) return json({ code: "ELEVENLABS_FAILED", message: `ElevenLabs failed (${response.status}).` }, 502);
    return new Response(response.body, { headers: { "content-type": "audio/mpeg", "x-voice-provider": "elevenlabs" } });
  }

  return json({ error: "Unknown provider" });
}
