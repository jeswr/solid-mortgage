// AUTHORED-BY Claude Opus 5.5
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // One process per file: a wasm trap or a stopped worker must not leak between files.
    pool: "forks",
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
