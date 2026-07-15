import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const zones = [
  {
    prefix: "/wallet",
    env: "MORTGAGE_WALLET_ZONE_URL",
    fallback: "https://wallet.invalid",
  },
  {
    prefix: "/verifications",
    env: "MORTGAGE_VERIFICATIONS_ZONE_URL",
    fallback: "https://verifications.invalid",
  },
  {
    prefix: "/lender-boa",
    env: "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
    fallback: "https://primary-lender.invalid",
  },
  {
    prefix: "/lender-53",
    env: "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
    fallback: "https://comparison-lender.invalid",
  },
  {
    prefix: "/gse",
    env: "MORTGAGE_UNDERWRITING_ZONE_URL",
    fallback: "https://underwriting.invalid",
  },
  {
    prefix: "/property",
    env: "MORTGAGE_PROPERTY_ZONE_URL",
    fallback: "https://property.invalid",
  },
  {
    prefix: "/closing",
    env: "MORTGAGE_CLOSING_ZONE_URL",
    fallback: "https://closing.invalid",
  },
] as const;

function readZoneUrl(env: (typeof zones)[number]["env"], fallback: string) {
  return (process.env[env] ?? fallback).replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  async rewrites() {
    return zones.flatMap(({ prefix, env, fallback }) => {
      const zoneUrl = readZoneUrl(env, fallback);
      return [
        {
          source: prefix,
          destination: `${zoneUrl}${prefix}`,
        },
        {
          source: `${prefix}/:path+`,
          destination: `${zoneUrl}${prefix}/:path+`,
        },
      ];
    });
  },
};

export default nextConfig;
