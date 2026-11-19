// AUTHORED-BY Claude Opus 5.5
/**
 * The seven tour steps of the reusable-KYC demo (flows.md section 8). Step ids follow the video
 * narration (`video/reusable-kyc/narration.md`). This file holds the copy and what each step must
 * show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on Alder Bank's "Your identity" section and
 * Pennant's application page. Step 4 and step 7 are summary steps: they complete when reached;
 * the pages they open still read the pod for real.
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
const acl = (kind: "grant" | "revoke", path: string): Partial<PodEvent> => ({
  kind,
  method: "PUT",
  path: `${path}.acl`,
  pod: "alex",
});
const note = (kind: AppNote["kind"], org: AppNote["org"]): Partial<AppNote> => ({ kind, org });

const STATEMENT = "/credentials/kyc-attestation";

const refused: Partial<PodEvent> = {
  actor: actedBy("card-issuer"),
  kind: "denied",
  path: STATEMENT,
  pod: "alex",
};

export const CHAPTERS = Object.freeze([
  "1 What the bank says",
  "2 One read",
  "3 Taking it back",
  "Summary",
] as const);

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    action: { label: "Get attestation", target: "bank-kyc-get-attestation" },
    app: "bank",
    body: "Alex banks with Alder. Under Your identity, Alex asks for a statement of what the bank verified: which checks, by what method, and when. It is signed and holds no document images. Press Get attestation.",
    chapter: "1 What the bank says",
    clock: { day: DAY.apply },
    done: { event: write("alex", STATEMENT, "alex") },
    expect: [write("alex", STATEMENT, "alex"), write("bank", "/issued/kyc-attestation-v1", "bank")],
    id: "attestation",
    lens: {
      chips: [
        { kind: "credential", label: "KYC attestation" },
        { kind: "pod write", label: "Your credentials" },
      ],
      headline: "Alder Bank states what it verified, and signs it",
    },
    mode: "interactive",
    path: "kyc",
    realWorld: {
      rule: "A US bank must verify a customer's identity when an account is opened, under a written Customer Identification Program.",
      stage: "Before applying",
    },
    title: "The bank states what it verified",
  },
  {
    action: { label: "Use verified identity", target: "card-use-verified-identity" },
    app: "card-issuer",
    body: "Pennant offers a choice: fill in the long form, or use a verified identity. Press Use verified identity. Cairn asks Alex to let Pennant read one record, once, within the hour, and approves.",
    chapter: "2 One read",
    clock: { day: DAY.apply },
    done: { event: acl("grant", STATEMENT) },
    expect: [
      write("alex", "/policies/y1", "alex"),
      write("alex", "/consents/y1-given", "alex"),
      acl("grant", STATEMENT),
    ],
    id: "card-consent",
    lens: {
      chips: [
        { kind: "grant", label: "Y1" },
        { kind: "pod write", label: "Policy and consent record" },
      ],
      headline: "The narrowest grant here: one record, read once, within an hour",
    },
    mode: "interactive",
    path: "apply",
    realWorld: {
      rule: "A card issuer usually runs its own identity checks, asking again for documents another institution has already seen.",
      stage: "Card application",
    },
    title: "Pennant asks for one read",
  },
  {
    action: { label: "Check identity", target: "card-check-identity" },
    app: "card-issuer",
    body: "Press Check identity. Pennant reads the statement once and checks three things: Alder's signature, that Alder has not withdrawn it, and that Alder is on the scheme's list of issuers Pennant has an agreement with.",
    chapter: "2 One read",
    clock: { day: DAY.apply },
    done: { note: note("verified", "card-issuer") },
    expect: [
      read("alex", STATEMENT, "card-issuer"),
      note("grant-used", "wallet"),
      acl("revoke", STATEMENT),
      read("bank", "/status/list", "card-issuer"),
      write("card-issuer", "/applications/alex-identity-check", "card-issuer"),
      note("verified", "card-issuer"),
    ],
    id: "card-verify",
    lens: {
      chips: [
        { kind: "pod read", label: "KYC attestation" },
        { kind: "credential", label: "Signature, status, issuer list" },
      ],
      headline: "Verified in a second. No documents uploaded",
    },
    mode: "interactive",
    path: "apply",
    realWorld: {
      rule: "A bank may rely on another financial institution's identity checks only under conditions, including an agreement between them. The scheme's list stands for that agreement.",
      stage: "Card application",
    },
    title: "Pennant checks the statement",
  },
  {
    app: "card-issuer",
    body: "Open the Lens on Not shared. Pennant learned the name, date of birth and address the bank verified, and how. It did not see the identity document, Alex's accounts, or anything else in the pod.",
    chapter: "2 One read",
    clock: { day: DAY.apply },
    done: {},
    expect: [],
    id: "not-shared",
    lens: {
      chips: [{ kind: "pod read", label: "One record" }],
      headline: "Pennant did not see the ID document, the accounts, or anything else",
      notShared: [
        "The identity document, or any image of it",
        "Alex's accounts at Alder Bank",
        "Anything else in Alex's pod",
      ],
    },
    mode: "summary",
    path: "apply",
    realWorld: {
      rule: "A copied identity document can be reused by anyone who holds the copy.",
      stage: "Card application",
    },
    title: "What Pennant did not see",
  },
  {
    action: { label: "Refresh", target: "card-refresh-identity" },
    app: "card-issuer",
    body: "Pennant asks for the statement again. Press Refresh. Cairn closed the one-time grant after the first read, so the pod refuses.",
    chapter: "3 Taking it back",
    clock: { day: DAY.apply },
    done: { event: refused },
    expect: [{ ...refused, status: 403 }],
    id: "used-up",
    lens: {
      chips: [{ kind: "denied", label: "Pennant" }],
      headline: "403. A one-time grant is used up",
    },
    mode: "interactive",
    path: "apply",
    realWorld: {
      stage: "Card application",
    },
    title: "Asking again is refused",
  },
  {
    action: { label: "Report ID lost", target: "bank-kyc-report-lost" },
    app: "bank",
    body: "The next day Alex loses the identity document. Press Report ID lost. Alder checks a replacement, signs a new statement for Alex's pod, and withdraws the old one in its status list.",
    chapter: "3 Taking it back",
    clock: { day: DAY.lost },
    done: { event: write("bank", "/status/list", "bank") },
    expect: [
      write("alex", STATEMENT, "alex"),
      write("bank", "/issued/kyc-attestation-v2", "bank"),
      write("bank", "/status/list", "bank"),
    ],
    id: "reissue",
    lens: {
      chips: [
        { kind: "credential", label: "New attestation" },
        { kind: "pod write", label: "Status list" },
      ],
      headline: "The issuer can withdraw what it said",
    },
    mode: "interactive",
    path: "kyc",
    realWorld: {
      rule: "A lost identity document is usually reported to its issuer and to each institution that kept a copy.",
      stage: "After the application",
    },
    title: "The bank withdraws and re-issues",
  },
  {
    app: "wallet",
    body: "The journey ledger lists the one read of Alex's statement, the refused one, and both withdrawals: Cairn closing access, and Alder withdrawing its word. The totals are counted from that log.",
    chapter: "Summary",
    clock: { day: DAY.lost },
    done: {},
    expect: [],
    id: "ledger",
    lens: {
      chips: [{ kind: "pod read", label: "One read" }],
      headline: "One set of checks, two institutions, one read",
    },
    mode: "summary",
    path: "kyc/ledger",
    realWorld: {
      stage: "After the application",
    },
    title: "Checked once, relied on once",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
