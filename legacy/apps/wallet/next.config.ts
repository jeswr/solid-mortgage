import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const prefix = "/wallet";

const nextConfig: NextConfig = {
  assetPrefix: prefix,
  basePath: prefix,
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      // solid-vc lazily imports the node-only DNS-pinning fetch as its
      // DEFAULT WebID/status fetch. The wallet's client code always injects
      // pod-served fetch seams, so in the BROWSER bundle the entry aliases to
      // a fail-closed stub (see the stub's header). Server bundles keep the
      // real module (`serverExternalPackages` below).
      "@jeswr/guarded-fetch/node": {
        browser: "./lib/pod/guarded-fetch-browser-stub.ts",
      },
    },
  },
  // The server rail pulls the decision-0015 owner resolver, whose production
  // profile fetch (`@jeswr/guarded-fetch/node`, DNS-pinned) imports undici +
  // node builtins that must never be client-bundled (lender-boa parity).
  serverExternalPackages: ["@jeswr/guarded-fetch"],
  async headers() {
    return [
      {
        // COOP/COEP on every route (workspace README "ZK proving" note): the
        // scene-2 HOLDER surface produces UltraHonk proofs in the browser and
        // cross-origin isolation unlocks bb.js multithreading (~4x). Applied
        // app-wide so the isolation state survives client-side navigation.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
