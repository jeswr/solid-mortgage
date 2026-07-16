/**
 * Scene-5 authenticated pod boundary. This deliberately reuses the lender's
 * decision-0015 owner resolver, pod IO, public URL reconstruction, and caller
 * contract. Identity and pod location are never accepted from request input.
 */
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { notConfigured } from "../../../lender-boa/lib/server/config";
import { type OwnerBindingSeams, resolveAuthorizedPod } from "../../../lender-boa/lib/server/owner";
import {
  anonymousPodFetch,
  PodAccessError,
  type PodIoFetch,
} from "../../../lender-boa/lib/server/pod";
import type { AuthenticatedPodCaller } from "../../../lender-boa/lib/server/pod-rail";
import { publicRequestUrl } from "../../../lender-boa/lib/server/url";
import { type ClosingConfig, configuredAgent } from "./config";
import {
  type ClosingSceneOptions,
  changeServicingAccess,
  executeClosing,
  readConsentLedger,
} from "./scene";

export interface ClosingServiceOptions {
  readonly config: ClosingConfig;
  readonly verifier?: DpopApiVerifier;
  readonly rateLimiter?: RateLimiter;
  readonly ownerSeams?: OwnerBindingSeams;
  readonly podFetch?: PodIoFetch;
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
  const sceneOptions: ClosingSceneOptions = {
    podFetch: options.podFetch ?? anonymousPodFetch,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.randomId === undefined ? {} : { randomId: options.randomId }),
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
          sceneOptions,
        );
        return Response.json({ simulated: true, ...result });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async grantServicer(request) {
      const authenticated = await caller(request, true);
      if (authenticated instanceof Response) return authenticated;
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
          sceneOptions,
        );
        return Response.json({ simulated: true, receipt });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async revokeLender(request) {
      const authenticated = await caller(request, true);
      if (authenticated instanceof Response) return authenticated;
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
          sceneOptions,
        );
        return Response.json({ simulated: true, receipt });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async ledger(request) {
      const authenticated = await caller(request, false);
      if (authenticated instanceof Response) return authenticated;
      try {
        return Response.json({
          simulated: true,
          receipts: await readConsentLedger(
            authenticated.podBase,
            authenticated.webid,
            sceneOptions,
          ),
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
