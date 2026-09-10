import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { buildApprovedMicrosoftPublicDefine, ensureNoForbiddenBrowserEnv } from "./viteMicrosoftEnvBridge";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  ensureNoForbiddenBrowserEnv(env);

  return {
    envPrefix: "VITE_",
    define: buildApprovedMicrosoftPublicDefine(env),
    plugins: [react()],
    server: { port: 5173 },
  };
});