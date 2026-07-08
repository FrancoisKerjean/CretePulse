import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // affiliate.test.ts uses node:test runner directly (npm run test:affiliate)
    include: ["src/**/*.test.ts"],
    exclude: ["src/lib/affiliate.test.ts"],
    environment: "node",
  },
});
