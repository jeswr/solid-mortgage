// AUTHORED-BY Claude Opus 5.5
/**
 * The nine tour steps of the small business loan demo (flows.md section 6). Step ids are the
 * normative ids of `docs/rebuild/video-scripts.md` ("Small business loan"). This file holds the
 * copy and what each step must show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the bank's business banking page, the
 * state's Department of Revenue page, Brackenridge's loan pages and the wallet's loan screens.
 * Step 9 is a summary step; its page still reads the log the pods produced.
 */

import type { PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
import { DAY } from "./facts.js";

export { DEMO } from "./facts.js";

type Pod = PodEvent["pod"];
type Org = PodEvent["actor"]["org"];

const by = (org: Org): PodEvent["actor"] => ({ org }) as PodEvent["actor"];
const read = (pod: Pod, path: string, org?: Org): Partial<PodEvent> => ({
  kind: "read",
  method: "GET",
  path,
  pod,
  status: 200,
  ...(org === undefined ? {} : { actor: by(org) }),
});
const write = (pod: Pod, path: string, org?: Org): Partial<PodEvent> => ({
  kind: "write",
  path,
  pod,
  ...(org === undefined ? {} : { actor: by(org) }),
});
const acl = (kind: "grant" | "revoke", path: string): Partial<PodEvent> => ({
  kind,
  method: "PUT",
  path: `${path}.acl`,
  pod: "northwind",
});

export const CHAPTERS = Object.freeze([
  "1 Data from the source",
  "2 The application",
  "3 A standing grant",
  "Summary",
] as const);

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    action: { label: "Keep my pod up to date", target: "bank-business-publish-cash-flow" },
    app: "bank",
    body: "Northwind, from the KYB demo, owns its pod; Jordan Blake manages it. Press Keep my pod up to date: Jordan approves grant S1, and Alder Bank writes twelve months of cash flow there for a loan application. Alder may write it, never read it.",
    chapter: "1 Data from the source",
    clock: { day: DAY.cashFlow },
    done: { event: write("northwind", "/finance/cash-flow", "bank") },
    expect: [
      write("northwind", "/policies/s1"),
      acl("grant", "/finance/cash-flow"),
      write("northwind", "/finance/cash-flow", "bank"),
    ],
    id: "publish-cash-flow",
    lens: {
      chips: [
        { kind: "grant", label: "S1: write one resource" },
        { kind: "pod write", label: "Cash flow, 12 months" },
      ],
      headline: "The bank publishes the business's own data to the business",
    },
    mode: "interactive",
    path: "business",
    realWorld: {
      rule: "Today a lender asks for twelve months of bank statements, exported as PDFs and retyped.",
      stage: "Preparing to borrow",
    },
    title: "Alder keeps Northwind's cash flow current",
  },
  {
    action: { label: "Issue tax compliance", target: "state-revenue-issue-tax" },
    app: "state",
    body: "The Department of Revenue sees Northwind's returns filed through last quarter. Press Issue tax compliance: it signs a credential saying so, with the turnover band (never the figure), and Northwind's wallet stores it.",
    chapter: "1 Data from the source",
    clock: { day: DAY.tax },
    done: { event: write("northwind", "/credentials/tax-compliance") },
    expect: [
      write("state", "/issued/tax-compliance-northwind-v1", "state"),
      write("northwind", "/credentials/tax-compliance"),
    ],
    id: "tax-compliance",
    lens: {
      chips: [{ kind: "credential", label: "Tax compliance" }],
      headline: "Filings up to date, signed by the revenue department",
    },
    mode: "interactive",
    path: "revenue",
    realWorld: {
      rule: "A tax clearance letter is usually requested by post or portal and emailed on as a PDF.",
      stage: "Preparing to borrow",
    },
    title: "The state confirms tax filings",
  },
  {
    action: { label: "Approve for 30 days", target: "wallet-loan-approve-s2" },
    app: "wallet",
    body: "Brackenridge Bank asks for four things: identity, ownership, tax compliance and cash flow, to decide on a $150,000 equipment loan. Press Approve for 30 days: grant S2, one purpose, credit decision.",
    chapter: "2 The application",
    clock: { day: DAY.apply },
    // S2's documents are written in path order: the loan terms come last.
    done: { event: acl("grant", "/loans/brackenridge/terms") },
    expect: [
      write("northwind", "/policies/s2"),
      write("northwind", "/consents/s2-given"),
      acl("grant", "/credentials/tax-compliance"),
      acl("grant", "/finance/cash-flow"),
      acl("grant", "/loans/brackenridge/terms"),
    ],
    id: "apply",
    lens: {
      chips: [
        { kind: "grant", label: "S2: four reads, 30 days" },
        { kind: "grant", label: "Credit decision" },
      ],
      headline: "Four resources, one purpose, thirty days",
      notShared: ["Officer authorisation", "Bank statements"],
    },
    mode: "interactive",
    path: "loan/requests",
    realWorld: {
      rule: "Due diligence already done for the bank account is normally collected again by each lender.",
      stage: "Loan application",
    },
    title: "Northwind applies to Brackenridge",
  },
  {
    action: { label: "Run the assessment", target: "lender-loan-assess" },
    app: "business-lender",
    body: "Tomas Whitfield, credit officer, presses Run the assessment. Brackenridge reads the four resources in Northwind's pod under S2, checks each signature at source and measures twelve months of cash flow.",
    chapter: "2 The application",
    clock: { day: DAY.apply },
    done: { event: write("business-lender", "/credit/northwind/assessment", "business-lender") },
    expect: [
      read("northwind", "/credentials/org-identity", "business-lender"),
      read("northwind", "/credentials/beneficial-ownership", "business-lender"),
      read("northwind", "/credentials/tax-compliance", "business-lender"),
      read("northwind", "/finance/cash-flow", "business-lender"),
      { kind: "verified", org: "business-lender" },
    ],
    id: "assessment",
    lens: {
      chips: [
        { kind: "pod read", label: "Four reads under S2" },
        { kind: "credential", label: "Three signatures checked" },
      ],
      headline: "Read at source: nothing exported, nothing retyped",
    },
    mode: "interactive",
    path: "loan",
    realWorld: {
      rule: "Lenders usually spread statements by hand into a cash flow model before deciding.",
      stage: "Underwriting",
    },
    title: "Brackenridge assesses at source",
  },
  {
    action: { label: "Approve and send", target: "lender-loan-decide" },
    app: "business-lender",
    body: "Coverage and balances clear both covenants. Press Approve and send: Brackenridge writes its decision, the loan terms with two quarterly covenants, and the notice of action taken into Northwind's pod.",
    chapter: "2 The application",
    clock: { day: DAY.decision },
    done: { event: write("northwind", "/loans/brackenridge/notice-of-action", "business-lender") },
    expect: [
      write("northwind", "/loans/brackenridge/decision", "business-lender"),
      write("northwind", "/loans/brackenridge/terms", "business-lender"),
      write("northwind", "/loans/brackenridge/notice-of-action", "business-lender"),
    ],
    id: "decision",
    lens: {
      chips: [
        { kind: "pod write", label: "Decision and terms" },
        { kind: "pod write", label: "Notice of action taken" },
      ],
      headline: "The decision and its reasons, written back to the borrower",
    },
    mode: "interactive",
    path: "loan/decision",
    realWorld: {
      rule: "Regulation B: notify the applicant of action taken within 30 days of a completed application (12 CFR 1002.9).",
      stage: "Credit decision",
    },
    title: "The decision, written back",
  },
  {
    action: { label: "Approve monitoring", target: "wallet-loan-approve-s3" },
    app: "wallet",
    body: "The loan carries two covenants, tested each quarter. Brackenridge asks to read the cash flow record once a quarter while the loan is open. Press Approve monitoring: grant S3 states the frequency and the end.",
    chapter: "3 A standing grant",
    clock: { day: DAY.decision },
    done: { event: write("northwind", "/policies/s3") },
    expect: [
      write("northwind", "/policies/s3"),
      write("northwind", "/consents/s3-given"),
      acl("grant", "/finance/cash-flow"),
    ],
    id: "monitoring",
    lens: {
      chips: [{ kind: "grant", label: "S3: quarterly, until repaid" }],
      headline: "A standing grant with its frequency and its end",
    },
    mode: "interactive",
    path: "loan/requests",
    realWorld: {
      rule: "Covenants are usually reported each quarter on a compliance certificate the borrower prepares.",
      stage: "Loan servicing",
    },
    title: "A quarterly read, while the loan is open",
  },
  {
    action: { label: "Advance one quarter", target: "lender-loan-quarter" },
    app: "business-lender",
    body: "Press Advance one quarter: the simulated calendar moves three months on. S2's thirty days have ended, Alder's back office updates the record, and Brackenridge reads it under S3 for the covenant test.",
    chapter: "3 A standing grant",
    clock: { day: DAY.quarter },
    done: {
      event: write("business-lender", "/credit/northwind/covenant-test-q1", "business-lender"),
    },
    expect: [
      write("northwind", "/consents/s2-expired"),
      write("northwind", "/finance/cash-flow", "bank"),
      read("northwind", "/finance/cash-flow", "business-lender"),
      write("business-lender", "/credit/northwind/covenant-test-q1", "business-lender"),
    ],
    id: "quarter",
    lens: {
      chips: [
        { kind: "pod read", label: "Quarterly read under S3" },
        { kind: "grant", label: "S2 expired" },
      ],
      headline: "The covenant check is a read, not a certificate",
    },
    mode: "interactive",
    path: "loan/covenants",
    realWorld: {
      rule: "Missing a quarterly certificate can itself be a default under the loan agreement.",
      stage: "Loan servicing",
    },
    title: "One quarter on: the covenant check",
  },
  {
    action: { label: "Loan repaid: withdraw", target: "wallet-loan-withdraw-s3" },
    app: "wallet",
    body: "Northwind repays the loan early. Press Loan repaid: withdraw. Cairn withdraws S3, and Brackenridge's next read of the cash flow record is refused by the pod.",
    chapter: "3 A standing grant",
    clock: { day: DAY.repaid },
    done: {
      event: {
        actor: by("business-lender"),
        kind: "denied",
        path: "/finance/cash-flow",
        pod: "northwind",
      },
    },
    expect: [
      write("northwind", "/consents/s3-withdrawn"),
      acl("revoke", "/finance/cash-flow"),
      {
        actor: by("business-lender"),
        kind: "denied",
        path: "/finance/cash-flow",
        pod: "northwind",
        status: 403,
      },
    ],
    id: "revoke",
    lens: {
      chips: [
        { kind: "grant", label: "S3 withdrawn" },
        { kind: "denied", label: "Brackenridge Bank" },
      ],
      headline: "Repaid, withdrawn, refused at source",
    },
    mode: "interactive",
    path: "loan/sharing",
    realWorld: {
      rule: "Today a lender's copies of statements stay in its files after the loan is repaid.",
      stage: "Repayment",
    },
    title: "Repaid: the grant ends",
  },
  {
    app: "wallet",
    body: "The journey ledger counts what the log shows: who put data into Northwind's pod, who read it under which grant, and what was written back.",
    chapter: "Summary",
    clock: { day: DAY.repaid },
    done: {},
    expect: [],
    id: "ledger",
    lens: {
      chips: [{ kind: "pod read", label: "Journey ledger" }],
      headline: "Two issuers, one lender, one decision written back",
    },
    mode: "summary",
    path: "loan/ledger",
    realWorld: {
      rule: "A borrower rarely sees who holds copies of its financial records.",
      stage: "Summary",
    },
    title: "The journey ledger",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
