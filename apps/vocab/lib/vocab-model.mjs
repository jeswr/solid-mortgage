/**
 * Shared vocabulary model helpers for the build-time generator.
 *
 * Parses vocab/mort.ttl (the single source of truth) with the sanctioned n3
 * parser and derives the term model the HTML documentation page renders.
 */
import { Parser } from "n3";

export const MORT_NAMESPACE = "https://solid-mortgage-vocab.vercel.app/mort#";
export const MORT_ONTOLOGY_IRI = "https://solid-mortgage-vocab.vercel.app/mort";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";
const RDFS_RANGE = "http://www.w3.org/2000/01/rdf-schema#range";
const RDFS_SEE_ALSO = "http://www.w3.org/2000/01/rdf-schema#seeAlso";
const RDFS_SUBCLASS_OF = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
const SKOS_IN_SCHEME = "http://www.w3.org/2004/02/skos/core#inScheme";

const KIND_BY_TYPE = new Map([
  ["http://www.w3.org/2002/07/owl#Class", "Class"],
  ["http://www.w3.org/2002/07/owl#ObjectProperty", "Object property"],
  ["http://www.w3.org/2002/07/owl#DatatypeProperty", "Datatype property"],
  ["http://www.w3.org/2004/02/skos/core#ConceptScheme", "Concept scheme"],
  ["http://www.w3.org/2004/02/skos/core#Concept", "Concept"],
]);

export function parseVocab(turtle) {
  return new Parser({ format: "text/turtle" }).parse(turtle);
}

/** Groups the vocabulary quads into a display model, one entry per mort: term. */
export function buildTermModel(quads) {
  const bySubject = new Map();
  for (const quad of quads) {
    const subject = quad.subject.value;
    if (quad.subject.termType !== "NamedNode" || !subject.startsWith(MORT_NAMESPACE)) continue;
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(quad);
  }

  const terms = [];
  for (const [iri, subjectQuads] of bySubject) {
    const objectValues = (predicate) =>
      subjectQuads.filter((quad) => quad.predicate.value === predicate).map((q) => q.object.value);
    const types = objectValues(RDF_TYPE);
    const kind = types.map((type) => KIND_BY_TYPE.get(type)).find(Boolean) ?? "Term";
    terms.push({
      iri,
      localName: iri.slice(MORT_NAMESPACE.length),
      kind,
      label: objectValues(RDFS_LABEL)[0] ?? "",
      comment: objectValues(RDFS_COMMENT)[0] ?? "",
      range: objectValues(RDFS_RANGE)[0],
      subClassOf: objectValues(RDFS_SUBCLASS_OF)[0],
      inScheme: objectValues(SKOS_IN_SCHEME)[0],
      seeAlso: objectValues(RDFS_SEE_ALSO),
    });
  }

  const kindOrder = ["Class", "Object property", "Datatype property", "Concept scheme", "Concept"];
  terms.sort(
    (a, b) =>
      kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) ||
      a.localName.localeCompare(b.localName),
  );
  return terms;
}
