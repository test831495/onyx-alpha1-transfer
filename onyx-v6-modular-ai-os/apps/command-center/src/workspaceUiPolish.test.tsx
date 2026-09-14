import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { APP_REGISTRY } from "./applicationRegistry";
import { APP_DETAIL_REGISTRY } from "./appDetailRegistry";
import { shellReducer, shellStateFactory } from "./shellState";

const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const detailShellStyles = readFileSync(
  new URL("./styles/DetailShell.css", import.meta.url),
  "utf8",
);
const microsoftFilesSource = readFileSync(
  new URL("./components/MicrosoftFilesPanel.tsx", import.meta.url),
  "utf8",
);
const workspacePanelSource = readFileSync(
  new URL("./components/WorkspacePanel.tsx", import.meta.url),
  "utf8",
);

describe("Track A Workspace UI Polish", () => {
  describe("Fix A: Files Dock Visibility & Application Registry", () => {
    it("includes Files in APP_REGISTRY between Workspace and Mail", () => {
      const appIds = APP_REGISTRY.map((entry) => entry.appId);
      expect(appIds).toContain("files");
      const workspaceIndex = appIds.indexOf("workspace");
      const filesIndex = appIds.indexOf("files");
      const mailIndex = appIds.indexOf("mail");

      expect(workspaceIndex).toBeGreaterThan(-1);
      expect(filesIndex).toBe(workspaceIndex + 1);
      expect(mailIndex).toBe(filesIndex + 1);
    });

    it("includes Files in APP_DETAIL_REGISTRY between Workspace and Mail", () => {
      const appIds = APP_DETAIL_REGISTRY.map((entry) => entry.appId);
      expect(appIds).toContain("files");
      const workspaceIndex = appIds.indexOf("workspace");
      const filesIndex = appIds.indexOf("files");
      const mailIndex = appIds.indexOf("mail");

      expect(workspaceIndex).toBeGreaterThan(-1);
      expect(filesIndex).toBe(workspaceIndex + 1);
      expect(mailIndex).toBe(filesIndex + 1);
    });

    it("supports open, focus, minimize, restore, and close state transitions for files app in shellReducer", () => {
      let state = shellStateFactory();

      // Open files
      state = shellReducer(state, { type: "OPEN_APP", appId: "files" });
      expect(state.workspaceByCharacter[state.currentCharacter].openAppIds).toContain("files");
      expect(state.workspaceByCharacter[state.currentCharacter].selectedAppId).toBe("files");
      expect(state.workspaceByCharacter[state.currentCharacter].minimizedAppIds).not.toContain("files");

      // Minimize files
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "files" });
      expect(state.workspaceByCharacter[state.currentCharacter].minimizedAppIds).toContain("files");
      expect(state.workspaceByCharacter[state.currentCharacter].selectedAppId).toBeNull();

      // Restore files
      state = shellReducer(state, { type: "RESTORE_APP", appId: "files" });
      expect(state.workspaceByCharacter[state.currentCharacter].minimizedAppIds).not.toContain("files");
      expect(state.workspaceByCharacter[state.currentCharacter].selectedAppId).toBe("files");

      // Focus files
      state = shellReducer(state, { type: "FOCUS_APP", appId: "files" });
      expect(state.workspaceByCharacter[state.currentCharacter].selectedAppId).toBe("files");

      // Close files
      state = shellReducer(state, { type: "CLOSE_APP", appId: "files" });
      expect(state.workspaceByCharacter[state.currentCharacter].openAppIds).not.toContain("files");
    });
  });

  describe("Fix B & C: Google Tile Containment & Button Standardization", () => {
    it("scopes Workspace button wrapping while preserving compact action styling", () => {
      expect(stylesSource).not.toMatch(
        /#panel-workspace button\s*\{[^}]*white-space:\s*nowrap/,
      );
      expect(stylesSource).toMatch(
        /#panel-workspace button\s*\{[^}]*box-sizing:\s*border-box;[^}]*max-width:\s*100%;/s,
      );
      expect(stylesSource).toMatch(
        /#panel-workspace \[aria-labelledby="microsoft-files-heading"\] button\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;[^}]*max-width:\s*100%;[^}]*height:\s*auto;[^}]*line-height:\s*1\.3;/s,
      );
      expect(stylesSource).toMatch(
        /#panel-workspace \[aria-labelledby="microsoft-files-heading"\] > div:first-child > button\s*\{[^}]*white-space:\s*nowrap/s,
      );
      expect(stylesSource).toMatch(
        /\.microsoft-files-panel \.microsoft-files-diagnostic-trace\s*\{[^}]*max-height:\s*12rem;[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto/s,
      );
      const detailContentRule = detailShellStyles.match(
        /\.detail-shell__content\s*\{[^}]*\}/s,
      )?.[0] ?? "";
      expect(detailContentRule).toContain("min-height: 0;");
      expect(detailContentRule).toContain("min-width: 0;");
      expect(detailContentRule).toContain("overflow-x: hidden;");
      expect(detailContentRule).toContain("overflow-y: auto;");
      expect(detailContentRule).toContain("overscroll-behavior: contain;");
      expect(detailContentRule).toContain("-webkit-overflow-scrolling: touch;");
      expect(detailContentRule).toContain(
        "padding-bottom: max(2.5rem, env(safe-area-inset-bottom));",
      );
      expect(stylesSource).toMatch(
        /#panel-workspace\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible/s,
      );
      expect(stylesSource).not.toMatch(
        /#panel-workspace\s*\{[^}]*overflow-y:\s*auto/s,
      );
      expect(workspacePanelSource).not.toMatch(
        /<section id="panel-workspace"[^>]*overflow:\s*"hidden"/s,
      );
      expect(workspacePanelSource).not.toMatch(
        /<article key=\{provider\.provider\}[^>]*overflow:\s*"hidden"/s,
      );
      expect(microsoftFilesSource).toContain('className="microsoft-files-panel"');
      expect(microsoftFilesSource).toContain('className="microsoft-files-diagnostic-trace"');
      expect(microsoftFilesSource).toContain("Run bounded OneDrive read/write test");
      expect(microsoftFilesSource).toContain("Run bounded SharePoint read/write test");
      expect(microsoftFilesSource).not.toContain("compactActionStyle");
    });

    it("renders Google Connect Google and Refresh Status buttons with standard compactActionStyle", () => {
      const html = renderToStaticMarkup(
        <WorkspacePanel
          snapshot={{
            updatedAt: Date.now(),
            providers: [
              {
                provider: "google",
                label: "Google",
                state: "disconnected",
                diagnostic: "Google is ready to connect.",
                capabilities: [
                  { id: "profile", label: "Google Profile", enabled: false },
                  { id: "mail", label: "Gmail", enabled: false },
                ],
              },
            ],
          }}
          busy={false}
          onConnect={() => undefined}
          onReconnect={() => undefined}
          onDisconnect={() => undefined}
          onRefresh={() => undefined}
        />,
      );

      expect(html).toContain("Connect Google");
      expect(html).toContain("Refresh Status");
      expect(html).toContain('aria-label="Connect Google workspace"');
      expect(html).toContain('aria-label="Refresh Google workspace status"');

      // Verify compact action styling is applied
      expect(html).toContain("min-height:2.25rem");
      expect(html).toContain("max-height:2.5rem");
      expect(html).toContain("font-size:0.85rem");
      expect(html).toContain("border-radius:0.5rem");
    });

    it("renders side-by-side Microsoft and Google tiles with explicit cell containment and overflow rules", () => {
      const html = renderToStaticMarkup(
        <WorkspacePanel
          snapshot={{
            updatedAt: Date.now(),
            providers: [
              {
                provider: "microsoft",
                label: "Microsoft",
                state: "connected",
                diagnostic: "Microsoft active.",
                profile: { displayName: "User", email: "user@contoso.com" },
                capabilities: [
                  { id: "profile", label: "Profile", enabled: true },
                  { id: "files", label: "OneDrive", enabled: true },
                ],
              },
              {
                provider: "google",
                label: "Google",
                state: "disconnected",
                diagnostic: "Google is not connected.",
                capabilities: [
                  { id: "profile", label: "Google Profile", enabled: false },
                ],
              },
            ],
          }}
          busy={false}
          onConnect={() => undefined}
          onReconnect={() => undefined}
          onDisconnect={() => undefined}
          onRefresh={() => undefined}
        />,
      );

      expect(html).toContain("Microsoft");
      expect(html).toContain("Google");
      expect(html).toContain("overflow-wrap:anywhere");
      expect(html).toContain("word-break:break-word");
      expect(html).toContain('class="workspace-files-content"');
      expect(html).toContain('class="microsoft-files-panel"');
      expect(html).toContain("min-width:0");
    });
  });
});
