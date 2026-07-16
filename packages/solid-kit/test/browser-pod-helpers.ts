/**
 * Shared fixtures for the Mode-1 in-browser pod runtime tests (sm-23): the REAL
 * `--target web` wasm artifact loaded from the vendored `@jeswr/solid-server` package
 * (never a fake — bead sm-23's hard rule), plus the sm-20 Alex Rivera persona built
 * through `@mortgage/data-model`'s validated wrappers.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { type Persona, personas } from "@mortgage/data-model";

const require = createRequire(import.meta.url);

/** The persona-fixture reference instant (decision 0012: fixtures never read the clock). */
export const FIXTURE_NOW = new Date("2026-07-01T00:00:00Z");

/** Load the `--target web` wasm binary the vendored tarball ships. */
export async function loadWasmBytes(): Promise<Uint8Array> {
  return readFile(require.resolve("@jeswr/solid-server/wasm/sparq_lws_wasm_bg.wasm"));
}

/** Build the sm-20 primary persona (Alex Rivera) with deterministic content. */
export async function buildAlexRivera(): Promise<Persona> {
  const built = await personas({ now: FIXTURE_NOW });
  const alex = built.find((persona) => persona.id === "alex-rivera");
  if (alex === undefined) throw new Error("sm-20 fixtures no longer include alex-rivera");
  return alex;
}

export const NOTE_TURTLE = `@prefix schema: <http://schema.org/> .

<> a schema:NoteDigitalDocument ;
    schema:text "browser pod round-trip payload" .
`;
