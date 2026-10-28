import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lanza un error fuera de Next.js; en las pruebas se sustituye por un módulo vacío.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
