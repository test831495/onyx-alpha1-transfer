import { deepFreeze } from "./contracts";

export interface SyntheticModelRequest {
  readonly interactionId: string;
  readonly prompt: string;
  readonly evidenceReferences: readonly string[];
  readonly cancelled: boolean;
  readonly maxOutputCharacters: number;
}

export function createSyntheticModelAdapter(fixtureResponse: string) {
  const response = fixtureResponse.slice(0, 80);
  return deepFreeze({
    provider: "SYNTHETIC_LOCAL" as const,
    networkAccess: false as const,
    credentialsUsed: false as const,
    respond(request: SyntheticModelRequest) {
      if (request.cancelled) return deepFreeze({ status: "CANCELLED" as const, text: null, evidenceReferences: [] as string[], uncertainty: "UNKNOWN" as const, toolAuthority: false as const, memoryAuthority: false as const, usage: { inputCharacters: 0, outputCharacters: 0 } });
      const text = response.slice(0, Math.max(0, request.maxOutputCharacters));
      return deepFreeze({ status: "COMPLETE" as const, text, evidenceReferences: [...request.evidenceReferences], uncertainty: "SYNTHETIC_FIXTURE" as const, toolAuthority: false as const, memoryAuthority: false as const, usage: { inputCharacters: request.prompt.length, outputCharacters: text.length } });
    },
  });
}

export const INPUT_BOUNDARY = deepFreeze({
  baseline: "TEXT_INPUT_REQUIRED" as const,
  pushToTalk: {
    mode: "PUSH_TO_TALK_SYNTHETIC_ONLY" as const,
    transcriptFixtureOnly: true as const,
    microphoneCapture: false as const,
    speechToTextProvider: false as const,
    textToSpeechProvider: false as const,
    wakeWord: false as const,
    alwaysListening: false as const,
    rawAudioRetention: false as const,
    voiceRecognition: false as const,
    voiceBiometrics: false as const,
    voiceAuthorization: false as const,
  },
});