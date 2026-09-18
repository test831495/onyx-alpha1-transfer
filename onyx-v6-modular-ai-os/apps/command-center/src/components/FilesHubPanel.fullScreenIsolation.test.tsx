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

describe("ACCOUNT_SWITCH_FILE_STATE_ISOLATION", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("clears selected file, preview, and related Notes when accountScope changes without unmounting the parent surface", async () => {
    const accountA = "account-switch-a";
    const accountB = "account-switch-b";
    const file = new File(["private file content"], "budget.txt", { type: "text/plain", lastModified: 456 });
    const projection = projectLocalFile(file, "FILE_INPUT");
    notesRepository.forAccount(accountA).createNote({
      title: "Account A budget note",
      fileReferences: [{ referenceId: "ref-budget", fileId: projection.selectionId, provider: "local", displayName: file.name, fileType: file.type, referencedAt: new Date().toISOString() }],
    });

    const { rerender } = render(<FilesHubPanel sources={sources} accountScope={accountA} />);
    const fileInput = () => document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
    fireEvent.change(fileInput(), { target: { files: [file] } });
    await screen.findByText("budget.txt", { selector: "dd" });
    await screen.findByLabelText("Related Notes");

    // Switch accounts on the same mounted tree (no unmount of FilesHubPanel itself).
    rerender(<FilesHubPanel sources={sources} accountScope={accountB} />);

    expect(screen.queryAllByText("budget.txt")).toHaveLength(0);
    expect(screen.queryByLabelText("Related Notes")).not.toBeInTheDocument();
    expect(screen.getByText("No local file or folder selected.")).toBeVisible();

    // Account B can select a file normally afterward, with no leaked Account A projection.
    const otherFile = new File(["other"], "plan.txt", { type: "text/plain", lastModified: 789 });
    fireEvent.change(fileInput(), { target: { files: [otherFile] } });
    await screen.findByText("plan.txt", { selector: "dd" });
    expect(screen.queryByLabelText("Related Notes")).not.toBeInTheDocument();
    expect(screen.queryAllByText("budget.txt")).toHaveLength(0);

    // Switching back to Account A does not silently restore the prior transient selection.
    rerender(<FilesHubPanel sources={sources} accountScope={accountA} />);
    expect(screen.queryAllByText("plan.txt")).toHaveLength(0);
    expect(screen.queryAllByText("budget.txt")).toHaveLength(0);
    expect(screen.getByText("No local file or folder selected.")).toBeVisible();
  });

  it("ignores a stale text-preview read that resolves after the file selection changed", async () => {
    const originalText = File.prototype.text;
    let firstResolve: (() => void) | undefined;
    let callCount = 0;
    File.prototype.text = function (this: File) {
      callCount += 1;
      if (callCount === 1) return new Promise<string>((resolve) => { firstResolve = () => { void originalText.call(this).then(resolve); }; });
      return originalText.call(this);
    };
    try {
      const firstFile = new File(["first content"], "first.txt", { type: "text/plain", lastModified: 1 });
      const secondFile = new File(["second content"], "second.txt", { type: "text/plain", lastModified: 2 });
      render(<FilesHubPanel sources={sources} />);
      const fileInput = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [firstFile] } });
      await screen.findByText("first.txt");

      fireEvent.change(fileInput, { target: { files: [secondFile] } });
      await screen.findByText("second.txt");
      await screen.findByDisplayValue("second content");

      // Resolve the stale first-file read only after the second selection is already active and rendered.
      firstResolve?.();
      await Promise.resolve();
      expect(screen.queryByDisplayValue("first content")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("second content")).toBeVisible();
    } finally {
      File.prototype.text = originalText;
    }
  });
});
