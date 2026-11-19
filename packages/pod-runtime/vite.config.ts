// AUTHORED-BY Claude Opus 5.5
/**
 * Builds `dist/pods-sw.js`: one classic (IIFE) script, because a service worker may not use
 * top-level await or `import()`. The wasm is inlined as base64 so the single file that
 * tools/build-site.mjs copies is all the site needs. `MORTGAGE_HOST_MODE=1` builds host mode.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const VIRTUAL = "virtual:pod-runtime-wasm";
const HOST_CONFIG = "virtual:pod-runtime-host-config";
const hostMode = process.env.MORTGAGE_HOST_MODE === "1";

/**
 * Host mode fixes the owners and identities at build time, from the registry module named by
 * MORTGAGE_HOST_REGISTRY, export MORTGAGE_HOST_REGISTRY_EXPORT (default `ORGS`). Nothing a page sends can
 * change them. Path mode exports `undefined`: pages say who they are (design.md §d.5).
 */
function hostConfig(): Plugin {
  return {
    load(id) {
      if (id !== `\0${HOST_CONFIG}`) return undefined;
      if (!hostMode) return "export default undefined;";
      const registry = process.env.MORTGAGE_HOST_REGISTRY;
      const exportName = process.env.MORTGAGE_HOST_REGISTRY_EXPORT ?? "ORGS";
      if (!/^[A-Za-z_$][\w$]*$/.test(exportName))
        throw new Error("MORTGAGE_HOST_REGISTRY_EXPORT is not an identifier");
      if (!registry)
        throw new Error("a host-mode build needs MORTGAGE_HOST_REGISTRY (the registry module)");
      return [
        `import { ${exportName} as registry } from ${JSON.stringify(resolve(registry))};`,
        `import { holdersActedFor, podOwners } from "@mortgage/demo-kit/registry";`,
        "const identities = {};",
        "const holders = {};",
        "for (const [slug, record] of Object.entries(registry)) identities[slug] = record.actsAs;",
        "for (const slug of Object.keys(registry)) holders[slug] = [...holdersActedFor(registry, slug)];",
        "export default { holders, identities, owners: podOwners(registry) };",
      ].join("\n");
    },
    name: "pod-runtime-host-config",
    resolveId(id) {
      return id === HOST_CONFIG ? `\0${HOST_CONFIG}` : undefined;
    },
  };
}

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
    __HOST_MODE__: JSON.stringify(hostMode),
  },
  logLevel: "warn",
  plugins: [inlineWasm(), hostConfig()],
  publicDir: false,
});
