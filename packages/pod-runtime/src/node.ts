// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/pod-runtime/node`: the pod host in Node, for headless journeys in Vitest. Same host,
 * same real wasm as the service worker; the bytes come from the installed package.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createPodHost, type PodHost, type PodHostOptions } from "./host/host.js";
import { wasmLoader } from "./host/wasm.js";

const require = createRequire(import.meta.url);
let compiled: WebAssembly.Module | undefined;

/** The compiled `@sparq-org/solid-server` wasm (compiled once per process). */
export function nodeWasmModule(): WebAssembly.Module {
  if (compiled === undefined) {
    const glue = require.resolve("@sparq-org/solid-server/wasm");
    compiled = new WebAssembly.Module(readFileSync(join(dirname(glue), "sparq_lws_wasm_bg.wasm")));
  }
  return compiled;
}

/**
 * Watch `uncaughtException` for wasm traps. An error claimed by an in-flight dispatch is handled;
 * any other error keeps Node's default behaviour (print and exit) unless something else listens.
 */
function watchProcess(listener: (error: unknown) => boolean): () => void {
  const onError = (error: unknown) => {
    if (listener(error)) return;
    if (process.listenerCount("uncaughtException") > 1) return;
    console.error(error);
    process.exit(1);
  };
  process.on("uncaughtException", onError);
  return () => process.off("uncaughtException", onError);
}

export function createNodePodHost(
  options: Omit<PodHostOptions, "loadWasm"> & Partial<Pick<PodHostOptions, "loadWasm">>,
): PodHost {
  return createPodHost({
    loadWasm: wasmLoader(nodeWasmModule()),
    watchUncaught: watchProcess,
    ...options,
  });
}

export * from "./host/index.js";
