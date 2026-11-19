// AUTHORED-BY Claude Fable 5.2
/**
 * The world a journey step runs in: who can fetch, what day it is, who holds which key.
 *
 * Every pod effect in `journey.ts`, `grants.ts` and `seed.ts` is a plain function over this
 * interface. The apps pass the real pod runtime (`podFetch` with the session's organisation); the
 * headless test passes a small in-memory host over the same wasm server. Nothing here knows
 * which of the two it is given.
 */

import { parseRdf } from "@jeswr/fetch-rdf";
import { type MortgageResource, TURTLE_PREFIXES, validate } from "@mortgage/data-model";
import type { DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { AppNote } from "@mortgage/demo-kit/contracts";
import { type PodOwner, webidFor } from "@mortgage/demo-kit/registry";
import type { KeyPair } from "@mortgage/vc-kit";
import type { DatasetCore, Quad } from "@rdfjs/types";
import { Writer } from "n3";

export interface World {
  /** The origin every pod lives under, e.g. `https://pods.example`. */
  readonly podOrigin: string;
  readonly calendar: DemoCalendar;
  /** The simulated day the current step happens on. */
  readonly day: number;
  /** A fetch that the pod host authenticates as `owner`'s WebID. */
  fetchAs(owner: PodOwner): typeof fetch;
  /** `owner`'s Ed25519 signing key (WebCrypto), created at first run and never shipped. */
  keyFor(owner: PodOwner): Promise<KeyPair>;
  /** An "app said" Lens entry: something no pod request can show. */
  note(note: AppNote): void;
}

/** The absolute URL of `path` in `owner`'s pod (`path` has no leading slash). */
export function podUrl(world: Pick<World, "podOrigin">, owner: PodOwner, path = ""): string {
  return new URL(`/pods/${owner}/${path}`, world.podOrigin).href;
}

export function webid(world: Pick<World, "podOrigin">, owner: PodOwner): string {
  return webidFor(owner, world.podOrigin);
}

/** The instant of the current step at `time` ("HH:MM"). */
export function at(world: Pick<World, "calendar" | "day">, time: string): Date {
  return world.calendar.clock(world.day, time);
}

/** Midnight UTC of a demo day, for `xsd:date` values. */
export function dateOf(world: Pick<World, "calendar">, day: number): Date {
  return new Date(`${world.calendar.date(day)}T00:00:00Z`);
}

/** A pod answered with a status the caller did not expect. */
export class PodRequestError extends Error {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly status: number,
  ) {
    super(`${method} ${url} answered ${status}`);
    this.name = "PodRequestError";
  }
}

function writeTurtle(quads: readonly Quad[], baseIRI?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({
      format: "text/turtle",
      prefixes: TURTLE_PREFIXES,
      ...(baseIRI === undefined ? {} : { baseIRI }),
    });
    writer.addQuads([...quads]);
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });
}

/** Validate a resource against its shape and serialise it. With `baseIRI`, IRIs are written relative. */
export async function toTurtle(resource: MortgageResource, baseIRI?: string): Promise<string> {
  const report = await validate(resource.dataset, {
    expect: resource.resourceKind,
    focusNode: resource.value,
  });
  if (!report.conforms) {
    const detail = report.violations
      .map((violation) => `${violation.message} (${violation.path.join(" / ")})`)
      .join("; ");
    throw new Error(`${resource.resourceKind} ${resource.value} violates its shape: ${detail}`);
  }
  return writeTurtle([...resource.dataset] as Quad[], baseIRI);
}

/** The document URL of a resource IRI (its fragment removed). */
export function documentUrl(iri: string): string {
  const url = new URL(iri);
  url.hash = "";
  return url.href;
}

/** PUT a shape-checked resource at its own IRI. */
export async function putResource(
  fetcher: typeof fetch,
  resource: MortgageResource,
): Promise<string> {
  const url = documentUrl(resource.value);
  await put(fetcher, url, await toTurtle(resource), "text/turtle");
  return url;
}

export async function put(
  fetcher: typeof fetch,
  url: string,
  body: string,
  contentType: string,
): Promise<void> {
  const response = await fetcher(url, {
    body,
    headers: { "content-type": contentType },
    method: "PUT",
  });
  if (!response.ok) throw new PodRequestError("PUT", url, response.status);
}

/**
 * POST a shape-checked resource into a container the caller may only append to. The server
 * picks the name, so the resource is built under a placeholder IRI and written relative to it;
 * the server resolves `<>` against the URL it assigns. Returns that URL.
 */
export async function postResource(
  fetcher: typeof fetch,
  container: string,
  slug: string,
  build: (iri: string) => MortgageResource,
): Promise<string> {
  const placeholder = `${container}${slug}`;
  const body = await toTurtle(build(placeholder), placeholder);
  const response = await fetcher(container, {
    body,
    headers: { "content-type": "text/turtle", slug },
    method: "POST",
  });
  const location = response.headers.get("location");
  if (!response.ok || location === null) {
    throw new PodRequestError("POST", container, response.status);
  }
  return new URL(location, container).href;
}

/** GET and parse an RDF resource. Throws {@link PodRequestError} with the status on refusal. */
export async function readDataset(fetcher: typeof fetch, url: string): Promise<DatasetCore> {
  const response = await fetcher(url, { headers: { accept: "text/turtle" } });
  if (!response.ok) throw new PodRequestError("GET", url, response.status);
  return parseRdf(await response.text(), response.headers.get("content-type"), { baseIRI: url });
}

/** GET a resource as text (credential bodies are verified from the exact bytes read). */
export async function readText(
  fetcher: typeof fetch,
  url: string,
  accept = "text/turtle",
): Promise<string> {
  const response = await fetcher(url, { headers: { accept } });
  if (!response.ok) throw new PodRequestError("GET", url, response.status);
  return response.text();
}

/** The status a GET gets, without throwing: what a denied read looks like to the caller. */
export async function statusOf(fetcher: typeof fetch, url: string): Promise<number> {
  const response = await fetcher(url, { headers: { accept: "text/turtle" } });
  return response.status;
}

export async function remove(fetcher: typeof fetch, url: string): Promise<void> {
  const response = await fetcher(url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new PodRequestError("DELETE", url, response.status);
  }
}

export { writeTurtle };
