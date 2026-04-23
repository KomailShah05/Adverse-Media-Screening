import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Provide minimal env vars so env.js validation passes during import
    env: {
      NODE_ENV: "test",
      OPENAI_API_KEY: "sk-test-key-for-unit-tests",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/screening/**"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
