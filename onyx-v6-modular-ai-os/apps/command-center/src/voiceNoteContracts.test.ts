import { describe, expect, it } from "vitest";
import {
  MIN_VOICE_NOTE_CLIP_DURATION_MILLISECONDS,
  defaultTrimmedVoiceNoteTitle,
  defaultVoiceNoteTitle,
  friendlyVoiceNoteMediaLabel,
  isValidTrimRange,
  isValidVoiceNoteClipMetadata,
  normalizeVoiceNoteTitle,
} from "./voiceNoteContracts";

describe("voice note title defaults and normalization", () => {
  it("formats a deterministic default title from a date", () => {
    expect(defaultVoiceNoteTitle(new Date(2026, 8, 17, 9, 5))).toBe("Voice note 2026-09-17 09:05");
  });

  it("builds a default trimmed title suffix", () => {
    expect(defaultTrimmedVoiceNoteTitle("Meeting notes")).toBe("Meeting notes - Trimmed");
  });

  it("trims, rejects blank, and bounds title length", () => {
    expect(normalizeVoiceNoteTitle("  Hello  ")).toBe("Hello");
    expect(normalizeVoiceNoteTitle("   ")).toBe("");
    expect(normalizeVoiceNoteTitle("x".repeat(500)).length).toBe(200);
  });
});

describe("friendly media label", () => {
  it("maps known MIME families to friendly labels without altering the exact value elsewhere", () => {
    expect(friendlyVoiceNoteMediaLabel("audio/webm;codecs=opus")).toBe("WebM (Opus)");
    expect(friendlyVoiceNoteMediaLabel("audio/mp4")).toBe("MP4 Audio");
    expect(friendlyVoiceNoteMediaLabel("audio/ogg;codecs=opus")).toBe("Ogg (Opus)");
    expect(friendlyVoiceNoteMediaLabel("audio/x-unknown-codec")).toBe("audio/x-unknown-codec");
    expect(friendlyVoiceNoteMediaLabel("")).toBe("Browser-selected audio");
    expect(friendlyVoiceNoteMediaLabel(undefined)).toBe("Browser-selected audio");
  });
});

describe("trim range validation", () => {
  it("accepts a valid range and enforces the minimum clip duration", () => {
    expect(isValidTrimRange({ trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, durationMilliseconds: 20000 })).toBe(true);
    expect(isValidTrimRange({ trimStartMilliseconds: 0, trimEndMilliseconds: MIN_VOICE_NOTE_CLIP_DURATION_MILLISECONDS, durationMilliseconds: 20000 })).toBe(true);
    expect(isValidTrimRange({ trimStartMilliseconds: 0, trimEndMilliseconds: MIN_VOICE_NOTE_CLIP_DURATION_MILLISECONDS - 1, durationMilliseconds: 20000 })).toBe(false);
  });

  it("rejects start below zero, end above duration, and start >= end", () => {
    expect(isValidTrimRange({ trimStartMilliseconds: -1, trimEndMilliseconds: 5000, durationMilliseconds: 20000 })).toBe(false);
    expect(isValidTrimRange({ trimStartMilliseconds: 5000, trimEndMilliseconds: 21000, durationMilliseconds: 20000 })).toBe(false);
    expect(isValidTrimRange({ trimStartMilliseconds: 5000, trimEndMilliseconds: 5000, durationMilliseconds: 20000 })).toBe(false);
    expect(isValidTrimRange({ trimStartMilliseconds: 6000, trimEndMilliseconds: 5000, durationMilliseconds: 20000 })).toBe(false);
  });

  it("rejects non-finite inputs", () => {
    expect(isValidTrimRange({ trimStartMilliseconds: Number.NaN, trimEndMilliseconds: 5000, durationMilliseconds: 20000 })).toBe(false);
    expect(isValidTrimRange({ trimStartMilliseconds: 0, trimEndMilliseconds: Number.POSITIVE_INFINITY, durationMilliseconds: 20000 })).toBe(false);
  });

  it("validates full derived-clip metadata shape", () => {
    const valid = { sourceNoteId: "note-1", sourceAudioReferenceId: "audio-1", trimStartMilliseconds: 5000, trimEndMilliseconds: 15000, originalDurationMilliseconds: 20000, derivedFromVoiceNote: true as const };
    expect(isValidVoiceNoteClipMetadata(valid)).toBe(true);
    expect(isValidVoiceNoteClipMetadata({ ...valid, sourceNoteId: "" })).toBe(false);
    expect(isValidVoiceNoteClipMetadata({ ...valid, trimEndMilliseconds: 25000 })).toBe(false);
    expect(isValidVoiceNoteClipMetadata(undefined)).toBe(false);
  });
});
