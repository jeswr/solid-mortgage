/**
 * Scene-3 application submit: build the URLA-subset loan application and the
 * instant "approved with conditions" decision from the GRANTED pod data, and
 * deliver both back into the borrower's pod (`/mortgage/application`,
 * `/mortgage/decision`) — the Loan Estimate beat. Documents are built through
 * the data-model wrapper layer and serialised by `resourceToTurtle`, which
 * SHACL-validates before any byte leaves the process.
 *
 * TRID framing (docs/research/mortgage-process.md): the Loan Estimate must be
 * delivered or placed in the mail within 3 business days of the application —
 * here it lands in the pod immediately; the copy quotes the rule.
 */
import {
  buildLoanApplication,
  buildUnderwritingDecision,
  FIBO,
  MORT,
  PERSONA_VALUES,
  RESOURCE_POD_PATHS,
  resourceToTurtle,
} from "@mortgage/data-model";
import type { LenderConfig } from "./config";
import { assertAllowedPodBase, readPodResource, writePodTurtle } from "./pod";
import { prefillFromPod, type UrlaPrefill } from "./prefill";
import { ILLUSTRATIVE_RATE_QUOTE } from "./statements";

/** TRID Loan Estimate timing, quoted exactly (Reg Z §1026.19(e)(1)(iii)). */
export const TRID_LE_TIMING =
  "delivered or placed in the mail within 3 business days of the application";

export interface LoanEstimate {
  readonly simulated: true;
  readonly illustrative: true;
  readonly notAnOffer: true;
  readonly product: string;
  readonly loanAmountUsd: number;
  readonly loanTermMonths: number;
  readonly interestRatePercent: number;
  readonly aprPercent: number;
  readonly monthlyPrincipalAndInterestUsd: number;
  readonly estimatedClosingCostsUsd: number;
  readonly tridTiming: string;
}

export interface SubmitResult {
  readonly simulated: true;
  readonly applicationIri: string;
  readonly decisionIri: string;
  readonly decisionStatus: string;
  readonly conditions: readonly string[];
  readonly loanEstimate: LoanEstimate;
  readonly prefill: UrlaPrefill;
}

/** Standard amortized monthly principal + interest (illustrative figure). */
export function monthlyPrincipalAndInterest(
  principalUsd: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  const r = annualRatePercent / 100 / 12;
  const factor = (1 + r) ** termMonths;
  return Math.round((principalUsd * r * factor) / (factor - 1));
}

/** The demo loan constants (persona-derived; every figure illustrative). */
function demoLoanValues() {
  const persona = PERSONA_VALUES[0];
  if (persona === undefined) throw new Error("no demo persona available");
  return persona;
}

export function loanEstimateOf(loanAmountUsd: number, closingCostsUsd: number): LoanEstimate {
  return {
    simulated: true,
    illustrative: true,
    notAnOffer: true,
    product: ILLUSTRATIVE_RATE_QUOTE.product,
    loanAmountUsd,
    loanTermMonths: 360,
    interestRatePercent: ILLUSTRATIVE_RATE_QUOTE.interestRatePercent,
    aprPercent: ILLUSTRATIVE_RATE_QUOTE.aprPercent,
    monthlyPrincipalAndInterestUsd: monthlyPrincipalAndInterest(
      loanAmountUsd,
      ILLUSTRATIVE_RATE_QUOTE.interestRatePercent,
      360,
    ),
    estimatedClosingCostsUsd: closingCostsUsd,
    tridTiming: TRID_LE_TIMING,
  };
}

/**
 * Submit the application: prefill from the granted pod, write the application
 * + decision documents back into the pod, return the Loan Estimate payload.
 */
export async function submitApplication(
  pod: string,
  webId: string,
  config: LenderConfig,
  options: { now?: () => Date } = {},
): Promise<SubmitResult> {
  const base = assertAllowedPodBase(pod, config);
  const now = (options.now ?? (() => new Date()))();
  const prefill = await prefillFromPod(pod, webId, config);
  // The borrower's OWN identity + pod-read profile drive the application; the
  // LOAN TERMS (requested amount, term, subject property, and the "approved
  // with conditions" outcome) are illustrative persona constants — a real
  // application would carry the borrower's requested amount and a real AUS
  // decision. Everything is marked `simulated: true` + wrapped in
  // IllustrativeFigure at the UI. Follow-up: derive terms from submitted input.
  const values = demoLoanValues();

  const applicationIri = `${base}${RESOURCE_POD_PATHS["loan-application"].slice(1)}`;
  const decisionIri = `${base}${RESOURCE_POD_PATHS["underwriting-decision"].slice(1)}`;

  const application = buildLoanApplication({
    iri: applicationIri,
    created: now,
    submittedBy: webId,
    requestedAmountUsd: values.requestedLoanUsd,
    loanTermMonths: values.loanTermMonths,
    property: {
      address: values.subjectPropertyAddress,
      appraisedValueUsd: values.appraisedValueUsd,
    },
    loanPurpose: FIBO.MortgageLoanPurpose_RealPropertyPurchase,
    occupancy: FIBO.PropertyUsage_primaryResidence,
    amortizationType: FIBO.AmortizationType_fixedRate,
  });

  const conditions = [
    "Provide updated employment verification within 10 business days of closing.",
  ];
  const decision = buildUnderwritingDecision({
    iri: decisionIri,
    evaluates: applicationIri,
    decisionStatus: MORT.DecisionStatus_ApprovedWithConditions,
    conditions,
    approvedAmountUsd: values.approvedLoanUsd,
    ausRecommendation: values.ausRecommendation,
    issued: now,
    // The demo lender identity (matches the persona fixtures' issuer set;
    // RFC 2606 .example — never a real org's IRI, decision 0010).
    creator: "https://lender.example/orgs/underwriting#id",
  });

  const applicationTurtle = await resourceToTurtle(application);
  const decisionTurtle = await resourceToTurtle(decision);

  const existingApplication = await readPodResource(applicationIri, base);
  await writePodTurtle(applicationIri, applicationTurtle, {
    etag: existingApplication?.etag,
  });
  const existingDecision = await readPodResource(decisionIri, base);
  await writePodTurtle(decisionIri, decisionTurtle, { etag: existingDecision?.etag });

  return {
    simulated: true,
    applicationIri,
    decisionIri,
    decisionStatus: "ApprovedWithConditions",
    conditions,
    loanEstimate: loanEstimateOf(values.requestedLoanUsd, values.closingCostsUsd),
    prefill,
  };
}
