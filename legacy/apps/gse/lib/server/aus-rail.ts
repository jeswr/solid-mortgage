/**
 * The AUS route boundary (SECURITY-CRITICAL; mirrors the reviewed
 * apps/closing/lib/server/pod-rail.ts). Every handler:
 *
 *   1. requires a DPoP-bound Solid-OIDC caller (solid-kit `verifyApiRequest`;
 *      anonymous ⇒ 401 + `WWW-Authenticate`) — NO simulated bypass exists in
 *      server code, in any runtime mode;
 *   2. REJECTS caller-supplied `pod`/`webid` (query or body) with 400 — the
 *      identity and the pod are never request inputs;
 *   3. derives the authorized pod from the TOKEN WebID via the bidirectional
 *      `pim:storage` binding (`resolveAuthorizedPod`, decision 0015 L2);
 *   4. runs the AUS over the service identity's GRANTED pod fetch (L4) — the
 *      pod's WAC enforces the borrower's grant; there is NO anonymous
 *      fallback, so an unconfigured service identity fails closed (503) and
 *      a revoked grant fails the run instead of reading an open pod.
 *
 * Fail-closed invariants (do NOT weaken): unconfigured issuer allowlist ⇒
 * 503; unconfigured service identity ⇒ 503; any binding failure ⇒ 403;
 * malformed payloads ⇒ 400 before any pod IO; unexpected errors ⇒ 500, never
 * a pass. Handler order is strict: authenticate → reject overrides →
 * validate the body → ONLY THEN the pod binding + IO.
 */
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { createServicePodFetch } from "@mortgage/solid-kit/auth/service";
import { notConfigured } from "../../../lender-boa/lib/server/config";
import { type OwnerBindingSeams, resolveAuthorizedPod } from "../../../lender-boa/lib/server/owner";
import { PodAccessError, type PodIoFetch } from "../../../lender-boa/lib/server/pod";
import { type AusConfig, configuredAgent, requiredConfig } from "./config";
import type { VerifySeams } from "./loan-file";
import { runUnderwriting, type UnderwriteOptions } from "./underwrite";
import { publicRequestUrl } from "./url";

/** The verified caller of a pod route: token WebID + the ONE pod it binds to. */
export interface AuthenticatedPodCaller {
  readonly webid: string;
  readonly podBase: string;
}

export interface AusRailServiceOptions {
  readonly config: AusConfig;
  /** Injected in tests; defaults to a config-derived process-wide verifier. */
  readonly verifier?: DpopApiVerifier;
  /** Per-WebID rate limiter shared by the AUS routes. */
  readonly rateLimiter?: RateLimiter;
  /** Owner-binding seams (profile fetch) for tests. */
  readonly ownerSeams?: OwnerBindingSeams;
  /** Injected in tests together with {@link serviceWebId} (an account authFetch). */
  readonly podFetch?: PodIoFetch;
  /** The injected {@link podFetch}'s WebID (tests). Falls back to config. */
  readonly serviceWebId?: string;
  /** Credential-verification seams (in-process issuer fixtures in tests). */
  readonly verifySeams?: VerifySeams;
  /** Explicit clock seam. */
  readonly now?: () => Date;
}

export interface AusRailService {
  run(request: Request): Promise<Response>;
}

const OVERRIDE_PARAMS = ["pod", "webid"] as const;

/** Loud 400 for any attempt to name the pod/identity in the request. */
function overrideRejection(where: "query" | "body"): Response {
  return Response.json(
    {
      simulated: true,
      error: "param_rejected",
      detail:
        `the ${where} must not name a pod or webid — both are derived from the ` +
        "authenticated caller (decision 0015)",
    },
    { status: 400 },
  );
}

function errorResponse(error: unknown): Response {
  if (error instanceof PodAccessError) {
    return Response.json(
      { simulated: true, error: "pod_access", detail: error.message },
      { status: error.status },
    );
  }
  if (error instanceof Error && error.message.endsWith("is unset")) {
    return notConfigured(error.message);
  }
  return Response.json({ simulated: true, error: "internal_error" }, { status: 500 });
}

export function createAusRailService(options: AusRailServiceOptions): AusRailService {
  const { config } = options;
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 60, refillPerSec: 1 });
  // Constructed lazily so an unconfigured deployment never builds a verifier
  // with an empty issuer list; cached because the verifier owns the jti replay
  // store and JWKS cache (a per-request verifier would let captured proofs
  // replay).
  let verifier: DpopApiVerifier | undefined = options.verifier;
  const getVerifier = (): DpopApiVerifier => {
    verifier ??= createApiVerifier({
      allowInsecureLoopback: config.allowInsecureLoopback,
      trustedIssuers: config.trustedOidcIssuers,
      trustForwardedHeaders: config.trustForwardedHeaders,
    });
    return verifier;
  };

  // Built lazily and cached: the service fetch owns a token cache + DPoP key,
  // and an unconfigured deployment must answer 503 (fail closed), not throw
  // at module load. NO anonymous fallback exists (see the module header).
  let scene: Pick<UnderwriteOptions, "podFetch" | "serviceWebId"> | undefined;
  const sceneOptions = (): Pick<UnderwriteOptions, "podFetch" | "serviceWebId"> | Response => {
    if (scene !== undefined) return scene;
    try {
      const serviceWebId =
        options.serviceWebId ??
        configuredAgent(
          config.serviceWebId,
          "MORTGAGE_AUS_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
      const podFetch =
        options.podFetch ??
        createServicePodFetch({
          allowInsecureLoopback: config.allowInsecureLoopback,
          clientId: requiredConfig(config.podServiceClientId, "MORTGAGE_AUS_POD_SERVICE_CLIENT_ID"),
          clientSecret: requiredConfig(
            config.podServiceClientSecret,
            "MORTGAGE_AUS_POD_SERVICE_CLIENT_SECRET",
          ),
          issuer: requiredConfig(config.podServiceIssuer, "MORTGAGE_AUS_POD_SERVICE_ISSUER"),
        });
      scene = { podFetch, serviceWebId };
      return scene;
    } catch (error) {
      return errorResponse(error);
    }
  };

  /**
   * Step 1 — authenticate. Anonymous is ALWAYS 401 (even with malformed
   * params: the caller's identity is established before anything else).
   */
  async function authenticate(request: Request): Promise<{ webid: string } | Response> {
    if (config.trustedOidcIssuers.length === 0) {
      return notConfigured("MORTGAGE_TRUSTED_OIDC_ISSUERS is unset");
    }
    return verifyApiRequest(
      { headers: request.headers, method: request.method, url: publicRequestUrl(request) },
      { rateLimiter, verifier: getVerifier() },
    );
  }

  /** Step 2 — refuse query overrides. `undefined` = clean. */
  function queryOverrides(request: Request): Response | undefined {
    const url = new URL(request.url);
    if (OVERRIDE_PARAMS.some((name) => url.searchParams.has(name))) {
      return overrideRejection("query");
    }
    return undefined;
  }

  /** Step 3 — an OPTIONAL JSON body must be an object without pod/webid keys. */
  async function validateBody(request: Request): Promise<Response | undefined> {
    const raw = await request.text();
    if (raw.trim() === "") return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { simulated: true, error: "malformed_request", detail: "body must be JSON" },
        { status: 400 },
      );
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json(
        { simulated: true, error: "malformed_request", detail: "body must be a JSON object" },
        { status: 400 },
      );
    }
    return OVERRIDE_PARAMS.some((name) => name in parsed) ? overrideRejection("body") : undefined;
  }

  /** Final step — derive the authorized pod (the first pod/network IO). */
  async function bindPod(webid: string): Promise<AuthenticatedPodCaller | Response> {
    try {
      const podBase = await resolveAuthorizedPod(webid, config, options.ownerSeams ?? {});
      return { podBase, webid };
    } catch (error) {
      return errorResponse(error);
    }
  }

  return {
    async run(request: Request): Promise<Response> {
      const identity = await authenticate(request);
      if (identity instanceof Response) return identity;
      const rejected = queryOverrides(request);
      if (rejected !== undefined) return rejected;
      const bodyRejection = await validateBody(request);
      if (bodyRejection !== undefined) return bodyRejection;
      const caller = await bindPod(identity.webid);
      if (caller instanceof Response) return caller;
      const grant = sceneOptions();
      if (grant instanceof Response) return grant;
      try {
        return Response.json(
          await runUnderwriting(caller.podBase, caller.webid, config, {
            ...grant,
            ...(options.now !== undefined ? { now: options.now } : {}),
            ...(options.verifySeams !== undefined ? { seams: options.verifySeams } : {}),
          }),
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
