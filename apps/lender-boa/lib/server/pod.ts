/**
 * Guarded server-side pod IO for the granted-access rail (decision 0012 rail
 * 2). Reads go through `@jeswr/fetch-rdf` (the sanctioned fetch+parse path);
 * writes serialise via the data-model wrapper layer upstream of this module
 * and land here as shape-validated Turtle for a conditional PUT.
 *
 * SSRF posture: the pod base arrives from the request (`?pod=`), so every
 * request is confined to the operator-configured `MORTGAGE_POD_ALLOWED_ORIGINS`
 * allowlist, non-loopback origins must be https, and redirects are refused.
 * No allowlist ⇒ every pod route fails closed (503).
 */
import { fetchRdf, RdfFetchError } from "@jeswr/fetch-rdf";
import type { DatasetCore } from "@rdfjs/types";
import type { LenderConfig } from "./config";

export class PodAccessError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PodAccessError";
    this.status = status;
  }
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopback(url: URL): boolean {
  return LOOPBACK_HOSTS.has(url.hostname) || url.hostname === "::1";
}

/**
 * Validate an untrusted pod base URL against the config allowlist. Returns
 * the normalised base (trailing slash). Throws `PodAccessError` (fail-closed).
 */
export function assertAllowedPodBase(pod: string, config: LenderConfig): string {
  if (config.podAllowedOrigins.length === 0) {
    throw new PodAccessError(503, "MORTGAGE_POD_ALLOWED_ORIGINS is unset — pod rail disabled");
  }
  let url: URL;
  try {
    url = new URL(pod);
  } catch {
    throw new PodAccessError(400, "pod is not a valid URL");
  }
  if (url.username !== "" || url.password !== "") {
    throw new PodAccessError(400, "pod URL must not carry userinfo");
  }
  const httpsOk = url.protocol === "https:";
  const loopbackOk = url.protocol === "http:" && config.allowInsecureLoopback && isLoopback(url);
  if (!httpsOk && !loopbackOk) {
    throw new PodAccessError(400, "pod must be https (or loopback http in dev mode)");
  }
  const allowed = config.podAllowedOrigins.some((entry) => {
    try {
      return new URL(entry).origin === url.origin;
    } catch {
      return false;
    }
  });
  if (!allowed) {
    throw new PodAccessError(403, `pod origin ${url.origin} is not in the allowlist`);
  }
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

/** Redirect-refusing fetch for all pod IO (an allowlisted origin must not bounce us out). */
function guardedPodFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, redirect: "error" });
}

export interface PodResource {
  readonly dataset: DatasetCore;
  readonly etag: string | null;
}

/** GET+parse one pod RDF resource. 404 → `undefined`; other failures throw. */
export async function readPodResource(iri: string, base: string): Promise<PodResource | undefined> {
  try {
    const { dataset, etag } = await fetchRdf(iri, { fetch: guardedPodFetch });
    return { dataset, etag };
  } catch (error) {
    if (error instanceof RdfFetchError && error.status === 404) return undefined;
    throw new PodAccessError(
      502,
      `could not read ${iri.replace(base, "<pod>/")}: ${(error as Error).message}`,
    );
  }
}

/**
 * Conditional PUT of shape-validated Turtle: `If-Match` when the caller read
 * an ETag, `If-None-Match: *` for a create — a lost-update can never clobber.
 */
export async function writePodTurtle(
  iri: string,
  turtle: string,
  options: { etag: string | null | undefined },
): Promise<void> {
  const headers: Record<string, string> = { "content-type": "text/turtle" };
  if (options.etag !== null && options.etag !== undefined) headers["if-match"] = options.etag;
  else headers["if-none-match"] = "*";
  const response = await guardedPodFetch(iri, { method: "PUT", headers, body: turtle });
  if (!response.ok) {
    throw new PodAccessError(502, `pod write to ${iri} failed with ${response.status}`);
  }
}
