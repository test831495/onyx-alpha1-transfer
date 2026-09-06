import { useEffect, useState } from "react";
import { captureInstallPrompt, consumeInstallPrompt, dismissInstallPrompt, isInstallDismissed, isIosDevice, isStandalone } from "../pwa/installController";

export function PwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [iosGuidance, setIosGuidance] = useState(false);

  useEffect(() => {
    const standalone = isStandalone();
    setIosGuidance(!standalone && isIosDevice() && !isInstallDismissed());
    const onBeforeInstallPrompt = (event: Event) => {
      captureInstallPrompt(event);
      setCanInstall(!isStandalone() && !isInstallDismissed());
    };
    const onInstalled = () => {
      setCanInstall(false);
      setIosGuidance(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!canInstall && !iosGuidance) return null;
  return <aside className="pwa-install-prompt" aria-label="ONYX NOVA installation">
    <div>
      <strong>Install ONYX NOVA</strong>
      {iosGuidance && <small>Safari Share, then Add to Home Screen.</small>}
    </div>
    {canInstall && <button type="button" onClick={() => void consumeInstallPrompt().then(() => setCanInstall(false))}>Install</button>}
    <button type="button" className="pwa-install-dismiss" aria-label="Dismiss install guidance" onClick={() => { dismissInstallPrompt(); setCanInstall(false); setIosGuidance(false); }}>Dismiss</button>
  </aside>;
}
