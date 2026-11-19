// AUTHORED-BY Claude Opus 5.5
/** Turn compiled wasm into the host's `loadWasm`: fresh glue + fresh instance on every call. */
import { createGlue, type Glue } from "../generated/glue-factory.js";

export function wasmLoader(module: WebAssembly.Module): () => Glue {
  return () => {
    const glue = createGlue();
    glue.initSync({ module });
    return glue;
  };
}

export type { Glue };
