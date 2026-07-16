/**
 * Scene-4 pre-close freshness re-check (decision 0007). The green tick is
 * `verifyCredential` AND `isFresh` — exactly as vc-kit's reissue.ts documents:
 * the employment VC's signature, issuer, shape, validity window and Bitstring
 * status must ALL verify (fail-closed — an unverifiable signature, an
 * untrusted issuer, or an unconfirmable status is never a pass), AND the
 * decision-0007 window check must hold. Freshness (validity window) and
 * revocation (status list) stay distinct signals; a stale credential is
 * re-issued through the existing grant (the verifications app's act).
 *
 * SECURITY: a credential is trusted only after full `verifyCredential` against
 * the configured employment-issuer allowlist. SHACL-conformance alone (a
 * forgeable, unsigned graph) never earns a green tick.
 */
import { RESOURCE_POD_PATHS } from "@mortgage/data-model";
import { isFresh, type VerifyCredentialOptions, verifyCredential } from "@mortgage/vc-kit";
import type { LenderConfig } from "./config";
import { assertAllowedPodBase, PodAccessError, readPodResource } from "./pod";

export type FreshnessDecision = "stands" | "blocked-stale" | "blocked-invalid";

export interface FreshnessReport {
  readonly simulated: true;
  readonly credentialIri: string;
  readonly window: { readonly validFrom?: string; readonly validUntil?: string };
  /** Decision-0007 window check via vc-kit `isFresh`. */
  readonly fresh: boolean;
  /** Full `verifyCredential` verdict (signature + issuer + window + status + shape). */
  readonly verified: boolean;
  /** Distinct `verifyCredential` failure codes (diagnostics; never leaks internals). */
  readonly verifyErrors: readonly string[];
  /** The green tick: fresh window AND a fully verified credential. */
  readonly greenTick: boolean;
  /** The re-run scene-3 decision under this evidence. */
  readonly decision: FreshnessDecision;
  /** The regulatory anchor the beat demonstrates. */
  readonly rule: string;
}

/** Fannie Mae B3-3.1-04: verbal VOE within 10 business days before closing. */
export const VOE_RULE =
  "Verbal verification of employment within 10 business days before the note date (Fannie Mae B3-3.1-04)";

/** Verification seams `verifyCredential` consumes — injected in tests. */
export type FreshnessSeams = Pick<
  VerifyCredentialOptions,
  "resolveKey" | "isControlledBy" | "webIdFetch" | "statusFetch" | "trustedStatusIssuers"
>;

export async function checkEmploymentFreshness(
  pod: string,
  config: LenderConfig,
  options: { now?: () => Date; seams?: FreshnessSeams } = {},
): Promise<FreshnessReport> {
  if (config.trustedCredentialIssuers.length === 0) {
    throw new PodAccessError(
      503,
      "MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS is unset — the freshness rail fails closed",
    );
  }
  const base = assertAllowedPodBase(pod, config);
  const now = (options.now ?? (() => new Date()))();
  const iri = `${base}${RESOURCE_POD_PATHS["employment-income-credential"].slice(1)}`;
  const resource = await readPodResource(iri, base);
  if (resource === undefined) {
    throw new PodAccessError(404, "pod has no employment credential to re-verify");
  }

  // Dev/e2e loopback mode swaps the SSRF-guarded default fetch only; the
  // fail-closed verification semantics are identical.
  const seams: FreshnessSeams =
    options.seams ??
    (config.allowInsecureLoopback
      ? { webIdFetch: fetch.bind(globalThis), statusFetch: fetch.bind(globalThis) }
      : {});

  // Authoritative gate: signature + issuer + window + status + shape.
  const verification = await verifyCredential(resource.dataset, {
    expectShape: "employment-income-credential",
    now,
    trustedIssuers: config.trustedCredentialIssuers,
    ...seams,
  });
  // Holder binding (decision 0012 discipline), caller-INDEPENDENT: the
  // credential subject must be THIS pod's own owner WebID — derived from the
  // pod being checked (the conventional `<pod>/profile/card#me`), NEVER from a
  // caller-supplied parameter. A valid credential attesting a different subject
  // (dropped into this pod) can therefore never green the tick. Full binding to
  // an authenticated borrower session arrives with the wallet grant pipeline
  // (sm-28); this is the strongest binding available without a caller identity.
  const podOwner = `${base}profile/card#me`;
  const subjectOk =
    verification.credential?.subject !== undefined && verification.credential.subject === podOwner;
  const verifyErrors = [
    ...verification.errors.map((error) => error.code),
    ...(subjectOk ? [] : ["SUBJECT_MISMATCH"]),
  ];
  const verified = verification.verified && subjectOk;
  // The decision-0007 window sub-signal, from the same (already structurally
  // read) credential projection.
  const window = {
    validFrom: verification.credential?.validFrom,
    validUntil: verification.credential?.validUntil,
  };
  const fresh = isFresh(window, now);

  const decision: FreshnessDecision = !fresh
    ? "blocked-stale"
    : verified
      ? "stands"
      : "blocked-invalid";
  return {
    simulated: true,
    credentialIri: iri,
    window: {
      ...(window.validFrom !== undefined ? { validFrom: window.validFrom } : {}),
      ...(window.validUntil !== undefined ? { validUntil: window.validUntil } : {}),
    },
    fresh,
    verified,
    verifyErrors,
    greenTick: fresh && verified,
    decision,
    rule: VOE_RULE,
  };
}
