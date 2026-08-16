import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createBuiltinRegistry,
} from "@onyx/module-registry";

import {
  normalizeAssistantInput,
} from "./normalize";

import {
  resolveIntent,
} from "./resolve";

function resolve(
  text: string,
) {
  const registry =
    createBuiltinRegistry();

  const input =
    normalizeAssistantInput({
      text,
      source: "typed",
    });

  return resolveIntent(
    input,
    registry,
  );
}

describe(
  "Intent Engine",
  () => {
    it(
      "switches to ONYX",
      () => {
        expect(
          resolve("Switch to Onyx"),
        ).toEqual({
          kind: "assistant.switch",
          assistant: "onyx",
        });
      },
    );

    it(
      "switches to NOVA",
      () => {
        expect(
          resolve("Call Nova"),
        ).toEqual({
          kind: "assistant.switch",
          assistant: "nova",
        });
      },
    );

    it(
      "opens Calendar",
      () => {
        expect(
          resolve("Open calendar"),
        ).toMatchObject({
          kind: "module.open",
          target: "calendar",
        });
      },
    );

    it(
      "resolves the schedule alias",
      () => {
        expect(
          resolve("Show my schedule"),
        ).toMatchObject({
          kind: "module.open",
          target: "calendar",
        });
      },
    );

    it(
      "launches YouTube",
      () => {
        expect(
          resolve("Launch YouTube"),
        ).toMatchObject({
          kind: "app.launch",
          target: "youtube",
        });
      },
    );

    it(
      "searches for a document",
      () => {
        expect(
          resolve(
            "Find architecture baseline",
          ),
        ).toMatchObject({
          kind: "document.search",
          query:
            "architecture baseline",
        });
      },
    );

    it(
      "opens Settings",
      () => {
        expect(
          resolve("Open settings"),
        ).toMatchObject({
          kind: "settings.open",
        });
      },
    );

    it(
      "returns unsupported",
      () => {
        expect(
          resolve(
            "Perform an unknown action",
          ),
        ).toMatchObject({
          kind: "unsupported",
        });
      },
    );

    it(
      "never maps YouTube to Finance",
      () => {
        const result =
          resolve("Open YouTube");

        expect(
          result,
        ).toMatchObject({
          kind: "app.launch",
          target: "youtube",
        });

        expect(
          result,
        ).not.toMatchObject({
          kind: "module.open",
          target: "finance",
        });
      },
    );
  },
);