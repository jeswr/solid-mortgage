#!/usr/bin/env node
/**
 * CI guard: every mort: term referenced anywhere in packages/ or apps/ must be
 * defined in vocab/mort.ttl (the single source of truth). Catches typo'd or
 * never-minted term IRIs before they reach committed RDF or code.
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Parser } from "n3";

const ROOT = path.resolve(import.meta.dirname, "..");
const VOCAB_TTL = path.join(ROOT, "vocab", "mort.ttl");
const MORT_NAMESPACE = "https://solid-mortgage-vocab.vercel.app/mort#";
const FULL_IRI_PATTERN = /https:\/\/solid-mortgage-vocab\.vercel\.app\/mort#([A-Za-z][\w.-]*)/g;
const PREFIXED_PATTERN = /\bmort:([A-Za-z][\w-]*)/g;
const RDF_EXTENSIONS = new Set([
  ".jsonld",
  ".nq",
  ".nt",
  ".owl",
  ".rdf",
  ".shaclc",
  ".trig",
  ".ttl",
]);
const LOCAL_NAME_TRAILER = /[.-]+$/;

async function definedTerms() {
  const turtle = await readFile(VOCAB_TTL, "utf8");
  const quads = new Parser({ format: "text/turtle" }).parse(turtle);
  const locals = new Set();
  for (const quad of quads) {
    if (quad.subject.termType === "NamedNode" && quad.subject.value.startsWith(MORT_NAMESPACE)) {
      locals.add(quad.subject.value.slice(MORT_NAMESPACE.length));
    }
  }
  return locals;
}

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z", "--", "packages", "apps"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split("\0")
    .filter(Boolean)
    .map((file) => path.join(ROOT, file));
}

const defined = await definedTerms();
if (defined.size === 0) {
  console.error(`no mort: terms defined in ${VOCAB_TTL}`);
  process.exit(1);
}

const failures = [];
let referenceCount = 0;
for (const file of trackedFiles()) {
  const text = await readFile(file, "utf8").catch(() => null);
  if (text === null) continue;
  const isRdf = RDF_EXTENSIONS.has(path.extname(file).toLowerCase());
  const patterns = isRdf ? [FULL_IRI_PATTERN, PREFIXED_PATTERN] : [FULL_IRI_PATTERN];
  for (const [lineIndex, line] of text.split("\n").entries()) {
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        const localName = (match[1] ?? "").replace(LOCAL_NAME_TRAILER, "");
        if (localName === "" || defined.has(localName)) {
          referenceCount += 1;
          continue;
        }
        failures.push(
          `${path.relative(ROOT, file)}:${lineIndex + 1}: mort:${localName} is not defined in vocab/mort.ttl`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}
console.log(
  `check-mort-terms: ${referenceCount} reference(s) in packages/ and apps/ all resolve against ${defined.size} defined term(s)`,
);
