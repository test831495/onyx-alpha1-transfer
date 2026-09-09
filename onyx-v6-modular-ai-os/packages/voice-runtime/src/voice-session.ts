export type VoiceSessionState = "IDLE" | "LISTENING" | "UNDERSTANDING" | "RESPONDING" | "INTERRUPTED" | "OFFLINE";

export interface VoiceSessionOptions {
  readonly language: string;
  readonly maxFollowUps?: number;
  readonly accountId?: string;
  readonly sessionId?: string;
}

export interface VoiceSessionCancellation {
  readonly cancelled: true;
  readonly reason: string;
}

export function createVoiceSession({ language, maxFollowUps = 1, accountId, sessionId }: VoiceSessionOptions) {
  let state: VoiceSessionState = "IDLE";
  let microphoneRequested = false;
  let followUps = 0;
  const responses = new Set<string>();
  const navigations = new Set<string>();

  return Object.freeze({
    language,
    providerEnabled: false as const,
    get state() { return state; },
    get microphoneRequested() { return microphoneRequested; },
    tapToTalk(): VoiceSessionState {
      microphoneRequested = true;
      state = "LISTENING";
      return state;
    },
    orbitListen(): VoiceSessionState {
      return this.tapToTalk();
    },
    owns(owner: { readonly accountId: string; readonly sessionId: string }): boolean {
      return owner.accountId === accountId && owner.sessionId === sessionId;
    },
    understand(transcript: string): VoiceSessionState {
      if (!transcript.trim() || state !== "LISTENING") return state;
      state = "UNDERSTANDING";
      return state;
    },
    endTurn(transcript: string, spokenResponse: string) {
      state = "RESPONDING";
      return Object.freeze({ transcript, spokenResponse, consistent: Boolean(transcript.trim() && spokenResponse.trim()) });
    },
    beginResponse(responseId: string): boolean {
      if (responses.has(responseId) || state === "OFFLINE") return false;
      responses.add(responseId);
      state = "RESPONDING";
      return true;
    },
    navigate(navigationId: string): boolean {
      if (navigations.has(navigationId)) return false;
      navigations.add(navigationId);
      return true;
    },
    interrupt(): VoiceSessionState {
      state = "INTERRUPTED";
      return state;
    },
    bargeIn(): VoiceSessionState {
      return this.interrupt();
    },
    cancel(reason: string): VoiceSessionCancellation {
      state = "OFFLINE";
      return Object.freeze({ cancelled: true as const, reason });
    },
    followUp(): VoiceSessionState {
      if (followUps >= maxFollowUps) {
        state = "OFFLINE";
        return state;
      }
      followUps += 1;
      state = "LISTENING";
      return state;
    },
    reconnect(): VoiceSessionState {
      state = "LISTENING";
      return state;
    },
    fallback(): VoiceSessionState {
      state = "OFFLINE";
      return state;
    },
    releaseMicrophone(): VoiceSessionState {
      microphoneRequested = false;
      state = "IDLE";
      return state;
    },
  });
}