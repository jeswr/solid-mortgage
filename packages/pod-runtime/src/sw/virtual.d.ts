// AUTHORED-BY Claude Opus 5.5
/** The wasm binary, base64-encoded and inlined into pods-sw.js by vite.config.ts. */
declare module "virtual:pod-runtime-wasm" {
  const base64: string;
  export default base64;
}

/** True in a host-mode build (MORTGAGE_HOST_MODE=1): identity comes only from the bridge page. */
declare const __HOST_MODE__: boolean;
