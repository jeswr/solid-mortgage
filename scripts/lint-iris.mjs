#!/usr/bin/env node
/**
 * HEAD-check every HTTP(S) IRI in Git-tracked RDF data for dereferenceability.
 * Successful results are cached on disk for seven days; HEAD failures retry with GET.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_FILE = path.join(ROOT, ".cache", "iri-lint.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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
const SKIP_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function trackedRdfFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => RDF_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => path.join(ROOT, file));
}

function shouldSkip(iri) {
  const { hostname } = new URL(iri);
  return (
    SKIP_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname === "example.com" ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".test")
  );
}

export function extractIris(text) {
  const iris = new Set();
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>)\]}\\,;`]+/g)) {
    const iri = match[0].replace(/[.>;,)`]+$/, "").split("#")[0];
    if (!shouldSkip(iri)) iris.add(iri);
  }
  return iris;
}

async function checkIri(iri) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const response = await fetch(iri, {
        method,
        redirect: "follow",
        headers: {
          accept:
            "text/turtle, application/ld+json, application/rdf+xml, text/html;q=0.5, */*;q=0.1",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return { ok: true, status: response.status };
    } catch (error) {
      if (method === "GET") {
        return { ok: false, status: String(error?.cause?.code ?? error.name) };
      }
    }
  }
  return { ok: false, status: "unreachable" };
}

async function loadCache() {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    console.warn(`Ignoring unreadable cache at ${path.relative(ROOT, CACHE_FILE)}.`);
    return {};
  }
}

const iris = new Set();
for (const file of trackedRdfFiles()) {
  for (const iri of extractIris(await readFile(file, "utf8"))) iris.add(iri);
}

const cache = await loadCache();
const now = Date.now();
const failures = [];
let checked = 0;

for (const iri of [...iris].sort()) {
  const cached = cache[iri];
  if (cached?.ok && now - cached.at < CACHE_TTL_MS) continue;
  const result = await checkIri(iri);
  checked += 1;
  cache[iri] = { ...result, at: now };
  if (!result.ok) failures.push(`${iri} -> ${result.status}`);
}

await mkdir(path.dirname(CACHE_FILE), { recursive: true });
await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);

console.log(`lint:iris - ${iris.size} IRIs (${checked} checked live, rest cached)`);
if (failures.length > 0) {
  console.error(`\nUnreachable IRIs:\n  ${failures.join("\n  ")}`);
  process.exitCode = 1;
} else {
  console.log("All IRIs dereference.");
}
