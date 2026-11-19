// AUTHORED-BY Claude Opus 5.5
/**
 * The ten tour steps of the moving-house demo (flows.md section 2). Step ids follow the video
 * narration (`video/moving-house/narration.md`). This file holds the copy and what each step must
 * show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the wallet's moving-house sections and the
 * state app's Driver Services page. Steps that only show something (1, 5, 6, 7, 10) are summary
 * steps: they complete when reached (step 1 when its page has read the pod); the pages they open
 * still read the pod for real.
 */

import type { PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
import { DAY } from "./facts.js";

export { DEMO } from "./facts.js";

type Pod = PodEvent["pod"];

const actedBy = (org: PodEvent["actor"]["org"]): PodEvent["actor"] =>
  ({ org }) as PodEvent["actor"];

const read = (pod: Pod, path: string, org?: PodEvent["actor"]["org"]): Partial<PodEvent> => ({
  kind: "read",
  method: "GET",
  path,
  pod,
  status: 200,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
const write = (pod: Pod, path: string, org?: PodEvent["actor"]["org"]): Partial<PodEvent> => ({
  kind: "write",
  method: "PUT",
  path,
  pod,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
const grant = (path: string): Partial<PodEvent> => ({
  kind: "grant",
  method: "PUT",
  path: `${path}.acl`,
  pod: "alex",
});
const revoke = (path: string): Partial<PodEvent> => ({
  kind: "revoke",
  method: "PUT",
  path: `${path}.acl`,
  pod: "alex",
});

export const CHAPTERS = Object.freeze([
  "1 One address",
  "2 Who should know",
  "3 Everyone reads it",
  "4 Taking one away",
  "Summary",
] as const);

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    app: "wallet",
    body: "Alex closed on 14 Larch Lane yesterday. Cairn shows the one address record in Alex's pod, and its description as a data product: one owner, a stated purpose, and the organisations that read it.",
    chapter: "1 One address",
    clock: { day: DAY.moved },
    // Done when the page has read the data product description (a summary step opened by the
    // welcome page's deep link is never "gone to", so it cannot complete on arrival).
    done: { event: read("alex", "/profile/address.dprod") },
    expect: [read("alex", "/profile/address", "alex"), read("alex", "/profile/address.dprod")],
    id: "address",
    lens: {
      chips: [{ kind: "pod read", label: "Your address" }],
      headline: "One address, one owner, described as a data product",
    },
    mode: "summary",
    path: "moving",
    realWorld: {
      rule: "Today a move means a change-of-address form for each organisation, and each keeps its own copy.",
      stage: "After the move",
    },
    title: "One address, kept by Alex",
  },
  {
    action: { label: "Save address", target: "wallet-mh-save-address" },
    app: "wallet",
    body: "Alex types the new address once, effective today. Cairn checks it against the recording receipt from closing, already in the pod, and links it as the proof of address. Press Save address.",
    chapter: "1 One address",
    clock: { day: DAY.moved },
    done: { event: write("alex", "/profile/address", "alex") },
    expect: [
      read("alex", "/mortgage/closing/recording-receipt", "alex"),
      write("alex", "/profile/address", "alex"),
    ],
    id: "change",
    lens: {
      chips: [
        { kind: "pod read", label: "Recording receipt" },
        { kind: "pod write", label: "Your address" },
      ],
      headline: "One write. The evidence was already in the pod from closing",
    },
    mode: "interactive",
    path: "moving/address",
    realWorld: {
      rule: "Proof of address is usually a utility bill or a lease, copied again for each organisation.",
      stage: "After the move",
    },
    title: "Change it once, with the deed",
  },
  {
    action: { label: "Approve", target: "wallet-mh-approve" },
    app: "wallet",
    body: "Alex ticks six organisations: the state, the county, Alder Bank, the insurer, payroll and the servicer. Each gets a standing grant to read this one record for one purpose: keeping the address current. Press Approve.",
    chapter: "2 Who should know",
    clock: { day: DAY.moved },
    done: { event: write("alex", "/profile/address.dprod", "alex") },
    expect: [
      write("alex", "/policies/h1"),
      write("alex", "/policies/h6"),
      write("alex", "/consents/h1-given"),
      write("alex", "/consents/h6-given"),
      grant("/profile/address"),
      write("alex", "/profile/address.dprod", "alex"),
    ],
    id: "who",
    lens: {
      chips: [
        { kind: "grant", label: "H1 to H6" },
        { kind: "pod write", label: "Data product description" },
      ],
      headline: "Six standing grants to one resource",
    },
    mode: "interactive",
    path: "moving/who",
    realWorld: {
      rule: "Each organisation usually needs its own change-of-address form, letter or call.",
      stage: "After the move",
    },
    title: "Choose who should know",
  },
  {
    action: { label: "Update licence", target: "state-update-licence" },
    app: "state",
    body: "State Online Services opens Alex's record and reads the address and the recorded deed under grant H1. Press Update licence: it signs a new licence credential with the new address and withdraws the old one.",
    chapter: "3 Everyone reads it",
    clock: { day: DAY.moved },
    done: { event: write("alex", "/identity/driver-licence", "state") },
    expect: [
      read("alex", "/profile/address", "state"),
      read("alex", "/mortgage/closing/recording-receipt", "state"),
      write("alex", "/identity/driver-licence", "state"),
      write("state", "/status/list", "state"),
    ],
    id: "driver-services",
    lens: {
      chips: [
        { kind: "pod read", label: "Address and evidence" },
        { kind: "credential", label: "Driver licence" },
      ],
      headline: "The agency read the address and its evidence, and wrote back a new credential",
    },
    mode: "interactive",
    path: "driver-services",
    realWorld: {
      rule: "US states generally require a licence holder to report a change of address within a set number of days.",
      stage: "After the move",
    },
    title: "Driver Services reads, then re-issues",
  },
  {
    app: "county",
    body: "Marlow County's treasurer opens its record for Alex. It reads the address under grant H2 and keeps a copy that says where it came from, so tax bills go to the new house.",
    chapter: "3 Everyone reads it",
    clock: { day: DAY.moved },
    done: {},
    expect: [
      read("alex", "/profile/address", "county"),
      write("county", "/treasurer/alex-address"),
    ],
    id: "treasurer",
    lens: {
      chips: [{ kind: "pod read", label: "Your address" }],
      headline: "Tax bills now go to the right place. No form",
    },
    mode: "summary",
    path: "moving/treasurer",
    realWorld: {
      rule: "County treasurers mail property tax bills to the owner's address on file.",
      stage: "After the move",
    },
    title: "The county treasurer reads it",
  },
  {
    app: "insurer",
    body: "Wrenfield Mutual reads the address under grant H4. The car policy's garaging address follows Alex to Larch Lane. Any premium change it shows is an illustrative figure.",
    chapter: "3 Everyone reads it",
    clock: { day: DAY.moved },
    done: {},
    expect: [
      read("alex", "/profile/address", "insurer"),
      write("insurer", "/policyholders/alex-address"),
    ],
    id: "insurer",
    lens: {
      chips: [{ kind: "pod read", label: "Your address" }],
      headline: "The car's garaging address updated itself; the premium note is illustrative",
    },
    mode: "summary",
    path: "moving/policies",
    realWorld: {
      rule: "Car insurers rate a policy partly on where the car is kept.",
      stage: "After the move",
    },
    title: "The insurer updates the car policy",
  },
  {
    app: "wallet",
    body: "Cairn lists who has read Alex's address. Alder Bank, Ledgerly and Marigold read it as soon as their grants arrived; the state, the county and the insurer when they opened it.",
    chapter: "3 Everyone reads it",
    clock: { day: DAY.moved },
    done: {},
    expect: [
      read("alex", "/profile/address", "bank"),
      read("alex", "/profile/address", "payroll"),
      read("alex", "/profile/address", "servicer"),
    ],
    id: "readers",
    lens: {
      chips: [{ kind: "pod read", label: "Six readers" }],
      headline: "Bank, payroll and servicer read the same resource. Six readers, one copy",
    },
    mode: "summary",
    path: "moving/readers",
    realWorld: {
      stage: "After the move",
    },
    title: "Six readers, one copy",
  },
  {
    action: { label: "Withdraw", target: "wallet-mh-revoke-bank" },
    app: "wallet",
    body: "Alex is closing the old Alder Bank account, so the bank no longer needs the address. Press Withdraw: Cairn records the withdrawal and removes the bank's rule from the address.",
    chapter: "4 Taking one away",
    clock: { day: DAY.moved },
    // The rule goes first; the withdrawal is recorded once it is gone, and that ends the step.
    done: { event: write("alex", "/consents/h3-withdrawn") },
    expect: [revoke("/profile/address"), write("alex", "/consents/h3-withdrawn")],
    id: "revoke-bank",
    lens: {
      chips: [{ kind: "grant", label: "H3 withdrawn" }],
      headline: "The rule is removed",
    },
    mode: "interactive",
    path: "moving/sharing",
    realWorld: {
      stage: "After the move",
    },
    title: "Withdraw Alder Bank's grant",
  },
  {
    action: { label: "Save correction", target: "wallet-mh-correct-unit" },
    app: "wallet",
    body: "A week later Alex notices the old flat's unit number carried over. Press Save correction. Every subscribed organisation is told the record changed, and reads it again under its grant.",
    chapter: "4 Taking one away",
    clock: { day: DAY.correction },
    done: {
      event: { actor: actedBy("bank"), kind: "denied", path: "/profile/address", pod: "alex" },
    },
    expect: [
      write("alex", "/profile/address", "alex"),
      { kind: "notified", org: "bank" },
      read("alex", "/profile/address", "payroll"),
      {
        actor: actedBy("bank"),
        kind: "denied",
        path: "/profile/address",
        pod: "alex",
        status: 403,
      },
      write("bank", "/customers/alex-address", "bank"),
    ],
    id: "correction",
    lens: {
      chips: [
        { kind: "pod write", label: "Your address" },
        { kind: "pod read", label: "Five readers" },
        { kind: "denied", label: "Alder Bank" },
      ],
      headline:
        "Five organisations read the correction. Alder's request is refused (403) and its record is now stale",
    },
    mode: "interactive",
    path: "moving/address",
    realWorld: {
      stage: "A week after the move",
    },
    title: "Correct the unit, a week later",
  },
  {
    app: "wallet",
    body: "The journey ledger lists every read of Alex's address, with the grant that allowed it, and the one the pod refused. The totals are counted from that log.",
    chapter: "Summary",
    clock: { day: DAY.correction },
    done: {},
    expect: [],
    id: "ledger",
    lens: {
      chips: [{ kind: "pod read", label: "Eleven reads" }],
      headline: "One resource, six organisations, eleven reads, no forms",
    },
    mode: "summary",
    path: "moving/ledger",
    realWorld: {
      stage: "A week after the move",
    },
    title: "One record, six organisations",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
