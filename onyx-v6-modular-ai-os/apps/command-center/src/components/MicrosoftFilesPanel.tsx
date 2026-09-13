import { useState } from "react";
import type { FileOperationReceipt, FolderListingProjection } from "@onyx/workspace-contracts";

export interface MicrosoftFilesPanelProps {
  readonly available: boolean;
  readonly onRead: (continuation?: string) => Promise<FolderListingProjection>;
  readonly onWriteTest: () => Promise<FileOperationReceipt>;
}

export function MicrosoftFilesPanel({ available, onRead, onWriteTest }: MicrosoftFilesPanelProps) {
  const [listing, setListing] = useState<FolderListingProjection>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Files has not been opened.");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch { setMessage("Microsoft Files is unavailable. No automatic retry was attempted."); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="microsoft-files-heading" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 18%, transparent)", paddingTop: "0.8rem", display: "grid", gap: "0.6rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <div><b id="microsoft-files-heading">Microsoft Files</b><div><small>{available ? "OneDrive available" : "OneDrive unavailable"}</small></div></div>
      <button type="button" onClick={() => void run(async () => { const next = await onRead(); setListing(next); setMessage(next.itemCount === 0 ? "OneDrive folder is empty." : `${next.itemCount} metadata items loaded.`); })} disabled={busy || !available}>Open OneDrive</button>
    </div>
    {listing && <>
      <nav aria-label="OneDrive folder breadcrumb"><small>OneDrive / {listing.parent.name}</small></nav>
      <ul aria-label="OneDrive metadata listing" style={{ margin: 0, paddingLeft: "1.2rem" }}>{listing.items.map((item) => <li key={item.itemId}><span>{item.itemKind === "FOLDER" ? "Folder" : "File"}</span> {item.name}{item.size === undefined ? "" : ` (${item.size} bytes)`}</li>)}</ul>
      {listing.continuationCursor && <button type="button" onClick={() => void run(async () => { const next = await onRead(listing.continuationCursor); setListing(next); })} disabled={busy}>Next page</button>}
    </>}
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <button type="button" onClick={() => void run(async () => { if (!window.confirm("Run the bounded Microsoft Files test? Only synthetic artifacts in ONYX-NOVA-Connector-Test will be affected and cleanup will run.")) return; const receipt = await onWriteTest(); setMessage(receipt.cleanupVerified ? "Bounded OneDrive test completed and cleanup was verified." : "Bounded test stopped. External effect is uncertain; no retry was attempted."); })} disabled={busy || !available}>Run bounded OneDrive read/write test</button>
      <small>{message}</small>
    </div>
  </section>;
}
