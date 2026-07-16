/**
 * The two property issuer flows (bead sm-33), issued through the ONE VC rail
 * (`@mortgage/vc-kit` `issueCredential`, decision 0004) and written into the
 * borrower's own pod via the decision-0015 authenticated-caller boundary.
 *
 * APPRAISAL (Cotality-modelled): the appraised value is a PLAIN DISCLOSED,
 * signed claim — `schema:value` under the FIBO appraised-value node — and is
 * NEVER wrapped in a ZK operand anchor (decision 0005: never prove a property
 * of a value the credential reveals anyway). The only appraisal-specific gate
 * is a consistency check that the appraised value covers the requested loan
 * (requested loan ≤ appraised value; the SPEC's "the loan never exceeds the
 * appraised value"). This is a plain arithmetic check on disclosed figures —
 * there is no ZK anchor and no hidden operand.
 *
 * TITLE (First American-modelled): a `mort:titleStatus` clear/clouded outcome.
 *
 * Both mint a Bitstring Status List entry (revocation-only, decision 0007) via
 * a deterministic per-subject index, and both bind `credentialSubject` to the
 * authenticated caller WebID (decision 0015 L3) — a credential about someone
 * else is never issued into the bound pod.
 */
import { PERSONA_VALUES, type PostalAddressInit, RESOURCE_POD_PATHS } from "@mortgage/data-model";
import {
  type AppraisalClaims,
  deriveStatusIndex,
  IssueRefusedError,
  issueCredential,
  type TitleClearClaims,
} from "@mortgage/vc-kit";
import type { PropertyConfig } from "./config";
import type { IssuerBrand, IssuerRegistry } from "./issuers";
import { PodAccessError, type PodIoFetch, readPodResource, writePodDocument } from "./pod";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** `YYYY-MM-DD` (the xsd:date lexical the shapes require). */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAddress(address: PostalAddressInit): string {
  return `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`;
}

/** The demo persona the seeded scripted journey uses (Alex Rivera). */
function persona() {
  const values = PERSONA_VALUES[0];
  if (values === undefined) throw new Error("no demo persona available");
  return values;
}

// ── Consistency check (disclosed figures only — no ZK, no hidden operand) ─────

export interface AppraisalConsistency {
  readonly appraisedValueUsd: number;
  readonly requestedLoanUsd: number;
  /** requested loan ≤ appraised value (LTV ≤ 100%). */
  readonly appraisalCoversLoan: boolean;
}

/**
 * The appraisal consistency invariant, over PLAIN DISCLOSED numbers. Both
 * operands are revealed on the wire, so this is deliberately a bare comparison
 * — asserting it in ZK would violate decision 0005 (never prove a property of a
 * value the credential discloses).
 */
export function appraisalConsistency(
  appraisedValueUsd: number,
  requestedLoanUsd: number,
): AppraisalConsistency {
  return {
    appraisedValueUsd,
    requestedLoanUsd,
    appraisalCoversLoan: appraisedValueUsd >= requestedLoanUsd,
  };
}

// ── Issuance ──────────────────────────────────────────────────────────────

export interface IssueSceneOptions {
  readonly now?: () => Date;
  /** Grant-authenticated / owner pod-IO fetch seam (default: anonymous). */
  readonly podFetch?: PodIoFetch;
}

/** Common shape of an issue-flow response payload (every field `simulated`). */
interface IssueResultBase {
  readonly simulated: true;
  readonly brand: IssuerBrand;
  readonly credentialIri: string;
  readonly issuer: string;
  readonly subject: string;
  readonly statusListIndex: number;
  readonly statusListCredential: string;
  readonly validFrom: string;
  readonly validUntil: string;
}

export interface AppraisalIssueResult extends IssueResultBase {
  readonly brand: "appraisal";
  /** The DISCLOSED appraised value (a signed plain claim, never ZK-proved). */
  readonly appraisedValueUsd: number;
  readonly requestedLoanUsd: number;
  readonly appraisalCoversLoan: boolean;
  readonly propertyAddress: string;
  readonly appraiserName: string;
  readonly reportIssued: string;
}

export interface TitleIssueResult extends IssueResultBase {
  readonly brand: "title";
  readonly titleStatus: "clear" | "clouded";
  readonly propertyAddress: string;
  readonly searchedThrough: string;
}

/**
 * The `credentialStatus` entry for a freshly-issued credential (revocation only,
 * decision 0007).
 *
 * SCOPE LIMITATIONS (roborev sm-33 Medium; follow-up beads):
 *  - This bead MINTS the entry (the reference the credential carries); it does
 *    NOT create/host/verify the referenced Bitstring Status List document. The
 *    list is a seed-layer resource on the issuer origin (same `.example`
 *    posture as every persona VC) — fail-closed status verification only works
 *    once that list is hosted (`StatusListClient`, sm-24).
 *  - `index` comes from `deriveStatusIndex` seeded per (issuer, subject, brand):
 *    stable per subject, but WITHOUT an occupancy predicate two distinct
 *    subjects could birthday-collide on one index (revoking either would revoke
 *    both). Negligible in the one-persona-per-pod demo; the correct fix is a
 *    `StatusIndexAllocator` rehydrated from the authoritative hosted list —
 *    which requires the hosting above, so both land together.
 */
function statusEntry(index: number, statusListCredential: string) {
  return {
    statusPurpose: "revocation" as const,
    statusListIndex: index,
    statusListCredential,
  };
}

/**
 * Write the signed credential into the borrower's pod (conditional PUT).
 *
 * The write runs over the injectable `podFetch` seam (decision 0015 L4). The
 * DEFAULT is anonymous, which a WAC-enabled pod refuses for a private container
 * (fail-closed — the demo never silently depends on an open pod); it succeeds
 * against the seeded fixed-owner demo/e2e pod. Because the authenticated caller
 * here is the pod OWNER, the honest production path is either the borrower's own
 * Solid session performing this store client-side, or an sm-28
 * grant-authenticated fetch injected as `podFetch` — roborev sm-33 High,
 * tracked as a follow-up bead; the seam is already the injection point.
 */
async function writeIssued(
  credentialIri: string,
  podBase: string,
  body: string,
  seams: IssueSceneOptions,
): Promise<void> {
  const existing = await readPodResource(credentialIri, podBase, seams.podFetch);
  await writePodDocument(credentialIri, body, {
    etag: existing?.etag,
    contentType: "text/turtle",
    ...(seams.podFetch !== undefined ? { podFetch: seams.podFetch } : {}),
  });
}

/**
 * Issue the appraisal credential (disclosed value) into the caller's pod.
 * `podBase` + `subject` are DERIVED from the authenticated caller by the route
 * boundary (decision 0015) — never request parameters.
 */
export async function issueAppraisal(
  podBase: string,
  subject: string,
  registry: IssuerRegistry,
  _config: PropertyConfig,
  options: IssueSceneOptions = {},
): Promise<AppraisalIssueResult> {
  const values = persona();
  const now = (options.now ?? (() => new Date()))();
  const issuer = await registry.resolve("appraisal");

  // Consistency over disclosed figures (no ZK, no hidden operand).
  const consistency = appraisalConsistency(values.appraisedValueUsd, values.requestedLoanUsd);
  if (!consistency.appraisalCoversLoan) {
    throw new PodAccessError(
      409,
      "appraisal_inconsistent: the appraised value does not cover the requested loan amount",
    );
  }

  const credentialIri = `${podBase}${RESOURCE_POD_PATHS["appraisal-credential"].slice(1)}`;
  const reportIssued = isoDate(daysFrom(now, -8));
  const claims: AppraisalClaims = {
    kind: "appraisal-credential",
    property: {
      address: values.subjectPropertyAddress,
      // The disclosed value: a plain signed claim, NOT a ZK operand anchor.
      appraisedValueUsd: values.appraisedValueUsd,
    },
    appraiser: { name: values.appraiserName, licenseId: values.appraiserLicenseId },
    reportIssued,
  };
  const statusListIndex = deriveStatusIndex(`${issuer.webid}:${subject}:appraisal-credential`);
  const validFrom = daysFrom(now, -7);
  const validUntil = daysFrom(now, 177);

  const issued = await issueCredentialGuarded({
    kind: "appraisal-credential",
    credentialId: credentialIri,
    issuer: issuer.webid,
    subject,
    claims,
    validity: { validFrom, validUntil },
    status: statusEntry(statusListIndex, issuer.statusListUrl),
    key: issuer.key,
  });

  await writeIssued(credentialIri, podBase, issued.body, options);

  return {
    simulated: true,
    brand: "appraisal",
    credentialIri,
    issuer: issuer.webid,
    subject,
    appraisedValueUsd: consistency.appraisedValueUsd,
    requestedLoanUsd: consistency.requestedLoanUsd,
    appraisalCoversLoan: consistency.appraisalCoversLoan,
    propertyAddress: formatAddress(values.subjectPropertyAddress),
    appraiserName: values.appraiserName,
    reportIssued,
    statusListIndex,
    statusListCredential: issuer.statusListUrl,
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

/** Issue the title-clear credential into the caller's pod. */
export async function issueTitle(
  podBase: string,
  subject: string,
  registry: IssuerRegistry,
  _config: PropertyConfig,
  options: IssueSceneOptions = {},
): Promise<TitleIssueResult> {
  const values = persona();
  const now = (options.now ?? (() => new Date()))();
  const issuer = await registry.resolve("title");

  const credentialIri = `${podBase}${RESOURCE_POD_PATHS["title-clear-credential"].slice(1)}`;
  const searchedThrough = isoDate(daysFrom(now, -6));
  const titleStatus = "clear" as const;
  const claims: TitleClearClaims = {
    kind: "title-clear-credential",
    property: { address: values.subjectPropertyAddress },
    titleStatus,
    searchedThrough,
    evidence: `${podBase}reports/title-search`,
  };
  const statusListIndex = deriveStatusIndex(`${issuer.webid}:${subject}:title-clear-credential`);
  const validFrom = daysFrom(now, -5);
  const validUntil = daysFrom(now, 87);

  const issued = await issueCredentialGuarded({
    kind: "title-clear-credential",
    credentialId: credentialIri,
    issuer: issuer.webid,
    subject,
    claims,
    validity: { validFrom, validUntil },
    status: statusEntry(statusListIndex, issuer.statusListUrl),
    key: issuer.key,
  });

  await writeIssued(credentialIri, podBase, issued.body, options);

  return {
    simulated: true,
    brand: "title",
    credentialIri,
    issuer: issuer.webid,
    subject,
    titleStatus,
    propertyAddress: formatAddress(values.subjectPropertyAddress),
    searchedThrough,
    statusListIndex,
    statusListCredential: issuer.statusListUrl,
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

/**
 * `issueCredential` with the shape-refusal lowered to a fail-closed 422: a
 * payload that fails its SHACL shape is never signed AND never surfaces an
 * opaque 500 — the caller learns the credential was refused.
 */
async function issueCredentialGuarded(
  options: Parameters<typeof issueCredential>[0],
): ReturnType<typeof issueCredential> {
  try {
    return await issueCredential(options);
  } catch (error) {
    if (error instanceof IssueRefusedError) {
      throw new PodAccessError(422, `credential refused by its shape: ${error.message}`);
    }
    throw error;
  }
}

// ── Mode-1 demo previews (client-safe; no pod, no signing) ──────────────────

export interface AppraisalDemoPreview {
  readonly simulated: true;
  readonly propertyAddress: string;
  readonly appraisedValueUsd: number;
  readonly requestedLoanUsd: number;
  readonly appraisalCoversLoan: boolean;
  readonly appraiserName: string;
  readonly appraiserLicenseId: string;
}

export interface TitleDemoPreview {
  readonly simulated: true;
  readonly propertyAddress: string;
  readonly titleStatus: "clear" | "clouded";
}

/** The appraisal figures the RSC hands the client for the Mode-1 fallback. */
export function appraisalDemoPreview(): AppraisalDemoPreview {
  const values = persona();
  const consistency = appraisalConsistency(values.appraisedValueUsd, values.requestedLoanUsd);
  return {
    simulated: true,
    propertyAddress: formatAddress(values.subjectPropertyAddress),
    appraisedValueUsd: consistency.appraisedValueUsd,
    requestedLoanUsd: consistency.requestedLoanUsd,
    appraisalCoversLoan: consistency.appraisalCoversLoan,
    appraiserName: values.appraiserName,
    appraiserLicenseId: values.appraiserLicenseId,
  };
}

/** The title figures the RSC hands the client for the Mode-1 fallback. */
export function titleDemoPreview(): TitleDemoPreview {
  const values = persona();
  return {
    simulated: true,
    propertyAddress: formatAddress(values.subjectPropertyAddress),
    titleStatus: "clear",
  };
}
