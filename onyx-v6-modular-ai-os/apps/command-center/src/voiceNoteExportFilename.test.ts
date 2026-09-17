import { describe, expect, it } from "vitest";
import { extensionForVoiceNoteMediaType, resolveVoiceNoteExportFilename, sanitizeVoiceNoteExportFilenameBase } from "./voiceNoteExportFilename";

describe("extensionForVoiceNoteMediaType", () => {
  it("maps known audio families to their extension", () => {
    expect(extensionForVoiceNoteMediaType("audio/webm;codecs=opus")).toBe(".webm");
    expect(extensionForVoiceNoteMediaType("audio/mp4")).toBe(".m4a");
    expect(extensionForVoiceNoteMediaType("audio/ogg;codecs=opus")).toBe(".ogg");
    expect(extensionForVoiceNoteMediaType("audio/mpeg")).toBe(".mp3");
  });

  it("never maps mp3 unless the actual type is audio/mpeg", () => {
    expect(extensionForVoiceNoteMediaType("audio/webm")).not.toBe(".mp3");
    expect(extensionForVoiceNoteMediaType("audio/mp4")).not.toBe(".mp3");
  });

  it("falls back to a bounded extension for unknown/empty types", () => {
    expect(extensionForVoiceNoteMediaType("audio/x-totally-unknown")).toBe(".audio");
    expect(extensionForVoiceNoteMediaType("")).toBe(".audio");
    expect(extensionForVoiceNoteMediaType(undefined)).toBe(".audio");
  });
});

describe("sanitizeVoiceNoteExportFilenameBase", () => {
  it("strips unsafe path characters and control characters", () => {
    expect(sanitizeVoiceNoteExportFilenameBase('a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
  });

  it("trims leading/trailing periods and spaces and bounds length", () => {
    expect(sanitizeVoiceNoteExportFilenameBase("  . hello . ")).toBe("hello");
    expect(sanitizeVoiceNoteExportFilenameBase("x".repeat(500)).length).toBeLessThanOrEqual(120);
  });

  it("falls back to a default name for an empty title", () => {
    expect(sanitizeVoiceNoteExportFilenameBase("   ")).toBe("Voice note");
  });
});

describe("resolveVoiceNoteExportFilename", () => {
  it("combines the sanitized title with the correct extension", () => {
    expect(resolveVoiceNoteExportFilename("Testing file", "audio/webm;codecs=opus")).toBe("Testing file.webm");
    expect(resolveVoiceNoteExportFilename("Testing file - Trimmed", "audio/webm;codecs=opus")).toBe("Testing file - Trimmed.webm");
  });

  it("does not rename the Note itself (pure function, no side effects)", () => {
    const title = "Meeting notes";
    resolveVoiceNoteExportFilename(title, "audio/mp4");
    expect(title).toBe("Meeting notes");
  });
});
