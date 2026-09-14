import { describe, expect, it } from "vitest";
import { LocalFileCapabilityRegistry, LocalFileEditorRegistry, LocalFileMetadataRegistry, LocalFileViewerRegistry, findLocalViewer } from "./localFileRegistries";
import { LocalFileConverterRegistry } from "./localFileConverters";

describe("Local Files registries", () => {
  it("registers ten independent Tier 1 capabilities", () => {
    expect(LocalFileCapabilityRegistry).toHaveLength(10);
    expect(LocalFileViewerRegistry.map((viewer) => viewer.capabilityId)).toEqual(LocalFileCapabilityRegistry);
    expect(LocalFileEditorRegistry).toEqual(["text-editor", "code-editor"]);
    expect(LocalFileConverterRegistry.length).toBeGreaterThan(0);
    expect(LocalFileMetadataRegistry.length).toBeGreaterThan(0);
  });

  it("resolves MIME before shared extensions and keeps logs distinct", () => {
    expect(findLocalViewer(".mp4", "video/mp4")?.capabilityId).toBe("video-player");
    expect(findLocalViewer(".mp4", "audio/mp4")?.capabilityId).toBe("audio-player");
    expect(findLocalViewer(".jsonl", "text/plain")?.capabilityId).toBe("log-viewer");
    expect(findLocalViewer(".docx", "application/octet-stream")?.capabilityId).toBe("office-preview");
  });
});