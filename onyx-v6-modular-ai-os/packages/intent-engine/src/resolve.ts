import type {
  AssistantMode,
  Intent,
  NormalizedAssistantInput,
} from "@onyx/contracts";

import type {
  ModuleRegistry,
} from "@onyx/module-registry";

import {
  joinTokens,
  removeFillerWords,
} from "./aliases";

const openVerbs = new Set([
  "open",
  "show",
  "display",
]);

const launchVerbs = new Set([
  "launch",
  "start",
]);

const searchVerbs = new Set([
  "find",
  "search",
  "locate",
]);

function detectAssistant(
  tokens: readonly string[],
): AssistantMode | undefined {
  if (tokens.includes("nova")) {
    return "nova";
  }

  if (tokens.includes("onyx")) {
    return "onyx";
  }

  return undefined;
}
function removeAssistantTokens(
  tokens: readonly string[],
): string[] {
  return tokens.filter(
    token =>
      token !== "nova" &&
      token !== "onyx" &&
      token !== "hey" &&
      token !== "hi" &&
      token !== "hello" &&
      token !== "call",
  );
}
function removeSwitchTokens(
  tokens: readonly string[],
): string[] {
  return tokens.filter(
    token =>
      token !== "switch" &&
      token !== "change" &&
      token !== "to" &&
      token !== "assistant",
  );
}

export function resolveIntent(
  input: NormalizedAssistantInput,
  registry: ModuleRegistry,
): Intent {
  const assistant =
    input.requestedAssistant ??
    detectAssistant(input.tokens);

  const withoutAssistant =
    removeAssistantTokens(input.tokens);

  const tokens = removeFillerWords(
    withoutAssistant,
  );

  const switchTokens =
    removeSwitchTokens(tokens);

  if (
    assistant &&
    switchTokens.length === 0
  ) {
    return {
      kind: "assistant.switch",
      assistant,
    };
  }

  if (
    assistant &&
    (
      tokens.includes("switch") ||
      tokens.includes("change")
    )
  ) {
    return {
      kind: "assistant.switch",
      assistant,
    };
  }

  const firstToken = tokens[0];
    if (
    firstToken === "open" &&
    tokens[1] === "settings"
  ) {
    return {
      kind: "settings.open",
      assistant,
    };
  }

  if (
    tokens.length === 1 &&
    firstToken === "settings"
  ) {
    return {
      kind: "settings.open",
      assistant,
    };
  }

  if (
    firstToken === "find" ||
    firstToken === "search" ||
    firstToken === "locate"
  ) {
    const query = joinTokens(
      tokens.slice(1),
    );

    if (query) {
      return {
        kind: "document.search",
        query,
        assistant,
      };
    }
  }

  if (
    tokens.includes("settings") &&
    (
      firstToken === "open" ||
      firstToken === "show" ||
      tokens.length === 1
    )
  ) {
    return {
      kind: "settings.open",
      assistant,
    };
  }

  const targetText = joinTokens(
    tokens.slice(1),
  );

  if (
    firstToken &&
    openVerbs.has(firstToken)
  ) {
    const module =
      registry.resolveModule(
        targetText,
      );

    if (module) {
      return {
        kind: "module.open",
        target: module.id,
        assistant,
      };
    }

    const application =
      registry.resolveApplication(
        targetText,
      );

    if (application) {
      return {
        kind: "app.launch",
        target: application.id,
        assistant,
      };
    }
  }

  if (
    firstToken &&
    launchVerbs.has(firstToken)
  ) {
    const application =
      registry.resolveApplication(
        targetText,
      );

    if (application) {
      return {
        kind: "app.launch",
        target: application.id,
        assistant,
      };
    }
  }

  if (
    firstToken &&
    searchVerbs.has(firstToken)
  ) {
    const query = joinTokens(
      tokens.slice(1),
    );

    if (query) {
      return {
        kind: "document.search",
        query,
        assistant,
      };
    }
  }

  const directText =
    joinTokens(tokens);

  const directModule =
    registry.resolveModule(
      directText,
    );

  if (directModule) {
    return {
      kind: "module.open",
      target: directModule.id,
      assistant,
    };
  }

  const directApplication =
    registry.resolveApplication(
      directText,
    );

  if (directApplication) {
    return {
      kind: "app.launch",
      target: directApplication.id,
      assistant,
    };
  }

  return {
    kind: "unsupported",
    rawInput: input.rawText,
    reason:
      "No registered intent matched",
  };
}