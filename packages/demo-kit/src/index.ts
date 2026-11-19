// AUTHORED-BY Claude Opus 5.5
/**
 * @mortgage/demo-kit: what every demo app and engine package shares. Browser-safe.
 * The React trust components live under `@mortgage/demo-kit/trust` so engine packages that do
 * not render React (pod-runtime, lens) never pull React in.
 */
export * from "./calendar.js";
export * from "./contracts/index.js";
export * from "./registry.js";
export * from "./urls.js";
