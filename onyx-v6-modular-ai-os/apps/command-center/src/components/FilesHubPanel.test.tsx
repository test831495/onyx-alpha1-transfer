import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FilesHubPanel } from "./FilesHubPanel";

const sources = [
  { sourceId: "local" as const, displayName: "Local Files", providerFamily: "local", availability: "AVAILABLE" as const, connection: "CONNECTED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: true }] },
  { sourceId: "microsoft-onedrive" as const, displayName: "OneDrive", providerFamily: "microsoft", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
  { sourceId: "microsoft-sharepoint" as const, displayName: "SharePoint", providerFamily: "microsoft", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
  { sourceId: "google-drive" as const, displayName: "Google Drive", providerFamily: "google", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
];

describe("Files Hub", () => {
  it("stays available and shows every source while cloud providers are disconnected", () => {
    const html = renderToStaticMarkup(<FilesHubPanel sources={sources} />);
    expect(html).toContain("Browse local and connected file sources.");
    expect(html).toContain("Local Files");
    expect(html).toContain("OneDrive");
    expect(html).toContain("SharePoint");
    expect(html).toContain("Google Drive");
    expect(html).not.toContain("Files unavailable");
  });

  it("does not connect or browse a provider while rendering", () => {
    const onMicrosoftAction = vi.fn();
    const onGoogleAction = vi.fn();
    renderToStaticMarkup(<FilesHubPanel sources={sources} onMicrosoftAction={onMicrosoftAction} onGoogleAction={onGoogleAction} />);
    expect(onMicrosoftAction).not.toHaveBeenCalled();
    expect(onGoogleAction).not.toHaveBeenCalled();
  });
});