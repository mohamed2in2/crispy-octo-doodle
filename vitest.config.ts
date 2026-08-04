import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * The `@/*` alias mirrors the `paths` mapping in tsconfig.json so tests can
 * import application modules with the same specifier the app uses. It is
 * declared explicitly rather than via vite-tsconfig-paths to avoid adding a
 * second dependency.
 *
 * `environment: "node"` because the initial suite covers server-side helpers.
 * Add `environment: "jsdom"` (and jsdom itself) when component tests arrive.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Exclude generated Prisma output; it contains no tests and is large.
    exclude: ["**/node_modules/**", "src/generated/**", ".next/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "src/generated/**"],
    },
  },
});
