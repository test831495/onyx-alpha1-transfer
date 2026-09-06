import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const manifestPath = new URL("public/manifest.webmanifest", root);
const workerPath = new URL("public/sw.js", root);
const html = read("index.html");
const main = read("src/main.tsx");
const styles = read("src/styles.css");
const voiceApp = read("src/App.tsx");

const manifest = () => JSON.parse(readFileSync(manifestPath, "utf8"));

describe("ONYX NOVA PWA installability contract", () => {
  it("defines a safe installable manifest and repository-controlled icons", () => {
    expect(existsSync(manifestPath)).toBe(true);
    const value = manifest();
    expect(value.name).toBe("ONYX NOVA");
    expect(value.short_name).toBe("ONYX NOVA");
    expect(value.start_url).toBe("/");
    expect(value.scope).toBe("/");
    expect(value.display).toBe("standalone");
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icons/onyx-nova-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icons/onyx-nova-512.png", sizes: "512x512", type: "image/png" }),
    ]));
    for (const icon of ["public/icons/onyx-nova-192.png", "public/icons/onyx-nova-512.png"]) expect(existsSync(new URL(icon, root))).toBe(true);
    expect(value.prefer_related_applications).toBe(false);
  });

  it("wires safe registration, install UI, and mobile metadata", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="mobile-web-app-capable"');
    expect(main).toContain("registerPwa");
    expect(main).toContain("PwaInstallPrompt");
    expect(styles).toContain("pwa-install-prompt");
  });

  it("keeps service-worker cache boundaries fail-closed", () => {
    expect(existsSync(workerPath)).toBe(true);
    const worker = readFileSync(workerPath, "utf8");
    expect(existsSync(new URL("public/offline.html", root))).toBe(false);
    expect(worker.match(/<!doctype html>/g)?.length).toBe(1);
    expect(worker).toContain("Network-only dynamic request");
    expect(worker).toMatch(/voice|speech|audio|microphone|media|stream/i);
    expect(worker).toContain("request.method !== \"GET\"");
    expect(worker).toContain("offline.html");
    expect(worker).toContain('cache.put("/offline.html"');
    expect(worker).not.toContain("cache.addAll");
    expect(worker).not.toContain("skipWaiting()");
    expect(worker).not.toContain("clients.claim()");
    expect(worker).not.toContain("cache.addAll");
  });

  it("preserves existing voice and microphone ownership", () => {
    expect(voiceApp).toContain("VoiceManager");
    expect(voiceApp).toContain("startListening");
    expect(voiceApp).toContain("voiceManager.current.speak");
    expect(main).not.toContain("getUserMedia");
    expect(workerPath).toBeDefined();
  });
});
