// AUTHORED-BY Claude Opus 5.5
/** Builds the test-only harness page (e2e/harness/) into e2e/harness/dist, served at /e2e-harness/. */
import { fileURLToPath } from "node:url";
import { mortgageAliases } from "@mortgage/content/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/e2e-harness/",
  build: { emptyOutDir: true, outDir: "dist", target: "es2022" },
  logLevel: "warn",
  resolve: { alias: mortgageAliases() },
  root: fileURLToPath(new URL("./harness", import.meta.url)),
});
