// AUTHORED-BY Claude Opus 5.5
import { mortgageAliases } from "@mortgage/content/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The app's URL segment; tools/build-site.mjs copies dist/ to the site's /<slug>/. */
export const SLUG = "state";

export default defineConfig({
  base: `/${SLUG}/`,
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  plugins: [react()],
  // The pinned @jeswr/solid-vc build imports Node modules; vc-kit ships browser stand-ins.
  resolve: { alias: mortgageAliases() },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
