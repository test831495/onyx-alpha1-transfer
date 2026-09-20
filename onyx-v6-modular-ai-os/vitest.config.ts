import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));
const packageRequire = createRequire(new URL("./packages/google-workspace-server-runtime/package.json", import.meta.url));
const netlifyDatabaseEntry = packageRequire.resolve("@netlify/database");
const netlifyDatabaseRequire = createRequire(netlifyDatabaseEntry);
const neonServerlessEntry = netlifyDatabaseRequire.resolve("@neondatabase/serverless").replace(/index\.js$/, "index.mjs");

export default defineConfig({
  resolve: {
    alias: {
      "@netlify/database": netlifyDatabaseEntry,
      "@neondatabase/serverless": neonServerlessEntry,
      "@onyx/google-workspace-server-runtime": `${workspaceRoot}packages/google-workspace-server-runtime/src/index.ts`,
      "@onyx/provider-neutral-credential-store-session-foundation": `${workspaceRoot}packages/provider-neutral-credential-store-session-foundation/src/index.ts`,
      "@onyx/account-authentication-server-authority": `${workspaceRoot}packages/account-authentication-server-authority/src/index.ts`,
      "@onyx/workspace-connectors": `${workspaceRoot}packages/workspace-connectors/src/index.ts`,
    },
  },
});
