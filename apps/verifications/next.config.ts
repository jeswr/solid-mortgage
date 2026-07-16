import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const prefix = "/verifications";

const nextConfig: NextConfig = {
  assetPrefix: prefix,
  basePath: prefix,
  turbopack: {
    root: workspaceRoot,
  },
  // `@mortgage/vc-kit` re-exports its ZK layer, whose proving/verifying path
  // loads Barretenberg + noir_js WASM; bundling them breaks WASM
  // instantiation, so they stay external (lender-boa parity). The decision-0015
  // owner resolver's production profile fetch (`@jeswr/guarded-fetch/node`,
  // DNS-pinned) imports undici + node builtins that must never be
  // client-bundled.
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js", "@jeswr/guarded-fetch"],
};

export default nextConfig;
