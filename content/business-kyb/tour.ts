// AUTHORED-BY Claude Opus 5.5
/**
 * The twelve tour steps of the business KYB demo (flows.md section 3). Step ids are the
 * normative ids of `docs/rebuild/video-scripts.md` ("Business KYB with LEI"). This file holds the
 * copy and what each step must show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the wallet's KYB sections, the registry's
 * record pages and the bank's due diligence page. Steps 1, 10 and 12 are summary steps; their
 * pages still read the pods for real (step 10's page runs both banks' back-office reads).
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
  pod,
  path,
  ...(org === undefined ? {} : { actor: by(org) }),
});
const grant = (path: string): Partial<PodEvent> => ({
  kind: "grant",
  method: "PUT",
  path: `${path}.acl`,
  pod: "northwind",
});

export const CHAPTERS = Object.freeze([
  "1 The register",
  "2 Opening the account",
  "3 The credit line",
  "4 Ownership changes",
  "Summary",
] as const);

const STAGE = "Business onboarding";

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    app: "wallet",
    body: "Jordan Blake runs Northwind Logistics' pod in Cairn. The credentials drawer is empty: no register record, no officer list, no ownership record yet.",
    chapter: "1 The register",
    clock: { day: DAY.register },
    done: { event: read("northwind", "/credentials/") },
    expect: [read("northwind", "/credentials/", "northwind")],
    id: "vault",
    lens: {
      chips: [{ kind: "pod read", label: "Credentials drawer" }],
      headline: "A business pod, operated by its managing member",
    },
    mode: "summary",
    path: "kyb",
    realWorld: {
      rule: "Today each bank collects formation papers, an ownership form and IDs for every owner, separately.",
      stage: STAGE,
    },
    title: "Northwind's pod, empty",
  },
  {
    action: { label: "Issue identity credential", target: "registry-issue-identity" },
    app: "registry",
    body: "Halyard LEI Services holds Northwind's register record: legal name, legal form, registered address and an illustrative LEI. Press Issue identity credential: Halyard signs it into Northwind's pod.",
    chapter: "1 The register",
    clock: { day: DAY.register },
    done: { event: write("northwind", "/credentials/org-identity") },
    expect: [
      write("registry", "/issued/org-identity-v1", "registry"),
      write("northwind", "/credentials/org-identity"),
    ],
    id: "org-identity",
    lens: {
      chips: [{ kind: "credential", label: "Organisational identity" }],
      headline: "The register signs the entity's identity, LEI included",
    },
    mode: "interactive",
    path: "entity",
    realWorld: {
      rule: "LEIs follow ISO 17442. Every LEI here uses the never-accredited prefix 9999.",
      stage: STAGE,
    },
    title: "The register issues Northwind's identity",
  },
  {
    action: { label: "Issue officer authorisation", target: "registry-issue-officers" },
    app: "registry",
    body: "The register lists Jordan Blake as managing member and signatory. Press Issue officer authorisation: the credential names who may act for Northwind.",
    chapter: "1 The register",
    clock: { day: DAY.register },
    done: { event: write("northwind", "/credentials/officer-authorisation") },
    expect: [write("northwind", "/credentials/officer-authorisation")],
    id: "officer",
    lens: {
      chips: [{ kind: "credential", label: "Officer authorisation" }],
      headline: "Who may act for the business, signed by the register",
    },
    mode: "interactive",
    path: "officers",
    realWorld: {
      rule: "The CDD Rule's control prong asks for one individual who controls the business.",
      stage: STAGE,
    },
    title: "Who may act for Northwind",
  },
  {
    action: { label: "Issue ownership credential", target: "registry-issue-ownership" },
    app: "registry",
    body: "Four owners: Jordan 42%, Priya 28%, Marcus 18%, Dana 12%. Press Issue ownership credential: Halyard signs the shares in basis points, and anchors them for zero-knowledge proofs.",
    chapter: "1 The register",
    clock: { day: DAY.register },
    done: { event: write("northwind", "/credentials/anchors/owner-2") },
    expect: [
      write("northwind", "/credentials/beneficial-ownership"),
      write("northwind", "/credentials/anchors/owner-array"),
      write("northwind", "/credentials/anchors/owner-1"),
      write("northwind", "/credentials/anchors/owner-2"),
    ],
    id: "ownership",
    lens: {
      chips: [
        { kind: "credential", label: "Beneficial ownership" },
        { kind: "credential", label: "Three anchors" },
      ],
      headline: "Ownership in basis points, plus the anchors proofs bind to",
    },
    mode: "interactive",
    path: "ownership",
    realWorld: {
      rule: "Owners holding 25% or more must be identified (31 CFR 1010.230(d)(1)).",
      stage: STAGE,
    },
    title: "The register records who owns Northwind",
  },
  {
    action: { label: "Approve", target: "wallet-kyb-approve-k1" },
    app: "wallet",
    body: "Alder Bank asks to read the three credentials for customer due diligence, for one year. Press Approve: Cairn writes grant K1 and the consent record.",
    chapter: "2 Opening the account",
    clock: { day: DAY.onboarding },
    done: { event: grant("/credentials/org-identity") },
    expect: [
      write("northwind", "/policies/k1"),
      write("northwind", "/consents/k1-given"),
      grant("/credentials/beneficial-ownership"),
      grant("/credentials/officer-authorisation"),
      grant("/credentials/org-identity"),
    ],
    id: "onboarding-consent",
    lens: {
      chips: [{ kind: "grant", label: "K1" }],
      headline: "Alder may read three credentials, for due diligence, for a year",
    },
    mode: "interactive",
    path: "kyb/requests",
    realWorld: {
      rule: "Account opening normally means uploading the same documents again for each bank.",
      stage: STAGE,
    },
    title: "Approve Alder Bank's request",
  },
  {
    action: { label: "Run due diligence", target: "bank-kyb-run-cdd" },
    app: "bank",
    body: "Alder Bank reads the credentials from Northwind's pod under K1 and checks each signature and status at Halyard. Press Run due diligence: it identifies the owners at 25% or more and the control person.",
    chapter: "2 Opening the account",
    clock: { day: DAY.onboarding },
    done: { event: write("bank", "/kyb/cdd/northwind") },
    expect: [
      read("northwind", "/credentials/org-identity", "bank"),
      read("northwind", "/credentials/officer-authorisation", "bank"),
      read("northwind", "/credentials/beneficial-ownership", "bank"),
      read("registry", "/status/list"),
      write("bank", "/kyb/cdd/northwind", "bank"),
    ],
    id: "due-diligence",
    lens: {
      chips: [
        { kind: "pod read", label: "Three credentials" },
        { kind: "pod write", label: "CDD record" },
      ],
      headline: "Checked at source; the bank keeps its own decision record",
    },
    mode: "interactive",
    path: "kyb/due-diligence",
    realWorld: {
      rule: "Banks must identify and verify beneficial owners when a business opens an account.",
      stage: STAGE,
    },
    title: "Alder Bank checks and opens the account",
  },
  {
    action: { label: "Prove", target: "wallet-kyb-prove" },
    app: "wallet",
    body: "Brackenridge Bank wants to know, before anything is shared, that no undisclosed owner holds 25% or more. Press Prove: Cairn proves it in this browser and sends the proofs to Brackenridge.",
    chapter: "3 The credit line",
    clock: { day: DAY.credit },
    done: { event: write("business-lender", "/kyb/pre-decisions/northwind") },
    expect: [
      read("northwind", "/credentials/anchors/owner-array", "northwind"),
      { actor: by("northwind"), kind: "write", method: "POST", pod: "business-lender" },
      { kind: "proof-verified", org: "business-lender" },
      write("business-lender", "/kyb/pre-decisions/northwind"),
    ],
    id: "proof",
    lens: {
      chips: [{ kind: "proof", label: "No undisclosed owner at 25%" }],
      headline: "Proved without sharing a single ownership share",
      notShared: ["Any owner's share", "Marcus's and Dana's names", "The credentials"],
    },
    mode: "interactive",
    path: "prove/kyb",
    realWorld: {
      rule: "A lender usually asks for the full ownership table before saying whether to proceed.",
      stage: "Credit application",
    },
    title: "Prove no hidden owner holds 25%",
  },
  {
    action: { label: "Approve", target: "wallet-kyb-approve-k2" },
    app: "wallet",
    body: "To build its deal sheet, Brackenridge asks to read the identity, officer and ownership credentials for its credit decision. Press Approve: grant K2 is written and Brackenridge's desk reads them.",
    chapter: "3 The credit line",
    clock: { day: DAY.credit },
    done: { event: read("northwind", "/credentials/beneficial-ownership", "business-lender") },
    expect: [
      write("northwind", "/policies/k2"),
      grant("/credentials/beneficial-ownership"),
      read("northwind", "/credentials/org-identity", "business-lender"),
      read("northwind", "/credentials/beneficial-ownership", "business-lender"),
    ],
    id: "disclosed-grant",
    lens: {
      chips: [
        { kind: "grant", label: "K2" },
        { kind: "pod read", label: "Deal sheet" },
      ],
      headline: "A second bank reads the same credentials. Nothing re-uploaded",
    },
    mode: "interactive",
    path: "kyb/requests",
    realWorld: {
      rule: "A second bank normally repeats the first bank's document collection.",
      stage: "Credit application",
    },
    title: "Share the credentials with Brackenridge",
  },
  {
    action: { label: "Record the sale", target: "registry-record-sale" },
    app: "registry",
    body: "Marcus Webb sells his 18% to Jordan Blake. Press Record the sale: Halyard signs a new ownership credential, withdraws the old one on its status list and replaces the anchors.",
    chapter: "4 Ownership changes",
    clock: { day: DAY.sale },
    done: { event: write("registry", "/status/list", "registry") },
    expect: [
      write("registry", "/issued/beneficial-ownership-v2", "registry"),
      write("northwind", "/credentials/beneficial-ownership"),
      write("northwind", "/credentials/anchors/owner-array"),
      write("registry", "/status/list", "registry"),
    ],
    id: "ownership-change",
    lens: {
      chips: [
        { kind: "credential", label: "Ownership, version 2" },
        { kind: "pod write", label: "Status list" },
      ],
      headline: "One re-issue at the register; the old credential now fails its status check",
    },
    mode: "interactive",
    path: "ownership",
    realWorld: {
      rule: "Banks must keep beneficial ownership information current, usually by asking again.",
      stage: "Ongoing monitoring",
    },
    title: "Ownership changes at the register",
  },
  {
    app: "business-lender",
    body: "Brackenridge's deal sheet, and Alder Bank's monitoring, read the new ownership credential under the grants they already hold, and check it at Halyard. Nobody sent a form.",
    chapter: "4 Ownership changes",
    clock: { day: DAY.sale },
    done: { event: read("northwind", "/credentials/beneficial-ownership", "business-lender") },
    expect: [
      read("northwind", "/credentials/beneficial-ownership", "bank"),
      read("northwind", "/credentials/beneficial-ownership", "business-lender"),
    ],
    id: "both-banks",
    lens: {
      chips: [{ kind: "pod read", label: "Two banks, one record" }],
      headline: "Both banks are current from the same record",
    },
    mode: "summary",
    path: "deal",
    realWorld: {
      rule: "Ongoing customer due diligence includes keeping ownership information up to date.",
      stage: "Ongoing monitoring",
    },
    title: "Both banks see the change",
  },
  {
    action: { label: "Close account and withdraw", target: "wallet-kyb-close-alder" },
    app: "wallet",
    body: "Northwind closes its account at Alder Bank. Press Close account and withdraw: Cairn withdraws K1. Alder's next monitoring read is refused by the pod.",
    chapter: "4 Ownership changes",
    clock: { day: DAY.sale },
    done: {
      event: {
        actor: by("bank"),
        kind: "denied",
        path: "/credentials/beneficial-ownership",
        pod: "northwind",
      },
    },
    expect: [
      write("northwind", "/consents/k1-withdrawn"),
      {
        kind: "revoke",
        method: "PUT",
        path: "/credentials/beneficial-ownership.acl",
        pod: "northwind",
      },
      {
        actor: by("bank"),
        kind: "denied",
        path: "/credentials/beneficial-ownership",
        pod: "northwind",
        status: 403,
      },
    ],
    id: "revoke",
    lens: {
      chips: [
        { kind: "grant", label: "K1 withdrawn" },
        { kind: "denied", label: "Alder Bank" },
      ],
      headline: "Access ends at source. Alder keeps the record it must keep",
    },
    mode: "interactive",
    path: "kyb/sharing",
    realWorld: {
      rule: "Banks keep CDD records for five years after an account closes (31 CFR 1010.230(i)).",
      stage: "Account closure",
    },
    title: "Close the Alder account",
  },
  {
    app: "wallet",
    body: "The journey ledger lists every read of Northwind's credentials and the grant that allowed it. The examiner view checks each CDD obligation against that log.",
    chapter: "Summary",
    clock: { day: DAY.sale },
    done: {},
    expect: [],
    id: "examiner",
    lens: {
      chips: [{ kind: "pod read", label: "Access register" }],
      headline: "Every obligation, evidenced from the log",
    },
    mode: "summary",
    path: "kyb/ledger",
    realWorld: {
      rule: "An examiner normally samples files to see whether each obligation was met.",
      stage: "Examination",
    },
    title: "What an examiner sees",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
