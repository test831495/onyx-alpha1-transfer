import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ModuleManifest,
} from "./manifest";

import {
  createBuiltinRegistry,
} from "./builtins";

import {
  ModuleRegistry,
} from "./registry";

describe(
  "ModuleRegistry",
  () => {
    it(
      "registers built-in modules",
      () => {
        const registry =
          createBuiltinRegistry();

        expect(
          registry.getModule(
            "calendar",
          )?.title,
        ).toBe("Calendar");

        expect(
          registry.getModule(
            "files",
          )?.title,
        ).toBe("Files");
      },
    );

    it(
      "resolves calendar aliases",
      () => {
        const registry =
          createBuiltinRegistry();

        expect(
          registry.resolveModule(
            "schedule",
          )?.id,
        ).toBe("calendar");

        expect(
          registry.resolveModule(
            "  MY SCHEDULE  ",
          ),
        ).toBeUndefined();

        expect(
          registry.resolveModule(
            "agenda",
          )?.id,
        ).toBe("calendar");
      },
    );

    it(
      "returns undefined for an unknown alias",
      () => {
        const registry =
          createBuiltinRegistry();

        expect(
          registry.resolveModule(
            "unknown module",
          ),
        ).toBeUndefined();
      },
    );

    it(
      "registers YouTube as a placeholder application",
      () => {
        const registry =
          createBuiltinRegistry();

        const youtube =
          registry.resolveApplication(
            "youtube",
          );

        expect(
          youtube?.id,
        ).toBe("youtube");

        expect(
          youtube?.availability,
        ).toBe("placeholder");

        expect(
          youtube?.launchMode,
        ).toBe("unavailable");
      },
    );

    it(
      "rejects duplicate module identifiers",
      () => {
        const registry =
          new ModuleRegistry();

        const module: ModuleManifest = {
          id: "calendar",
          title: "Calendar",
          description:
            "Calendar test module.",
          aliases: [
            "schedule",
          ],
          capabilities: [
            "module.open",
          ],
          availability: "available",
        };

        registry.registerModule(
          module,
        );

        expect(() =>
          registry.registerModule(
            module,
          ),
        ).toThrow(
          "Module already registered",
        );
      },
    );

    it(
      "does not resolve YouTube as Finance or another module",
      () => {
        const registry =
          createBuiltinRegistry();

        expect(
          registry.resolveModule(
            "youtube",
          ),
        ).toBeUndefined();

        expect(
          registry.resolveApplication(
            "youtube",
          )?.id,
        ).toBe("youtube");
      },
    );
  },
);