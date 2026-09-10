import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envPrefix: ["VITE_", "ONYX_MS_"],
  plugins: [react()],
  server: { port: 5173 },
});