import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { APP_REGISTRY } from "../applicationRegistry";
import { getAppDetail } from "../appDetailRegistry";
import { resolveShellIntent } from "../shellState";
import { MailPanel } from "./MailPanel";

const messages = Array.from({ length: 11 }, (_, index) => ({
  provider: "microsoft" as const,
  subject: `Subject ${index + 1}`,
  senderDisplayName: `Sender ${index + 1}`,
  receivedAt: "2026-09-12T10:00:00.000Z",
  isRead: index % 2 === 0,
  hasAttachments: index === 0,
}));

describe("Outlook Mail panel", () => {
  it("MAIL_UI_001 through 003 registers visible Mail navigation and detail routing", () => {
    expect(APP_REGISTRY.some((entry) => entry.appId === "mail" && entry.friendlyLabel === "Mail")).toBe(true);
    expect(getAppDetail("mail")?.supportsDetails).toBe(true);
    expect(resolveShellIntent("open mail")).toEqual({ type: "OPEN_APP", appId: "mail" });
  });

  it("MAIL_UI_004 through 007 renders connect, permission, loading, and empty states", () => {
    const connect = vi.fn();
    const refresh = vi.fn();
    expect(renderToStaticMarkup(<MailPanel connected={false} busy={false} messages={[]} onConnect={connect} onRefresh={refresh} />)).toContain("Outlook Mail is not connected.");
    expect(renderToStaticMarkup(<MailPanel connected busy={false} messages={[]} reasonCode="MAIL_SCOPE_MISSING" onConnect={connect} onRefresh={refresh} />)).toContain("Mail permission required.");
    expect(renderToStaticMarkup(<MailPanel connected busy messages={[]} onConnect={connect} onRefresh={refresh} />)).toContain("Loading recent mail");
    expect(renderToStaticMarkup(<MailPanel connected busy={false} messages={[]} reasonCode="MAIL_EMPTY" onConnect={connect} onRefresh={refresh} />)).toContain("No recent mail available.");
  });

  it("MAIL_UI_005 surfaces a recoverable connection failure instead of masking it as disconnected", () => {
    const html = renderToStaticMarkup(<MailPanel connected={false} busy={false} messages={[]} reasonCode="MAIL_TRANSPORT_FAILURE" onConnect={() => undefined} onRefresh={() => undefined} />);
    expect(html).toContain("Outlook Mail is temporarily unavailable.");
    expect(html).toContain("Reconnect Outlook Mail");
  });

  it("MAIL_UI_007 treats a successful refreshed empty mailbox as empty", () => {
    const html = renderToStaticMarkup(<MailPanel connected busy={false} messages={[]} reasonCode="MAIL_RETRY_SUCCEEDED" onConnect={() => undefined} onRefresh={() => undefined} />);
    expect(html).toContain("No recent mail available.");
    expect(html).not.toContain("temporarily unavailable");
  });

  it("MAIL_UI_008 through 014 renders at most ten safe metadata records", () => {
    const html = renderToStaticMarkup(<MailPanel connected busy={false} messages={messages} onConnect={() => undefined} onRefresh={() => undefined} />);
    expect(html).toContain("Subject 1");
    expect(html).toContain("Sender 1");
    expect(html).toContain("Unread");
    expect(html).toContain("Has attachments");
    expect(html).not.toContain("Subject 11");
    expect(html).not.toMatch(/@|message-id|bodyPreview|attachment content/i);
  });

  it("MAIL_UI_009 renders a manual refresh control", () => {
    const html = renderToStaticMarkup(<MailPanel connected busy={false} messages={[]} reasonCode="MAIL_EMPTY" onConnect={() => undefined} onRefresh={() => undefined} />);
    expect(html).toContain("Refresh Mail");
  });
});