import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    include: ["test/**/*.test.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    restoreMocks: true,
  },
});
