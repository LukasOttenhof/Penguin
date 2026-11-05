import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

const envDir = path.resolve(__dirname, "../..");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");

  return {
    envDir,
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    server: {
      // Proxies same-origin /api requests to the real (HTTP) backend from
      // Vite's Node process, so the browser never makes a direct cross-origin
      // request to it — avoids mixed-content blocking when the dev server is
      // served over HTTPS (e.g. a Codespaces forwarded port).
      proxy: {
        "/api": {
          target: env.VITE_AIDA_SERVER_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
