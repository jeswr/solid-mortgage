import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const prefix = "/property";

const nextConfig: NextConfig = {
  assetPrefix: prefix,
  basePath: prefix,
  turbopack: {
    root: workspaceRoot,
  },
  // `@jeswr/guarded-fetch` stays external because its `/node` entry (the
  // DNS-pinning WebID-profile fetch the decision-0015 owner binding uses,
  // lib/server/owner.ts) imports undici + node builtins that must not be
  // client-bundled.
  serverExternalPackages: ["@jeswr/guarded-fetch"],
};

export default nextConfig;
