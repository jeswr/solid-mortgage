#!/usr/bin/env node
/**
 * Build-time generator for the vocab publication app.
 *
 * Reads vocab/mort.ttl (the single source of truth), parses it with n3, and
 * emits generated/vocab-artifacts.json holding the three representations the
 * /mort route serves via content negotiation:
 *   - turtle:  the source file verbatim (canonical)
 *   - jsonld:  produced via @jeswr/rdf-serialize (N-Quads) -> jsonld.fromRDF -> compact
 *   - html:    a labels/comments documentation table with per-term fragment anchors
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { serialize } from "@jeswr/rdf-serialize";
import jsonld from "jsonld";
import {
  buildTermModel,
  MORT_NAMESPACE,
  MORT_ONTOLOGY_IRI,
  parseVocab,
} from "../lib/vocab-model.mjs";

const APP_ROOT = path.resolve(import.meta.dirname, "..");
const VOCAB_TTL = path.resolve(APP_ROOT, "..", "..", "vocab", "mort.ttl");
const OUTPUT = path.join(APP_ROOT, "generated", "vocab-artifacts.json");

const JSONLD_CONTEXT = {
  cred: "https://www.w3.org/2018/credentials#",
  dcterms: "http://purl.org/dc/terms/",
  mort: MORT_NAMESPACE,
  owl: "http://www.w3.org/2002/07/owl#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compactIri(iri) {
  for (const [prefix, namespace] of Object.entries(JSONLD_CONTEXT)) {
    if (iri.startsWith(namespace)) return `${prefix}:${iri.slice(namespace.length)}`;
  }
  return iri;
}

function termRow(term) {
  const details = [];
  if (term.subClassOf) details.push(`subclass of ${compactIri(term.subClassOf)}`);
  if (term.range) details.push(`range ${compactIri(term.range)}`);
  if (term.inScheme) details.push(`in scheme ${compactIri(term.inScheme)}`);
  const seeAlso = term.seeAlso
    .map((iri) => `<a href="${escapeHtml(iri)}">${escapeHtml(compactIri(iri))}</a>`)
    .join(", ");
  return `      <tr id="${escapeHtml(term.localName)}">
        <td><a href="#${escapeHtml(term.localName)}"><code>mort:${escapeHtml(term.localName)}</code></a></td>
        <td>${escapeHtml(term.kind)}</td>
        <td>${escapeHtml(term.label)}</td>
        <td>${escapeHtml(term.comment)}${details.length > 0 ? `<br /><small>${escapeHtml(details.join(" · "))}</small>` : ""}${seeAlso ? `<br /><small>See also: ${seeAlso}</small>` : ""}</td>
      </tr>`;
}

function htmlDocument(terms) {
  const rows = terms.map(termRow).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Solid Mortgage Showcase residue vocabulary (mort)</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 72rem; padding: 0 1rem; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: 0.5rem; text-align: left; vertical-align: top; }
    code { word-break: break-all; }
    tr:target { outline: 2px solid currentColor; }
    .formats { font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <h1>Solid Mortgage Showcase residue vocabulary</h1>
    <p>
      Namespace <code>${escapeHtml(MORT_NAMESPACE)}</code> (prefix <code>mort:</code>).
      This is a hash namespace: every term is a fragment of this document, so dereferencing a
      term IRI returns this document with the term&#39;s definition addressable by its anchor.
    </p>
    <p class="formats">
      Also available as <a href="/mort" type="text/turtle">Turtle</a> and
      <a href="/mort" type="application/ld+json">JSON-LD</a> via content negotiation on
      <code>${escapeHtml(MORT_ONTOLOGY_IRI)}</code> (<code>Accept: text/turtle</code> or
      <code>Accept: application/ld+json</code>).
    </p>
    <p>
      A <em>residue</em> vocabulary: it defines only the terms that FIBO, schema.org,
      W3C VC&#160;2.0, DPV, and ODRL do not provide for the Solid Mortgage Showcase.
      Part of a concept demonstration — not affiliated with or endorsed by any organisation
      named in term documentation.
    </p>
    <table>
      <thead>
        <tr><th scope="col">Term</th><th scope="col">Kind</th><th scope="col">Label</th><th scope="col">Definition</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </main>
</body>
</html>
`;
}

const turtle = await readFile(VOCAB_TTL, "utf8");
const quads = parseVocab(turtle);
const terms = buildTermModel(quads);
if (terms.length === 0) throw new Error(`no mort: terms found in ${VOCAB_TTL}`);

const nquads = await serialize(quads, { format: "application/n-quads" });
const expanded = await jsonld.fromRDF(nquads);
const compacted = await jsonld.compact(expanded, JSONLD_CONTEXT);

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify(
    {
      turtle,
      jsonld: `${JSON.stringify(compacted, null, 2)}\n`,
      html: htmlDocument(terms),
      termCount: terms.length,
    },
    null,
    2,
  )}\n`,
);
console.log(`generated ${path.relative(APP_ROOT, OUTPUT)} (${terms.length} terms)`);
