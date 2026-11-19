// AUTHORED-BY Claude Opus 5.5
import { mortgageAliases } from "@mortgage/content/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The app's URL segment; tools/build-site.mjs copies dist/ to the site's /wallet/. */
export const SLUG = "wallet";

export default defineConfig({
  base: `/${SLUG}/`,
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true, target: "es2022" },
  plugins: [react()],
  // The browser stand-ins for the Node modules @jeswr/solid-vc imports (content/vite.ts).
  // tools/build-site.mjs builds src/agent.ts with this config too.
  resolve: { alias: mortgageAliases() },
  // The prover's wasm workers are loaded by bb.js itself; pre-bundling breaks their URLs.
  optimizeDeps: { exclude: ["@aztec/bb.js", "@noir-lang/noir_js"] },
  worker: { format: "es" },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
