// AUTHORED-BY Claude Opus 5.5
/**
 * The ten tour steps of the medication handover (flows.md section 5). Step ids follow the video
 * narration (`video/medication-handover/narration.md`). This file holds the copy and what each
 * step must show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the wallet's health sections and the
 * hospital, pharmacy and practice pages. Steps 1 and 8 are summary steps that complete on the
 * page's last read; steps 5 and 10 complete when reached. Everything clinical is fictional and
 * none of it is clinical guidance.
 */

import type { PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
import { DAY } from "./facts.js";

export { DEMO } from "./facts.js";

type Pod = PodEvent["pod"];
type Actor = PodEvent["actor"]["org"];

const actedBy = (org: Actor): PodEvent["actor"] => ({ org }) as PodEvent["actor"];

const read = (pod: Pod, path: string, org?: Actor): Partial<PodEvent> => ({
  kind: "read",
  method: "GET",
  path,
  pod,
  status: 200,
  ...(org === undefined ? {} : { actor: actedBy(org) }),
});
const write = (pod: Pod, path: string, org?: Actor): Partial<PodEvent> => ({
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
  pod: "rosa",
});
const revoke = (path: string): Partial<PodEvent> => ({
  kind: "revoke",
  method: "PUT",
  path: `${path}.acl`,
  pod: "rosa",
});
const denied = (path: string, org: Actor): Partial<PodEvent> => ({
  actor: actedBy(org),
  kind: "denied",
  path,
  pod: "rosa",
});

export const CHAPTERS = Object.freeze([
  "1 Leaving hospital",
  "2 The pharmacy",
  "3 The practice",
  "4 Changing pharmacy",
  "Summary",
] as const);

const STAGE_DISCHARGE = "Discharge day";
const STAGE_WEEK = "A week later";

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    app: "wallet",
    body: "An idealised future: no single organisation could run this today. Rosa Rivera, Alex's mother, is leaving hospital. Her medicines and allergy are in her own pod; the hospital wrote to it during her stay under grant M1, which she gave. All clinical details are fictional.",
    chapter: "1 Leaving hospital",
    clock: { day: DAY.discharge },
    // Completes when the page has read the allergy, its last read.
    done: { event: read("rosa", "/allergies/amoxicillin", "rosa") },
    expect: [
      read("rosa", "/medications/lisinopril", "rosa"),
      read("rosa", "/allergies/amoxicillin"),
    ],
    id: "health",
    lens: {
      chips: [{ kind: "pod read", label: "Medicines and allergy" }],
      headline: "Rosa's medication list lives in her pod",
    },
    mode: "summary",
    path: "health",
    realWorld: {
      rule: "Medication changes at discharge usually travel by letter, then are typed again at the pharmacy and the practice.",
      stage: STAGE_DISCHARGE,
    },
    title: "Rosa's medicines, in her pod",
  },
  {
    action: { label: "Sign", target: "hospital-sign-discharge" },
    app: "hospital",
    body: "Imani Brooks, the ward pharmacist, reconciles Rosa's list: ibuprofen stopped, lisinopril raised to 20 mg, atorvastatin new. Each change carries a reason. Press Sign to write them, with the discharge summary, to Rosa's pod.",
    chapter: "1 Leaving hospital",
    clock: { day: DAY.discharge },
    done: { event: write("rosa", "/discharge/summary", "hospital") },
    expect: [
      read("rosa", "/medications/ibuprofen", "hospital"),
      write("rosa", "/medications/ibuprofen", "hospital"),
      write("rosa", "/medications/provenance/ibuprofen-day-53", "hospital"),
      write("rosa", "/medications/atorvastatin", "hospital"),
      write("rosa", "/medications/requests/atorvastatin", "hospital"),
      write("rosa", "/discharge/summary", "hospital"),
    ],
    id: "discharge",
    lens: {
      chips: [
        { kind: "pod write", label: "Three changes, with reasons" },
        { kind: "pod write", label: "Discharge summary" },
      ],
      headline: "The ward wrote the list once, with reasons, where everyone else will read it",
    },
    mode: "interactive",
    path: "discharge",
    realWorld: {
      rule: "A discharge letter is often the only record of why a medicine changed.",
      stage: STAGE_DISCHARGE,
    },
    title: "The ward signs three changes",
  },
  {
    action: { label: "Approve", target: "wallet-med-approve" },
    app: "wallet",
    body: "Home again, Rosa decides who may use her list. She lets Corner Dispensary read her medicines and allergies, lets Larch Lane Family Practice read and update her record, and lets her son Alex read the list. Nobody gets access she has not approved. Press Approve.",
    chapter: "1 Leaving hospital",
    clock: { day: DAY.discharge },
    done: { event: grant("/medications/dispenses/") },
    expect: [
      write("rosa", "/consents/m1-expired"),
      write("rosa", "/policies/m2"),
      write("rosa", "/policies/m3"),
      write("rosa", "/policies/m4"),
      write("rosa", "/consents/m4-given"),
      grant("/medications/"),
      grant("/medications/dispenses/"),
    ],
    id: "grants",
    lens: {
      chips: [
        { kind: "grant", label: "M2, M3 and M4" },
        { kind: "grant", label: "M1 ended" },
      ],
      headline: "Three grants with three different scopes",
    },
    mode: "interactive",
    path: "health/requests",
    realWorld: {
      rule: "Pharmacies and practices usually hold their own copies of a patient's medicines, each updated separately.",
      stage: STAGE_DISCHARGE,
    },
    title: "Rosa decides who can see it",
  },
  {
    action: { label: "Dispense", target: "pharmacy-dispense" },
    app: "pharmacy",
    body: "Grace Liu, the pharmacist, opens Rosa under grant M2. The list shows what changed since the last supply, and why. Press Dispense: the supply is recorded in Rosa's pod and in the pharmacy's own records.",
    chapter: "2 The pharmacy",
    clock: { day: DAY.discharge },
    done: { event: write("pharmacy", "/dispensing/rosa-atorvastatin-day-53", "pharmacy") },
    expect: [
      read("rosa", "/medications/lisinopril", "pharmacy"),
      read("rosa", "/allergies/amoxicillin", "pharmacy"),
      write("rosa", "/medications/dispenses/atorvastatin-day-53", "pharmacy"),
      write("pharmacy", "/dispensing/rosa-atorvastatin-day-53", "pharmacy"),
    ],
    id: "dispense",
    lens: {
      chips: [
        { kind: "pod read", label: "Medicines and allergies" },
        { kind: "pod write", label: "Dispensing record" },
      ],
      headline: "The pharmacist sees the change against the last supply. No fax, no retyping",
    },
    mode: "interactive",
    path: "queue",
    realWorld: {
      rule: "A pharmacist usually learns of a hospital change from a paper prescription or a faxed letter.",
      stage: STAGE_DISCHARGE,
    },
    title: "The pharmacy dispenses against the change",
  },
  {
    app: "pharmacy",
    body: "Open the Lens and its Not shared view. Corner Dispensary read Rosa's medicines and allergies. It never read the discharge summary: grant M2 does not cover it, and the pod would have refused.",
    chapter: "2 The pharmacy",
    clock: { day: DAY.discharge },
    done: {},
    expect: [],
    id: "not-shared",
    lens: {
      chips: [{ kind: "pod read", label: "Medicines and allergies only" }],
      headline: "The pharmacy saw medicines and allergies. Not the discharge summary",
      notShared: ["The discharge summary", "The hospital's notes on the stay"],
    },
    mode: "summary",
    path: "queue",
    realWorld: {
      stage: STAGE_DISCHARGE,
    },
    title: "What the pharmacy did not see",
  },
  {
    action: { label: "Save", target: "clinic-save-consultation" },
    app: "clinic",
    body: "A week later Dr Lena Marsh opens Rosa's record under grant M3, with the hospital's summary and reasons. Simvastatin and atorvastatin are both on the list. Press Save to stop the duplicate, with her name and reason.",
    chapter: "3 The practice",
    clock: { day: DAY.consultation },
    done: { event: write("clinic", "/consultations/rosa-day-60", "clinic") },
    expect: [
      read("rosa", "/discharge/summary", "clinic"),
      read("rosa", "/medications/simvastatin", "clinic"),
      write("rosa", "/medications/simvastatin", "clinic"),
      write("rosa", "/medications/provenance/simvastatin-day-60", "clinic"),
      write("clinic", "/consultations/rosa-day-60", "clinic"),
    ],
    id: "consultation",
    lens: {
      chips: [
        { kind: "pod write", label: "One change, with a reason" },
        { kind: "pod write", label: "Practice's own pointer" },
      ],
      headline: "The practice changed the same record. Its own system keeps a pointer, not a copy",
    },
    mode: "interactive",
    path: "consultation",
    realWorld: {
      rule: "A practice usually updates its own record, and the pharmacy hears about it separately.",
      stage: STAGE_WEEK,
    },
    title: "The practice stops a duplicate",
  },
  {
    action: { label: "Refresh", target: "pharmacy-refresh" },
    app: "pharmacy",
    body: "Back at Corner Dispensary, press Refresh. The pharmacy reads Rosa's list again under grant M2 and sees simvastatin stopped by Dr Marsh, with her reason. The practice and the pharmacy never exchanged a message.",
    chapter: "3 The practice",
    clock: { day: DAY.consultation },
    done: { event: read("rosa", "/medications/simvastatin", "pharmacy") },
    expect: [
      read("rosa", "/medications/provenance/simvastatin-day-60", "pharmacy"),
      read("rosa", "/medications/simvastatin", "pharmacy"),
    ],
    id: "pharmacy-refresh",
    lens: {
      chips: [{ kind: "pod read", label: "The same list" }],
      headline: "The pharmacy sees the practice's change on its next read",
    },
    mode: "interactive",
    path: "queue",
    realWorld: {
      stage: STAGE_WEEK,
    },
    title: "The pharmacy sees it next time",
  },
  {
    app: "wallet",
    body: "Alex opens Shared with me in his own wallet. Rosa's notice is in his inbox, and he reads her current list under grant M4: simvastatin stopped, atorvastatin current. He cannot change anything.",
    chapter: "3 The practice",
    clock: { day: DAY.consultation },
    done: { event: read("rosa", "/medications/simvastatin", "alex") },
    expect: [read("alex", "/inbox/"), read("rosa", "/medications/simvastatin", "alex")],
    id: "carer",
    lens: {
      chips: [{ kind: "pod read", label: "Medicines, read-only" }],
      headline: "A carer sees the current list, read-only",
    },
    mode: "summary",
    path: "health/shared?holder=alex",
    realWorld: {
      rule: "Carers often keep their own handwritten list of a relative's medicines.",
      stage: STAGE_WEEK,
    },
    title: "Alex sees the current list",
  },
  {
    action: { label: "Withdraw", target: "wallet-med-revoke-pharmacy" },
    app: "wallet",
    body: "Rosa moves to a pharmacy nearer home. Press Withdraw: her wallet records the withdrawal, removes Corner Dispensary from her ACLs and tells it. The pharmacy's next read of the list is refused.",
    chapter: "4 Changing pharmacy",
    clock: { day: DAY.changePharmacy },
    done: { event: denied("/medications/", "pharmacy") },
    expect: [
      write("rosa", "/consents/m2-withdrawn"),
      revoke("/medications/"),
      { ...denied("/medications/", "pharmacy"), status: 403 },
    ],
    id: "revoke",
    lens: {
      chips: [
        { kind: "grant", label: "M2 withdrawn" },
        { kind: "denied", label: "Corner Dispensary" },
      ],
      headline: "403. Past dispensing records stay with the pharmacy; the live list does not",
    },
    mode: "interactive",
    path: "health/sharing",
    realWorld: {
      rule: "Pharmacies keep their own dispensing records for a period the law sets.",
      stage: "A week later",
    },
    title: "Change pharmacy",
  },
  {
    app: "wallet",
    body: "The journey ledger counts from the log: one list, the organisations that wrote to it, who read it, every change and the provenance record signed with it, and the read the pod refused.",
    chapter: "Summary",
    clock: { day: DAY.changePharmacy },
    done: {},
    expect: [],
    id: "ledger",
    lens: {
      chips: [{ kind: "pod write", label: "Every change attributed" }],
      headline: "One list, three writers, every change attributed",
    },
    mode: "summary",
    path: "health/ledger",
    realWorld: {
      stage: "A week later",
    },
    title: "One list, three writers",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
