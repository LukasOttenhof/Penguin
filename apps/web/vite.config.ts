import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const envDir = path.resolve(__dirname, "../..");

// https://vite.dev/config/
export default defineConfig({
  envDir,
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    // In dev, forward /api/* to the Express api on port 3000 (dropping the
    // /api prefix), so the browser talks to one origin and cookies just work.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ""),
      },
    },
  },
});
