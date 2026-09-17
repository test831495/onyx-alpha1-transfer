import { describe, expect, it, vi } from "vitest";
import type { Note } from "@onyx/workspace-contracts";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import { VoiceNotePlaybackController } from "./voiceNotePlaybackController";

type FakeAudio = {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  preload: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function makeAudio(): FakeAudio {
  return {
    src: "",
    currentTime: 0,
    duration: Number.NaN,
    paused: true,
    preload: "",
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function makeNote(audioReferenceId = "audio-1"): Note {
  return {
    noteId: "note-1",
    version: 1,
    title: "Voice note",
    content: "",
    type: "VOICE_NOTE",
    source: "LOCAL",
    tags: [],
    fileReferences: [],
    pinned: false,
    archived: false,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    futureFields: {
      audioReferenceId,
      durationMilliseconds: 4000,
      byteLength: 4,
      recordedMediaType: "audio/webm",
      recordingStatus: "SAVED",
      transcriptStatus: "NOT_REQUESTED",
    },
  } as Note;
}

describe("VoiceNotePlaybackController", () => {
  it("retrieves same-account audio, binds one object URL, and handles fulfilled play", async () => {
    const audio = makeAudio();
    const getAudio = vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm" }));
    const createObjectURL = vi.fn().mockReturnValue("blob:voice-note");
    const controller = new VoiceNotePlaybackController({
      accountScopeId: "account-a",
      audioRepository: { getAudio } as unknown as VoiceNoteAudioRepository,
      createAudio: () => audio as unknown as HTMLAudioElement,
      urlApi: { createObjectURL, revokeObjectURL: vi.fn() },
    });

    await controller.play(makeNote());

    expect(getAudio).toHaveBeenCalledWith("account-a", "audio-1");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(audio.src).toBe("blob:voice-note");
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(controller.getProjection()).toMatchObject({ state: "PLAYING", noteId: "note-1" });
  });

  it("does not claim playing when the browser rejects play", async () => {
    const audio = makeAudio();
    audio.play.mockRejectedValue(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
    const controller = new VoiceNotePlaybackController({
      accountScopeId: "account-a",
      audioRepository: { getAudio: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm" })) } as unknown as VoiceNoteAudioRepository,
      createAudio: () => audio as unknown as HTMLAudioElement,
      urlApi: { createObjectURL: vi.fn().mockReturnValue("blob:voice-note"), revokeObjectURL: vi.fn() },
    });

    await expect(controller.play(makeNote())).rejects.toMatchObject({ code: "PLAYBACK_NOT_ALLOWED" });
    expect(controller.getProjection()).toMatchObject({ state: "FAILED", errorCode: "PLAYBACK_NOT_ALLOWED" });
  });

  it("rejects a definitively unsupported persisted format before creating an object URL", async () => {
    const audio = makeAudio();
    const createObjectURL = vi.fn();
    const controller = new VoiceNotePlaybackController({
      accountScopeId: "account-a",
      audioRepository: { getAudio: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm;codecs=opus" })) } as unknown as VoiceNoteAudioRepository,
      createAudio: () => audio as unknown as HTMLAudioElement,
      canPlayType: (type) => type === "audio/mp4" ? "probably" : "",
      urlApi: { createObjectURL, revokeObjectURL: vi.fn() },
    });

    const note = { ...makeNote(), futureFields: { ...makeNote().futureFields, recordedMediaType: "audio/webm;codecs=opus" } };
    await expect(controller.play(note)).rejects.toMatchObject({ code: "PLAYBACK_FORMAT_UNSUPPORTED" });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("projects metadata, timeupdate, seek, restart, ended, and cleanup", async () => {
    const audio = makeAudio();
    const listeners = new Map<string, EventListener>();
    audio.addEventListener.mockImplementation((name: string, listener: EventListener) => listeners.set(name, listener));
    const revokeObjectURL = vi.fn();
    const controller = new VoiceNotePlaybackController({
      accountScopeId: "account-a",
      audioRepository: { getAudio: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm" })) } as unknown as VoiceNoteAudioRepository,
      createAudio: () => audio as unknown as HTMLAudioElement,
      urlApi: { createObjectURL: vi.fn().mockReturnValue("blob:voice-note"), revokeObjectURL },
    });

    await controller.play(makeNote());
    audio.duration = 4;
    listeners.get("loadedmetadata")?.(new Event("loadedmetadata"));
    audio.currentTime = 1.5;
    listeners.get("timeupdate")?.(new Event("timeupdate"));
    expect(controller.getProjection()).toMatchObject({ duration: 4, current: 1.5 });

    controller.seek(3);
    expect(audio.currentTime).toBe(3);
    controller.restart();
    expect(audio.currentTime).toBe(0);
    listeners.get("ended")?.(new Event("ended"));
    expect(controller.getProjection()).toMatchObject({ state: "ENDED", current: 4 });

    controller.dispose();
    expect(audio.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:voice-note");
  });
});
