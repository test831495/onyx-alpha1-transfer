const DISMISS_KEY = "onyx-nova-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function registerPwa(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
}

export function isStandalone(): boolean {
  return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isInstallDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  const timestamp = Number(localStorage.getItem(DISMISS_KEY));
  return Number.isFinite(timestamp) && Date.now() - timestamp < DISMISS_COOLDOWN_MS;
}

export function captureInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
}

export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null && !isStandalone() && !isInstallDismissed();
}

export async function consumeInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt || isStandalone() || isInstallDismissed()) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  return (await prompt.userChoice).outcome === "accepted";
}

export function dismissInstallPrompt(): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(DISMISS_KEY, String(Date.now()));
  deferredPrompt = null;
}
