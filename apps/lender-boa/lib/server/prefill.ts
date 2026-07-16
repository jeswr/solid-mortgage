/**
 * Scene-3 URLA-subset prefill FROM the borrower's granted pod data. All reads
 * go through `@jeswr/fetch-rdf` + the data-model typed wrappers (house RDF
 * discipline — no dataset walking, no hand-parsing), and every fetched
 * document is SHACL-revalidated before a value is trusted: pod RDF is
 * untrusted input even under a grant.
 */

import type { MortgageResourceKind } from "@mortgage/data-model";
import {
  AssetCredential,
  BorrowerProfile,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  PERSONA_VALUES,
  RESOURCE_POD_PATHS,
  validate,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import type { LenderConfig } from "./config";
import { assertAllowedPodBase, PodAccessError, readPodResource } from "./pod";

/** The URLA (Form 1003) subset the application form prefills. */
export interface UrlaPrefill {
  readonly simulated: true;
  readonly source: "pod" | "demo";
  readonly borrower: {
    readonly webId: string;
    readonly name: string;
    readonly birthDate: string;
    readonly email: string;
    readonly telephone: string;
    readonly maritalStatus: string;
    readonly address: string;
  };
  readonly employment: {
    readonly employerName: string;
    readonly jobTitle: string;
    readonly startDate: string;
    readonly monthlyGrossIncomeUsd: number;
  };
  readonly assets: {
    readonly accounts: readonly {
      readonly providerName: string;
      readonly amountUsd: number;
      readonly accountLast4: string;
    }[];
  };
  readonly credit: {
    readonly creditScoreValue: number;
    readonly totalMonthlyDebtUsd: number;
  };
}

function labelOfIri(iri: string): string {
  const tail = iri.split(/[#/]/).pop() ?? iri;
  const dashed = tail.split("-").pop() ?? tail;
  return dashed;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function validatedDataset(
  dataset: DatasetCore,
  kind: MortgageResourceKind,
  focusNode: string,
): Promise<void> {
  const report = await validate(dataset, { expect: kind, focusNode });
  if (!report.conforms) {
    const first = report.violations[0]?.message ?? "unknown violation";
    throw new PodAccessError(502, `pod ${kind} document violates its shape: ${first}`);
  }
}

async function readValidated(
  base: string,
  kind: Exclude<MortgageResourceKind, "zk-operand-anchor">,
  focusNode?: string,
): Promise<{ dataset: DatasetCore; iri: string }> {
  const iri = `${base}${RESOURCE_POD_PATHS[kind].slice(1)}`;
  const resource = await readPodResource(iri, base);
  if (resource === undefined) {
    throw new PodAccessError(404, `pod has no ${kind} document at ${RESOURCE_POD_PATHS[kind]}`);
  }
  await validatedDataset(resource.dataset, kind, focusNode ?? iri);
  return { dataset: resource.dataset, iri };
}

/**
 * Read the URLA prefill from the granted pod. `webId` names the borrower (the
 * borrower-profile document's root node — supplied by the grant/session, not
 * guessed from the graph).
 */
export async function prefillFromPod(
  pod: string,
  webId: string,
  config: LenderConfig,
): Promise<UrlaPrefill> {
  const base = assertAllowedPodBase(pod, config);

  const profileDoc = await readValidated(base, "borrower-profile", webId);
  const profile = new BorrowerProfile(
    DataFactory.namedNode(webId),
    profileDoc.dataset,
    DataFactory,
  );

  const employmentDoc = await readValidated(base, "employment-income-credential");
  const employment = new EmploymentIncomeCredential(
    DataFactory.namedNode(employmentDoc.iri),
    employmentDoc.dataset,
    DataFactory,
  );

  const assetDoc = await readValidated(base, "asset-credential");
  const assets = new AssetCredential(
    DataFactory.namedNode(assetDoc.iri),
    assetDoc.dataset,
    DataFactory,
  );

  const creditDoc = await readValidated(base, "credit-score-credential");
  const credit = new CreditScoreCredential(
    DataFactory.namedNode(creditDoc.iri),
    creditDoc.dataset,
    DataFactory,
  );

  const address = profile.address;
  const employmentSubject = employment.credentialSubject;
  const creditSubject = credit.credentialSubject;
  return {
    simulated: true,
    source: "pod",
    borrower: {
      webId,
      name: profile.personName,
      birthDate: isoDate(profile.birthDate),
      email: [...profile.emails][0] ?? "",
      telephone: profile.telephone ?? "",
      maritalStatus: labelOfIri(profile.maritalStatus),
      address: `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`,
    },
    employment: {
      employerName: employmentSubject.worksFor.organizationName,
      jobTitle: employmentSubject.jobTitle,
      startDate: isoDate(employmentSubject.startDate),
      monthlyGrossIncomeUsd: employmentSubject.monthlyGrossIncomeUsd,
    },
    assets: {
      accounts: [...assets.credentialSubject.accounts].map((account) => ({
        providerName: account.provider.organizationName,
        amountUsd: account.accountAmount.amountValue,
        accountLast4: account.accountLast4,
      })),
    },
    credit: {
      creditScoreValue: creditSubject.creditScoreValue,
      totalMonthlyDebtUsd: creditSubject.totalMonthlyDebtUsd,
    },
  };
}

/** The demo-persona prefill used when no pod is connected (Mode-1 fallback). */
export function demoPrefill(): UrlaPrefill {
  const persona = PERSONA_VALUES[0];
  if (persona === undefined) throw new Error("no demo persona available");
  const home = persona.homeAddress;
  return {
    simulated: true,
    source: "demo",
    borrower: {
      webId: "https://alex.pod.example/profile/card#me",
      name: persona.name,
      birthDate: persona.birthDate,
      email: persona.email,
      telephone: persona.telephone,
      maritalStatus: labelOfIri(persona.maritalStatus),
      address: `${home.streetAddress}, ${home.addressLocality}, ${home.addressRegion} ${home.postalCode}`,
    },
    employment: {
      employerName: persona.employerName,
      jobTitle: persona.jobTitle,
      startDate: persona.employmentStartDate,
      monthlyGrossIncomeUsd: persona.monthlyGrossIncomeUsd,
    },
    assets: {
      accounts: [
        {
          providerName: persona.bankName,
          amountUsd: persona.bankBalanceUsd,
          accountLast4: "0000",
        },
      ],
    },
    credit: {
      creditScoreValue: persona.creditScoreValue,
      totalMonthlyDebtUsd: persona.totalMonthlyDebtUsd,
    },
  };
}
