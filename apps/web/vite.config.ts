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
});
