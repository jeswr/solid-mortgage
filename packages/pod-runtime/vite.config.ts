// AUTHORED-BY Claude Opus 5.5
/**
 * Builds `dist/pods-sw.js`: one classic (IIFE) script, because a service worker may not use
 * top-level await or `import()`. The wasm is inlined as base64 so the single file that
 * tools/build-site.mjs copies is all the site needs. `MORTGAGE_HOST_MODE=1` builds host mode.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";

const VIRTUAL = "virtual:pod-runtime-wasm";

function inlineWasm(): Plugin {
  return {
    load(id) {
      if (id !== `\0${VIRTUAL}`) return undefined;
      const glue = createRequire(import.meta.url).resolve("@sparq-org/solid-server/wasm");
      const bytes = readFileSync(join(dirname(glue), "sparq_lws_wasm_bg.wasm"));
      return `export default ${JSON.stringify(bytes.toString("base64"))};`;
    },
    name: "pod-runtime-inline-wasm",
    resolveId(id) {
      return id === VIRTUAL ? `\0${VIRTUAL}` : undefined;
    },
  };
}

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/sw/pods-sw.ts",
      fileName: () => "pods-sw.js",
      formats: ["iife"],
      name: "podRuntime",
    },
    minify: true,
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
  define: {
    __HOST_MODE__: JSON.stringify(process.env.MORTGAGE_HOST_MODE === "1"),
  },
  logLevel: "warn",
  plugins: [inlineWasm()],
  publicDir: false,
});
