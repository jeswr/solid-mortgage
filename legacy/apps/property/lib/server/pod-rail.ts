/**
 * Property issuer routes behind the decision-0015 authenticated-caller
 * boundary (SECURITY-CRITICAL; mirrors the reviewed
 * `apps/lender-boa/lib/server/pod-rail.ts`). Every handler:
 *
 *   1. requires a DPoP-bound Solid-OIDC caller (solid-kit `verifyApiRequest`;
 *      anonymous ⇒ 401 + `WWW-Authenticate`) — NO simulated bypass exists in
 *      server code, in any runtime mode;
 *   2. REJECTS caller-supplied `pod`/`webid` (query or body) with 400 — the
 *      identity and the pod are never request inputs;
 *   3. derives the authorized pod from the TOKEN WebID via the bidirectional
 *      `pim:storage` binding (`resolveAuthorizedPod`, decision 0015 L2);
 *   4. issues the credential bound to `credentialSubject == token WebID`
 *      (decision 0015 L3) and writes it into that pod (WAC-enforced, L4).
 *
 * Fail-closed invariants (do NOT weaken): unconfigured OIDC-issuer list ⇒ 503;
 * runtime-issuance disabled ⇒ 503; any binding failure ⇒ 403; malformed
 * payloads ⇒ 400 before any pod IO; unexpected errors ⇒ 500, never a pass.
 * Handler order is strict: authenticate (anonymous ⇒ 401, even with malformed
 * params) → reject overrides → validate the body → ONLY THEN the pod binding +
 * issuance + write.
 */
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { notConfigured, type PropertyConfig } from "./config";
import { type IssueSceneOptions, issueAppraisal, issueTitle } from "./issue";
import { createIssuerRegistry, type IssuerRegistry } from "./issuers";
import { type OwnerBindingSeams, resolveAuthorizedPod } from "./owner";
import { PodAccessError } from "./pod";
import { publicRequestUrl } from "./url";

/** The verified caller of a pod route: token WebID + the ONE pod it binds to. */
export interface AuthenticatedPodCaller {
  readonly webid: string;
  readonly podBase: string;
}

export interface PropertyRailServiceOptions {
  readonly config: PropertyConfig;
  /** Injected in tests; defaults to a config-derived process-wide verifier. */
  readonly verifier?: DpopApiVerifier;
  /** Per-WebID rate limiter shared by the issuer routes. */
  readonly rateLimiter?: RateLimiter;
  /** Owner-binding seams (profile fetch) for tests. */
  readonly ownerSeams?: OwnerBindingSeams;
  /** Issuer signing-identity registry (injected in tests). */
  readonly issuerRegistry?: IssuerRegistry;
  /** Pod-IO fetch seam (grant/owner fetch; default anonymous). */
  readonly podFetch?: IssueSceneOptions["podFetch"];
  /** Explicit clock seam. */
  readonly now?: () => Date;
}

export interface PropertyRailService {
  issueAppraisal(request: Request): Promise<Response>;
  issueTitle(request: Request): Promise<Response>;
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

function podErrorResponse(error: unknown): Response {
  if (error instanceof PodAccessError) {
    return Response.json(
      { simulated: true, error: "pod_access", detail: error.message },
      { status: error.status },
    );
  }
  return Response.json({ simulated: true, error: "internal_error" }, { status: 500 });
}

export function createPropertyRailService(
  options: PropertyRailServiceOptions,
): PropertyRailService {
  const { config } = options;
  const now = options.now ?? (() => new Date());
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 60, refillPerSec: 1 });
  const registry = options.issuerRegistry ?? createIssuerRegistry(config);
  // Constructed lazily so an unconfigured deployment never builds a verifier
  // with an empty issuer list; cached because the verifier owns the jti replay
  // store and JWKS cache (a per-request verifier would let captured proofs
  // replay).
  let verifier: DpopApiVerifier | undefined = options.verifier;
  const getVerifier = (): DpopApiVerifier => {
    verifier ??= createApiVerifier({
      trustedIssuers: config.trustedOidcIssuers,
      allowInsecureLoopback: config.allowInsecureLoopback,
      trustForwardedHeaders: config.trustForwardedHeaders,
    });
    return verifier;
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
      { verifier: getVerifier(), rateLimiter },
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

  /** Parse an OPTIONAL JSON body, rejecting pod/webid keys. */
  async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
    const raw = await request.text();
    if (raw.trim() === "") return {};
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
    const body = parsed as Record<string, unknown>;
    if (OVERRIDE_PARAMS.some((name) => name in body)) return overrideRejection("body");
    return body;
  }

  /** Final step — derive the authorized pod (the first pod/network IO). */
  async function bindPod(webid: string): Promise<AuthenticatedPodCaller | Response> {
    try {
      const podBase = await resolveAuthorizedPod(webid, config, options.ownerSeams ?? {});
      return { webid, podBase };
    } catch (error) {
      return podErrorResponse(error);
    }
  }

  const sceneOptions: IssueSceneOptions = {
    now,
    ...(options.podFetch !== undefined ? { podFetch: options.podFetch } : {}),
  };

  async function runIssue(
    request: Request,
    issue: (podBase: string, webid: string) => Promise<unknown>,
  ): Promise<Response> {
    const identity = await authenticate(request);
    if (identity instanceof Response) return identity;
    const rejected = queryOverrides(request);
    if (rejected !== undefined) return rejected;
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const caller = await bindPod(identity.webid);
    if (caller instanceof Response) return caller;
    try {
      return Response.json(await issue(caller.podBase, caller.webid));
    } catch (error) {
      return podErrorResponse(error);
    }
  }

  return {
    issueAppraisal(request: Request): Promise<Response> {
      return runIssue(request, (podBase, webid) =>
        issueAppraisal(podBase, webid, registry, config, sceneOptions),
      );
    },
    issueTitle(request: Request): Promise<Response> {
      return runIssue(request, (podBase, webid) =>
        issueTitle(podBase, webid, registry, config, sceneOptions),
      );
    },
  };
}
