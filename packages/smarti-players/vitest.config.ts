import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@smarti/ui": path.resolve(__dirname, "../smarti-ui/src"),
      "@smarti/api": path.resolve(__dirname, "../smarti-api/src"),
      "@smarti/session": path.resolve(__dirname, "../smarti-session/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
