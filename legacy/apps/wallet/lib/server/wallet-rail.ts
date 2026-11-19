/**
 * The wallet's authenticated Mode-2 grant boundary (decision 0015; the
 * closing pod-rail pattern, third consumer — hoist tracked by bead sm-emv).
 * Identity and pod location are never accepted from request input: the caller
 * is DPoP-verified (L1), the pod derives from the token WebID's bidirectional
 * `pim:storage` binding (L2), and grants target only OPERATOR-CONFIGURED
 * party WebIDs resolved from short ids (never request-supplied WebIDs).
 *
 * Pod IO runs over the wallet's OWN service identity (decision 0015 L4): the
 * pod's custodian ACL names it with Control (the decision-0003 "Verizon
 * custodies the pod" posture). There is NO anonymous fallback — an
 * unconfigured service identity fails closed (503). Mode 1 never reaches
 * these routes: the in-browser demo answers 401 here and the UI falls back
 * to the disclosed client-side simulation (decision 0015 mode table).
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
import {
  changeContainerAccess,
  type GrantEngineOptions,
  readConsentLedger,
  readGrantStandings,
} from "../grants/engine";
import {
  configuredAgent,
  GRANT_PARTIES,
  GRANT_PARTY_IDS,
  type GrantPartyId,
  isGrantPartyId,
  requiredConfig,
  type WalletConfig,
} from "./config";
import { publicRequestUrl } from "./url";

export interface AuthenticatedPodCaller {
  readonly webid: string;
  readonly podBase: string;
}

export interface WalletServiceOptions {
  readonly config: WalletConfig;
  readonly verifier?: DpopApiVerifier;
  readonly rateLimiter?: RateLimiter;
  readonly ownerSeams?: OwnerBindingSeams;
  /** Injected in tests together with {@link serviceWebId} (an account authFetch). */
  readonly podFetch?: PodIoFetch;
  /** The injected {@link podFetch}'s WebID (tests). Falls back to config. */
  readonly serviceWebId?: string;
  readonly now?: () => Date;
}

export interface WalletService {
  /** GET — the access-grant dashboard (parties + live standing). */
  grants(request: Request): Promise<Response>;
  /** POST `{ party, action }` — create or revoke one party's grant. */
  changeGrant(request: Request): Promise<Response>;
  /** GET — the full consent-receipt ledger (decision 0006). */
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

function badRequest(detail: string): Response {
  return Response.json({ simulated: true, error: "malformed_request", detail }, { status: 400 });
}

export function createWalletService(options: WalletServiceOptions): WalletService {
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
  // and an unconfigured deployment must answer 503 (fail closed), not throw
  // at module load. NO anonymous fallback exists (see the module header).
  let engine: GrantEngineOptions | undefined;
  const engineOptions = (): GrantEngineOptions | Response => {
    if (engine !== undefined) return engine;
    try {
      const serviceWebId =
        options.serviceWebId ??
        configuredAgent(
          config.serviceWebId,
          "MORTGAGE_WALLET_SERVICE_WEBID",
          config.allowInsecureLoopback,
        );
      const podFetch =
        options.podFetch ??
        createServicePodFetch({
          issuer: requiredConfig(config.podServiceIssuer, "MORTGAGE_WALLET_POD_SERVICE_ISSUER"),
          clientId: requiredConfig(
            config.podServiceClientId,
            "MORTGAGE_WALLET_POD_SERVICE_CLIENT_ID",
          ),
          clientSecret: requiredConfig(
            config.podServiceClientSecret,
            "MORTGAGE_WALLET_POD_SERVICE_CLIENT_SECRET",
          ),
          allowInsecureLoopback: config.allowInsecureLoopback,
        });
      engine = {
        podFetch,
        serviceWebId,
        ...(options.now === undefined ? {} : { now: options.now }),
      };
      return engine;
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

  async function caller(request: Request): Promise<AuthenticatedPodCaller | Response> {
    const identity = await authenticate(request);
    if (identity instanceof Response) return identity;
    const queryRejection = rejectQueryOverrides(request);
    if (queryRejection !== undefined) return queryRejection;
    try {
      return {
        webid: identity.webid,
        podBase: await resolveAuthorizedPod(identity.webid, config, options.ownerSeams ?? {}),
      };
    } catch (error) {
      return errorResponse(error);
    }
  }

  /** The configured party list the dashboard shows (unset parties excluded). */
  function configuredParties(): { id: GrantPartyId; label: string; webid: string }[] {
    return GRANT_PARTY_IDS.flatMap((id) => {
      const webid = config.partyWebIds[id];
      return webid === undefined ? [] : [{ id, label: GRANT_PARTIES[id].label, webid }];
    });
  }

  return {
    async grants(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;
      const engine = engineOptions();
      if (engine instanceof Response) return engine;
      try {
        const standings = await readGrantStandings(
          authenticated.podBase,
          authenticated.webid,
          engine,
        );
        return Response.json({
          simulated: true,
          parties: configuredParties(),
          standings,
        });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async changeGrant(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;

      let parsed: unknown;
      try {
        parsed = JSON.parse(await request.text());
      } catch {
        return badRequest("body must be JSON");
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return badRequest("body must be a JSON object");
      }
      if (OVERRIDE_PARAMS.some((name) => name in parsed)) return overrideRejection("body");
      const { party, action } = parsed as Record<string, unknown>;
      if (typeof party !== "string" || !isGrantPartyId(party)) {
        return badRequest(`body.party must be one of: ${GRANT_PARTY_IDS.join(", ")}`);
      }
      if (action !== "grant" && action !== "revoke") {
        return badRequest('body.action must be "grant" or "revoke"');
      }

      const engine = engineOptions();
      if (engine instanceof Response) return engine;
      try {
        // The party's WebID is OPERATOR-PINNED env config (decision 0015: a
        // grant route never materialises WAC for a request-supplied agent).
        const definition = GRANT_PARTIES[party];
        const agent = configuredAgent(
          config.partyWebIds[party],
          definition.envVar,
          config.allowInsecureLoopback,
        );
        const receipt = await changeContainerAccess(
          authenticated.podBase,
          authenticated.webid,
          agent,
          action,
          { write: definition.write, control: definition.control },
          engine,
        );
        return Response.json({ simulated: true, party, receipt });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async ledger(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;
      const engine = engineOptions();
      if (engine instanceof Response) return engine;
      try {
        return Response.json({
          simulated: true,
          receipts: await readConsentLedger(authenticated.podBase, authenticated.webid, engine),
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
