const dialogSelector = 'section[aria-label="ONYX Automation Center"]';
const focusableSelector = 'button:not([disabled]), summary, select, input, textarea, a[href], [tabindex]:not([tabindex="-1"])';

if (typeof window !== "undefined" && typeof document !== "undefined") {
  let launcher: HTMLElement | null = null;
  let dialogWasPresent = false;

  const getDialog = () => document.querySelector<HTMLElement>(dialogSelector);
  const focusClose = (dialog: HTMLElement) => {
    dialog.querySelector<HTMLElement>("header button")?.focus();
  };

  window.addEventListener("onyx:open-automation", () => {
    launcher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => {
      const dialog = getDialog();
      if (dialog) focusClose(dialog);
    }, 0);
  });

  document.addEventListener("keydown", (event) => {
    const dialog = getDialog();
    if (!dialog) return;

    if (event.key === "Escape") {
      event.preventDefault();
      dialog.querySelector<HTMLButtonElement>("header button")?.click();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  new MutationObserver(() => {
    const dialog = getDialog();
    if (dialog && !dialogWasPresent) focusClose(dialog);
    if (!dialog && dialogWasPresent) {
      launcher?.focus();
      launcher = null;
    }
    dialogWasPresent = Boolean(dialog);
  }).observe(document.body, { childList: true, subtree: true });
}
