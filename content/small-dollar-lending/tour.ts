// AUTHORED-BY Claude Opus 5.5
/**
 * The twelve tour steps of the small-dollar lending demo (flows.md section 4). Step ids follow
 * the video narration (`video/small-dollar-lending/narration.md`). This file holds the copy and
 * what each step must show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the lending sections of the wallet, the
 * payroll, bank and bureau apps, and on the Trueline, Finchly and Swiftline pages. Steps that only
 * show something (1 and 9) are summary steps; the pages they open still read and write the pods
 * for real. Each `done` event is the last request its step makes, so nothing a step does is
 * tagged with the next one.
 */

import type { AppNote, PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
import { DAY } from "./facts.js";

export { DEMO } from "./facts.js";

type Pod = PodEvent["pod"];
type Org = PodEvent["actor"]["org"];

const actedBy = (org: Org): PodEvent["actor"] => ({ org }) as PodEvent["actor"];

const read = (pod: Pod, path: string, org?: Org): Partial<PodEvent> => ({
  kind: "read",
  method: "GET",
  path,
  pod,
  status: 200,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
const write = (pod: Pod, path: string, org?: Org): Partial<PodEvent> => ({
  kind: "write",
  method: "PUT",
  path,
  pod,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
/** A message, request or presentation appended to an inbox (the server names it). */
const post = (pod: Pod, org?: Org): Partial<PodEvent> => ({
  kind: "write",
  method: "POST",
  pod,
  status: 201,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
const grant = (path: string): Partial<PodEvent> => ({
  kind: "grant",
  method: "PUT",
  path: `${path}.acl`,
  pod: "maya",
});
const revoke = (path: string): Partial<PodEvent> => ({
  kind: "revoke",
  method: "PUT",
  path: `${path}.acl`,
  pod: "maya",
});
const note = (kind: AppNote["kind"], org: AppNote["org"]): Partial<AppNote> => ({ kind, org });

export const CHAPTERS = Object.freeze([
  "1 Filling the pod",
  "2 Two quotes",
  "3 One decision",
  "4 Paid out",
  "5 Repaying, and leaving",
] as const);

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    app: "wallet",
    body: "Maya Torres needs $2,000 this week for a car repair. Her credit file is thin. Cairn opens her pod: drawers for credentials, loans and banking, and nothing in them yet.",
    chapter: "1 Filling the pod",
    clock: { day: DAY.apply },
    // Done when the page has listed the pod (a summary step opened by a deep link is never
    // "gone to", so it cannot complete on arrival).
    done: { event: read("maya", "/", "maya") },
    expect: [read("maya", "/", "maya"), read("maya", "/credentials/", "maya")],
    id: "vault",
    lens: {
      chips: [{ kind: "pod read", label: "Maya's pod" }],
      headline: "An empty pod",
    },
    mode: "summary",
    path: "lending",
    realWorld: {
      rule: "Small-dollar loans are often priced on a credit score alone, which a thin file does not support.",
      stage: "Before applying",
    },
    title: "Maya's pod, empty",
  },
  {
    action: { label: "Verify identity", target: "idv-verify" },
    app: "idv",
    body: "Trueline Identity checks Maya once. It asks Cairn for one slot in her pod, Maya approves, and Trueline writes a signed identity credential there. Press Verify identity.",
    chapter: "1 Filling the pod",
    clock: { day: DAY.apply },
    done: { event: write("idv", "/issued/maya-identity", "idv") },
    expect: [
      post("maya", "idv"),
      write("maya", "/policies/s1"),
      write("maya", "/consents/s1-given"),
      grant("/credentials/identity"),
      write("maya", "/credentials/identity", "idv"),
    ],
    id: "identity",
    lens: {
      chips: [
        { kind: "grant", label: "S1" },
        { kind: "credential", label: "Identity" },
      ],
      headline: "Verified once, strongly, and reusable",
    },
    mode: "interactive",
    path: "check",
    realWorld: {
      rule: "US lenders must verify a customer's identity before opening an account (31 CFR 1020.220).",
      stage: "Before applying",
    },
    title: "Verify identity, once",
  },
  {
    action: { label: "Send", target: "payroll-lending-send" },
    app: "payroll",
    body: "Ledgerly runs payroll for Maya's employer and pays her weekend delivery shifts. It states $2,860 a month across both streams, and signs the anchor a later proof needs. Press Send.",
    chapter: "1 Filling the pod",
    clock: { day: DAY.apply },
    done: { event: write("payroll", "/issued/maya-employment-income-anchor", "payroll") },
    expect: [
      write("maya", "/consents/s2-given"),
      write("maya", "/credentials/employment-income", "payroll"),
      write("maya", "/credentials/employment-income-anchor", "payroll"),
    ],
    id: "income",
    lens: {
      chips: [
        { kind: "grant", label: "S2" },
        { kind: "credential", label: "Income" },
      ],
      headline: "Same issuer app as the mortgage, different person",
    },
    mode: "interactive",
    path: "lending",
    realWorld: {
      stage: "Before applying",
    },
    title: "Ledgerly states her income",
  },
  {
    action: { label: "Send", target: "bank-lending-send" },
    app: "bank",
    body: "Alder Bank summarises six months of Maya's checking account: two regular deposit streams, an average balance, no returned payments in 90 days, and a cash-flow score of 720. Press Send.",
    chapter: "1 Filling the pod",
    clock: { day: DAY.apply },
    done: { event: write("bank", "/issued/maya-returned-payments-anchor", "bank") },
    expect: [
      write("maya", "/consents/s3-given"),
      write("maya", "/credentials/cash-flow", "bank"),
      write("maya", "/credentials/cash-flow-score-anchor", "bank"),
      write("maya", "/credentials/returned-payments-anchor", "bank"),
    ],
    id: "cash-flow",
    lens: {
      chips: [
        { kind: "grant", label: "S3" },
        { kind: "credential", label: "Cash flow" },
      ],
      headline: "The bank's data, in Maya's hands",
    },
    mode: "interactive",
    path: "lending/cash-flow",
    realWorld: {
      rule: "Consumers have a right to their own account data in a usable electronic form (Dodd-Frank Act, section 1033).",
      stage: "Before applying",
    },
    title: "Alder Bank summarises cash flow",
  },
  {
    action: { label: "Send", target: "bureau-lending-send" },
    app: "bureau",
    body: "Quillon adds its view of Maya: a FICO 8 score of 612, from two accounts opened recently. Press Send to sign the summary into her pod.",
    chapter: "1 Filling the pod",
    clock: { day: DAY.apply },
    done: { event: write("bureau", "/issued/maya-credit-summary", "bureau") },
    expect: [
      write("maya", "/consents/s4-given"),
      write("maya", "/credentials/credit-summary", "bureau"),
    ],
    id: "credit-summary",
    lens: {
      chips: [
        { kind: "grant", label: "S4" },
        { kind: "credential", label: "Credit summary" },
      ],
      headline: "Both views of Maya now sit side by side",
    },
    mode: "interactive",
    path: "lending",
    realWorld: {
      stage: "Before applying",
    },
    title: "Quillon adds the credit summary",
  },
  {
    action: { label: "Prove to two lenders", target: "wallet-lending-prove" },
    app: "wallet",
    body: "Finchly asks for income of at least $2,200, a cash-flow score of at least 660 and no returned payments. Alder Bank asks for the income and returned payments, plus a credit check. Press Prove to two lenders.",
    chapter: "2 Two quotes",
    clock: { day: DAY.apply },
    done: { event: grant("/loans/alder/") },
    expect: [
      post("fintech-lender", "maya"),
      post("bank", "maya"),
      note("proof-verified", "fintech-lender"),
      note("proof-verified", "bank"),
      write("fintech-lender", "/quotes/maya", "fintech-lender"),
      write("bank", "/quotes/maya", "bank"),
      write("maya", "/consents/a1-credit-report-authorisation"),
    ],
    id: "prove",
    lens: {
      chips: [
        { kind: "proof", label: "Five threshold proofs" },
        { kind: "grant", label: "A1" },
      ],
      headline: "Two quotes. Neither lender holds anything about her",
      notShared: ["Name", "Income", "Cash-flow score", "Transactions"],
    },
    mode: "interactive",
    path: "lending/prove",
    realWorld: {
      rule: "A pre-qualification is not an application or a commitment to lend.",
      stage: "Shopping",
    },
    title: "Two quotes, nothing handed over",
  },
  {
    action: { label: "Apply", target: "fintech-apply" },
    app: "fintech-lender",
    body: "Maya picks Finchly. Finchly asks to read her identity, income and cash flow for 30 days, keep the loan documents in her pod, and run a credit check. Press Apply, then approve in Cairn.",
    chapter: "3 One decision",
    clock: { day: DAY.apply },
    done: { event: grant("/loans/finchly/") },
    expect: [
      post("maya", "fintech-lender"),
      write("maya", "/policies/l1"),
      write("maya", "/consents/l1-given"),
      write("maya", "/consents/l1-credit-report-authorisation"),
      grant("/credentials/cash-flow"),
      grant("/credentials/identity"),
    ],
    id: "apply",
    lens: {
      chips: [
        { kind: "grant", label: "L1" },
        { kind: "pod write", label: "Policy and consent record" },
      ],
      headline: "A grant, with a consent record written before the first read",
      notShared: ["Credit summary", "Transactions"],
    },
    mode: "interactive",
    path: "apply",
    realWorld: {
      rule: "A lender needs a permissible purpose to obtain a credit report. A credit transaction the consumer starts is one (FCRA, section 604).",
      stage: "Application",
    },
    title: "Apply to Finchly",
  },
  {
    action: { label: "Accept", target: "fintech-accept" },
    app: "fintech-lender",
    body: "Finchly checks the three credentials at source and asks Quillon for the score. Its screen shows both ways of deciding: the score alone, and the score with cash flow. Press Accept.",
    chapter: "3 One decision",
    clock: { day: DAY.apply },
    done: { event: write("maya", "/loans/finchly/disclosure", "fintech-lender") },
    expect: [
      read("maya", "/credentials/identity", "fintech-lender"),
      read("maya", "/credentials/employment-income", "fintech-lender"),
      read("maya", "/credentials/cash-flow", "fintech-lender"),
      read("maya", "/consents/l1-credit-report-authorisation", "bureau"),
      note("org-to-org", "bureau"),
      write("maya", "/loans/finchly/disclosure", "fintech-lender"),
    ],
    id: "decision",
    lens: {
      chips: [
        { kind: "pod read", label: "Three credentials" },
        { kind: "pod write", label: "Loan disclosure" },
      ],
      headline:
        "Bureau only: declined. Bureau and cash flow: approved. The disclosure is Maya's to keep",
    },
    mode: "interactive",
    path: "decision",
    realWorld: {
      rule: "Before a closed-end loan is made, the lender discloses the APR, finance charge, amount financed and total of payments (Regulation Z, 12 CFR 1026.18).",
      stage: "Decision",
    },
    title: "One decision, two models",
  },
  {
    app: "bank",
    body: "Alder Bank's model looks at the credit score alone. It asked Quillon under Maya's authorisation, and 612 is below its cut-off. Its notice of the decline, with the reasons and the score, is in her pod.",
    chapter: "3 One decision",
    clock: { day: DAY.apply },
    done: {},
    expect: [
      read("maya", "/consents/a1-credit-report-authorisation", "bureau"),
      write("maya", "/loans/alder/adverse-action", "bank"),
    ],
    id: "decline-notice",
    lens: {
      chips: [{ kind: "pod write", label: "Adverse action notice" }],
      headline: "The decline arrives with its reasons, in the pod",
    },
    mode: "summary",
    path: "lending/loans",
    realWorld: {
      rule: "A creditor that declines an application must give the principal reasons within 30 days (Regulation B, 12 CFR 1002.9).",
      stage: "Decision",
    },
    title: "Alder Bank's decline, with reasons",
  },
  {
    action: { label: "Authorise in Cairn", target: "payout-authorise" },
    app: "payout",
    body: "Swiftline Payouts sends the $2,000 to Maya's debit card. Maya's wallet writes where to pay and grants Swiftline one read of that one record. Press Authorise in Cairn.",
    chapter: "4 Paid out",
    clock: { day: DAY.apply },
    done: { event: write("maya", "/consents/l2-used", "maya") },
    expect: [
      write("maya", "/banking/payout-instruction", "maya"),
      write("maya", "/consents/l2-given"),
      grant("/banking/payout-instruction"),
      read("maya", "/banking/payout-instruction", "payout"),
      note("grant-used", "wallet"),
      revoke("/banking/payout-instruction"),
      write("payout", "/payouts/fl-2048", "payout"),
      note("org-to-org", "payout"),
    ],
    id: "payout",
    lens: {
      chips: [
        { kind: "grant", label: "L2, one read" },
        { kind: "pod read", label: "Payout instruction" },
      ],
      headline: "The payment rail saw the instruction and nothing else",
      notShared: ["Identity", "Income", "Cash flow", "Credit summary"],
    },
    mode: "interactive",
    path: "status",
    realWorld: {
      stage: "Funding",
    },
    title: "Paid out to her card",
  },
  {
    action: { label: "Make the payments", target: "fintech-pay" },
    app: "fintech-lender",
    body: "Four weeks on, Maya has made both payments on time. Press Make the payments: Finchly writes a repayment history credential into her pod and reports the loan to Quillon.",
    chapter: "5 Repaying, and leaving",
    clock: { day: DAY.payoff },
    done: { event: write("fintech-lender", "/issued/maya-repayment-history", "fintech-lender") },
    expect: [
      write("maya", "/credentials/repayment-history", "fintech-lender"),
      post("bureau", "fintech-lender"),
      note("org-to-org", "fintech-lender"),
    ],
    id: "repayments",
    lens: {
      chips: [{ kind: "credential", label: "Repayment history" }],
      headline: "On-time payments become a credential that builds her file",
    },
    mode: "interactive",
    path: "servicing",
    realWorld: {
      rule: "A lender that reports to a credit bureau must report accurately (FCRA, section 623).",
      stage: "Repayment",
    },
    title: "Repayments build her file",
  },
  {
    action: { label: "Withdraw", target: "wallet-lending-revoke-finchly" },
    app: "wallet",
    body: "The loan is paid off. Maya withdraws Finchly's grant in Cairn, and Cairn tells Finchly. Press Withdraw, then watch Finchly ask for her bank data again.",
    chapter: "5 Repaying, and leaving",
    clock: { day: DAY.payoff },
    done: {
      event: {
        actor: actedBy("fintech-lender"),
        kind: "denied",
        path: "/credentials/cash-flow",
        pod: "maya",
      },
    },
    expect: [
      write("maya", "/consents/l1-withdrawn"),
      revoke("/credentials/cash-flow"),
      post("fintech-lender", "maya"),
      {
        actor: actedBy("fintech-lender"),
        kind: "denied",
        path: "/credentials/cash-flow",
        pod: "maya",
        status: 403,
      },
    ],
    id: "revoke",
    lens: {
      chips: [
        { kind: "grant", label: "L1 withdrawn" },
        { kind: "denied", label: "Finchly" },
      ],
      headline: "403. Paid off, access ended",
    },
    mode: "interactive",
    path: "lending/sharing",
    realWorld: {
      stage: "After repayment",
    },
    title: "Paid off; access ended",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
