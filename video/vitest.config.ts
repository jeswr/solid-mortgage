// AUTHORED-BY Claude Opus 5.5
// The video checks: `pnpm exec vitest run --root video` (needs `pnpm run build` first).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
