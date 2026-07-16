/**
 * The verifications app's authenticated ISSUER boundary (sm-29; decision 0015;
 * the lender-boa/wallet/closing pod-rail pattern — hoist tracked by sm-emv).
 *
 * Scene 1 ("Fill the vault"): POST /api/issue signs one of the three branded
 * flows' credentials — PLUS its ZK operand anchor where the flow has one —
 * into the AUTHENTICATED borrower's Data Vault pod, and hosts/updates the
 * issuer's Bitstring revocation list (decision 0007: status = revocation
 * only). Scene 4 ("Nothing goes stale"): POST /api/reissue is the one-click
 * freshness re-issue — same claims, fresh window, old index revoked — through
 * the existing grant (vc-kit `reissueCredential`).
 *
 * Identity and pod location are never accepted from request input: the caller
 * is DPoP-verified (L1), the pod derives from the token WebID's bidirectional
 * `pim:storage` binding (L2), and every credential is issued to the
 * AUTHENTICATED WebID as subject (L3). Claims are the PINNED demo-persona
 * values (lib/server/flows.ts) — a request can select a flow, never a value,
 * so the route can never be used as a signing oracle. Pod IO runs over the
 * app's OWN service identity (L4: the grant the borrower's wallet
 * materialises names it); there is NO anonymous fallback — an unconfigured
 * service identity or issuer flow fails closed (503).
 *
 * Known demo-scope limit (filed follow-up): status-list index OCCUPANCY is
 * per-process (`StatusIndexAllocator`), so horizontally scaled issuers would
 * need a shared allocator. Allocation seeds are deterministic (credential
 * IRIs), and `reissueCredential` reserves the old index before allocating, so
 * a single demo instance can never hand a replacement its revoked index.
 */

import { fitsZkBudget } from "@mortgage/data-model";
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { createServicePodFetch } from "@mortgage/solid-kit/auth/service";
import type { KeyPair, VerifyCredentialOptions } from "@mortgage/vc-kit";
import {
  ClaimInputError,
  type IssuedCredential,
  IssueRefusedError,
  importKeyPair,
  isFresh,
  issueCredential,
  ReissueError,
  reissueCredential,
  StatusIndexAllocator,
  StatusListClient,
  StatusListError,
  verifyCredential,
} from "@mortgage/vc-kit";
import { type OwnerBindingSeams, resolveAuthorizedPod } from "../../../lender-boa/lib/server/owner";
import {
  PodAccessError,
  type PodIoFetch,
  readPodResource,
  writePodTurtle,
} from "../../../lender-boa/lib/server/pod";
import {
  flowEnvVar,
  ISSUER_FLOW_IDS,
  type IssuerFlowId,
  isIssuerFlowId,
  notConfigured,
  requiredConfig,
  type VerificationsConfig,
} from "./config";
import {
  anchoredClaimValue,
  CAPTURED_OPERAND_ENC,
  ISSUER_FLOWS,
  type IssuerFlowDefinition,
} from "./flows";
import { publicRequestUrl } from "./url";

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Hosted-list lifetime on (re)creation. Long-lived by design (the wallet
 * Mode-1 posture): revocation WRITES re-sign the list with a fresh window
 * anyway, and a demo list must outlive the longest credential window.
 */
const STATUS_LIST_VALID_DAYS = 180;

export interface AuthenticatedPodCaller {
  readonly webid: string;
  readonly podBase: string;
}

export interface IssuerServiceOptions {
  readonly config: VerificationsConfig;
  readonly verifier?: DpopApiVerifier;
  readonly rateLimiter?: RateLimiter;
  readonly ownerSeams?: OwnerBindingSeams;
  /** Injected in tests together with {@link serviceWebId} (an account authFetch). */
  readonly podFetch?: PodIoFetch;
  /** The injected {@link podFetch}'s WebID (tests). Falls back to config. */
  readonly serviceWebId?: string;
  /**
   * Fetch for the issuer's hosted status list (reads AND re-signed writes).
   * Default: the same service-identity fetch as the pod IO — the issuer org's
   * host names the app's service WebID. Injected in tests.
   */
  readonly statusHostFetch?: typeof fetch;
  /** Injected issuer signing keys (tests). Fall back to the env private JWKs. */
  readonly keys?: Partial<Record<IssuerFlowId, KeyPair>>;
  readonly now?: () => Date;
}

export interface IssuerService {
  /** GET — the flow catalogue + the caller's live per-flow credential state. */
  flows(request: Request): Promise<Response>;
  /** POST `{ flow }` — scene 1: issue the flow's VC (+ anchor) into the pod. */
  issue(request: Request): Promise<Response>;
  /** POST `{ flow }` — scene 4: one-click re-issue with a fresh window. */
  reissue(request: Request): Promise<Response>;
}

const OVERRIDE_PARAMS = ["pod", "webid"] as const;

interface FlowRuntime {
  readonly definition: IssuerFlowDefinition;
  readonly issuerWebId: string;
  readonly key: KeyPair;
  readonly statusList: StatusListClient;
  readonly allocator: StatusIndexAllocator;
}

function errorResponse(error: unknown): Response {
  if (error instanceof PodAccessError) {
    return Response.json(
      { detail: error.message, error: "pod_access", simulated: true },
      { status: error.status },
    );
  }
  if (error instanceof ReissueError) {
    // Refused re-issues are CALLER-STATE conflicts (already revoked, foreign
    // list, unauthenticated claims) — the guard held, nothing was signed.
    return Response.json(
      { detail: error.message, error: "reissue_refused", simulated: true },
      { status: 409 },
    );
  }
  if (error instanceof StatusListError) {
    return Response.json(
      { detail: error.message, error: "status_list", simulated: true },
      { status: 502 },
    );
  }
  if (error instanceof Error && error.message.endsWith("is unset")) {
    return notConfigured(error.message);
  }
  if (error instanceof IssueRefusedError || error instanceof ClaimInputError) {
    // Pinned demo claims failing their own shape is a SERVER defect — surface
    // as 500 without echoing graph internals.
    return Response.json({ error: "issuance_defect", simulated: true }, { status: 500 });
  }
  return Response.json({ error: "internal_error", simulated: true }, { status: 500 });
}

function overrideRejection(where: "query" | "body"): Response {
  return Response.json(
    {
      detail: `the ${where} must not name a pod or webid — both come from the authenticated caller`,
      error: "param_rejected",
      simulated: true,
    },
    { status: 400 },
  );
}

function badRequest(detail: string): Response {
  return Response.json({ detail, error: "malformed_request", simulated: true }, { status: 400 });
}

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

export function createIssuerService(options: IssuerServiceOptions): IssuerService {
  const { config } = options;
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 60, refillPerSec: 1 });
  let verifier = options.verifier;
  const getVerifier = (): DpopApiVerifier => {
    verifier ??= createApiVerifier({
      allowInsecureLoopback: config.allowInsecureLoopback,
      trustForwardedHeaders: config.trustForwardedHeaders,
      trustedIssuers: config.trustedOidcIssuers,
    });
    return verifier;
  };

  // Built lazily and cached: the service fetch owns a token cache + DPoP key,
  // and an unconfigured deployment must answer 503 (fail closed), not throw
  // at module load. NO anonymous fallback exists (see the module header).
  let servicePodFetch: PodIoFetch | undefined;
  const getPodFetch = (): PodIoFetch | Response => {
    if (servicePodFetch !== undefined) return servicePodFetch;
    if (options.podFetch !== undefined) {
      servicePodFetch = options.podFetch;
      return servicePodFetch;
    }
    try {
      servicePodFetch = createServicePodFetch({
        allowInsecureLoopback: config.allowInsecureLoopback,
        clientId: requiredConfig(
          config.podServiceClientId,
          "MORTGAGE_VERIFICATIONS_POD_SERVICE_CLIENT_ID",
        ),
        clientSecret: requiredConfig(
          config.podServiceClientSecret,
          "MORTGAGE_VERIFICATIONS_POD_SERVICE_CLIENT_SECRET",
        ),
        issuer: requiredConfig(
          config.podServiceIssuer,
          "MORTGAGE_VERIFICATIONS_POD_SERVICE_ISSUER",
        ),
      });
      return servicePodFetch;
    } catch (error) {
      return errorResponse(error);
    }
  };

  const getStatusHostFetch = (): typeof fetch | Response =>
    options.statusHostFetch ?? getPodFetch();

  const runtimes = new Map<IssuerFlowId, FlowRuntime>();
  async function runtimeFor(flow: IssuerFlowId): Promise<FlowRuntime | Response> {
    const cached = runtimes.get(flow);
    if (cached !== undefined) return cached;
    const statusHostFetch = getStatusHostFetch();
    if (statusHostFetch instanceof Response) return statusHostFetch;
    const identity = config.issuers[flow];
    try {
      const issuerWebId = requiredConfig(identity.webid, flowEnvVar(flow, "ISSUER_WEBID"));
      const statusListUrl = requiredConfig(
        identity.statusListUrl,
        flowEnvVar(flow, "STATUS_LIST_URL"),
      );
      let key = options.keys?.[flow];
      if (key === undefined) {
        const keyJwk = requiredConfig(identity.keyJwk, flowEnvVar(flow, "ISSUER_KEY_JWK"));
        const verificationMethod =
          identity.keyVerificationMethod ?? `${issuerWebId.split("#")[0]}#vc-key`;
        key = await importKeyPair(verificationMethod, JSON.parse(keyJwk));
      }
      const runtime: FlowRuntime = {
        allocator: new StatusIndexAllocator(),
        definition: ISSUER_FLOWS[flow],
        issuerWebId,
        key,
        statusList: new StatusListClient({
          fetch: statusHostFetch,
          issuer: issuerWebId,
          key,
          url: statusListUrl,
        }),
      };
      runtimes.set(flow, runtime);
      return runtime;
    } catch (error) {
      if (error instanceof Error && error.message.endsWith("is unset")) {
        return notConfigured(error.message);
      }
      // A malformed key JWK must not leak its contents into the response.
      return notConfigured(`${flowEnvVar(flow, "ISSUER_KEY_JWK")} could not be imported`);
    }
  }

  async function authenticate(request: Request): Promise<{ webid: string } | Response> {
    if (config.trustedOidcIssuers.length === 0) {
      return notConfigured("MORTGAGE_TRUSTED_OIDC_ISSUERS is unset");
    }
    return verifyApiRequest(
      { headers: request.headers, method: request.method, url: publicRequestUrl(request) },
      { rateLimiter, verifier: getVerifier() },
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
        podBase: await resolveAuthorizedPod(identity.webid, config, options.ownerSeams ?? {}),
        webid: identity.webid,
      };
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function parseFlowBody(request: Request): Promise<IssuerFlowId | Response> {
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
    const { flow } = parsed as Record<string, unknown>;
    if (typeof flow !== "string" || !isIssuerFlowId(flow)) {
      return badRequest(`body.flow must be one of: ${ISSUER_FLOW_IDS.join(", ")}`);
    }
    return flow;
  }

  /**
   * Verification seams for reads of THIS issuer's own artefacts. Dev/e2e
   * loopback mode swaps the SSRF-guarded default fetch only; the fail-closed
   * verification semantics are identical (the freshness.ts posture).
   */
  function verifySeams(): Pick<VerifyCredentialOptions, "webIdFetch" | "statusFetch"> {
    return config.allowInsecureLoopback
      ? { statusFetch: fetch.bind(globalThis), webIdFetch: fetch.bind(globalThis) }
      : {};
  }

  /** Create the issuer's hosted all-clear list if (and only if) it is absent. */
  async function ensureStatusList(
    runtime: FlowRuntime,
    statusHostFetch: typeof fetch,
    now: Date,
  ): Promise<void> {
    const probe = await statusHostFetch(runtime.statusList.url, {
      headers: { accept: "application/vc+ld+json, application/json;q=0.9" },
    });
    if (probe.ok) return;
    if (probe.status !== 404) {
      throw new StatusListError(
        `status list probe GET ${runtime.statusList.url} failed: ${probe.status}`,
      );
    }
    await runtime.statusList.create({
      now,
      validUntil: daysFrom(now, STATUS_LIST_VALID_DAYS),
    });
  }

  interface IssuedSummary {
    readonly id: string;
    readonly kind: string;
    readonly validFrom: string;
    readonly validUntil: string | undefined;
    readonly statusListCredential: string;
    readonly statusListIndex: string | undefined;
  }

  function summarize(issued: IssuedCredential, runtime: FlowRuntime, from: Date, until: Date) {
    return {
      id: issued.credentialId,
      kind: issued.kind,
      statusListCredential: runtime.statusList.url,
      statusListIndex: issued.status?.statusListIndex,
      validFrom: from.toISOString(),
      validUntil: until.toISOString(),
    } satisfies IssuedSummary;
  }

  /**
   * The scene-4 one-click gate: a credential may be re-issued through the
   * existing grant IFF it fully verifies — signature, issuer binding, shape,
   * status — except AT MOST an expired window (expiry is the very reason the
   * flow exists), AND its subject is the AUTHENTICATED caller (decision 0015
   * L3 — a valid credential attesting someone else can never be renewed into
   * this pod). `reissueCredential` re-checks the proof + revocation
   * internally; this gate adds shape/subject/trust on top.
   */
  async function reissueGate(
    body: string,
    runtime: FlowRuntime,
    kind: IssuerFlowDefinition["kind"],
    webid: string,
    now: Date,
  ): Promise<Response | undefined> {
    const outcome = await verifyCredential(body, {
      expectShape: kind,
      now,
      trustedIssuers: [runtime.issuerWebId],
      ...verifySeams(),
    });
    const blocking = outcome.errors.filter((error) => error.code !== "EXPIRED");
    if (blocking.length > 0) {
      return Response.json(
        {
          detail: `the stored ${kind} does not qualify for one-click re-issue`,
          error: "reissue_refused",
          simulated: true,
          verifyErrors: blocking.map((error) => error.code),
        },
        { status: 409 },
      );
    }
    if (outcome.credential?.subject !== webid) {
      return Response.json(
        {
          detail: "the stored credential does not attest the authenticated caller",
          error: "subject_mismatch",
          simulated: true,
        },
        { status: 409 },
      );
    }
    return undefined;
  }

  return {
    async flows(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;
      const podFetch = getPodFetch();
      if (podFetch instanceof Response) return podFetch;
      const now = options.now?.() ?? new Date();

      const flows = [];
      for (const id of ISSUER_FLOW_IDS) {
        const definition = ISSUER_FLOWS[id];
        const base = {
          anchorField: definition.anchor?.field,
          credentialPath: definition.credentialPath,
          id,
          kind: definition.kind,
          label: definition.label,
          modelledOn: definition.modelledOn,
          role: definition.role,
        };
        const runtime = await runtimeFor(id);
        if (runtime instanceof Response) {
          flows.push({ ...base, configured: false });
          continue;
        }
        try {
          const iri = `${authenticated.podBase}${definition.credentialPath.slice(1)}`;
          const resource = await readPodResource(iri, authenticated.podBase, podFetch);
          if (resource === undefined) {
            flows.push({ ...base, configured: true, issued: false });
            continue;
          }
          const outcome = await verifyCredential(resource.dataset, {
            expectShape: definition.kind,
            now,
            trustedIssuers: [runtime.issuerWebId],
            ...verifySeams(),
          });
          const window = {
            validFrom: outcome.credential?.validFrom,
            validUntil: outcome.credential?.validUntil,
          };
          flows.push({
            ...base,
            configured: true,
            fresh: isFresh(window, now),
            issued: true,
            verified:
              outcome.verified &&
              outcome.credential?.subject !== undefined &&
              outcome.credential.subject === authenticated.webid,
            verifyErrors: outcome.errors.map((error) => error.code),
            window,
          });
        } catch (error) {
          const lowered = errorResponse(error);
          // A per-flow read failure degrades that FLOW's entry, not the route.
          flows.push({ ...base, configured: true, error: lowered.status });
        }
      }
      return Response.json({ flows, simulated: true });
    },

    async issue(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;
      const flow = await parseFlowBody(request);
      if (flow instanceof Response) return flow;
      const podFetch = getPodFetch();
      if (podFetch instanceof Response) return podFetch;
      const statusHostFetch = getStatusHostFetch();
      if (statusHostFetch instanceof Response) return statusHostFetch;
      const runtime = await runtimeFor(flow);
      if (runtime instanceof Response) return runtime;
      const definition = runtime.definition;
      const now = options.now?.() ?? new Date();

      try {
        const credentialIri = `${authenticated.podBase}${definition.credentialPath.slice(1)}`;
        const anchorIri =
          definition.anchor === undefined
            ? undefined
            : `${authenticated.podBase}${definition.anchor.path.slice(1)}`;

        // Scene-1 issuance is a strict CREATE: an occupied slot means the
        // vault is already filled — renewal is the scene-4 re-issue rail.
        const [existing, existingAnchor] = await Promise.all([
          readPodResource(credentialIri, authenticated.podBase, podFetch),
          anchorIri === undefined
            ? Promise.resolve(undefined)
            : readPodResource(anchorIri, authenticated.podBase, podFetch),
        ]);
        if (existing !== undefined || existingAnchor !== undefined) {
          return Response.json(
            {
              detail: "this flow's credential already exists in the vault — use re-issue",
              error: "already_issued",
              flow,
              simulated: true,
            },
            { status: 409 },
          );
        }

        await ensureStatusList(runtime, statusHostFetch, now);

        const validity = {
          validFrom: daysFrom(now, definition.validFromDays),
          validUntil: daysFrom(now, definition.validUntilDays),
        };
        const issued = await issueCredential({
          claims: definition.claims(),
          credentialId: credentialIri,
          issuer: runtime.issuerWebId,
          key: runtime.key,
          kind: definition.kind,
          status: runtime.statusList.entry(runtime.allocator.allocate(credentialIri)),
          subject: authenticated.webid,
          validity,
        });
        await writePodTurtle(credentialIri, issued.body, { etag: undefined, podFetch });

        let anchorSummary: IssuedSummary | undefined;
        if (definition.anchor !== undefined && anchorIri !== undefined) {
          // The anchored value comes off the SAME typed pinned-claims object
          // the issuance gate just signed, is re-gated against its
          // decision-0005 digit budget, and is bound to its CAPTURED genuine
          // encoding — an operand encoding is never fabricated (see the
          // flows.ts provenance note).
          const value = anchoredClaimValue(definition);
          const operandEnc = fitsZkBudget(definition.anchor.field, value)
            ? CAPTURED_OPERAND_ENC[value]
            : undefined;
          if (operandEnc === undefined) {
            return Response.json(
              { error: "no_captured_encoding", simulated: true },
              { status: 500 },
            );
          }
          const anchorIssued = await issueCredential({
            claims: { field: definition.anchor.field, kind: "zk-operand-anchor", operandEnc },
            credentialId: anchorIri,
            issuer: runtime.issuerWebId,
            key: runtime.key,
            kind: "zk-operand-anchor",
            status: runtime.statusList.entry(runtime.allocator.allocate(anchorIri)),
            subject: authenticated.webid,
            validity,
          });
          await writePodTurtle(anchorIri, anchorIssued.body, { etag: undefined, podFetch });
          anchorSummary = summarize(anchorIssued, runtime, validity.validFrom, validity.validUntil);
        }

        return Response.json({
          anchor: anchorSummary ?? null,
          credential: summarize(issued, runtime, validity.validFrom, validity.validUntil),
          flow,
          simulated: true,
        });
      } catch (error) {
        return errorResponse(error);
      }
    },

    async reissue(request) {
      const authenticated = await caller(request);
      if (authenticated instanceof Response) return authenticated;
      const flow = await parseFlowBody(request);
      if (flow instanceof Response) return flow;
      const podFetch = getPodFetch();
      if (podFetch instanceof Response) return podFetch;
      const runtime = await runtimeFor(flow);
      if (runtime instanceof Response) return runtime;
      const definition = runtime.definition;
      const now = options.now?.() ?? new Date();

      try {
        const credentialIri = `${authenticated.podBase}${definition.credentialPath.slice(1)}`;
        const resource = await readPodResource(credentialIri, authenticated.podBase, podFetch);
        if (resource === undefined) {
          return Response.json(
            {
              detail: "no stored credential to re-issue — issue it first",
              error: "not_issued",
              flow,
              simulated: true,
            },
            { status: 404 },
          );
        }

        // The one-click gate needs the byte body for the string-input verify
        // path; re-read once via the same authenticated fetch.
        const bodyResponse = await podFetch(credentialIri, {
          headers: { accept: "text/turtle" },
          redirect: "error",
        });
        if (!bodyResponse.ok) {
          throw new PodAccessError(502, `could not re-read the stored credential`);
        }
        const gate = await reissueGate(
          await bodyResponse.text(),
          runtime,
          definition.kind,
          authenticated.webid,
          now,
        );
        if (gate !== undefined) return gate;

        const validity = { validFrom: now, validUntil: daysFrom(now, definition.reissueDays) };
        const result = await reissueCredential(resource.dataset, {
          allocator: runtime.allocator,
          key: runtime.key,
          now,
          statusList: runtime.statusList,
          validity,
        });
        await writePodTurtle(credentialIri, result.issued.body, {
          etag: resource.etag,
          podFetch,
        });

        // The flow's operand anchor shares the lapsed window — renew it in the
        // same click (same pinned claims; its old index is revoked too).
        let anchorSummary: IssuedSummary | undefined;
        if (definition.anchor !== undefined) {
          const anchorIri = `${authenticated.podBase}${definition.anchor.path.slice(1)}`;
          const anchorResource = await readPodResource(anchorIri, authenticated.podBase, podFetch);
          if (anchorResource !== undefined) {
            const anchorResult = await reissueCredential(anchorResource.dataset, {
              allocator: runtime.allocator,
              key: runtime.key,
              now,
              statusList: runtime.statusList,
              validity,
            });
            await writePodTurtle(anchorIri, anchorResult.issued.body, {
              etag: anchorResource.etag,
              podFetch,
            });
            anchorSummary = summarize(
              anchorResult.issued,
              runtime,
              validity.validFrom,
              validity.validUntil,
            );
          }
        }

        return Response.json({
          anchor: anchorSummary ?? null,
          credential: summarize(result.issued, runtime, validity.validFrom, validity.validUntil),
          flow,
          newIndex: result.newIndex,
          revokedIndex: result.revokedIndex,
          simulated: true,
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
