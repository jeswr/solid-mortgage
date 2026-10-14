/**
 * Scene-3/4 pod-rail routes behind the decision-0015 authenticated-caller
 * boundary (SECURITY-CRITICAL; closes the sm-30 roborev High tracked as
 * sm-7s8). Every handler:
 *
 *   1. requires a DPoP-bound Solid-OIDC caller (solid-kit `verifyApiRequest`;
 *      anonymous ⇒ 401 + `WWW-Authenticate`) — NO simulated bypass exists in
 *      server code, in any runtime mode;
 *   2. REJECTS caller-supplied `pod`/`webid` (query or body) with 400 — the
 *      identity and the pod are never request inputs;
 *   3. derives the authorized pod from the TOKEN WebID via the bidirectional
 *      `pim:storage` binding (`resolveAuthorizedPod`, decision 0015 L2);
 *   4. hands `{ webid, podBase }` to the scene logic, which additionally
 *      enforces `credentialSubject == webid` on every consumed credential
 *      (decision 0015 L3).
 *
 * Fail-closed invariants (do NOT weaken): unconfigured issuer allowlist ⇒
 * 503; any binding failure ⇒ 403; malformed payloads ⇒ 400 before any pod IO;
 * unexpected errors ⇒ 500, never a pass. Handler order is strict:
 * authenticate (anonymous ⇒ 401, even with malformed params) → reject
 * overrides → validate the body → ONLY THEN the pod binding + IO.
 */
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { type LenderConfig, notConfigured } from "./config";
import { checkEmploymentFreshness, type FreshnessSeams } from "./freshness";
import { parseHousing, recordIntake, staffViewEnabled } from "./intake";
import { submitApplication } from "./loan";
import { type OwnerBindingSeams, resolveAuthorizedPod } from "./owner";
import { PodAccessError } from "./pod";
import { prefillFromPod } from "./prefill";
import { publicRequestUrl } from "./url";

/** The verified caller of a pod route: token WebID + the ONE pod it binds to. */
export interface AuthenticatedPodCaller {
  readonly webid: string;
  readonly podBase: string;
}

export interface PodRailServiceOptions {
  readonly config: LenderConfig;
  /** Injected in tests; defaults to a config-derived process-wide verifier. */
  readonly verifier?: DpopApiVerifier;
  /** Per-WebID rate limiter shared by the pod routes. */
  readonly rateLimiter?: RateLimiter;
  /** Owner-binding seams (profile fetch) for tests. */
  readonly ownerSeams?: OwnerBindingSeams;
  /** Freshness verification seams for tests (offline key/status fixtures). */
  readonly freshnessSeams?: FreshnessSeams;
  /** Explicit clock seam. */
  readonly now?: () => Date;
}

export interface PodRailService {
  prefill(request: Request): Promise<Response>;
  submit(request: Request): Promise<Response>;
  freshness(request: Request): Promise<Response>;
  reissueRequest(request: Request): Promise<Response>;
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

export function createPodRailService(options: PodRailServiceOptions): PodRailService {
  const { config } = options;
  const now = options.now ?? (() => new Date());
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 60, refillPerSec: 1 });
  // Constructed lazily so an unconfigured deployment never builds a verifier with an
  // empty issuer list; cached because the verifier owns the jti replay store and JWKS
  // cache (a per-request verifier would let captured proofs replay).
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

  /**
   * Final step — derive the authorized pod (the first pod/network IO of the
   * pipeline; runs only after authentication + payload validation).
   */
  async function bindPod(webid: string): Promise<AuthenticatedPodCaller | Response> {
    try {
      const podBase = await resolveAuthorizedPod(webid, config, options.ownerSeams ?? {});
      return { webid, podBase };
    } catch (error) {
      return podErrorResponse(error);
    }
  }

  /** Parse an OPTIONAL JSON body, rejecting pod/webid keys. `undefined` = rejection sent. */
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

  return {
    async prefill(request: Request): Promise<Response> {
      const identity = await authenticate(request);
      if (identity instanceof Response) return identity;
      const rejected = queryOverrides(request);
      if (rejected !== undefined) return rejected;
      const caller = await bindPod(identity.webid);
      if (caller instanceof Response) return caller;
      try {
        return Response.json(await prefillFromPod(caller.podBase, caller.webid, config));
      } catch (error) {
        return podErrorResponse(error);
      }
    },

    async submit(request: Request): Promise<Response> {
      const identity = await authenticate(request);
      if (identity instanceof Response) return identity;
      const rejected = queryOverrides(request);
      if (rejected !== undefined) return rejected;
      const body = await readBody(request);
      if (body instanceof Response) return body;
      const caller = await bindPod(identity.webid);
      if (caller instanceof Response) return caller;
      try {
        const result = await submitApplication(caller.podBase, caller.webid, config, { now });
        if (staffViewEnabled()) {
          // The demo loan-officer view's intake record: pod + WebID come from the
          // verified caller (L1–L3); the body only says which channel was used.
          const housing = parseHousing(body.housing);
          recordIntake({
            webid: caller.webid,
            podBase: caller.podBase,
            borrowerName: result.prefill.borrower.name,
            applicationIri: result.applicationIri,
            decisionIri: result.decisionIri,
            submittedAt: now().toISOString(),
            channel: body.channel === "assistant" ? "assistant" : "form",
            ...(housing !== undefined ? { housing } : {}),
          });
        }
        return Response.json(result);
      } catch (error) {
        return podErrorResponse(error);
      }
    },

    async freshness(request: Request): Promise<Response> {
      const identity = await authenticate(request);
      if (identity instanceof Response) return identity;
      const rejected = queryOverrides(request);
      if (rejected !== undefined) return rejected;
      const caller = await bindPod(identity.webid);
      if (caller instanceof Response) return caller;
      try {
        return Response.json(
          await checkEmploymentFreshness(caller.podBase, caller.webid, config, {
            now,
            ...(options.freshnessSeams !== undefined ? { seams: options.freshnessSeams } : {}),
          }),
        );
      } catch (error) {
        return podErrorResponse(error);
      }
    },

    async reissueRequest(request: Request): Promise<Response> {
      const identity = await authenticate(request);
      if (identity instanceof Response) return identity;
      const rejected = queryOverrides(request);
      if (rejected !== undefined) return rejected;
      const body = await readBody(request);
      if (body instanceof Response) return body;
      const caller = await bindPod(identity.webid);
      if (caller instanceof Response) return caller;
      // SIMULATION: dispatches/persists nothing. In the built-for-real product
      // this notifies the employment verifier's re-issue endpoint over the
      // borrower's existing grant; in the demo the re-issue is performed
      // out-of-band (the verifications app) and the borrower re-runs the check.
      return Response.json({
        simulated: true,
        dispatched: false,
        nextStep:
          "Simulated: nothing was sent. A live lender would ask the employment verification " +
          "provider for a replacement credential. Issue the replacement credential in Verification Services, then check again.",
      });
    },
  };
}
