// AUTHORED-BY Claude Opus 5.5
/**
 * Reliance verification against a scheme's trusted-issuer list (reusable KYC demo, flows.md
 * section 8). SECURITY-CRITICAL. The verdict is the conjunction of fail-closed gates:
 *
 *  1. every {@link verifyCredential} gate (structure, shape, window, status, proofs);
 *  2. status REQUIRED: a credential without a status entry fails (`STATUS_MISSING`). The
 *     general verifier treats an absent entry as a pass; reliance on another institution's
 *     word needs a way for that word to be withdrawn;
 *  3. the list itself: it must parse, conform to `mshape:TrustedIssuerListShape` bound to the
 *     given IRI (`TRUST_LIST_INVALID`), be in force at `now` (`TRUST_LIST_OUT_OF_FORCE`) and
 *     list issuers for the credential's class (`TRUST_LIST_WRONG_TYPE`);
 *  4. membership: the issuer must have an entry (`ISSUER_NOT_LISTED`) that is in force both
 *     when the credential took effect and at `now` (`LISTING_NOT_IN_FORCE`);
 *  5. for KYC attestations: no check may be dated after the credential took effect
 *     (`CHECK_AFTER_ISSUANCE`): an issuer cannot attest a check it had not yet run.
 *
 * The list's authenticity rests on where the caller loaded it from (the relying party's own
 * copy of the scheme's publication); this module does not sign or fetch lists. The function
 * never throws on hostile input and never reads the clock.
 */

import { parseCredentialRdf } from "@jeswr/solid-vc";
import {
  KycAttestationCredential,
  type TrustedIssuerEntry,
  TrustedIssuerList,
  validate,
} from "@mortgage/data-model";
import type { DatasetCore, Term } from "@rdfjs/types";
import { DataFactory } from "n3";
import {
  type VcKitErrorCode,
  type VerifiedCredentialInfo,
  type VerifyCredentialOptions,
  verifyCredential,
} from "./verify.js";
import { type CredentialKind, targetClassOf, VC_CREDENTIAL_STATUS } from "./vocab.js";

/** The gates this module adds to {@link VcKitErrorCode}. */
export type TrustListErrorCode =
  | "STATUS_MISSING"
  | "TRUST_LIST_INVALID"
  | "TRUST_LIST_OUT_OF_FORCE"
  | "TRUST_LIST_WRONG_TYPE"
  | "ISSUER_NOT_LISTED"
  | "LISTING_NOT_IN_FORCE"
  | "CHECK_AFTER_ISSUANCE";

export interface TrustListVerificationError {
  readonly code: VcKitErrorCode | TrustListErrorCode;
  readonly message: string;
}

/** The trusted-issuer list document and the IRI of the list node inside it. */
export interface TrustListInput {
  readonly iri: string;
  readonly document: string | DatasetCore;
  /** Content type when `document` is a string. Default `text/turtle`. */
  readonly contentType?: string;
}

export interface VerifyWithTrustListOptions
  extends Omit<VerifyCredentialOptions, "trustedIssuers" | "expectShape"> {
  /** The credential kind the document must hold. */
  readonly expectShape: CredentialKind;
  readonly trustList: TrustListInput;
}

/** Each gate's outcome, for a verifier screen that shows what was checked. */
export interface TrustListGates {
  /** Proofs verified and bound to the issuer. */
  readonly signature: boolean;
  /** A status entry is present and the list says the credential is neither revoked nor suspended. */
  readonly status: boolean;
  /** Shape and validity window (and, for KYC attestations, the check dates). */
  readonly content: boolean;
  /** The trusted-issuer list parsed, conformed, is in force and covers this credential class. */
  readonly list: boolean;
  /** The issuer is on the list, with an entry in force at issuance and now. */
  readonly listed: boolean;
}

/** The entry that admitted the issuer (present when `gates.listed`). */
export interface TrustListEntryInfo {
  readonly issuer: string;
  readonly name: string;
  readonly agreement: string;
}

export interface TrustListVerificationResult {
  readonly verified: boolean;
  readonly errors: readonly TrustListVerificationError[];
  readonly gates: TrustListGates;
  readonly credential?: VerifiedCredentialInfo;
  readonly entry?: TrustListEntryInfo;
  /** The list's name and publisher, when the list itself is readable. */
  readonly list?: { readonly name: string; readonly publisher: string };
}

const SIGNATURE_CODES: ReadonlySet<string> = new Set([
  "NO_PROOF",
  "INVALID_SIGNATURE",
  "ISSUER_MISMATCH",
  "UNKNOWN_CRYPTOSUITE",
  "PROOF_PURPOSE_MISMATCH",
  "MALFORMED",
]);
const STATUS_CODES: ReadonlySet<string> = new Set([
  "STATUS_MISSING",
  "STATUS_REVOKED",
  "STATUS_SUSPENDED",
  "STATUS_UNREACHABLE",
]);
const LIST_CODES: ReadonlySet<string> = new Set([
  "TRUST_LIST_INVALID",
  "TRUST_LIST_OUT_OF_FORCE",
  "TRUST_LIST_WRONG_TYPE",
]);
const LISTED_CODES: ReadonlySet<string> = new Set(["ISSUER_NOT_LISTED", "LISTING_NOT_IN_FORCE"]);

function inForce(entry: TrustedIssuerEntry, at: number): boolean {
  const until = entry.validThrough;
  return entry.validFrom.getTime() <= at && (until === undefined || at <= until.getTime());
}

async function datasetOf(
  input: string | DatasetCore,
  contentType: string | undefined,
): Promise<DatasetCore> {
  return typeof input === "string"
    ? parseCredentialRdf(input, contentType ?? "text/turtle")
    : input;
}

function countStatusLinks(dataset: DatasetCore, credential: string): number {
  let count = 0;
  for (const quad of dataset.match(DataFactory.namedNode(credential) as unknown as Term)) {
    if (quad.predicate.value === VC_CREDENTIAL_STATUS) count += 1;
  }
  return count;
}

/** Gate 3: parse, shape-check and read the list. Returns the list or the errors. */
async function readList(
  input: TrustListInput,
  kind: CredentialKind,
  now: number,
): Promise<{ list?: TrustedIssuerList; errors: TrustListVerificationError[] }> {
  let dataset: DatasetCore;
  try {
    dataset = await datasetOf(input.document, input.contentType);
  } catch (error) {
    return {
      errors: [
        {
          code: "TRUST_LIST_INVALID",
          message: `trusted-issuer list did not parse: ${(error as Error).message}`,
        },
      ],
    };
  }
  try {
    const report = await validate(dataset, { expect: "trusted-issuer-list", focusNode: input.iri });
    if (!report.conforms) {
      return {
        errors: report.violations.map((violation) => ({
          code: "TRUST_LIST_INVALID" as const,
          message: `trusted-issuer list: ${violation.message}`,
        })),
      };
    }
    if (report.violations.length > 0) throw new Error("conforming report carried violations");
  } catch (error) {
    return {
      errors: [
        {
          code: "TRUST_LIST_INVALID",
          message: `trusted-issuer list could not be validated: ${(error as Error).message}`,
        },
      ],
    };
  }
  const errors: TrustListVerificationError[] = [];
  let list: TrustedIssuerList;
  try {
    list = new TrustedIssuerList(input.iri, dataset, DataFactory);
    if (now < list.datePublished.getTime() || now > list.validThrough.getTime()) {
      errors.push({
        code: "TRUST_LIST_OUT_OF_FORCE",
        message: `trusted-issuer list is in force from ${list.datePublished.toISOString()} to ${list.validThrough.toISOString()}`,
      });
    }
    if (list.about !== targetClassOf(kind)) {
      errors.push({
        code: "TRUST_LIST_WRONG_TYPE",
        message: `trusted-issuer list covers ${list.about}, not ${targetClassOf(kind)}`,
      });
    }
  } catch (error) {
    return {
      errors: [
        {
          code: "TRUST_LIST_INVALID",
          message: `trusted-issuer list could not be read: ${(error as Error).message}`,
        },
      ],
    };
  }
  return { list, errors };
}

/** Gate 5: no KYC check dated after the credential took effect. */
async function kycCheckDates(
  input: string | DatasetCore,
  options: VerifyWithTrustListOptions,
  credential: VerifiedCredentialInfo,
): Promise<TrustListVerificationError[]> {
  try {
    const dataset = await datasetOf(input, options.contentType);
    const attestation = new KycAttestationCredential(credential.id, dataset, DataFactory);
    const validFrom = attestation.validFrom.getTime();
    const late = attestation.credentialSubject.checks.filter(
      (check) => check.date.getTime() > validFrom,
    );
    return late.map((check) => ({
      code: "CHECK_AFTER_ISSUANCE" as const,
      message: `check "${check.description}" is dated ${check.date.toISOString().slice(0, 10)}, after the attestation took effect`,
    }));
  } catch (error) {
    return [
      {
        code: "CHECK_AFTER_ISSUANCE",
        message: `the attestation's checks could not be read: ${(error as Error).message}`,
      },
    ];
  }
}

/**
 * Verify a credential the way a relying party under a reliance scheme must: signature, status
 * (required) and membership of the issuer in the scheme's trusted-issuer list, failing closed
 * on every gate. See the module header for the gate list.
 */
export async function verifyWithTrustList(
  input: string | DatasetCore,
  options: VerifyWithTrustListOptions,
): Promise<TrustListVerificationResult> {
  const now = options.now.getTime();
  const errors: TrustListVerificationError[] = [];
  const { trustList, ...rest } = options;

  // Gate 1: every general gate (no allowlist here: membership is gate 4).
  const base = await verifyCredential(input, rest);
  errors.push(...base.errors);
  const credential = base.credential;

  // Gate 2: a status entry must be present.
  if (credential !== undefined) {
    try {
      const dataset = await datasetOf(input, options.contentType);
      if (countStatusLinks(dataset, credential.id) === 0) {
        errors.push({
          code: "STATUS_MISSING",
          message: "the credential carries no status entry, so its issuer could not withdraw it",
        });
      }
    } catch (error) {
      errors.push({
        code: "STATUS_MISSING",
        message: `the credential's status entry could not be read: ${(error as Error).message}`,
      });
    }
  }

  // Gate 3: the list.
  const { list, errors: listErrors } = await readList(trustList, options.expectShape, now);
  errors.push(...listErrors);

  // Gate 4: membership, in force at issuance and now.
  let entry: TrustListEntryInfo | undefined;
  if (list === undefined || credential === undefined) {
    errors.push({
      code: "ISSUER_NOT_LISTED",
      message: "issuer membership could not be established",
    });
  } else {
    const entries = list.entries.filter((candidate) => candidate.issuer === credential.issuer);
    const issuedAt =
      credential.validFrom === undefined ? Number.NaN : Date.parse(credential.validFrom);
    const admitting = entries.find(
      (candidate) =>
        !Number.isNaN(issuedAt) && inForce(candidate, issuedAt) && inForce(candidate, now),
    );
    if (entries.length === 0) {
      errors.push({
        code: "ISSUER_NOT_LISTED",
        message: `issuer ${credential.issuer} is not on ${list.name}`,
      });
    } else if (admitting === undefined) {
      errors.push({
        code: "LISTING_NOT_IN_FORCE",
        message: `issuer ${credential.issuer}'s listing was not in force both at issuance and now`,
      });
    } else {
      entry = { agreement: admitting.agreement, issuer: admitting.issuer, name: admitting.name };
    }
  }

  // Gate 5: KYC check dates.
  if (options.expectShape === "kyc-attestation-credential" && credential !== undefined) {
    errors.push(...(await kycCheckDates(input, options, credential)));
  }

  const codes = new Set(errors.map((error) => error.code));
  const none = (set: ReadonlySet<string>) => ![...codes].some((code) => set.has(code));
  const gates: TrustListGates = {
    content:
      credential !== undefined &&
      [...codes].every(
        (code) =>
          SIGNATURE_CODES.has(code) ||
          STATUS_CODES.has(code) ||
          LIST_CODES.has(code) ||
          LISTED_CODES.has(code),
      ),
    list: list !== undefined && none(LIST_CODES),
    listed: entry !== undefined && none(LISTED_CODES),
    signature: credential !== undefined && none(SIGNATURE_CODES),
    status: credential !== undefined && none(STATUS_CODES),
  };
  let listInfo: TrustListVerificationResult["list"];
  if (list !== undefined) {
    try {
      listInfo = { name: list.name, publisher: list.publisher.organizationName };
    } catch {
      listInfo = undefined;
    }
  }
  const verified = errors.length === 0;
  return {
    errors,
    gates,
    verified,
    ...(credential === undefined ? {} : { credential }),
    ...(verified && entry !== undefined ? { entry } : {}),
    ...(listInfo === undefined ? {} : { list: listInfo }),
  };
}
