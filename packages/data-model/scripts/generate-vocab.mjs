#!/usr/bin/env node
/**
 * Generates src/vocab/mort.ts (committed) from vocab/mort.ttl, the single
 * source of truth for the mort residue vocabulary.
 *
 *   node scripts/generate-vocab.mjs          # (re)write the constants module
 *   node scripts/generate-vocab.mjs --check  # exit 1 if the committed module drifted
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Parser } from "n3";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const VOCAB_TTL = path.resolve(PACKAGE_ROOT, "..", "..", "vocab", "mort.ttl");
const OUTPUT = path.join(PACKAGE_ROOT, "src", "vocab", "mort.ts");
const MORT_NAMESPACE = "https://solid-mortgage-vocab.vercel.app/mort#";
const MORT_ONTOLOGY_IRI = "https://solid-mortgage-vocab.vercel.app/mort";

function termLocalNames(quads) {
  const locals = new Set();
  for (const quad of quads) {
    if (quad.subject.termType === "NamedNode" && quad.subject.value.startsWith(MORT_NAMESPACE)) {
      locals.add(quad.subject.value.slice(MORT_NAMESPACE.length));
    }
  }
  return [...locals].sort((a, b) => a.localeCompare(b));
}

function constantKey(localName) {
  const key = localName.replaceAll("-", "_");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`term local name is not codegen-safe: ${localName}`);
  }
  return key;
}

export async function generateModule() {
  const turtle = await readFile(VOCAB_TTL, "utf8");
  const quads = new Parser({ format: "text/turtle" }).parse(turtle);
  const locals = termLocalNames(quads);
  if (locals.length === 0) throw new Error(`no mort: terms found in ${VOCAB_TTL}`);

  const entries = locals
    .map((local) => {
      // Match Biome's formatter (lineWidth 100): break long entries after the key.
      const oneLine = `  ${constantKey(local)}: "${MORT_NAMESPACE}${local}",`;
      return oneLine.length <= 100
        ? oneLine
        : `  ${constantKey(local)}:\n    "${MORT_NAMESPACE}${local}",`;
    })
    .join("\n");
  return `// Generated from vocab/mort.ttl by scripts/generate-vocab.mjs - DO NOT EDIT.
// Regenerate from packages/data-model: node scripts/generate-vocab.mjs

/** IRI of the mort ontology (the hash-namespace document). */
export const MORT_ONTOLOGY_IRI = "${MORT_ONTOLOGY_IRI}";

/** Namespace of the mort residue vocabulary. */
export const MORT_NAMESPACE = "${MORT_NAMESPACE}";

/**
 * IRI constants for every term defined in vocab/mort.ttl
 * (hyphens in SKOS concept local names become underscores).
 */
export const MORT = {
${entries}
} as const;

/** Constant keys of the mort vocabulary. */
export type MortTermKey = keyof typeof MORT;

/** Term IRIs of the mort vocabulary. */
export type MortTermIri = (typeof MORT)[MortTermKey];
`;
}

const isCheck = process.argv.includes("--check");
const generated = await generateModule();
if (isCheck) {
  const committed = await readFile(OUTPUT, "utf8").catch(() => "");
  if (committed !== generated) {
    console.error(
      `${path.relative(PACKAGE_ROOT, OUTPUT)} is stale - run: node scripts/generate-vocab.mjs`,
    );
    process.exit(1);
  }
  console.log("vocab constants are up to date");
} else {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, generated);
  console.log(`wrote ${path.relative(PACKAGE_ROOT, OUTPUT)}`);
}
