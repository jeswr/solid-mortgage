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

import { fitsZkBudget, ZkOperandAnchor } from "@mortgage/data-model";
import {
  createApiVerifier,
  type DpopApiVerifier,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import { createServicePodFetch } from "@mortgage/solid-kit/auth/service";
import type {
  KeyPair,
  StatusListClientOptions,
  StatusListWriteOptions,
  VerifyCredentialOptions,
} from "@mortgage/vc-kit";
import {
  ClaimInputError,
  deriveStatusIndex,
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
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
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
 * Hosted-list lifetime FLOOR. Every write through {@link DurableStatusListClient}
 * re-anchors the window at that write's `now` for at least this long — and never
 * for less than the flow's longest credential window plus a day — so a hosted
 * list always remains verifiable through the `validUntil` of every credential
 * that references it (roborev sm-29 FIX C).
 */
const STATUS_LIST_VALID_DAYS = 180;

/**
 * A {@link StatusListClient} whose every write (create / revoke / reinstate)
 * defaults the hosted list's `validUntil` to `now + coverDays` instead of the
 * base client's 24 hours. `reissueCredential` revokes through the client it is
 * handed, so without this the one-click re-issue would silently shrink the
 * hosted window below the replacement credential's own `validUntil` and the
 * credential would later fail verification against its own (expired) list.
 * Every mutation still rides the base client's fail-closed read-verify-modify
 * cycle (signature + issuer binding checked before any bit is trusted).
 */
class DurableStatusListClient extends StatusListClient {
  private readonly coverDays: number;

  constructor(options: StatusListClientOptions, coverDays: number) {
    super(options);
    this.coverDays = coverDays;
  }

  private durable<T extends StatusListWriteOptions>(options: T): T {
    return {
      ...options,
      validUntil: options.validUntil ?? daysFrom(options.now, this.coverDays),
    };
  }

  override create(options: StatusListWriteOptions & { bits?: Uint8Array }): Promise<void> {
    return super.create(this.durable(options));
  }

  override revoke(index: number, options: StatusListWriteOptions): Promise<void> {
    return super.revoke(index, this.durable(options));
  }

  override reinstate(index: number, options: StatusListWriteOptions): Promise<void> {
    return super.reinstate(index, this.durable(options));
  }
}

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
  readonly statusList: DurableStatusListClient;
  readonly allocator: StatusIndexAllocator;
  /**
   * A deterministic index RESERVED for list maintenance (never assigned to a
   * credential): `reinstate(sentinel)` is the fail-closed
   * verify-then-re-sign-with-a-fresh-window operation FIX C requires — the
   * base client refuses to touch a tampered or foreign-signed hosted list,
   * and clearing a bit that is never set changes no credential's status.
   */
  readonly sentinelIndex: number;
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
      const definition = ISSUER_FLOWS[flow];
      // The hosted window must outlive every credential this flow can mint
      // (initial windows AND re-issue windows), with a day of margin (FIX C).
      const coverDays = Math.max(
        STATUS_LIST_VALID_DAYS,
        definition.validUntilDays + 1,
        definition.reissueDays + 1,
      );
      const allocator = new StatusIndexAllocator();
      // Deterministic per list, so every process reserves the SAME slot and
      // no credential can ever be allocated the maintenance sentinel.
      const sentinelIndex = deriveStatusIndex(`${statusListUrl}#refresh-sentinel`);
      allocator.reserve(sentinelIndex);
      const runtime: FlowRuntime = {
        allocator,
        definition,
        issuerWebId,
        key,
        sentinelIndex,
        statusList: new DurableStatusListClient(
          {
            fetch: statusHostFetch,
            issuer: issuerWebId,
            key,
            url: statusListUrl,
          },
          coverDays,
        ),
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

  /**
   * FIX C: the hosted list is never trusted off a bare GET. Absent → create
   * the all-clear signed list. Present → `reinstate(sentinel)`, which runs the
   * base client's fail-closed read-verify-modify cycle (a tampered, foreign-
   * signed or malformed hosted document throws; only OUR OWN expired window is
   * tolerated — and immediately healed) and re-signs the list with a fresh
   * durable window that covers every credential this flow can mint. The
   * sentinel bit is reserved for maintenance and never set, so the "write" is
   * status-neutral for every credential.
   */
  async function ensureFreshStatusList(
    runtime: FlowRuntime,
    statusHostFetch: typeof fetch,
    now: Date,
  ): Promise<void> {
    const probe = await statusHostFetch(runtime.statusList.url, {
      headers: { accept: "application/vc+ld+json, application/json;q=0.9" },
    });
    if (probe.status === 404) {
      await runtime.statusList.create({ now });
      return;
    }
    if (!probe.ok) {
      throw new StatusListError(
        `status list probe GET ${runtime.statusList.url} failed: ${probe.status}`,
      );
    }
    await runtime.statusList.reinstate(runtime.sentinelIndex, { now });
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
    document: DatasetCore,
    runtime: FlowRuntime,
    kind: IssuerFlowDefinition["kind"],
    webid: string,
    now: Date,
  ): Promise<Response | undefined> {
    const outcome = await verifyCredential(document, {
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

  /**
   * The CAPTURED genuine encoding of the flow's anchored pinned-claim value —
   * re-gated against its decision-0005 digit budget. An operand encoding is
   * never fabricated (see the flows.ts provenance note); a missing capture is
   * a server defect and MUST refuse before any pod mutation.
   */
  function capturedEncodingFor(definition: IssuerFlowDefinition): string | Response {
    if (definition.anchor === undefined) {
      return Response.json({ error: "issuance_defect", simulated: true }, { status: 500 });
    }
    const value = anchoredClaimValue(definition);
    const operandEnc = fitsZkBudget(definition.anchor.field, value)
      ? CAPTURED_OPERAND_ENC[value]
      : undefined;
    if (operandEnc === undefined) {
      return Response.json({ error: "no_captured_encoding", simulated: true }, { status: 500 });
    }
    return operandEnc;
  }

  /**
   * FIX D + F: assess an EXISTING document at the anchor path. Structured
   * verdict (a bare boolean collapsed "revoked" into "replaceable" and let a
   * re-issue silently bypass the issuer's revocation — the FIX F regression):
   *
   *  - `renewable`   — it fully verifies as THIS flow's operand anchor
   *    (shape + signature + status, trusted issuer, subject = the
   *    authenticated caller, EXACT field IRI + CAPTURED operand encoding)
   *    with at most an EXPIRED window → renew by re-signing;
   *  - `revoked`     — it IS this flow's anchor for this caller, but the
   *    ISSUER revoked it (STATUS_REVOKED, beyond possible expiry) → the
   *    whole re-issue is REFUSED, mirroring the main-credential gate:
   *    re-minting would launder an explicit issuer decision;
   *  - `replaceable` — anything else (wrong kind/shape/issuer/subject/
   *    field/encoding, malformed) → not an anchor at all; mint a fresh
   *    correct one over it, never blindly re-sign.
   */
  type AnchorRenewal =
    | { readonly verdict: "renewable" }
    | { readonly verdict: "revoked"; readonly verifyErrors: readonly string[] }
    | { readonly verdict: "replaceable" };

  async function assessAnchorRenewal(
    anchorIri: string,
    anchorDataset: DatasetCore,
    runtime: FlowRuntime,
    expectedField: string,
    expectedEnc: string,
    webid: string,
    now: Date,
  ): Promise<AnchorRenewal> {
    const outcome = await verifyCredential(anchorDataset, {
      expectShape: "zk-operand-anchor",
      now,
      trustedIssuers: [runtime.issuerWebId],
      ...verifySeams(),
    });
    // Identity correctness, independent of window/status state: right
    // subject AND exactly the flow's field + captured encoding (typed read).
    let claimsMatch = false;
    try {
      const subject = new ZkOperandAnchor(anchorIri, anchorDataset, DataFactory).credentialSubject;
      claimsMatch = subject.fieldIri === expectedField && subject.operandEnc === expectedEnc;
    } catch {
      claimsMatch = false;
    }
    const identityOk = outcome.credential?.subject === webid && claimsMatch;
    const codes = outcome.errors.map((error) => error.code);
    const blocking = codes.filter((code) => code !== "EXPIRED");
    if (blocking.length === 0) {
      return identityOk ? { verdict: "renewable" } : { verdict: "replaceable" };
    }
    if (identityOk && blocking.every((code) => code === "STATUS_REVOKED")) {
      return { verdict: "revoked", verifyErrors: codes };
    }
    return { verdict: "replaceable" };
  }

  type ReplacementWriteOutcome = "committed" | "failed" | "indeterminate";

  /**
   * FIX E: a THROWN pod write is not proof the write failed — a transport
   * error can fire after the pod committed. Re-read and discriminate:
   * `committed` when the resource now carries the replacement's (unique)
   * proofValue — robust to the pod re-serialising the Turtle; `failed` when
   * the resource is provably unchanged (same ETag as the pre-mutation read);
   * anything else — unreadable, foreign content, missing ETags — is
   * `indeterminate`.
   */
  async function confirmReplacementWrite(
    iri: string,
    proofValue: string,
    oldEtag: string | null,
    podFetch: PodIoFetch,
  ): Promise<ReplacementWriteOutcome> {
    try {
      const after = await podFetch(iri, {
        headers: { accept: "text/turtle" },
        redirect: "error",
      });
      if (!after.ok) return "indeterminate";
      const body = await after.text();
      if (body.includes(proofValue)) return "committed";
      const etag = after.headers.get("etag");
      if (etag !== null && oldEtag !== null && etag === oldEtag) return "failed";
      return "indeterminate";
    } catch {
      return "indeterminate";
    }
  }

  /**
   * Deliver a replacement whose OLD status index `reissueCredential` already
   * revoked. On a thrown write the outcome is disambiguated (FIX E):
   *  - committed → the throw was post-commit transport noise; complete
   *    FORWARD (no reinstate, no release — the pod references the new index);
   *  - failed → the old document is still pod-resident; COMPENSATE (FIX B):
   *    reinstate its index and release the undelivered replacement's slot —
   *    a fully-old, retryable state;
   *  - indeterminate → fail safe: NEVER reinstate (that could un-revoke a
   *    possibly-superseded credential) and NEVER release (the index may be
   *    referenced by a committed document); surface the error.
   */
  async function writeReplacement(args: {
    iri: string;
    body: string;
    proofValue: string;
    oldEtag: string | null;
    revokedIndex: number;
    newIndex: number;
    runtime: FlowRuntime;
    now: Date;
    podFetch: PodIoFetch;
  }): Promise<void> {
    try {
      await writePodTurtle(args.iri, args.body, { etag: args.oldEtag, podFetch: args.podFetch });
      return;
    } catch (writeError) {
      const outcome = await confirmReplacementWrite(
        args.iri,
        args.proofValue,
        args.oldEtag,
        args.podFetch,
      );
      if (outcome === "committed") return;
      if (outcome === "failed") {
        await args.runtime.statusList.reinstate(args.revokedIndex, { now: args.now });
        args.runtime.allocator.release(args.newIndex);
      }
      throw writeError;
    }
  }

  /**
   * FIX E discrimination for a FRESH (strict-create) write: absence proves
   * the document did not land; the replacement's proofValue proves it did;
   * a present foreign document or an unreadable resource is indeterminate.
   */
  async function confirmCreateWrite(
    iri: string,
    proofValue: string,
    podFetch: PodIoFetch,
  ): Promise<ReplacementWriteOutcome> {
    try {
      const after = await podFetch(iri, {
        headers: { accept: "text/turtle" },
        redirect: "error",
      });
      if (after.status === 404) return "failed";
      if (!after.ok) return "indeterminate";
      return (await after.text()).includes(proofValue) ? "committed" : "indeterminate";
    } catch {
      return "indeterminate";
    }
  }

  /**
   * FIX G: deliver a FRESH-ISSUED document (no prior revocation to
   * compensate) and keep the allocator honest. On a thrown write the outcome
   * is disambiguated exactly like FIX E:
   *  - committed → the throw was post-commit noise; keep the indices;
   *  - failed (re-read PROVES the document did not land: 404 on a create, or
   *    the pre-mutation ETag on an overwrite) → RELEASE the just-allocated
   *    indices, so a borrower whose pod refuses writes cannot hammer the
   *    issue route into exhausting the finite per-flow index space;
   *  - indeterminate → keep the indices (never release a possibly-referenced
   *    slot) and surface the error.
   */
  async function writeIssuedOrRelease(args: {
    iri: string;
    body: string;
    proofValue: string;
    /** Pre-mutation ETag for an overwrite; undefined for a strict create. */
    etag: string | null | undefined;
    /** Indices to release when the write is CONFIRMED failed. */
    releaseOnFailure: readonly number[];
    runtime: FlowRuntime;
    podFetch: PodIoFetch;
  }): Promise<void> {
    try {
      await writePodTurtle(args.iri, args.body, { etag: args.etag, podFetch: args.podFetch });
      return;
    } catch (writeError) {
      const outcome =
        args.etag === null || args.etag === undefined
          ? await confirmCreateWrite(args.iri, args.proofValue, args.podFetch)
          : await confirmReplacementWrite(args.iri, args.proofValue, args.etag, args.podFetch);
      if (outcome === "committed") return;
      if (outcome === "failed") {
        for (const index of args.releaseOnFailure) args.runtime.allocator.release(index);
      }
      throw writeError;
    }
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

        // Scene-1 issuance is a strict CREATE of the COMPLETE flow (credential
        // AND anchor): only a fully-present slot is `already_issued` — renewal
        // is the scene-4 re-issue rail. Any PARTIAL state (a failed earlier
        // attempt, or an externally deleted anchor) is completed here instead
        // of being locked out (FIX A: recoverable, never anchor-less).
        const [existing, existingAnchor] = await Promise.all([
          readPodResource(credentialIri, authenticated.podBase, podFetch),
          anchorIri === undefined
            ? Promise.resolve(undefined)
            : readPodResource(anchorIri, authenticated.podBase, podFetch),
        ]);
        if (existing !== undefined && (anchorIri === undefined || existingAnchor !== undefined)) {
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

        // FIX C: verify-or-create the hosted list BEFORE anything is signed
        // against it or verified through it.
        await ensureFreshStatusList(runtime, statusHostFetch, now);

        // ── Repair: the credential is present but its mandatory anchor is
        // missing (a state Tier-A proving cannot use). Mint the anchor for the
        // STORED credential's own asserted window — but only after the stored
        // document fully verifies (signature, issuer, shape, status, window)
        // and attests the authenticated caller. An expired credential goes to
        // re-issue instead (which renews credential AND anchor together).
        if (existing !== undefined && definition.anchor !== undefined && anchorIri !== undefined) {
          const outcome = await verifyCredential(existing.dataset, {
            expectShape: definition.kind,
            now,
            trustedIssuers: [runtime.issuerWebId],
            ...verifySeams(),
          });
          if (!outcome.verified || outcome.credential?.subject !== authenticated.webid) {
            const codes = outcome.errors.map((error) => error.code);
            const onlyExpired = outcome.errors.length > 0 && codes.every((c) => c === "EXPIRED");
            return Response.json(
              {
                detail: onlyExpired
                  ? "the stored credential has expired — use re-issue (it renews the anchor too)"
                  : "the stored credential does not qualify for anchor repair",
                error: "anchor_repair_refused",
                simulated: true,
                verifyErrors: codes,
              },
              { status: 409 },
            );
          }
          const { validFrom, validUntil } = outcome.credential;
          if (validFrom === undefined || validUntil === undefined) {
            return Response.json({ error: "issuance_defect", simulated: true }, { status: 500 });
          }
          const operandEnc = capturedEncodingFor(definition);
          if (operandEnc instanceof Response) return operandEnc;
          const repairIndex = runtime.allocator.allocate(anchorIri);
          const anchorIssued = await issueCredential({
            claims: { field: definition.anchor.field, kind: "zk-operand-anchor", operandEnc },
            credentialId: anchorIri,
            issuer: runtime.issuerWebId,
            key: runtime.key,
            kind: "zk-operand-anchor",
            status: runtime.statusList.entry(repairIndex),
            subject: authenticated.webid,
            validity: { validFrom: new Date(validFrom), validUntil: new Date(validUntil) },
          });
          await writeIssuedOrRelease({
            body: anchorIssued.body,
            etag: undefined,
            iri: anchorIri,
            podFetch,
            proofValue: anchorIssued.proof.proofValue,
            releaseOnFailure: [repairIndex],
            runtime,
          });
          return Response.json({
            anchor: summarize(anchorIssued, runtime, new Date(validFrom), new Date(validUntil)),
            credential: {
              id: credentialIri,
              kind: definition.kind,
              statusListCredential: runtime.statusList.url,
              statusListIndex: undefined,
              validFrom,
              validUntil,
            },
            flow,
            repaired: true,
            simulated: true,
          });
        }

        // ── Fresh issue (or resume after a failed credential write left an
        // orphan anchor). FIX A ordering: BOTH documents are fully prepared
        // (claims pinned, SHACL-gated, signed) before ANY pod mutation, and
        // the anchor is written FIRST — so no failure point can ever leave an
        // anchor-less credential reachable, and every partial state resumes.
        const validity = {
          validFrom: daysFrom(now, definition.validFromDays),
          validUntil: daysFrom(now, definition.validUntilDays),
        };
        const credentialIndex = runtime.allocator.allocate(credentialIri);
        const issued = await issueCredential({
          claims: definition.claims(),
          credentialId: credentialIri,
          issuer: runtime.issuerWebId,
          key: runtime.key,
          kind: definition.kind,
          status: runtime.statusList.entry(credentialIndex),
          subject: authenticated.webid,
          validity,
        });
        let anchorIssued: IssuedCredential | undefined;
        let anchorIndex: number | undefined;
        if (definition.anchor !== undefined && anchorIri !== undefined) {
          const operandEnc = capturedEncodingFor(definition);
          if (operandEnc instanceof Response) return operandEnc;
          anchorIndex = runtime.allocator.allocate(anchorIri);
          anchorIssued = await issueCredential({
            claims: { field: definition.anchor.field, kind: "zk-operand-anchor", operandEnc },
            credentialId: anchorIri,
            issuer: runtime.issuerWebId,
            key: runtime.key,
            kind: "zk-operand-anchor",
            status: runtime.statusList.entry(anchorIndex),
            subject: authenticated.webid,
            validity,
          });
        }

        // Pod mutations, anchor first. A resume run OVERWRITES the orphan
        // anchor (If-Match) so the anchor always matches the credential that
        // lands beside it; a fresh run strict-creates both. FIX G: a
        // CONFIRMED-failed write releases the just-allocated indices —
        // NOTHING landed if the anchor write failed, so both slots go back.
        if (anchorIssued !== undefined && anchorIri !== undefined && anchorIndex !== undefined) {
          await writeIssuedOrRelease({
            body: anchorIssued.body,
            etag: existingAnchor?.etag,
            iri: anchorIri,
            podFetch,
            proofValue: anchorIssued.proof.proofValue,
            releaseOnFailure: [anchorIndex, credentialIndex],
            runtime,
          });
        }
        await writeIssuedOrRelease({
          body: issued.body,
          etag: undefined,
          iri: credentialIri,
          podFetch,
          proofValue: issued.proof.proofValue,
          releaseOnFailure: [credentialIndex],
          runtime,
        });

        return Response.json({
          anchor:
            anchorIssued === undefined
              ? null
              : summarize(anchorIssued, runtime, validity.validFrom, validity.validUntil),
          credential: summarize(issued, runtime, validity.validFrom, validity.validUntil),
          flow,
          resumed: existingAnchor !== undefined,
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
        const anchorIri =
          definition.anchor === undefined
            ? undefined
            : `${authenticated.podBase}${definition.anchor.path.slice(1)}`;

        // FIX B: EVERY input — main credential AND anchor — is read and
        // gate-checked before either resource or the status list is mutated.
        const [resource, anchorResource] = await Promise.all([
          readPodResource(credentialIri, authenticated.podBase, podFetch),
          anchorIri === undefined
            ? Promise.resolve(undefined)
            : readPodResource(anchorIri, authenticated.podBase, podFetch),
        ]);
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
        // FIX C: verify-and-refresh the hosted list before the gate consults
        // it and before any replacement is signed against it — a stale-but-
        // authentic window is healed rather than wedging the one-click flow.
        const statusHostFetch = getStatusHostFetch();
        if (statusHostFetch instanceof Response) return statusHostFetch;
        await ensureFreshStatusList(runtime, statusHostFetch, now);

        const gate = await reissueGate(
          resource.dataset,
          runtime,
          definition.kind,
          authenticated.webid,
          now,
        );
        if (gate !== undefined) return gate;

        const validity = { validFrom: now, validUntil: daysFrom(now, definition.reissueDays) };

        // ── Anchor FIRST (FIX A + B): renew (or repair, if missing — never
        // silently skip) the operand anchor before the main credential is
        // touched, and COMPENSATE its status-list revocation if its pod write
        // fails — so a mid-sequence failure can never leave a fresh main
        // credential beside a stale anchor, and every failure state retries.
        let anchorSummary: IssuedSummary | undefined;
        if (definition.anchor !== undefined && anchorIri !== undefined) {
          const operandEnc = capturedEncodingFor(definition);
          if (operandEnc instanceof Response) return operandEnc;
          // FIX D + F: only a document that provably IS this flow's anchor is
          // renewed by re-signing; a REVOKED-but-otherwise-correct anchor
          // refuses the whole re-issue (the issuer's decision is never
          // laundered by re-minting); anything else at the path is REPLACED
          // with a fresh correct anchor, never blindly re-signed.
          const assessment: AnchorRenewal =
            anchorResource === undefined
              ? { verdict: "replaceable" }
              : await assessAnchorRenewal(
                  anchorIri,
                  anchorResource.dataset,
                  runtime,
                  definition.anchor.field,
                  operandEnc,
                  authenticated.webid,
                  now,
                );
          if (assessment.verdict === "revoked") {
            return Response.json(
              {
                detail:
                  "the flow's operand anchor was revoked by the issuer — one-click re-issue cannot restore it (an explicit issuer decision is required)",
                error: "reissue_refused",
                simulated: true,
                verifyErrors: assessment.verifyErrors,
              },
              { status: 409 },
            );
          }
          if (anchorResource !== undefined && assessment.verdict === "renewable") {
            const anchorResult = await reissueCredential(anchorResource.dataset, {
              allocator: runtime.allocator,
              key: runtime.key,
              now,
              statusList: runtime.statusList,
              validity,
            });
            await writeReplacement({
              body: anchorResult.issued.body,
              iri: anchorIri,
              newIndex: anchorResult.newIndex,
              now,
              oldEtag: anchorResource.etag,
              podFetch,
              proofValue: anchorResult.issued.proof.proofValue,
              revokedIndex: anchorResult.revokedIndex,
              runtime,
            });
            anchorSummary = summarize(
              anchorResult.issued,
              runtime,
              validity.validFrom,
              validity.validUntil,
            );
          } else {
            // Missing anchor, or an unusable document parked at the anchor
            // path: mint the correct anchor fresh with the re-issue window
            // (strict create when absent, conditional overwrite when
            // replacing; no prior revocation to compensate — FIX G releases
            // the slot on a confirmed-failed write).
            const mintIndex = runtime.allocator.allocate(anchorIri);
            const anchorIssued = await issueCredential({
              claims: { field: definition.anchor.field, kind: "zk-operand-anchor", operandEnc },
              credentialId: anchorIri,
              issuer: runtime.issuerWebId,
              key: runtime.key,
              kind: "zk-operand-anchor",
              status: runtime.statusList.entry(mintIndex),
              subject: authenticated.webid,
              validity,
            });
            await writeIssuedOrRelease({
              body: anchorIssued.body,
              etag: anchorResource?.etag,
              iri: anchorIri,
              podFetch,
              proofValue: anchorIssued.proof.proofValue,
              releaseOnFailure: [mintIndex],
              runtime,
            });
            anchorSummary = summarize(
              anchorIssued,
              runtime,
              validity.validFrom,
              validity.validUntil,
            );
          }
        }

        // ── Main credential. `reissueCredential` signs the replacement and
        // revokes the old index; if the conditional pod write then fails, the
        // revocation is COMPENSATED (reinstate) so the pod-resident credential
        // is never left pointing at a revoked index (FIX B). A fresh-anchor /
        // stale-main intermediate is harmless and self-heals on retry (the
        // gate tolerates expiry; the anchor is simply renewed again).
        const result = await reissueCredential(resource.dataset, {
          allocator: runtime.allocator,
          key: runtime.key,
          now,
          statusList: runtime.statusList,
          validity,
        });
        await writeReplacement({
          body: result.issued.body,
          iri: credentialIri,
          newIndex: result.newIndex,
          now,
          oldEtag: resource.etag,
          podFetch,
          proofValue: result.issued.proof.proofValue,
          revokedIndex: result.revokedIndex,
          runtime,
        });

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
