import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    include: ["test/**/*.test.{js,mjs,cjs,ts,mts,cts}"],
    restoreMocks: true,
  },
});
