/**
 * Shared test rig for the property issuer suites: a deterministic Ed25519 issuer
 * key, a test issuer registry (both brands sign with that one key), a base
 * config builder, an in-memory capturing pod fetch (so the pure issuance tests
 * need no Solid server), and a Turtle parser.
 */

import { generateKeyPairForSuite, type KeyPair } from "@mortgage/vc-kit";
import type { DatasetCore } from "@rdfjs/types";
import { Parser, Store } from "n3";
import type { PropertyConfig } from "../lib/server/config";
import type { IssuerBrand, IssuerIdentity, IssuerRegistry } from "../lib/server/issuers";

// The seed-layer demo issuer identities (RFC 2606 `.example`, decision 0010).
export const APPRAISAL_ISSUER = "https://amc.example/orgs/appraisal-management#id";
export const TITLE_ISSUER = "https://title.example/orgs/title-company#id";
export const APPRAISAL_STATUS = "https://amc.example/status/appraisal";
export const TITLE_STATUS = "https://title.example/status/title";

let cachedKey: Promise<KeyPair> | undefined;
/** One deterministic-enough Ed25519 issuer key per suite run. */
export function testKey(): Promise<KeyPair> {
  cachedKey ??= generateKeyPairForSuite("https://property-test.example/issuer#key-1", "Ed25519");
  return cachedKey;
}

/** A registry where both brands sign with the single test key. */
export async function testIssuerRegistry(): Promise<IssuerRegistry> {
  const key = await testKey();
  const identities: Record<IssuerBrand, IssuerIdentity> = {
    appraisal: {
      brand: "appraisal",
      webid: APPRAISAL_ISSUER,
      key,
      statusListUrl: APPRAISAL_STATUS,
    },
    title: { brand: "title", webid: TITLE_ISSUER, key, statusListUrl: TITLE_STATUS },
  };
  return { resolve: (brand) => Promise.resolve(identities[brand]) };
}

/** A fully-populated config; override only what a test cares about. */
export function baseConfig(overrides: Partial<PropertyConfig> = {}): PropertyConfig {
  return {
    trustedOidcIssuers: [],
    podAllowedOrigins: [],
    enableRuntimeIssuance: true,
    appraisalIssuerWebId: APPRAISAL_ISSUER,
    titleIssuerWebId: TITLE_ISSUER,
    appraisalStatusListUrl: APPRAISAL_STATUS,
    titleStatusListUrl: TITLE_STATUS,
    allowInsecureLoopback: false,
    trustForwardedHeaders: false,
    ...overrides,
  };
}

export interface CapturingPod {
  readonly fetch: typeof fetch;
  /** URL → the PUT body written to it. */
  readonly writes: Map<string, string>;
}

/**
 * In-memory pod fetch: GET is always 404 (no existing resource → create path),
 * PUT captures the body. Enough to exercise `issue*`'s read-then-conditional-PUT
 * without a Solid server.
 */
export function capturingPod(): CapturingPod {
  const writes = new Map<string, string>();
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = init?.method ?? "GET";
    if (method === "PUT") {
      writes.set(url, String(init?.body ?? ""));
      return new Response(null, { status: 201 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetch: fetchImpl, writes };
}

/** Parse a Turtle credential document into a queryable Store. */
export function parseTurtle(body: string): Store & DatasetCore {
  return new Store(new Parser({ format: "text/turtle" }).parse(body));
}
