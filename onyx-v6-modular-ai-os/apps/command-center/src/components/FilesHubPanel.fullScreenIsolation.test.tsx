/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FilesHubPanel } from "./FilesHubPanel";
import { projectLocalFile } from "../localFilesProvider";
import { notesRepository } from "../notesRepository";

const sources = [
  { sourceId: "local" as const, displayName: "Local Files", providerFamily: "local", availability: "AVAILABLE" as const, connection: "CONNECTED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: true }] },
  { sourceId: "microsoft-onedrive" as const, displayName: "OneDrive", providerFamily: "microsoft", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
  { sourceId: "microsoft-sharepoint" as const, displayName: "SharePoint", providerFamily: "microsoft", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
  { sourceId: "google-drive" as const, displayName: "Google Drive", providerFamily: "google", availability: "CONNECT_REQUIRED" as const, connection: "CONNECT_REQUIRED" as const, capabilities: [{ operation: "BROWSE" as const, enabled: false }] },
];

describe("FULL_SCREEN_PROVIDER_STACK_ISOLATION", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("renders zero visible provider cards, connectors, and stack content while full-screen preview is active", async () => {
    render(<FilesHubPanel sources={sources} />);

    // Precondition: the provider stack is genuinely visible before entering full screen.
    const oneDriveHeading = screen.getByText("OneDrive");
    const sharePointHeading = screen.getByText("SharePoint");
    const googleDriveHeading = screen.getByText("Google Drive");
    const connectButtons = screen.getAllByRole("button", { name: "Connect" });
    expect(oneDriveHeading).toBeVisible();
    expect(sharePointHeading).toBeVisible();
    expect(googleDriveHeading).toBeVisible();
    expect(connectButtons).toHaveLength(3);

    const fileInput = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByText("note.txt");

    fireEvent.click(screen.getByRole("button", { name: "Full-screen preview" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Previous" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Next" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Exit full-screen preview" })).toBeVisible();
    expect(within(dialog).getByText("Selected File")).toBeVisible();

    // Full-screen isolation: no provider card, connector, or stack content remains visible.
    expect(oneDriveHeading).not.toBeVisible();
    expect(sharePointHeading).not.toBeVisible();
    expect(googleDriveHeading).not.toBeVisible();
    for (const button of connectButtons) expect(button).not.toBeVisible();

    fireEvent.click(within(dialog).getByRole("button", { name: "Exit full-screen preview" }));

    expect(screen.getByText("SharePoint")).toBeVisible();
    expect(screen.getByText("Google Drive")).toBeVisible();
  });

  it("shows account-scoped related Notes for a reselected local file without copying its content", async () => {
    const accountScope = "files-notes-reference-test";
    const file = new File(["private file content"], "roadmap.txt", { type: "text/plain", lastModified: 123 });
    const projection = projectLocalFile(file, "FILE_INPUT");
    notesRepository.forAccount(accountScope).createNote({
      title: "Roadmap decisions",
      fileReferences: [{ referenceId: "ref-roadmap", fileId: projection.selectionId, provider: "local", displayName: file.name, fileType: file.type, referencedAt: new Date().toISOString() }],
    });

    render(<FilesHubPanel sources={sources} accountScope={accountScope} />);
    const fileInput = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const related = await screen.findByLabelText("Related Notes");
    expect(within(related).getByText("Roadmap decisions")).toBeVisible();
    expect(within(related).getByText(/reference this file/)).toBeVisible();
    expect(related.textContent).not.toContain("private file content");
  });
});
