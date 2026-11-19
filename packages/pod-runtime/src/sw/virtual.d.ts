// AUTHORED-BY Claude Opus 5.5
/** The wasm binary, base64-encoded and inlined into pods-sw.js by vite.config.ts. */
declare module "virtual:pod-runtime-wasm" {
  const base64: string;
  export default base64;
}

/** Host mode: owners, identities and holders from the build-time registry; `undefined` in path mode. */
declare module "virtual:pod-runtime-host-config" {
  const config:
    | {
        owners: import("@mortgage/demo-kit/registry").PodOwner[];
        identities: Record<string, import("@mortgage/demo-kit/registry").PodOwner>;
        /** The holders each app may act for (`holdersActedFor`). */
        holders: Record<string, readonly string[]>;
      }
    | undefined;
  export default config;
}

/** True in a host-mode build (MORTGAGE_HOST_MODE=1): identity comes only from the bridge page. */
declare const __HOST_MODE__: boolean;
