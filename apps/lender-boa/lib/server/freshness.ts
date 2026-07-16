/**
 * Scene-4 pre-close freshness re-check (decision 0007: freshness = validity
 * window, status list = revocation ONLY; the green tick needs BOTH). Reads
 * the employment VC from the granted pod, evaluates `isFresh` + the Bitstring
 * status via vc-kit (fail-closed: an unreachable status list is never a
 * pass), and re-runs the scene-3 decision gate on the outcome.
 *
 * The one-click re-issue itself belongs to the verifications app (the issuer
 * re-signs through the EXISTING grant — that is the demo beat); this module
 * exposes the lender-side request + re-check loop.
 */
import { EmploymentIncomeCredential, RESOURCE_POD_PATHS, validate } from "@mortgage/data-model";
import {
  type CheckCredentialStatusOptions,
  checkCredentialStatus,
  isFresh,
} from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import type { LenderConfig } from "./config";
import { assertAllowedPodBase, PodAccessError, readPodResource } from "./pod";

export type FreshnessDecision = "stands" | "blocked-stale" | "blocked-status";

export interface FreshnessReport {
  readonly simulated: true;
  readonly credentialIri: string;
  readonly window: { readonly validFrom: string; readonly validUntil?: string };
  /** Decision-0007 window check via vc-kit `isFresh`. */
  readonly fresh: boolean;
  /** Bitstring status outcome (fail-closed; "unreachable" is never a pass). */
  readonly status: "absent" | "valid" | "revoked" | "suspended" | "unreachable";
  readonly statusReason?: string;
  /** The green tick: fresh window AND a positively-confirmed status. */
  readonly greenTick: boolean;
  /** The re-run scene-3 decision under this evidence. */
  readonly decision: FreshnessDecision;
  /** The regulatory anchor the beat demonstrates. */
  readonly rule: string;
}

/** Fannie Mae B3-3.1-04: verbal VOE within 10 business days before closing. */
export const VOE_RULE =
  "Verbal verification of employment within 10 business days before the note date (Fannie Mae B3-3.1-04)";

export type FreshnessSeams = Pick<
  CheckCredentialStatusOptions,
  "resolveKey" | "isControlledBy" | "webIdFetch" | "statusFetch" | "trustedStatusIssuers"
>;

export async function checkEmploymentFreshness(
  pod: string,
  config: LenderConfig,
  options: { now?: () => Date; seams?: FreshnessSeams } = {},
): Promise<FreshnessReport> {
  const base = assertAllowedPodBase(pod, config);
  const now = (options.now ?? (() => new Date()))();
  const iri = `${base}${RESOURCE_POD_PATHS["employment-income-credential"].slice(1)}`;
  const resource = await readPodResource(iri, base);
  if (resource === undefined) {
    throw new PodAccessError(404, "pod has no employment credential to re-verify");
  }
  const report = await validate(resource.dataset, {
    expect: "employment-income-credential",
    focusNode: iri,
  });
  if (!report.conforms) {
    throw new PodAccessError(
      502,
      `pod employment credential violates its shape: ${report.violations[0]?.message ?? "unknown"}`,
    );
  }
  const credential = new EmploymentIncomeCredential(
    DataFactory.namedNode(iri),
    resource.dataset,
    DataFactory,
  );
  const validFrom = credential.validFrom.toISOString();
  const validUntil = credential.validUntil?.toISOString();
  const fresh = isFresh({ validFrom, validUntil }, now);

  // Dev/e2e loopback mode swaps the SSRF-guarded default fetch only; the
  // fail-closed status semantics are identical.
  const seams: FreshnessSeams =
    options.seams ??
    (config.allowInsecureLoopback
      ? { webIdFetch: fetch.bind(globalThis), statusFetch: fetch.bind(globalThis) }
      : {});
  const statusCheck = await checkCredentialStatus(resource.dataset, { now, ...seams });

  const statusOk = statusCheck.status === "valid";
  const decision: FreshnessDecision = !fresh
    ? "blocked-stale"
    : statusOk
      ? "stands"
      : "blocked-status";
  return {
    simulated: true,
    credentialIri: iri,
    window: { validFrom, ...(validUntil !== undefined ? { validUntil } : {}) },
    fresh,
    status: statusCheck.status,
    ...("reason" in statusCheck && statusCheck.reason !== undefined
      ? { statusReason: statusCheck.reason }
      : {}),
    greenTick: fresh && statusOk,
    decision,
    rule: VOE_RULE,
  };
}
