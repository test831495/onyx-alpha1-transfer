import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./PwaInstallPrompt.tsx", import.meta.url), "utf8");
const controller = readFileSync(new URL("../pwa/installController.ts", import.meta.url), "utf8");

describe("PWA install experience", () => {
  it("uses user-initiated Chromium installation and installed-mode hiding", () => {
    expect(source).toContain("Install ONYX NOVA");
    expect(source).toContain("consumeInstallPrompt");
    expect(source).toContain("isStandalone");
    expect(source).toContain("beforeinstallprompt");
    expect(source).toContain("appinstalled");
    expect(source).toMatch(/captureInstallPrompt\(event\);[\s\S]*setCanInstall\(\s*!isStandalone\(\)\s*&&\s*!isInstallDismissed\(\)\s*\)/);
    expect(source).not.toContain("setCanInstall(true)");
    expect(source).toContain("onClick");
  });

  it("provides truthful iOS guidance without requesting microphone access", () => {
    expect(source).toContain("Add to Home Screen");
    expect(source).toContain("Safari Share");
    expect(source).toContain("isIosDevice");
    expect(source).not.toContain("getUserMedia");
    expect(controller).toContain("registerPwa");
    expect(controller).not.toContain("getUserMedia");
  });
});
