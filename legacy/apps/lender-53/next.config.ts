import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const prefix = "/lender-53";

const nextConfig: NextConfig = {
  assetPrefix: prefix,
  basePath: prefix,
  turbopack: { root: workspaceRoot },
  // Keep the exact lender-boa ZK runtime posture: Turbopack bundling breaks
  // the server-side Noir/Barretenberg WASM verifier.
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js", "@jeswr/guarded-fetch"],
  async headers() {
    return [
      {
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
