// AUTHORED-BY Claude Opus 5.5
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The app's URL segment; tools/build-site.mjs copies dist/ to the site's /<slug>/. */
export const SLUG = "payroll";

export default defineConfig({
  base: `/${SLUG}/`,
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  plugins: [react()],
  resolve: {
    // The pinned @jeswr/solid-vc build imports Node modules; vc-kit ships browser stand-ins.
    alias: {
      "node:zlib": "@mortgage/vc-kit/browser/zlib",
      "node:crypto": "@mortgage/vc-kit/browser/crypto",
      "@jeswr/guarded-fetch/node": "@mortgage/vc-kit/browser/guarded-fetch",
    },
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
