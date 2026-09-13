import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MicrosoftFilesPanel, presentBoundedWriteResult, type SharePointUiState } from "./MicrosoftFilesPanel";

const props = {
  available: true,
  onRead: vi.fn().mockResolvedValue({}),
  onWriteTest: vi.fn().mockResolvedValue({ cleanupVerified: true }),
  onResolveSharePoint: vi.fn(),
  onReadSharePoint: vi.fn(),
  onWriteSharePointTest: vi.fn(),
} as any;

describe("Microsoft Files SharePoint experience", () => {
  it("presents verified, unverified, and uncertain write outcomes consistently", () => {
    expect(presentBoundedWriteResult({ cleanupVerified: true, uncertainExternalEffect: false } as any)).toBe("Bounded Microsoft Files test completed. Cleanup verified.");
    expect(presentBoundedWriteResult({ cleanupVerified: false, uncertainExternalEffect: false } as any)).toContain("Cleanup was not verified");
    expect(presentBoundedWriteResult({ cleanupVerified: false, uncertainExternalEffect: true } as any)).toContain("uncertain external effect");
    expect(presentBoundedWriteResult({ cleanupVerified: true, uncertainExternalEffect: false } as any)).not.toContain("external effect");
  });
  it.each([
    ["SHAREPOINT_AVAILABLE", "SharePoint available"],
    ["SHAREPOINT_GUEST_SITE_AVAILABLE", "Guest SharePoint access detected"],
    ["SHAREPOINT_NO_ACCESSIBLE_SITE", "No accessible SharePoint site"],
    ["SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT", "SharePoint is not available for this account type."],
    ["SHAREPOINT_CONSENT_REQUIRED", "SharePoint consent is required"],
    ["SHAREPOINT_POLICY_BLOCKED", "SharePoint access is blocked by organizational policy"],
  ] as const)("renders the dedicated %s state", (state: SharePointUiState, label) => {
    const html = renderToStaticMarkup(<MicrosoftFilesPanel {...props} sharePointState={state} />);
    expect(html).toContain(label);
  });

  it("keeps standalone personal SharePoint non-error and does not show a reconnect prompt", () => {
    const html = renderToStaticMarkup(<MicrosoftFilesPanel {...props} sharePointAccountKind="PERSONAL_MICROSOFT_ACCOUNT" sharePointAvailable={false} />);
    expect(html).toContain("SharePoint is not available for this account type.");
    expect(html).toContain("OneDrive remains available.");
    expect(html).not.toContain("Reconnect Microsoft Files");
    expect(html).not.toContain("Resolve SharePoint site");
  });

  it("renders explicit target controls and does not invoke any operation while rendering", () => {
    const onResolve = vi.fn();
    const onReadSharePoint = vi.fn();
    const onWrite = vi.fn();
    const html = renderToStaticMarkup(<MicrosoftFilesPanel {...props} onResolveSharePoint={onResolve} onReadSharePoint={onReadSharePoint} onWriteSharePointTest={onWrite} sharePointState="SHAREPOINT_AVAILABLE" />);
    expect(html).toContain("SharePoint hostname");
    expect(html).toContain("SharePoint site path");
    expect(html).toContain("Resolve SharePoint site");
    expect(html).toContain("Run bounded OneDrive read/write test");
    expect(html).not.toContain("Bounded SharePoint test preview");
    expect(onResolve).not.toHaveBeenCalled();
    expect(onReadSharePoint).not.toHaveBeenCalled();
    expect(onWrite).not.toHaveBeenCalled();
  });
});
