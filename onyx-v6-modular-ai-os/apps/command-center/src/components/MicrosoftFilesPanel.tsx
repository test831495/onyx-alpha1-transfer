import { useState } from "react";
import type {
  DriveProjection,
  FileAccountKind,
  FileOperationReceipt,
  FileRuntimeTrace,
  FolderListingProjection,
} from "@onyx/workspace-contracts";
import { MicrosoftFilesError, type SharePointResolution } from "@onyx/workspace-connectors";

export function presentBoundedWriteResult(receipt: FileOperationReceipt): string {
  if (receipt.uncertainExternalEffect) return "Bounded Microsoft Files test stopped with an uncertain external effect. No retry was attempted. Review the generated receipt before continuing.";
  if (receipt.cleanupVerified) return "Bounded Microsoft Files test completed. Cleanup verified.";
  return "Bounded Microsoft Files test stopped. Cleanup was not verified.";
}

export type SharePointUiState =
  | "SHAREPOINT_AVAILABLE"
  | "SHAREPOINT_GUEST_SITE_AVAILABLE"
  | "SHAREPOINT_NO_ACCESSIBLE_SITE"
  | "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT"
  | "SHAREPOINT_CONSENT_REQUIRED"
  | "SHAREPOINT_POLICY_BLOCKED"
  | "SHAREPOINT_ERROR";

export interface MicrosoftFilesPanelProps {
  readonly available: boolean;
  readonly onRead: (continuation?: string) => Promise<FolderListingProjection>;
  readonly onWriteTest: () => Promise<FileOperationReceipt>;
  readonly sharePointAccountKind?: FileAccountKind;
  readonly sharePointAvailable?: boolean;
  readonly sharePointState?: SharePointUiState;
  readonly onResolveSharePoint?: (hostname: string, sitePath: string) => Promise<SharePointResolution>;
  readonly onReadSharePoint?: (siteId: string, driveId: string, itemId: string, continuation?: string) => Promise<FolderListingProjection>;
  readonly onWriteSharePointTest?: (driveId: string, parentItemId: string) => Promise<FileOperationReceipt>;
  readonly runtimeTrace?: readonly FileRuntimeTrace[];
  readonly onTraceClear?: () => void;
  readonly onReconnectFiles?: () => Promise<void>;
}

const accountLabels: Record<FileAccountKind, string> = {
  PERSONAL_MICROSOFT_ACCOUNT: "Personal Microsoft account",
  ORGANIZATIONAL_MICROSOFT_ACCOUNT: "Organizational Microsoft account",
  GUEST_MICROSOFT_ACCOUNT: "Guest Microsoft account",
  UNKNOWN_MICROSOFT_ACCOUNT: "Account classification unavailable",
};

const stateLabels: Record<SharePointUiState, string> = {
  SHAREPOINT_AVAILABLE: "SharePoint available",
  SHAREPOINT_GUEST_SITE_AVAILABLE: "Guest SharePoint access detected",
  SHAREPOINT_NO_ACCESSIBLE_SITE: "No accessible SharePoint site",
  SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT: "SharePoint is not available for this account type.",
  SHAREPOINT_CONSENT_REQUIRED: "SharePoint consent is required",
  SHAREPOINT_POLICY_BLOCKED: "SharePoint access is blocked by organizational policy",
  SHAREPOINT_ERROR: "SharePoint could not be loaded",
};

function capabilityState(accountKind: FileAccountKind, available: boolean): SharePointUiState {
  if (accountKind === "PERSONAL_MICROSOFT_ACCOUNT") return "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT";
  return available ? "SHAREPOINT_AVAILABLE" : "SHAREPOINT_CONSENT_REQUIRED";
}

export function MicrosoftFilesPanel({
  available,
  onRead,
  onWriteTest,
  sharePointAccountKind = "UNKNOWN_MICROSOFT_ACCOUNT",
  sharePointAvailable = false,
  sharePointState,
  onResolveSharePoint,
  onReadSharePoint,
  onWriteSharePointTest,
  runtimeTrace = [],
  onTraceClear,
  onReconnectFiles,
}: MicrosoftFilesPanelProps) {
  const [listing, setListing] = useState<FolderListingProjection>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Files has not been opened.");
  const [sharePointHostname, setSharePointHostname] = useState("");
  const [sharePointPath, setSharePointPath] = useState("");
  const [sharePointResolution, setSharePointResolution] = useState<SharePointResolution>();
  const [selectedLibrary, setSelectedLibrary] = useState<DriveProjection>();
  const [sharePointListing, setSharePointListing] = useState<FolderListingProjection>();
  const [sharePointMessage, setSharePointMessage] = useState("Enter a site target to begin.");
  const [showSharePointPreview, setShowSharePointPreview] = useState(false);
  const [sharePointResolvedState, setSharePointResolvedState] = useState<SharePointUiState>();
  const [interactionRequired, setInteractionRequired] = useState(false);
  const resolvedState = sharePointResolvedState ?? sharePointState ?? capabilityState(sharePointAccountKind, sharePointAvailable);
  const markInteractionRequired = (error: unknown): void => {
    if (error instanceof MicrosoftFilesError && (error.diagnostic.finalReasonCode === "MICROSOFT_FILES_INTERACTION_REQUIRED" || error.diagnostic.finalReasonCode === "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED")) setInteractionRequired(true);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { setInteractionRequired(false); await action(); } catch (error) { const reason = error instanceof MicrosoftFilesError ? error.diagnostic.finalReasonCode : "MICROSOFT_FILES_UNKNOWN_BOUNDED_FAILURE"; setInteractionRequired(reason === "MICROSOFT_FILES_INTERACTION_REQUIRED"); setMessage(reason); }
    finally { setBusy(false); }
  };

  const resolveSharePoint = async () => {
    if (!onResolveSharePoint || !sharePointHostname.trim() || !sharePointPath.trim()) return;
    setBusy(true);
    try {
      const result = await onResolveSharePoint(sharePointHostname.trim(), sharePointPath.trim());
      setSharePointResolution(result);
      setSelectedLibrary(undefined);
      setSharePointListing(undefined);
      const nextState = result.diagnostic.finalReasonCode === "MICROSOFT_SHAREPOINT_GUEST_SITE_AVAILABLE"
        ? "SHAREPOINT_GUEST_SITE_AVAILABLE"
        : result.drives.length === 0 ? "SHAREPOINT_NO_ACCESSIBLE_SITE" : "SHAREPOINT_AVAILABLE";
      setSharePointResolvedState(nextState);
      setSharePointMessage(stateLabels[nextState]);
    } catch (error) {
      markInteractionRequired(error);
      setSharePointResolution(undefined);
      setSharePointMessage(stateLabels.SHAREPOINT_ERROR);
    } finally { setBusy(false); }
  };

  const openSharePointFolder = async (drive: DriveProjection, itemId: string, continuation?: string) => {
    if (!onReadSharePoint) return;
    setBusy(true);
    try { setSelectedLibrary(drive); setSharePointListing(await onReadSharePoint(sharePointResolution?.siteId ?? "", drive.driveId, itemId, continuation)); }
    catch (error) { markInteractionRequired(error); setSharePointMessage(stateLabels.SHAREPOINT_ERROR); }
    finally { setBusy(false); }
  };

  return <section aria-labelledby="microsoft-files-heading" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 18%, transparent)", paddingTop: "0.8rem", display: "grid", gap: "0.8rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <div><b id="microsoft-files-heading">Microsoft Files</b><div><small>{available ? "OneDrive available" : "OneDrive unavailable"}</small></div></div>
      <button type="button" onClick={() => void run(async () => { const next = await onRead(); setListing(next); setMessage(next.itemCount === 0 ? "OneDrive folder is empty." : `${next.itemCount} metadata items loaded.`); })} disabled={busy || !available}>Open OneDrive</button>
    </div>
    {listing && <div><nav aria-label="OneDrive folder breadcrumb"><small>OneDrive / {listing.parent.name}</small></nav><ul aria-label="OneDrive metadata listing" style={{ margin: 0, paddingLeft: "1.2rem" }}>{listing.items.map((item) => <li key={item.itemId}><span>{item.itemKind === "FOLDER" ? "Folder" : "File"}</span> {item.name}{item.size === undefined ? "" : ` (${item.size} bytes)`}</li>)}</ul>{listing.continuationCursor && <button type="button" onClick={() => void run(async () => setListing(await onRead(listing.continuationCursor)))} disabled={busy}>Next page</button>}</div>}
    <div style={{ display: "grid", gap: "0.35rem" }}><button type="button" onClick={() => void run(async () => { if (!window.confirm("Run the bounded Microsoft Files test? Only synthetic artifacts in ONYX-NOVA-Connector-Test will be affected and cleanup will run.")) return; const receipt = await onWriteTest(); setMessage(presentBoundedWriteResult(receipt)); })} disabled={busy || !available}>Run bounded OneDrive read/write test</button><small>{message}</small>{interactionRequired && onReconnectFiles && <button type="button" onClick={() => void onReconnectFiles()} disabled={busy}>Reconnect Microsoft Files</button>}</div>
    {runtimeTrace.length > 0 && <details><summary>Diagnostic details</summary><div role="region" aria-label="Microsoft Files diagnostic details" style={{ display: "grid", gap: "0.35rem", marginTop: "0.45rem" }}><small>Bounded stage trace: {runtimeTrace.length} events</small><ol>{runtimeTrace.map((trace) => <li key={`${trace.correlationId}-${trace.sequence}`}><small>{trace.sequence}. {trace.stage}{trace.finalReasonCode ? ` · ${trace.finalReasonCode}` : ""}</small></li>)}</ol>{onTraceClear && <button type="button" onClick={onTraceClear}>Clear diagnostic details</button>}</div></details>}

    <section aria-labelledby="sharepoint-heading" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 18%, transparent)", paddingTop: "0.8rem", display: "grid", gap: "0.6rem" }}>
      <div><b id="sharepoint-heading">SharePoint</b><div><small>{accountLabels[sharePointAccountKind]}</small></div><strong aria-live="polite">{stateLabels[resolvedState]}</strong></div>
      {resolvedState === "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT" ? <><p role="status" style={{ margin: 0 }}>SharePoint is not available for this account type. OneDrive remains available.</p>{onResolveSharePoint && <><label>Explicit guest hostname<input aria-label="SharePoint guest hostname" value={sharePointHostname} onChange={(event) => setSharePointHostname(event.target.value)} placeholder="contoso.sharepoint.com" /></label><label>Explicit guest site path<input aria-label="SharePoint guest site path" value={sharePointPath} onChange={(event) => setSharePointPath(event.target.value)} placeholder="sites/project-x" /></label><button type="button" onClick={() => void resolveSharePoint()} disabled={busy || !sharePointHostname.trim() || !sharePointPath.trim()}>Check explicit guest site access</button></>}</> : resolvedState === "SHAREPOINT_CONSENT_REQUIRED" ? <p role="status" style={{ margin: 0 }}>Reconnect Microsoft Files to grant the delegated SharePoint capability.</p> : resolvedState === "SHAREPOINT_POLICY_BLOCKED" ? <p role="status" style={{ margin: 0 }}>Your organization blocked SharePoint access. No site request was made.</p> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(12rem,1fr))", gap: "1rem" }}><label htmlFor="sharepoint-hostname">SharePoint hostname<input id="sharepoint-hostname" value={sharePointHostname} onChange={(event) => setSharePointHostname(event.target.value)} placeholder="contoso.sharepoint.com" /></label><label htmlFor="sharepoint-site-path">SharePoint site path<input id="sharepoint-site-path" value={sharePointPath} onChange={(event) => setSharePointPath(event.target.value)} placeholder="sites/project-x" /></label></div>
        <button type="button" onClick={() => void resolveSharePoint()} disabled={busy || !onResolveSharePoint || !sharePointHostname.trim() || !sharePointPath.trim()}>Resolve SharePoint site</button>
        <small role="status">{sharePointMessage}</small>
        {interactionRequired && onReconnectFiles && <button type="button" onClick={() => void onReconnectFiles()} disabled={busy}>Reconnect Microsoft Files</button>}
        {sharePointResolution && <div role="region" aria-label="Resolved SharePoint site" style={{ display: "grid", gap: "0.45rem" }}><div><b>{sharePointResolution.siteName ?? "Resolved SharePoint site"}</b> · <small>{sharePointResolution.siteId}</small></div><small>Diagnostic: {sharePointResolution.diagnostic.finalReasonCode}</small><div><b>Document libraries ({sharePointResolution.drives.length})</b><ul aria-label="SharePoint document libraries" style={{ margin: 0, paddingLeft: "1.2rem" }}>{sharePointResolution.drives.map((drive) => <li key={drive.driveId}><button type="button" onClick={() => void openSharePointFolder(drive, "root")} disabled={busy}>{drive.displayName ?? "Document library"}</button> <small>{drive.driveType}</small></li>)}</ul></div></div>}
        {sharePointListing && selectedLibrary && <div role="region" aria-label="SharePoint folder browser" style={{ display: "grid", gap: "0.45rem" }}><nav aria-label="SharePoint folder breadcrumb"><button type="button" onClick={() => void openSharePointFolder(selectedLibrary, "root")} disabled={busy}>Root</button> / {sharePointListing.parent.name}</nav><ul aria-label="SharePoint metadata listing" style={{ margin: 0, paddingLeft: "1.2rem" }}>{sharePointListing.items.map((item) => <li key={item.itemId}>{item.itemKind === "FOLDER" && <button type="button" onClick={() => void openSharePointFolder(selectedLibrary, item.itemId)} disabled={busy}>Open folder</button>} <span>{item.itemKind === "FOLDER" ? "Folder" : "File"}</span> {item.name}{item.size === undefined ? "" : ` (${item.size} bytes)`}</li>)}</ul>{sharePointListing.continuationCursor && <button type="button" onClick={() => void openSharePointFolder(selectedLibrary, sharePointListing.parent.itemId, sharePointListing.continuationCursor)} disabled={busy}>Next page</button>}<button type="button" onClick={() => setShowSharePointPreview(true)} disabled={busy || !onWriteSharePointTest}>Run bounded SharePoint read/write test</button></div>}
        {showSharePointPreview && selectedLibrary && sharePointListing && <div role="dialog" aria-label="SharePoint bounded test preview" style={{ border: "1px solid currentColor", padding: "0.7rem" }}><b>Bounded SharePoint test preview</b><p>Target site: {sharePointResolution?.siteName ?? sharePointResolution?.siteId}</p><p>Target library: {selectedLibrary.displayName ?? selectedLibrary.driveId}</p><p>Target folder: {sharePointListing.parent.name}</p><p>Test folder: ONYX-NOVA-Connector-Test</p><p>Test file: onyx-nova-connector-test-&lt;unique&gt;.txt</p><p>Only synthetic ONYX-NOVA-Connector-Test artifacts will be created, verified, renamed, moved, and cleaned up. An uncertain external effect stops further mutation without retry.</p><button type="button" onClick={() => void run(async () => { const receipt = await onWriteSharePointTest!(selectedLibrary.driveId, sharePointListing.parent.itemId); setShowSharePointPreview(false); setSharePointMessage(presentBoundedWriteResult(receipt)); })}>Confirm and run test</button><button type="button" onClick={() => setShowSharePointPreview(false)}>Cancel</button></div>}
      </>}
    </section>
  </section>;
}
