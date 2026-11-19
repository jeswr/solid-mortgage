// AUTHORED-BY Claude Opus 5.5
/**
 * RDF plumbing shared by the host and the helpers: parse with @jeswr/fetch-rdf, read with
 * @rdfjs/wrapper / @solid/object accessors, serialise with n3.Writer. Nothing here builds Turtle by
 * string concatenation.
 */
import { extractMediaType, parseRdf, SUPPORTED_RDF_MEDIA_TYPES } from "@jeswr/fetch-rdf";
import type { DatasetCore, Quad } from "@rdfjs/types";
import {
  LiteralAs,
  NamedNodeAs,
  NamedNodeFrom,
  OptionalFrom,
  SetFrom,
  TermAs,
  TermWrapper,
} from "@rdfjs/wrapper";
import { DataFactory, Store, Writer } from "n3";

export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
export const CRED = "https://www.w3.org/2018/credentials#";

/** Media types the host parses (and therefore guards and describes). */
export function isRdfMediaType(contentType: string | null | undefined): boolean {
  const type = extractMediaType(contentType ?? null);
  return type !== null && (SUPPORTED_RDF_MEDIA_TYPES as readonly string[]).includes(type);
}

/** Parse an RDF body into an n3 Store (mutable, usable by the wrappers). */
export async function parseToStore(
  body: string,
  contentType: string,
  baseIRI: string,
): Promise<Store> {
  const parsed = await parseRdf(body, contentType, { baseIRI });
  return copyToStore(parsed);
}

export function copyToStore(dataset: Iterable<Quad>): Store {
  const store = new Store();
  for (const quad of dataset) store.addQuad(quad);
  return store;
}

/** Serialise quads to Turtle with n3.Writer. */
export function toTurtle(
  quads: Iterable<Quad>,
  prefixes: Record<string, string> = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes });
    for (const quad of quads) writer.addQuad(quad);
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });
}

/** Any node with `rdf:type`s. */
export class Typed extends TermWrapper {
  get types(): Set<string> {
    return SetFrom.subjectPredicate(this, RDF_TYPE, NamedNodeAs.string, NamedNodeFrom.string);
  }
}

/** The fields of a W3C Verifiable Credential the Lens shows (v2 `validFrom`, v1 `issuanceDate`). */
export class CredentialNode extends Typed {
  get issuer(): string | undefined {
    return OptionalFrom.subjectPredicate(this, `${CRED}issuer`, TermAs.term)?.value;
  }
  get validFrom(): string | undefined {
    return (
      OptionalFrom.subjectPredicate(this, `${CRED}validFrom`, LiteralAs.string) ??
      OptionalFrom.subjectPredicate(this, `${CRED}issuanceDate`, LiteralAs.string)
    );
  }
}

/** Subjects of `dataset` that are `url` itself or a fragment of it, wrapped as `Typed`. */
export function describedSubjects(dataset: DatasetCore, url: string): Typed[] {
  const seen = new Set<string>();
  const out: Typed[] = [];
  for (const quad of dataset.match(null, DataFactory.namedNode(RDF_TYPE), null)) {
    const subject = quad.subject;
    if (subject.termType !== "NamedNode" || seen.has(subject.value)) continue;
    if (subject.value !== url && !subject.value.startsWith(`${url}#`)) continue;
    seen.add(subject.value);
    out.push(new Typed(subject, dataset, DataFactory));
  }
  return out;
}
