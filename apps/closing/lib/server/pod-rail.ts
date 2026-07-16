/**
 * Scene-5 authenticated pod boundary. This deliberately reuses the lender's
 * decision-0015 owner resolver, pod IO, and caller contract (the public-URL
 * helper is app-local — the basePath differs per app). Identity and pod
 * location are never accepted from request input.
 *
 * Pod IO runs over the app's OWN service identity (decision 0015 L4): a
 * DPoP-bound client-credentials fetch whose WebID the borrower's grant names.
 * There is NO anonymous fallback — scene 5 operates exclusively on private,
 * WAC-protected resources, so an unconfigured service identity fails closed
 * (503) instead of attempting IO the pod would refuse.
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
import type { AuthenticatedPodCaller } from "../../../lender-boa/lib/server/pod-rail";
import { type ClosingConfig, configuredAgent, requiredConfig } from "./config";
import {
  type ClosingSceneOptions,
  changeServicingAccess,
  executeClosing,
  readConsentLedger,
} from "./scene";
import { publicRequestUrl } from "./url";

export interface ClosingServiceOptions {
  readonly config: ClosingConfig;
  readonly verifier?: DpopApiVerifier;
  readonly rateLimiter?: RateLimiter;
  readonly ownerSeams?: OwnerBindingSeams;
  /** Injected in tests together with {@link serviceWebId} (an account authFetch). */
  readonly podFetch?: PodIoFetch;
  /** The injected {@link podFetch}'s WebID (tests). Falls back to config. */
  readonly serviceWebId?: string;
  readonly now?: () => Date;
  readonly randomId?: () => string;
}

export interface ClosingService {
  close(request: Request): Promise<Response>;
  grantServicer(request: Request): Promise<Response>;
  revokeLender(request: Request): Promise<Response>;
  ledger(request: Request): Promise<Response>;
}

const OVERRIDE_PARAMS = ["pod", "webid"] as const;

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

function overrideRejection(where: "query" | "body"): Response {
  return Response.json(
    {
      simulated: true,
      error: "param_rejected",
      detail: `the ${where} must not name a pod or webid — both come from the authenticated caller`,
    },
    { status: 400 },
  );
}

export function createClosingService(options: ClosingServiceOptions): ClosingService {
  const { config } = options;
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 60, refillPerSec: 1 });
  let verifier = options.verifier;
  const getVerifier = (): DpopApiVerifier => {
    verifier ??= createApiVerifier({
      trustedIssuers: config.trustedOidcIssuers,
      allowInsecureLoopback: config.allowInsecureLoopback,
      trustForwardedHeaders: config.trustForwardedHeaders,
    });
    return verifier;
  };
  // Built lazily and cached: the service fetch owns a token cache + DPoP key,
  // and an unconfigured deployment must answer 503 (fail closed), not throw at
  // module load. NO anonymous fallback exists (see the module header).
  let scene: ClosingSceneOptions | undefined;
  const sceneOptions = (): ClosingSceneOptions | Response => {
    if (scene !== undefined) return scene;
    try {
      const serviceWebId =
        options.serviceWebId ??
        configuredAgent(
          config.serviceWebId,
          "MORTGAGE_CLOSING_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
      const podFetch =
        options.podFetch ??
        createServicePodFetch({
          issuer: requiredConfig(config.podServiceIssuer, "MORTGAGE_CLOSING_POD_SERVICE_ISSUER"),
          clientId: requiredConfig(
            config.podServiceClientId,
            "MORTGAGE_CLOSING_POD_SERVICE_CLIENT_ID",
          ),
          clientSecret: requiredConfig(
            config.podServiceClientSecret,
            "MORTGAGE_CLOSING_POD_SERVICE_CLIENT_SECRET",
          ),
          allowInsecureLoopback: config.allowInsecureLoopback,
        });
      scene = {
        podFetch,
        serviceWebId,
        ...(options.now === undefined ? {} : { now: options.now }),
        ...(options.randomId === undefined ? {} : { randomId: options.randomId }),
      };
      return scene;
    } catch (error) {
      return errorResponse(error);
    }
  };

  async function authenticate(request: Request): Promise<{ webid: string } | Response> {
    if (config.trustedOidcIssuers.length === 0) {
      return notConfigured("MORTGAGE_TRUSTED_OIDC_ISSUERS is unset");
    }
    return verifyApiRequest(
      { headers: request.headers, method: request.method, url: publicRequestUrl(request) },
      { verifier: getVerifier(), rateLimiter },
    );
  }

  function rejectQueryOverrides(request: Request): Response | undefined {
    const url = new URL(request.url);
    return OVERRIDE_PARAMS.some((name) => url.searchParams.has(name))
      ? overrideRejection("query")
      : undefined;
  }

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

  async function caller(
    request: Request,
    withBody: boolean,
  ): Promise<AuthenticatedPodCaller | Response> {
    const identity = await authenticate(request);
    if (identity instanceof Response) return identity;
    const queryRejection = rejectQueryOverrides(request);
    if (queryRejection !== undefined) return queryRejection;
    if (withBody) {
      const bodyRejection = await validateBody(request);
      if (bodyRejection !== undefined) return bodyRejection;
    }
    try {
      return {
        webid: identity.webid,
        podBase: await resolveAuthorizedPod(identity.webid, config, options.ownerSeams ?? {}),
      };
    } catch (error) {
      return errorResponse(error);
    }
  }

  return {
    async close(request) {
      const authenticated = await caller(request, true);
      if (authenticated instanceof Response) return authenticated;
      const scene = sceneOptions();
      if (scene instanceof Response) return scene;
      try {
        const lender = configuredAgent(
          config.lenderWebId,
          "MORTGAGE_LENDER_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
        const result = await executeClosing(
          authenticated.podBase,
          authenticated.webid,
          lender,
          scene,
        );
        return Response.json({ simulated: true, ...result });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async grantServicer(request) {
      const authenticated = await caller(request, true);
      if (authenticated instanceof Response) return authenticated;
      const scene = sceneOptions();
      if (scene instanceof Response) return scene;
      try {
        const servicer = configuredAgent(
          config.servicerWebId,
          "MORTGAGE_SERVICER_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
        const receipt = await changeServicingAccess(
          authenticated.podBase,
          authenticated.webid,
          servicer,
          "grant",
          scene,
        );
        return Response.json({ simulated: true, receipt });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async revokeLender(request) {
      const authenticated = await caller(request, true);
      if (authenticated instanceof Response) return authenticated;
      const scene = sceneOptions();
      if (scene instanceof Response) return scene;
      try {
        const lender = configuredAgent(
          config.lenderWebId,
          "MORTGAGE_LENDER_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
        const receipt = await changeServicingAccess(
          authenticated.podBase,
          authenticated.webid,
          lender,
          "revoke",
          scene,
        );
        return Response.json({ simulated: true, receipt });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async ledger(request) {
      const authenticated = await caller(request, false);
      if (authenticated instanceof Response) return authenticated;
      const scene = sceneOptions();
      if (scene instanceof Response) return scene;
      try {
        return Response.json({
          simulated: true,
          receipts: await readConsentLedger(authenticated.podBase, authenticated.webid, scene),
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
