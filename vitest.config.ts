/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Configure Vitest for Next.js 14 testing.
 * Sets up aliases and environment.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", ".next/"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
