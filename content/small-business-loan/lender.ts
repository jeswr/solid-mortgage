// AUTHORED-BY Claude Opus 5.5
/**
 * What Brackenridge Bank does with Northwind's data (flows.md section 6, steps 4, 5, 7 and 8).
 * Every read goes to Northwind's pod under Northwind's grant; every credential is checked at
 * source (signature against the issuer's own WebID profile, shape, validity window on the demo
 * calendar, the issuer's status list). The cash flow record is not a credential: Brackenridge
 * checks who wrote it (Alder Bank, as the record and the pod's provenance both say) and measures
 * it.
 *
 * - Step 4: the assessment, kept in Brackenridge's own credit file.
 * - Step 5: the decision, the loan terms with their covenants, and the notice of action taken
 *   (Regulation B, 12 CFR 1002.9) written into Northwind's `loans/brackenridge/`.
 * - Step 7: the quarterly covenant test, a read under S3, kept in Brackenridge's file.
 * - Step 8: the read after S3 is withdrawn, which the pod refuses.
 */

import { parseRdf } from "@jeswr/fetch-rdf";
import {
  BeneficialOwnershipCredential,
  BusinessLoanTerms,
  buildBusinessLoanTerms,
  buildCashFlowAssessment,
  buildDeliveredDocument,
  buildUnderwritingDecision,
  CashFlowAssessment,
  DeliveredDocument,
  MORT,
  type MortgageResourceKind,
  OrganisationalIdentityCredential,
  TaxComplianceCredential,
  UnderwritingDecision,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { ENTITY, THRESHOLD_BPS } from "../business-kyb/facts.js";
import { checkAtSource, type SourceCheck } from "../mortgage/issuers.js";
import {
  at,
  PodRequestError,
  podUrl,
  put,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import {
  cashFlowUrl,
  isEmptyRecord,
  type Measures,
  measure,
  readCashFlow,
  testCovenants,
} from "./cash-flow.js";
import { COVENANTS, HOLDER, LENDER_PATHS, LOAN, LOAN_PAYMENT, PATHS, usd } from "./facts.js";

const LENDER = "business-lender" as const;

export const lenderUrl = (world: Pick<World, "podOrigin">, path = "") =>
  podUrl(world, LENDER, path);
export const holderUrl = (world: Pick<World, "podOrigin">, path = "") =>
  podUrl(world, HOLDER, path);

/** The three credentials Brackenridge checks, the issuer it trusts for each, and the kind. */
export const CHECKED: readonly {
  readonly path: string;
  readonly label: string;
  readonly kind: MortgageResourceKind;
  readonly issuer: PodOwner;
}[] = Object.freeze([
  {
    issuer: "registry",
    kind: "organisational-identity-credential",
    label: "Identity",
    path: PATHS.identity,
  },
  {
    issuer: "registry",
    kind: "beneficial-ownership-credential",
    label: "Ownership",
    path: PATHS.ownership,
  },
  { issuer: "state", kind: "tax-compliance-credential", label: "Tax compliance", path: PATHS.tax },
]);

export interface CheckedSource {
  readonly path: string;
  readonly label: string;
  readonly url: string;
  readonly verified: boolean;
  readonly errors: readonly string[];
  readonly check: SourceCheck;
}

export interface Assessment {
  readonly checks: readonly CheckedSource[];
  readonly legalName: string;
  readonly lei: string;
  readonly beneficialOwners: readonly string[];
  readonly turnoverBand?: string;
  readonly filingsCurrentThrough?: Date;
  readonly cashFlow: Measures;
  /** Who wrote the cash flow record, as the record says. */
  readonly cashFlowWriter: string;
  readonly covenants: ReturnType<typeof testCovenants>;
  readonly approve: boolean;
  /** Brackenridge's own record. */
  readonly record: string;
}

const parse = (check: SourceCheck) => parseRdf(check.body, "text/turtle", { baseIRI: check.url });

async function ensureContainers(world: World, paths: readonly string[]): Promise<void> {
  const lender = world.fetchAs(LENDER);
  for (const path of paths) {
    const url = lenderUrl(world, path);
    if ((await statusOf(lender, url)) !== 200) await put(lender, url, "", "text/turtle");
  }
}

/**
 * Step 4. Read the four resources under S2: each credential checked at source, the cash flow
 * record read, its writer checked and twelve months measured with the new loan's payment added.
 * The assessment goes into Brackenridge's own credit file.
 */
export async function assess(world: World, time = "11:00"): Promise<Assessment> {
  const checks: CheckedSource[] = [];
  for (const item of CHECKED) {
    const url = holderUrl(world, item.path);
    const check = await checkAtSource(world, LENDER, url, item.kind, [item.issuer], time);
    checks.push({
      check,
      errors: check.result.errors.map((error) => `${error.code}: ${error.message}`),
      label: item.label,
      path: item.path,
      url,
      verified: check.result.verified,
    });
  }
  const byPath = (path: string) => {
    const found = checks.find((check) => check.path === path);
    if (found === undefined) throw new Error(`${path} was not checked`);
    return found.check;
  };
  const identity = new OrganisationalIdentityCredential(
    byPath(PATHS.identity).url,
    await parse(byPath(PATHS.identity)),
    DataFactory,
  ).credentialSubject;
  const owners = new BeneficialOwnershipCredential(
    byPath(PATHS.ownership).url,
    await parse(byPath(PATHS.ownership)),
    DataFactory,
  ).credentialSubject.ownerships;
  const tax = new TaxComplianceCredential(
    byPath(PATHS.tax).url,
    await parse(byPath(PATHS.tax)),
    DataFactory,
  ).credentialSubject;
  const record = await readCashFlow(world, LENDER);
  if (isEmptyRecord(record)) throw new Error("Northwind's cash flow record is still empty");
  const cashFlowWriter = record.bank;
  const measures = measure(record, 12, LOAN_PAYMENT);
  const covenants = testCovenants(measures);
  const allVerified = checks.every((check) => check.verified);
  const fromBank =
    cashFlowWriter === webid(world, "bank") && record.holder === webid(world, HOLDER);
  const approve =
    allVerified && fromBank && tax.status === "compliant" && covenants.every((c) => c.met);

  await ensureContainers(world, [LENDER_PATHS.credit, LENDER_PATHS.file]);
  const saved = await putResource(
    world.fetchAs(LENDER),
    buildCashFlowAssessment({
      averageBalanceUsd: measures.averageBalanceUsd,
      borrower: webid(world, HOLDER),
      checkedAt: at(world, time),
      covenantsMet: covenants.every((c) => c.met),
      debtServiceCoverageRatio: measures.dscr,
      iri: lenderUrl(world, LENDER_PATHS.assessment),
      lender: webid(world, LENDER),
      name: `Origination assessment: ${ENTITY.legalName}`,
      sources: [...checks.map((check) => check.url), cashFlowUrl(world)],
    }),
  );
  world.note({
    kind: "verified",
    org: LENDER,
    refs: [saved, ...checks.map((check) => check.url)],
    text: allVerified
      ? `Three signatures checked at source (register twice, Department of Revenue once). Twelve months of cash flow from Alder Bank: coverage ${measures.dscr.toFixed(2)}x with the new payment, average balance ${usd(measures.averageBalanceUsd)}.`
      : "A credential did not pass its check at source; the application cannot proceed.",
  });
  return {
    approve,
    beneficialOwners: owners
      .filter((ownership) => ownership.bps >= THRESHOLD_BPS)
      .map((ownership) => ownership.owner.personName),
    cashFlow: measures,
    cashFlowWriter,
    checks,
    covenants,
    legalName: identity.legalName,
    lei: identity.lei.text,
    record: saved,
    ...(tax.turnoverBand === undefined ? {} : { turnoverBand: tax.turnoverBand }),
    filingsCurrentThrough: tax.filingsCurrentThrough,
  };
}

/** Brackenridge's own origination assessment, if it has made one. */
export async function readAssessment(world: World): Promise<CashFlowAssessment | undefined> {
  return readOwn(world, LENDER_PATHS.assessment);
}

async function readOwn(world: World, path: string): Promise<CashFlowAssessment | undefined> {
  const fetcher = world.fetchAs(LENDER);
  const url = lenderUrl(world, path);
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  return new CashFlowAssessment(url, await readDataset(fetcher, url), DataFactory);
}

export interface Decision {
  readonly decision: string;
  readonly terms: string;
  readonly notice: string;
}

/**
 * Step 5. Approve with conditions (the covenants), and write three documents into Northwind's
 * `loans/brackenridge/` under S2: the decision, the loan terms, and the notice of action taken.
 */
export async function decide(world: World, time = "15:00"): Promise<Decision> {
  const assessment = await readAssessment(world);
  if (assessment === undefined) throw new Error("Brackenridge decides only after its assessment");
  const lender = world.fetchAs(LENDER);
  const issued = at(world, time);
  const decision = await putResource(
    lender,
    buildUnderwritingDecision({
      approvedAmountUsd: LOAN.principalUsd,
      conditions: COVENANTS.map((covenant) => `Covenant, tested quarterly: ${covenant.name}`),
      creator: webid(world, LENDER),
      decisionStatus: MORT.DecisionStatus_ApprovedWithConditions,
      evaluates: assessment.value,
      iri: holderUrl(world, PATHS.decision),
      issued,
    }),
  );
  const terms = await putResource(
    lender,
    buildBusinessLoanTerms({
      borrower: webid(world, HOLDER),
      covenants: COVENANTS,
      interestRate: LOAN.interestRate,
      iri: holderUrl(world, PATHS.terms),
      issued,
      lender: webid(world, LENDER),
      loanNumber: LOAN.loanNumber,
      monthlyPaymentUsd: LOAN_PAYMENT,
      name: `${LOAN.name}: ${LOAN.purpose}`,
      principalUsd: LOAN.principalUsd,
      termMonths: LOAN.termMonths,
    }),
  );
  const notice = await putResource(
    lender,
    buildDeliveredDocument({
      about: decision,
      creator: webid(world, LENDER),
      description: `Brackenridge Bank approved your application for a ${usd(LOAN.principalUsd)} ${LOAN.name.toLowerCase()} on the terms delivered with this notice, subject to two financial covenants tested quarterly. Reasons: identity, ownership and tax compliance were verified at source, and twelve months of cash flow show debt service coverage of ${assessment.debtServiceCoverageRatio.toFixed(2)}x with the new payment. Under the Equal Credit Opportunity Act, creditors may not discriminate against applicants on a prohibited basis.`,
      identifier: "Notice of action taken (12 CFR 1002.9)",
      iri: holderUrl(world, PATHS.notice),
      issued,
      loanNumber: LOAN.loanNumber,
      name: "Notice of action taken: approved",
    }),
  );
  world.note({
    kind: "org-to-org",
    org: LENDER,
    refs: [decision, terms, notice],
    text: "Brackenridge wrote its decision, the loan terms and the notice of action taken into Northwind's pod. Northwind keeps them.",
  });
  return { decision, notice, terms };
}

export interface Delivered {
  readonly decision?: UnderwritingDecision;
  readonly terms?: BusinessLoanTerms;
  readonly notice?: DeliveredDocument;
}

/** What Brackenridge delivered into Northwind's pod, read as `reader` (default Northwind). */
export async function readDelivered(world: World, reader: PodOwner = HOLDER): Promise<Delivered> {
  const fetcher = world.fetchAs(reader);
  const load = async (path: string) => {
    const url = holderUrl(world, path);
    if ((await statusOf(fetcher, url)) !== 200) return undefined;
    const dataset = await readDataset(fetcher, url);
    return dataset.size === 0 ? undefined : { dataset, url };
  };
  const [decision, terms, notice] = await Promise.all([
    load(PATHS.decision),
    load(PATHS.terms),
    load(PATHS.notice),
  ]);
  return {
    ...(decision === undefined
      ? {}
      : { decision: new UnderwritingDecision(decision.url, decision.dataset, DataFactory) }),
    ...(terms === undefined
      ? {}
      : { terms: new BusinessLoanTerms(terms.url, terms.dataset, DataFactory) }),
    ...(notice === undefined
      ? {}
      : { notice: new DeliveredDocument(notice.url, notice.dataset, DataFactory) }),
  };
}

export interface CovenantTest {
  readonly quarter: number;
  readonly measures: Measures;
  readonly covenants: ReturnType<typeof testCovenants>;
  readonly record: string;
}

/**
 * Step 7. The quarterly covenant test: read the cash flow under S3, measure the last three months
 * (the loan's payment is in their debt service already), keep the result in Brackenridge's file.
 * A refused read throws `PodRequestError`.
 */
export async function testQuarter(
  world: World,
  quarter = 1,
  time = "09:30",
): Promise<CovenantTest> {
  const record = await readCashFlow(world, LENDER);
  const measures = measure(record, 3);
  const covenants = testCovenants(measures);
  await ensureContainers(world, [LENDER_PATHS.credit, LENDER_PATHS.file]);
  const saved = await putResource(
    world.fetchAs(LENDER),
    buildCashFlowAssessment({
      averageBalanceUsd: measures.averageBalanceUsd,
      borrower: webid(world, HOLDER),
      checkedAt: at(world, time),
      covenantsMet: covenants.every((c) => c.met),
      debtServiceCoverageRatio: measures.dscr,
      iri: lenderUrl(world, LENDER_PATHS.covenantTest(quarter)),
      lender: webid(world, LENDER),
      name: `Covenant test, quarter ${quarter}: ${ENTITY.legalName}`,
      sources: [cashFlowUrl(world)],
    }),
  );
  world.note({
    kind: "verified",
    org: LENDER,
    refs: [saved, cashFlowUrl(world)],
    text: `Quarter ${quarter} covenant test: coverage ${measures.dscr.toFixed(2)}x, average balance ${usd(measures.averageBalanceUsd)}. ${covenants.every((c) => c.met) ? "Both covenants met." : "A covenant was missed."}`,
  });
  return { covenants, measures, quarter, record: saved };
}

/** Brackenridge's record of a quarter's covenant test, if it made one. */
export function readCovenantTest(world: World, quarter = 1) {
  return readOwn(world, LENDER_PATHS.covenantTest(quarter));
}

/** Step 8. Brackenridge reads the cash flow again; after the withdrawal the pod answers 403. */
export async function readAgain(world: World): Promise<{ status: number }> {
  try {
    await readCashFlow(world, LENDER);
    return { status: 200 };
  } catch (error) {
    if (error instanceof PodRequestError) return { status: error.status };
    throw error;
  }
}
