/**
 * Client-side pod reads for the credential wallet (RDF discipline: fetch +
 * parse via `@jeswr/fetch-rdf`, typed accessors via the data-model wrappers,
 * never a bare quad walk). VERIFY-ON-VIEW runs the full vc-kit fail-closed
 * gate chain — signature, issuer control, validity window, Bitstring status,
 * SHACL shape — with the issuer WebID documents and status lists dereferenced
 * FROM THE POD ITSELF (the Mode-1 seed hosts them on the pod origin, so the
 * whole chain stays inside the visitor's browser).
 */
// FIRST import (side effect): base64url support for the Buffer polyfill —
// verify-on-view decodes Bitstring status lists in the browser (see patch).
import "./buffer-base64url-patch";
import { fetchRdf, RdfFetchError } from "@jeswr/fetch-rdf";
import {
  AssetCredential,
  BorrowerProfile,
  ClosingRecord,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  type MortgageResourceKind,
  ZkOperandAnchor,
} from "@mortgage/data-model";
import type { CredentialStatus } from "@mortgage/ui";
import { type VcKitVerificationError, verifyCredential } from "@mortgage/vc-kit";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { ANCHOR_POD_PATHS, CREDENTIAL_POD_PATHS, podIssuerIris, WALLET_POD_BASE } from "./seed";

export interface WalletCredentialView {
  readonly id: keyof typeof CREDENTIAL_POD_PATHS;
  readonly title: string;
  readonly kind: MortgageResourceKind;
  readonly iri: string;
  /** Role-first issuer label (the seed's pod-hosted demo issuer). */
  readonly issuerLabel: string;
  readonly issuer: string;
  readonly validFrom?: Date;
  readonly validUntil?: Date;
  /** The CredentialCard status dot, derived from verify-on-view. */
  readonly status: CredentialStatus;
  readonly verified: boolean;
  readonly errors: readonly VcKitVerificationError[];
  /** Non-gate diagnostics (e.g. a missing document). */
  readonly detail?: string;
  /** Human claim rows for the card body (never the ZK-hidden raw values). */
  readonly claims: readonly { label: string; value: string }[];
}

const CREDENTIAL_DEFINITIONS: Record<
  keyof typeof CREDENTIAL_POD_PATHS,
  { title: string; kind: MortgageResourceKind; issuerLabel: string }
> = {
  income: {
    title: "Employment and income",
    kind: "employment-income-credential",
    issuerLabel: "employment and income verifier",
  },
  assets: {
    title: "Assets",
    kind: "asset-credential",
    issuerLabel: "depository institution",
  },
  credit: {
    title: "Credit score",
    kind: "credit-score-credential",
    issuerLabel: "credit bureau",
  },
  appraisal: {
    title: "Appraisal value",
    kind: "appraisal-credential",
    issuerLabel: "appraisal management company",
  },
  title: {
    title: "Title clear",
    kind: "title-clear-credential",
    issuerLabel: "title company",
  },
};

function iriOf(path: string): string {
  return `${WALLET_POD_BASE.slice(0, -1)}${path}`;
}

async function readDataset(iri: string, podFetch: typeof fetch): Promise<DatasetCore | undefined> {
  try {
    const { dataset } = await fetchRdf(iri, { fetch: podFetch });
    return dataset;
  } catch (error) {
    if (error instanceof RdfFetchError && error.status === 404) return undefined;
    throw error;
  }
}

/** Non-secret claim rows per credential kind (display only). */
function claimRows(
  id: keyof typeof CREDENTIAL_POD_PATHS,
  iri: string,
  dataset: DatasetCore,
): { label: string; value: string }[] {
  try {
    if (id === "assets") {
      const credential = new AssetCredential(iri, dataset, DataFactory);
      const accounts = [...credential.credentialSubject.accounts];
      return accounts.map((account) => ({
        label: "Deposit account",
        value: `…${account.accountLast4}`,
      }));
    }
  } catch {
    // Claim rows are cosmetic — verification is what gates the status dot.
  }
  return [];
}

export interface ListCredentialsOptions {
  readonly podFetch: typeof fetch;
  readonly now?: Date;
}

/** Read + verify the five wallet credentials (verify-on-view). */
export async function listWalletCredentials(
  options: ListCredentialsOptions,
): Promise<WalletCredentialView[]> {
  const now = options.now ?? new Date();
  const ids = Object.keys(CREDENTIAL_DEFINITIONS) as (keyof typeof CREDENTIAL_POD_PATHS)[];
  return Promise.all(
    ids.map(async (id) => {
      const definition = CREDENTIAL_DEFINITIONS[id];
      const iri = iriOf(CREDENTIAL_POD_PATHS[id]);
      const dataset = await readDataset(iri, options.podFetch);
      if (dataset === undefined) {
        return {
          id,
          title: definition.title,
          kind: definition.kind,
          iri,
          issuerLabel: definition.issuerLabel,
          issuer: "",
          status: "pending" as const,
          verified: false,
          errors: [],
          detail: "credential not found in the pod",
          claims: [],
        };
      }
      const result = await verifyCredential(dataset, {
        expectShape: definition.kind,
        now,
        trustedIssuers: podIssuerIris(),
        webIdFetch: options.podFetch,
        statusFetch: options.podFetch,
      });
      const validFrom = result.credential?.validFrom;
      const validUntil = result.credential?.validUntil;
      const expired = validUntil !== undefined && new Date(validUntil).getTime() < now.getTime();
      const revoked = result.errors.some((error) => error.code === "STATUS_REVOKED");
      const status: CredentialStatus = result.verified
        ? "valid"
        : revoked
          ? "revoked"
          : expired
            ? "expired"
            : "pending";
      return {
        id,
        title: definition.title,
        kind: definition.kind,
        iri,
        issuerLabel: definition.issuerLabel,
        issuer: result.credential?.issuer ?? "",
        ...(validFrom !== undefined ? { validFrom: new Date(validFrom) } : {}),
        ...(validUntil !== undefined ? { validUntil: new Date(validUntil) } : {}),
        status,
        verified: result.verified,
        errors: result.errors,
        claims: claimRows(id, iri, dataset),
      };
    }),
  );
}

/** The borrower profile document, for the vault home page. */
export interface BorrowerProfileView {
  readonly name: string;
  readonly emails: readonly string[];
  readonly telephone?: string;
  readonly addressLines: readonly string[];
}

export async function readBorrowerProfile(
  podFetch: typeof fetch,
  webId: string,
): Promise<BorrowerProfileView | undefined> {
  const dataset = await readDataset(iriOf("/mortgage/profile"), podFetch);
  if (dataset === undefined) return undefined;
  const profile = new BorrowerProfile(webId, dataset, DataFactory);
  const address = profile.address;
  return {
    name: profile.personName,
    emails: [...profile.emails],
    ...(profile.telephone !== undefined ? { telephone: profile.telephone } : {}),
    addressLines: [
      address.streetAddress,
      `${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`,
    ],
  };
}

/** The closing record document (a pod record, not a VC — labelled as such). */
export interface ClosingRecordView {
  readonly iri: string;
  readonly eNoteReference: string;
  readonly closingDate: Date;
  readonly servicerName: string;
}

export async function readClosingRecord(
  podFetch: typeof fetch,
): Promise<ClosingRecordView | undefined> {
  const iri = iriOf("/mortgage/closing");
  const dataset = await readDataset(iri, podFetch);
  if (dataset === undefined) return undefined;
  const record = new ClosingRecord(iri, dataset, DataFactory);
  return {
    iri,
    eNoteReference: record.eNoteReference,
    closingDate: record.closingDate,
    servicerName: record.servicer.organizationName,
  };
}

/** One pod-held operand anchor, ready for the VP-POST rail (decision 0012). */
export interface AnchorMaterial {
  /** The anchored ZK field IRI. */
  readonly field: string;
  /** The issuer-signed deterministic term encoding of the hidden value. */
  readonly operandEnc: string;
  /** The anchor VC's ORIGINAL Turtle body — POSTed verbatim to the verifier. */
  readonly turtle: string;
}

async function readAnchor(path: string, podFetch: typeof fetch): Promise<AnchorMaterial> {
  const iri = iriOf(path);
  const [dataset, response] = await Promise.all([readDataset(iri, podFetch), podFetch(iri)]);
  if (dataset === undefined || !response.ok) {
    throw new Error(`operand anchor is missing from the pod: ${iri}`);
  }
  const anchor = new ZkOperandAnchor(iri, dataset, DataFactory);
  const subject = anchor.credentialSubject;
  return { field: subject.fieldIri, operandEnc: subject.operandEnc, turtle: await response.text() };
}

/** Both scene-2 anchors (income + score), read from their borrower-only paths. */
export async function readProofMaterial(podFetch: typeof fetch): Promise<{
  readonly anchors: readonly AnchorMaterial[];
  readonly hiddenValues: ReadonlyMap<string, number>;
}> {
  const [incomeAnchor, scoreAnchor, incomeDataset, creditDataset] = await Promise.all([
    readAnchor(ANCHOR_POD_PATHS.income, podFetch),
    readAnchor(ANCHOR_POD_PATHS.score, podFetch),
    readDataset(iriOf(CREDENTIAL_POD_PATHS.income), podFetch),
    readDataset(iriOf(CREDENTIAL_POD_PATHS.credit), podFetch),
  ]);
  if (incomeDataset === undefined || creditDataset === undefined) {
    throw new Error("the income/credit credentials are missing from the pod");
  }
  // The HIDDEN values come from the borrower's own credentials (typed
  // accessors), keyed by field IRI. They never leave this device: proveTierA
  // consumes them as the private witness only.
  const income = new EmploymentIncomeCredential(
    iriOf(CREDENTIAL_POD_PATHS.income),
    incomeDataset,
    DataFactory,
  );
  const credit = new CreditScoreCredential(
    iriOf(CREDENTIAL_POD_PATHS.credit),
    creditDataset,
    DataFactory,
  );
  const hiddenValues = new Map<string, number>();
  hiddenValues.set(incomeAnchor.field, income.credentialSubject.monthlyGrossIncomeUsd);
  hiddenValues.set(scoreAnchor.field, credit.credentialSubject.creditScoreValue);
  return { anchors: [incomeAnchor, scoreAnchor], hiddenValues };
}
