// AUTHORED-BY Claude Opus 5.5
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The app's URL segment; tools/build-site.mjs copies dist/ to the site's /wallet/. */
export const SLUG = "wallet";

export default defineConfig({
  base: `/${SLUG}/`,
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true, target: "es2022" },
  plugins: [react()],
  resolve: {
    // vc-kit's stand-ins for the three Node modules the pinned signing library imports
    // (packages/vc-kit/README.md, "Running in a browser or a worker").
    alias: {
      "node:zlib": "@mortgage/vc-kit/browser/zlib",
      "node:crypto": "@mortgage/vc-kit/browser/crypto",
      "@jeswr/guarded-fetch/node": "@mortgage/vc-kit/browser/guarded-fetch",
    },
  },
  // The prover's wasm workers are loaded by bb.js itself; pre-bundling breaks their URLs.
  optimizeDeps: { exclude: ["@aztec/bb.js", "@noir-lang/noir_js"] },
  worker: { format: "es" },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
