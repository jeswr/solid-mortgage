// AUTHORED-BY Claude Opus 5.5
/**
 * What Juniper's portal reads from the pods, through the typed data-model wrappers.
 *
 * - The application form reads Alex's pod as Juniper under grant G4. The pod server decides;
 *   a refusal comes back as `{ kind: "refused" }` and the screen says so.
 * - Each credential is checked at source (signature against the issuer's key, status list,
 *   validity) as Juniper, and the form shows its issuer and the result.
 * - The disclosures live in `alex:/mortgage/juniper/`. G4 lets Juniper write that drawer but not
 *   read it, so the portal shows them as Alex reads them: the visitor here is Alex.
 * - Milestones come from Juniper's own loan file.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { LOAN } from "@mortgage/content/mortgage/facts";
import { checkAtSource } from "@mortgage/content/mortgage/issuers";
import { CREDENTIALS, type CredentialName } from "@mortgage/content/mortgage/journey";
import {
  PodRequestError,
  podUrl,
  readDataset,
  statusOf,
  type World,
} from "@mortgage/content/mortgage/world";
import {
  AgentProfile,
  AssetCredential,
  ClosingDisclosure,
  ContactDetails,
  CreditScoreCredential,
  EmploymentIncomeCredential,
  IdentityCredential,
  LoanEstimate,
  PurchaseAgreement,
  SubjectProperty,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import type { LoanFileState } from "./view.ts";

/** A postal address as one line. */
export function addressLine(address: {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
}): string {
  return `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`;
}

export const alexUrl = (world: World, path: string) => podUrl(world, "alex", path);
export const loanFileUrl = (world: World, path: string) =>
  podUrl(world, "lender", `loans/${LOAN.loanNumber}/${path}`);

/** The issuer app where Alex can put a missing credential into the pod. */
const ISSUER_APP = {
  assets: { app: "bank", path: "share" },
  "credit-summary": { app: "bureau", path: "summary" },
  "employment-income": { app: "payroll", path: "share" },
  identity: { app: "wallet", path: "documents" },
} as const;

export interface CredentialCheck {
  readonly name: CredentialName;
  readonly url: string;
  readonly issuer: string;
  readonly verified: boolean;
  readonly problems: readonly string[];
}

export interface Account {
  readonly provider: string;
  readonly last4: string;
  readonly balanceUsd: number;
}

export interface ApplicationData {
  readonly submitted: boolean;
  readonly name: string;
  readonly emails: readonly string[];
  readonly telephone?: string | undefined;
  readonly currentAddress: string;
  readonly birthDate: Date;
  readonly taxIdLast4: string;
  readonly employer: string;
  readonly jobTitle: string;
  readonly startDate: Date;
  readonly monthlyIncomeUsd: number;
  readonly accounts: readonly Account[];
  readonly monthlyDebtUsd: number;
  readonly propertyAddress: string;
  readonly yearBuilt: number;
  readonly purchasePriceUsd: number;
  readonly downPaymentUsd: number;
  readonly loanAmountUsd: number;
  readonly checks: Readonly<
    Record<"identity" | "employment-income" | "assets" | "credit-summary", CredentialCheck>
  >;
}

export interface MissingResource {
  readonly label: string;
  readonly url: string;
  readonly app?: { app: "bank" | "bureau" | "payroll" | "wallet"; path: string };
}

export type Loaded<T> =
  | { readonly kind: "ready"; readonly data: T }
  | {
      readonly kind: "refused";
      readonly url: string;
      readonly status: number;
      readonly method: string;
    }
  | { readonly kind: "missing"; readonly resources: readonly MissingResource[] };

/** Turn a pod refusal into a screen state; anything else is rethrown. */
export function refusalOf(error: unknown): Loaded<never> | undefined {
  if (error instanceof PodRequestError && (error.status === 401 || error.status === 403)) {
    return { kind: "refused", method: error.method, status: error.status, url: error.url };
  }
  return undefined;
}

class Missing extends Error {
  constructor(readonly resource: MissingResource) {
    super(`${resource.label} is not in the pod`);
  }
}

async function read(fetcher: typeof fetch, url: string, label: string): Promise<DatasetCore> {
  try {
    return await readDataset(fetcher, url);
  } catch (error) {
    if (error instanceof PodRequestError && error.status === 404) throw new Missing({ label, url });
    throw error;
  }
}

async function checked<T>(
  world: World,
  name: "identity" | "employment-income" | "assets" | "credit-summary",
  Wrapper: new (url: string, dataset: DatasetCore, factory: typeof DataFactory) => T,
  label: string,
): Promise<{ credential: T; check: CredentialCheck }> {
  const entry = CREDENTIALS[name];
  const url = alexUrl(world, entry.path);
  try {
    const source = await checkAtSource(world, "lender", url, entry.kind, [entry.issuer], "10:15");
    const dataset = await parseRdf(source.body, "text/turtle", { baseIRI: url });
    const credential = new Wrapper(url, dataset, DataFactory);
    return {
      check: {
        issuer: (credential as unknown as { issuer: string }).issuer,
        name,
        problems: source.result.errors.map((error) => error.code),
        url,
        verified: source.result.verified,
      },
      credential,
    };
  } catch (error) {
    if (error instanceof PodRequestError && error.status === 404) {
      throw new Missing({ app: ISSUER_APP[name], label, url });
    }
    throw error;
  }
}

/** Has Juniper filed the application in its own loan file? */
export async function isSubmitted(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs("lender"), loanFileUrl(world, "application"))) === 200;
}

/** Everything the application form shows, read from the pod as Juniper. */
export async function loadApplication(world: World): Promise<Loaded<ApplicationData>> {
  const lender = world.fetchAs("lender");
  try {
    const submitted = await isSubmitted(world);
    const profileUrl = alexUrl(world, "profile/card");
    const profile = new AgentProfile(
      profileUrl,
      await read(lender, profileUrl, "Your profile"),
      DataFactory,
    );
    // The identity credential is the first resource only G4 opens: read it first, so a missing
    // grant shows as one refusal rather than many.
    const identity = await checked(world, "identity", IdentityCredential, "Identity credential");
    const contactUrl = alexUrl(world, "profile/contact");
    const contact = new ContactDetails(
      contactUrl,
      await read(lender, contactUrl, "Contact details"),
      DataFactory,
    );
    const employment = await checked(
      world,
      "employment-income",
      EmploymentIncomeCredential,
      "Employment and income credential",
    );
    const assets = await checked(world, "assets", AssetCredential, "Account summary credential");
    const credit = await checked(
      world,
      "credit-summary",
      CreditScoreCredential,
      "Credit summary credential",
    );
    const propertyUrl = alexUrl(world, "property/subject-property");
    const property = new SubjectProperty(
      propertyUrl,
      await read(lender, propertyUrl, "Property details"),
      DataFactory,
    );
    const agreementUrl = alexUrl(world, "property/purchase-agreement");
    const agreement = new PurchaseAgreement(
      agreementUrl,
      await read(lender, agreementUrl, "Purchase agreement"),
      DataFactory,
    );
    const subject = employment.credential.credentialSubject;
    return {
      data: {
        accounts: [...assets.credential.credentialSubject.accounts].map((account) => ({
          balanceUsd: account.accountAmount.amountValue,
          last4: account.accountLast4,
          provider: account.provider.organizationName,
        })),
        birthDate: identity.credential.credentialSubject.birthDate,
        checks: {
          assets: assets.check,
          "credit-summary": credit.check,
          "employment-income": employment.check,
          identity: identity.check,
        },
        currentAddress: addressLine(contact.address),
        downPaymentUsd: LOAN.downPaymentUsd,
        emails: [...contact.emails],
        employer: subject.worksFor.organizationName,
        jobTitle: subject.jobTitle,
        // The amount Alex asks for: the price in the contract less the down payment.
        loanAmountUsd: agreement.purchasePriceUsd - LOAN.downPaymentUsd,
        monthlyDebtUsd: credit.credential.credentialSubject.totalMonthlyDebtUsd,
        monthlyIncomeUsd: subject.monthlyGrossIncomeUsd,
        name: profile.agent.name,
        propertyAddress: addressLine(property.address),
        purchasePriceUsd: agreement.purchasePriceUsd,
        startDate: subject.startDate,
        submitted,
        taxIdLast4: identity.credential.credentialSubject.taxIdLast4,
        telephone: contact.telephone,
        yearBuilt: property.yearBuilt,
      },
      kind: "ready",
    };
  } catch (error) {
    if (error instanceof Missing) return { kind: "missing", resources: [error.resource] };
    const refused = refusalOf(error);
    if (refused) return refused;
    throw error;
  }
}

// --- Disclosures --------------------------------------------------------------------------------

export interface DisclosureState {
  readonly submitted: boolean;
  readonly clearToClose: boolean;
  readonly estimate?: LoanEstimate | undefined;
  readonly closing?: ClosingDisclosure | undefined;
}

async function optional<T>(
  fetcher: typeof fetch,
  url: string,
  Wrapper: new (url: string, dataset: DatasetCore, factory: typeof DataFactory) => T,
): Promise<T | undefined> {
  try {
    return new Wrapper(url, await readDataset(fetcher, url), DataFactory);
  } catch (error) {
    if (error instanceof PodRequestError && error.status === 404) return undefined;
    throw error;
  }
}

/** The two disclosures as they sit in Alex's drawer, and where Juniper's file stands. */
export async function loadDisclosures(world: World): Promise<DisclosureState> {
  const lender = world.fetchAs("lender");
  const alex = world.fetchAs("alex");
  const submitted = await isSubmitted(world);
  const clearToClose = (await statusOf(lender, loanFileUrl(world, "decision"))) === 200;
  const estimate = submitted
    ? await optional(alex, alexUrl(world, "mortgage/juniper/loan-estimate"), LoanEstimate)
    : undefined;
  const closing = clearToClose
    ? await optional(alex, alexUrl(world, "mortgage/juniper/closing-disclosure"), ClosingDisclosure)
    : undefined;
  return { clearToClose, closing, estimate, submitted };
}

// --- Status ------------------------------------------------------------------------------------

/** Where the loan stands, from Juniper's own loan file and the disclosures in Alex's drawer. */
export async function loadLoanFile(world: World): Promise<LoanFileState> {
  const lender = world.fetchAs("lender");
  const has = async (path: string) => (await statusOf(lender, loanFileUrl(world, path))) === 200;
  const disclosures = await loadDisclosures(world);
  return {
    appraisalOrdered: await has("orders/appraisal"),
    applied: disclosures.submitted,
    clearToClose: disclosures.clearToClose,
    closed: await has("closing-record"),
    closingDisclosureReceived: disclosures.closing?.receivedDate !== undefined,
    estimateDelivered: disclosures.estimate !== undefined,
    insured: await has("pointers/evidence-of-insurance"),
    intentToProceed: disclosures.estimate?.intentToProceedDate !== undefined,
    titleOrdered: await has("orders/title"),
  };
}
