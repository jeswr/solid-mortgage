/**
 * Guarded server-side pod IO for the property issuer rail. Adapted from the
 * reviewed `apps/lender-boa/lib/server/pod.ts` (decision 0015): reads go through
 * `@jeswr/fetch-rdf`; the signed credential Turtle lands here for a conditional
 * PUT into the borrower's own pod.
 *
 * SSRF posture: the pod base is DERIVED from the authenticated caller
 * (decision 0015 — never a request parameter), and defence-in-depth confines
 * every pod IO to the operator-configured `MORTGAGE_POD_ALLOWED_ORIGINS`
 * allowlist; non-loopback origins must be https, and redirects are refused.
 * No allowlist ⇒ every pod route fails closed (503).
 *
 * WRITE AUTHORIZATION is enforced by the POD (WAC), not by this app: pod IO
 * accepts an injectable fetch, defaulting to a plain redirect-refusing
 * (ANONYMOUS) fetch. Against a WAC-enabled pod, an anonymous write to a
 * private container is refused — the demo can never silently depend on an
 * open pod. In the seeded dev/e2e pod the container the borrower owns is
 * writable, which is what the issue path exercises.
 */
import { fetchRdf, RdfFetchError } from "@jeswr/fetch-rdf";
import type { DatasetCore } from "@rdfjs/types";
import type { PropertyConfig } from "./config";

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
export function assertAllowedPodBase(pod: string, config: PropertyConfig): string {
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
  // sm-h2p: a query/fragment survives into `url.href` (the return value), but
  // fetch STRIPS the fragment on the wire — so `<pod>profile/card` composed
  // from `https://host/x#y` actually reads `https://host/x`, NOT the
  // owner-only-writable profile card, defeating the decision-0015 backward
  // acknowledgment. Check `href` (not `url.search`/`url.hash`): a bare
  // trailing `?`/`#` has EMPTY search/hash yet is preserved in href.
  if (url.href.includes("?") || url.href.includes("#")) {
    throw new PodAccessError(400, "pod URL must not carry a query or fragment");
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

/** The pod-IO fetch seam. Redirect-refusing always. */
export type PodIoFetch = typeof fetch;

/** The default (ANONYMOUS) pod-IO fetch — see the module-header write note. */
export function anonymousPodFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, redirect: "error" });
}

export interface PodResource {
  readonly dataset: DatasetCore;
  readonly etag: string | null;
}

/** GET+parse one pod RDF resource. 404 → `undefined`; other failures throw. */
export async function readPodResource(
  iri: string,
  base: string,
  podFetch: PodIoFetch = anonymousPodFetch,
): Promise<PodResource | undefined> {
  try {
    const { dataset, etag } = await fetchRdf(iri, {
      fetch: (input, init) => podFetch(input, { ...init, redirect: "error" }),
    });
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
 * Conditional PUT of a signed credential document: `If-Match` when the caller
 * read an ETag, `If-None-Match: *` for a create — a lost-update can never
 * clobber.
 */
export async function writePodDocument(
  iri: string,
  body: string,
  options: {
    etag: string | null | undefined;
    contentType?: string;
    podFetch?: PodIoFetch;
  },
): Promise<void> {
  const headers: Record<string, string> = {
    "content-type": options.contentType ?? "text/turtle",
  };
  if (options.etag !== null && options.etag !== undefined) headers["if-match"] = options.etag;
  else headers["if-none-match"] = "*";
  const podFetch = options.podFetch ?? anonymousPodFetch;
  const response = await podFetch(iri, {
    method: "PUT",
    headers,
    body,
    redirect: "error",
  });
  if (!response.ok) {
    throw new PodAccessError(502, `pod write to ${iri} failed with ${response.status}`);
  }
}
