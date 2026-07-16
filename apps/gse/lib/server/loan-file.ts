/**
 * Read + verify the GRANTED loan file from the borrower's pod (scene 3/4).
 *
 * Access model (decision 0015 L4, sm-28): every read runs over the AUS app's
 * OWN service identity fetch — the agent the borrower's grant names. The POD
 * enforces WAC against that identity; there is no anonymous fallback, so a
 * missing or revoked grant fails the run closed instead of silently
 * depending on open pods.
 *
 * Trust model: pod RDF is untrusted input even under a grant. Every document
 * is SHACL-validated before a value is read (typed wrappers only — house RDF
 * discipline), and every credential must ADDITIONALLY pass vc-kit's
 * fail-closed `verifyCredential` (signature + trusted issuer + validity
 * window + Bitstring status + shape) and attest the AUTHENTICATED borrower
 * (decision 0015 L3). Verification verdicts are carried into the rules as
 * explicit evidence inputs — an unverifiable credential downgrades the run
 * to "refer", never crashes it and never silently passes.
 */
import {
  AppraisalCredential,
  AssetCredential,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  LoanApplication,
  type PersonaResourceKind,
  RESOURCE_POD_PATHS,
  validate,
} from "@mortgage/data-model";
import { isFresh, type VerifyCredentialOptions, verifyCredential } from "@mortgage/vc-kit";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import {
  assertAllowedPodBase,
  PodAccessError,
  type PodIoFetch,
  readPodResource,
} from "../../../lender-boa/lib/server/pod";
import type { AusEvidence, AusLoanFile, EvidenceKind } from "../aus/rules";
import type { AusConfig } from "./config";

/**
 * Verification seams `verifyCredential` consumes — injected in tests with
 * in-process issuer fixtures. The verifier itself (signature, issuer, window,
 * status and shape gates) always runs for real.
 */
export type VerifySeams = Pick<
  VerifyCredentialOptions,
  "resolveKey" | "isControlledBy" | "webIdFetch" | "statusFetch" | "trustedStatusIssuers"
>;

export interface LoanFileOptions {
  /** The service identity's authenticated pod fetch (never anonymous). */
  readonly podFetch: PodIoFetch;
  /** The evaluation instant (explicit — freshness is never wall-clock-implicit). */
  readonly now: Date;
  readonly seams?: VerifySeams;
}

/** The granted loan file, parsed and evidence-scored. */
export interface GrantedLoanFile {
  readonly file: AusLoanFile;
  readonly applicationIri: string;
  readonly decisionIri: string;
}

function podIri(base: string, kind: PersonaResourceKind): string {
  return `${base}${RESOURCE_POD_PATHS[kind].slice(1)}`;
}

async function readRequired(
  base: string,
  kind: PersonaResourceKind,
  podFetch: PodIoFetch,
): Promise<{ dataset: DatasetCore; iri: string }> {
  const iri = podIri(base, kind);
  const resource = await readPodResource(iri, base, podFetch);
  if (resource === undefined) {
    throw new PodAccessError(404, `the granted loan file has no ${kind} document`);
  }
  return { dataset: resource.dataset, iri };
}

/** SHACL-gate a pod document before any value is trusted (untrusted input). */
async function assertShape(
  dataset: DatasetCore,
  kind: PersonaResourceKind,
  focusNode: string,
): Promise<void> {
  const report = await validate(dataset, { expect: kind, focusNode });
  if (!report.conforms) {
    const first = report.violations[0]?.message ?? "unknown violation";
    throw new PodAccessError(502, `pod ${kind} document violates its shape: ${first}`);
  }
}

interface VerifiedCredentialDocument {
  readonly dataset: DatasetCore;
  readonly iri: string;
  readonly evidence: AusEvidence;
}

async function readCredential(
  base: string,
  kind: EvidenceKind,
  shape: PersonaResourceKind,
  webid: string,
  config: AusConfig,
  options: LoanFileOptions,
): Promise<VerifiedCredentialDocument> {
  const { dataset, iri } = await readRequired(base, shape, options.podFetch);
  // Structural gate first: a document that does not even satisfy its shape is
  // hostile input, not scoreable evidence.
  await assertShape(dataset, shape, iri);

  // Dev/e2e loopback mode swaps the SSRF-guarded default fetch only; the
  // fail-closed verification semantics are identical (lender-boa precedent).
  const seams: VerifySeams =
    options.seams ??
    (config.allowInsecureLoopback
      ? { statusFetch: fetch.bind(globalThis), webIdFetch: fetch.bind(globalThis) }
      : {});

  // The authoritative gate: signature + trusted issuer + window + status + shape.
  const verification = await verifyCredential(dataset, {
    expectShape: shape,
    now: options.now,
    trustedIssuers: config.trustedCredentialIssuers,
    ...seams,
  });
  const subjectBound =
    verification.credential?.subject !== undefined && verification.credential.subject === webid;
  const window = {
    validFrom: verification.credential?.validFrom,
    validUntil: verification.credential?.validUntil,
  };
  return {
    dataset,
    evidence: {
      fresh: isFresh(window, options.now),
      kind,
      subjectBound,
      verified: verification.verified,
      verifyErrors: [
        ...verification.errors.map((error) => error.code),
        ...(subjectBound ? [] : ["SUBJECT_MISMATCH"]),
      ],
    },
    iri,
  };
}

/**
 * Read the granted loan file. `pod` and `webid` are DERIVED from the
 * authenticated caller by the route boundary (decision 0015) — never from
 * request parameters.
 */
export async function readGrantedLoanFile(
  pod: string,
  webid: string,
  config: AusConfig,
  options: LoanFileOptions,
): Promise<GrantedLoanFile> {
  if (config.trustedCredentialIssuers.length === 0) {
    throw new PodAccessError(
      503,
      "MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS is unset — the AUS rail fails closed",
    );
  }
  const base = assertAllowedPodBase(pod, config);

  // The application under evaluation.
  const applicationDoc = await readRequired(base, "loan-application", options.podFetch);
  await assertShape(applicationDoc.dataset, "loan-application", applicationDoc.iri);
  const application = new LoanApplication(
    DataFactory.namedNode(applicationDoc.iri),
    applicationDoc.dataset,
    DataFactory,
  );
  // Decision-0015 L3 on the application itself: it must have been submitted
  // by the authenticated borrower, or this run would underwrite someone else.
  if (application.submittedByIri !== webid) {
    throw new PodAccessError(
      403,
      "the pod loan application was submitted by a different subject than the authenticated borrower",
    );
  }

  const [employment, assets, credit, appraisal] = await Promise.all([
    readCredential(
      base,
      "employment-income",
      "employment-income-credential",
      webid,
      config,
      options,
    ),
    readCredential(base, "assets", "asset-credential", webid, config, options),
    readCredential(base, "credit-score", "credit-score-credential", webid, config, options),
    readCredential(base, "appraisal", "appraisal-credential", webid, config, options),
  ]);

  // Values are read through the typed wrappers AFTER the shape gate; a
  // malformed value is a 502, never a crash or a silent default.
  let file: AusLoanFile;
  try {
    const employmentSubject = new EmploymentIncomeCredential(
      DataFactory.namedNode(employment.iri),
      employment.dataset,
      DataFactory,
    ).credentialSubject;
    const assetAccounts = new AssetCredential(
      DataFactory.namedNode(assets.iri),
      assets.dataset,
      DataFactory,
    ).credentialSubject.accounts;
    const creditSubject = new CreditScoreCredential(
      DataFactory.namedNode(credit.iri),
      credit.dataset,
      DataFactory,
    ).credentialSubject;
    const appraisedValue = new AppraisalCredential(
      DataFactory.namedNode(appraisal.iri),
      appraisal.dataset,
      DataFactory,
    ).credentialSubject.subjectProperty.appraisedValue;
    if (appraisedValue === undefined) {
      throw new PodAccessError(502, "the appraisal credential carries no appraised value");
    }
    file = {
      appraisedValueUsd: appraisedValue.amountValue,
      creditScoreValue: creditSubject.creditScoreValue,
      evidence: [employment.evidence, assets.evidence, credit.evidence, appraisal.evidence],
      liquidAssetsUsd: [...assetAccounts].reduce(
        (total, account) => total + account.accountAmount.amountValue,
        0,
      ),
      loanTermMonths: application.loanTermMonths,
      monthlyGrossIncomeUsd: employmentSubject.monthlyGrossIncomeUsd,
      requestedAmountUsd: application.requestedAmount.amountValue,
      totalMonthlyDebtUsd: creditSubject.totalMonthlyDebtUsd,
    };
  } catch (error) {
    if (error instanceof PodAccessError) throw error;
    throw new PodAccessError(
      502,
      `the granted loan file could not be read through its typed wrappers: ${(error as Error).message}`,
    );
  }

  return {
    applicationIri: applicationDoc.iri,
    decisionIri: podIri(base, "underwriting-decision"),
    file,
  };
}
