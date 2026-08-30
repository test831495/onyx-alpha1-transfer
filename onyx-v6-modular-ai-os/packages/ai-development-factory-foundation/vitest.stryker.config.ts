import { defineConfig } from "vitest/config";

// Bounded Stryker mutation-testing scope: only the property and mutation
// assurance harnesses run inside the Stryker sandbox (a single-package copy),
// avoiding cross-package file-existence assertions that assume the full monorepo.
export default defineConfig({
  test: {
    include: [
      "tests/post-h1-alpha0-property-assurance.test.ts",
      "tests/post-h1-alpha0-mutation-assurance.test.ts",
    ],
  },
});
