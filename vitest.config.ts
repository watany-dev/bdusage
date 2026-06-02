import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/cli.ts", "src/commands.ts", "src/version.ts"],
      thresholds: {
        statements: 94,
        branches: 77,
        functions: 95,
        lines: 95,
      },
      reporter: ["text", "lcov"],
    },
  },
});
