export const VOICE_NOTE_FORMAT_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export type VoiceNotePlaybackSupport = "probably" | "maybe" | "";

export interface VoiceNoteFormatProbe {
  readonly isTypeSupported?: (mimeType: string) => boolean;
  readonly canPlayType?: (mimeType: string) => VoiceNotePlaybackSupport | undefined;
}

export interface VoiceNoteFormatResolution {
  readonly selected?: string;
  readonly playbackSupport?: VoiceNotePlaybackSupport;
  readonly candidates: readonly {
    readonly mimeType: string;
    readonly recordable: boolean;
    readonly playback: VoiceNotePlaybackSupport;
  }[];
}

export interface VoiceNoteMediaTypeEvidence {
  readonly recorderType?: string;
  readonly chunkTypes: readonly string[];
  readonly finalBlobType?: string;
}

export function playbackSupportFor(audio: Pick<HTMLAudioElement, "canPlayType"> | undefined, mimeType: string): VoiceNotePlaybackSupport | undefined {
  if (!audio || typeof audio.canPlayType !== "function") return undefined;
  const result = audio.canPlayType(mimeType);
  return result === "probably" || result === "maybe" ? result : "";
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function resolveVoiceNoteFormat(probe: VoiceNoteFormatProbe): VoiceNoteFormatResolution {
  const candidates = VOICE_NOTE_FORMAT_CANDIDATES.map((mimeType) => {
    const recordable = probe.isTypeSupported?.(mimeType) === true;
    const playback = probe.canPlayType?.(mimeType) ?? "";
    return { mimeType, recordable, playback };
  });
  const eligible = candidates.filter((candidate) => candidate.recordable && (candidate.playback === "probably" || candidate.playback === "maybe"));
  eligible.sort((left, right) => Number(right.playback === "probably") - Number(left.playback === "probably"));
  const selected = eligible[0];
  return { selected: selected?.mimeType, playbackSupport: selected?.playback, candidates };
}

export function resolveAuthoritativeVoiceNoteMediaType(evidence: VoiceNoteMediaTypeEvidence): string {
  const recorderType = clean(evidence.recorderType);
  const chunkTypes = evidence.chunkTypes.map(clean).filter(Boolean);
  const distinctChunkTypes = [...new Set(chunkTypes)];
  if (distinctChunkTypes.length > 1) throw new Error("RECORDER_OUTPUT_FORMAT_CONFLICT");
  const chunkType = distinctChunkTypes[0] ?? "";
  const finalBlobType = clean(evidence.finalBlobType);
  if (recorderType && chunkType && recorderType !== chunkType) throw new Error("RECORDER_OUTPUT_FORMAT_CONFLICT");
  if (recorderType && finalBlobType && recorderType !== finalBlobType) throw new Error("RECORDER_OUTPUT_FORMAT_CONFLICT");
  if (chunkType && finalBlobType && chunkType !== finalBlobType) throw new Error("RECORDER_OUTPUT_FORMAT_CONFLICT");
  return recorderType || chunkType || finalBlobType;
}
