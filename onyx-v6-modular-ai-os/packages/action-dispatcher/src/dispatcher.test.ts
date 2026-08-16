import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  Intent,
} from "@onyx/contracts";

import {
  ActionDispatcher,
} from "./dispatcher";

import {
  ActionHandlerRegistry,
} from "./registry";

function createContext() {
  return {
    requestId: "test-request",
    signal:
      new AbortController().signal,
  };
}

describe(
  "ActionDispatcher",
  () => {
    it(
      "executes a registered handler",
      async () => {
        const registry =
          new ActionHandlerRegistry();

        registry.register(
          "module.open",
          async intent => ({
            status: "success",
            message:
              `${intent.target} opened.`,
          }),
        );

        const dispatcher =
          new ActionDispatcher(registry);

        const intent: Intent = {
          kind: "module.open",
          target: "calendar",
        };

        const result =
          await dispatcher.dispatch(
            intent,
            createContext(),
          );

        expect(result).toEqual({
          status: "success",
          message: "calendar opened.",
        });
      },
    );

    it(
      "returns unsupported when no handler exists",
      async () => {
        const registry =
          new ActionHandlerRegistry();

        const dispatcher =
          new ActionDispatcher(registry);

        const result =
          await dispatcher.dispatch(
            {
              kind: "settings.open",
            },
            createContext(),
          );

        expect(result).toMatchObject({
          status: "unsupported",
          code: "NO_HANDLER",
        });
      },
    );

    it(
      "rejects duplicate handlers",
      () => {
        const registry =
          new ActionHandlerRegistry();

        const handler = async () => ({
          status: "success" as const,
          message: "Settings opened.",
        });

        registry.register(
          "settings.open",
          handler,
        );

        expect(() => {
          registry.register(
            "settings.open",
            handler,
          );
        }).toThrow(
          "Handler already registered",
        );
      },
    );

    it(
      "normalizes handler failures",
      async () => {
        const registry =
          new ActionHandlerRegistry();

        registry.register(
          "settings.open",
          async () => {
            throw new Error(
              "Settings handler failed.",
            );
          },
        );

        const dispatcher =
          new ActionDispatcher(registry);

        const result =
          await dispatcher.dispatch(
            {
              kind: "settings.open",
            },
            createContext(),
          );

        expect(result).toMatchObject({
          status: "failed",
          code: "HANDLER_FAILURE",
          message:
            "Settings handler failed.",
          recoverable: true,
        });
      },
    );

    it(
      "cancels before execution",
      async () => {
        const registry =
          new ActionHandlerRegistry();

        let executed = false;

        registry.register(
          "settings.open",
          async () => {
            executed = true;

            return {
              status: "success",
              message:
                "Settings opened.",
            };
          },
        );

        const controller =
          new AbortController();

        controller.abort();

        const dispatcher =
          new ActionDispatcher(registry);

        const result =
          await dispatcher.dispatch(
            {
              kind: "settings.open",
            },
            {
              requestId:
                "cancel-test",
              signal:
                controller.signal,
            },
          );

        expect(result.status).toBe(
          "cancelled",
        );

        expect(executed).toBe(false);
      },
    );
  },
);