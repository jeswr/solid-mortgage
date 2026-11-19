// AUTHORED-BY Claude Opus 5.5
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The app's URL segment; tools/build-site.mjs copies dist/ to the site's /<slug>/. */
export const SLUG = "servicer";

/** vc-kit's browser stand-ins for the Node modules the pinned @jeswr/solid-vc imports. */
const shim = (name: string) =>
  fileURLToPath(new URL(`../../packages/vc-kit/dist/browser/${name}.js`, import.meta.url));

export default defineConfig({
  base: `/${SLUG}/`,
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  plugins: [react()],
  resolve: {
    alias: {
      "@jeswr/guarded-fetch/node": shim("guarded-fetch"),
      "node:crypto": shim("crypto"),
      "node:zlib": shim("zlib"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
