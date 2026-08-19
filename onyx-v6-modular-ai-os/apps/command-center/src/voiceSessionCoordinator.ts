export {};
type Assistant = "nova" | "onyx";
type SessionOwner = "idle" | "wake" | "command" | "speaking";

let owner: SessionOwner = "idle";
let transitionUntil = 0;
let resumeTimer = 0;

const label = (button: HTMLButtonElement) =>
  [button.getAttribute("aria-label"), button.getAttribute("title"), button.dataset.testid, button.textContent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const isMic = (button: HTMLButtonElement) =>
  /microphone|voice input|start listening|push.to.talk|(^|\s)mic($|\s)|🎙|🎤/i.test(label(button));

function activeAssistant(): Assistant {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")];
  const onyx = buttons.find((button) => /^onyx$/i.test((button.textContent || "").trim()));
  return onyx?.getAttribute("aria-pressed") === "true" || onyx?.className.includes("active") ? "onyx" : "nova";
}

function extraSettings(assistant: Assistant): { autoListen?: boolean; wakeWords?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(`onyx.voice.extra.${assistant}`) || "{}");
  } catch {
    return {};
  }
}

function supervisor(enabled: boolean): void {
  const assistant = activeAssistant();
  const settings = extraSettings(assistant);
  window.dispatchEvent(new CustomEvent("onyx:voice-supervisor-setting", {
    detail: { assistant, enabled, wakeEnabled: Boolean(settings.wakeWords) }
  }));
}

function emit(message: string, state: string): void {
  window.dispatchEvent(new CustomEvent("onyx:voice-supervisor-status", {
    detail: { message, state, owner }
  }));
}

function resumeWake(reason: string): void {
  window.clearTimeout(resumeTimer);
  resumeTimer = window.setTimeout(() => {
    const settings = extraSettings(activeAssistant());
    if (!settings.autoListen || !settings.wakeWords) {
      owner = "idle";
      return;
    }
    owner = "wake";
    supervisor(true);
    emit(`Wake-word listener resumed after ${reason}.`, "listening");
  }, 1200);
}

function beginCommand(reason: string): void {
  transitionUntil = Date.now() + 2500;
  owner = "command";
  supervisor(false);
  emit(`Voice listener transitioning to command mode (${reason}).`, "transitioning");
  window.clearTimeout(resumeTimer);
  resumeTimer = window.setTimeout(() => resumeWake("command timeout"), 10000);
}

if (typeof window !== "undefined") {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (target instanceof HTMLButtonElement && isMic(target)) beginCommand("microphone selected");
  }, true);

  document.addEventListener("submit", () => beginCommand("typed command"), true);

  window.addEventListener("onyx:wake-command", () => beginCommand("wake word detected"));
  window.addEventListener("onyx:command-complete", () => resumeWake("command completion"));
  window.addEventListener("onyx:speech-start", () => {
    transitionUntil = Date.now() + 5000;
    owner = "speaking";
    supervisor(false);
    emit("Recognition paused while ONYX/NOVA is speaking.", "speaking");
  });
  window.addEventListener("onyx:speech-end", () => resumeWake("speech completion"));

  window.addEventListener("onyx:voice-supervisor-status", (event) => {
    const detail = (event as CustomEvent<{ message?: string; state?: string }>).detail;
    if (Date.now() < transitionUntil && /aborted/i.test(detail?.message || "")) {
      event.stopImmediatePropagation();
      emit("Voice listener transition completed.", "transitioning");
    }
  }, true);
}
