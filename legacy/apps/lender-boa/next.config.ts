import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const prefix = "/lender-boa";

const nextConfig: NextConfig = {
  assetPrefix: prefix,
  basePath: prefix,
  turbopack: {
    root: workspaceRoot,
  },
  // The ZK verify path (`@mortgage/vc-kit`) runs Barretenberg + noir_js WASM
  // server-side. Bundling them through Turbopack breaks WASM instantiation
  // (proofs then fail to verify); keep them external so they load as real
  // Node ESM at runtime. `@jeswr/guarded-fetch` stays external because its
  // `/node` entry (the DNS-pinning WebID-profile fetch, decision 0015) imports
  // undici + node builtins that must not be client-bundled.
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js", "@jeswr/guarded-fetch"],
  async headers() {
    return [
      {
        // COOP/COEP on every route (workspace README "ZK proving" note): the
        // scene-2 surface hosts bb.js proving/verifying work, and cross-origin
        // isolation unlocks its multithreading. Applied app-wide so the
        // isolation state survives client-side navigation within the zone.
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
