import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@onyx/google-workspace-server-runtime": `${workspaceRoot}packages/google-workspace-server-runtime/src/index.ts`,
      "@onyx/provider-neutral-credential-store-session-foundation": `${workspaceRoot}packages/provider-neutral-credential-store-session-foundation/src/index.ts`,
      "@onyx/account-authentication-server-authority": `${workspaceRoot}packages/account-authentication-server-authority/src/index.ts`,
      "@onyx/workspace-connectors": `${workspaceRoot}packages/workspace-connectors/src/index.ts`,
    },
  },
});
