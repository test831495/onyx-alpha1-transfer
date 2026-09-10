import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const forbidden = ["ONYX_MS_CLIENT_SECRET", "VITE_MS_CLIENT_SECRET"].filter((key) => {
    const value = env[key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (forbidden.length > 0) {
    throw new Error(
      `Forbidden secret-bearing Microsoft environment variables detected: ${forbidden.join(", ")}. Browser builds must fail closed.`,
    );
  }

  return {
    envPrefix: "VITE_",
    plugins: [react()],
    server: { port: 5173 },
  };
});