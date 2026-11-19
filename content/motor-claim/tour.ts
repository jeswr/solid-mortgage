// AUTHORED-BY Claude Opus 5.5
/**
 * The ten tour steps of the motor-claim demo (flows.md section 7). Step ids follow the video
 * narration (`video/motor-claim/narration.md`). This file holds the copy and what each step must
 * show; `journey.ts` holds what each step does to the pods.
 *
 * `action.target` names are `data-tour` attributes on the wallet's motor-claim sections, the
 * insurer's claims desk and the repairer's job card. Step 6 is a summary step: the wallet page it
 * opens lists, from the log, what the workshop read and what it never saw.
 */

import type { PodEvent, TourStep } from "@mortgage/demo-kit/contracts";
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

/** Any rewrite of a resource's rules, whatever it changes. */
const rulesRewritten = (path: string): Partial<PodEvent> => ({
  method: "PUT",
  path: `${path}.acl`,
  pod: "alex",
});

const CLAIM = "/claims/CLM-1/";
const PHOTO = `${CLAIM}photos/rear-bumper.svg`;

export const CHAPTERS = Object.freeze([
  "1 The claim file",
  "2 The insurer",
  "3 The repairer",
  "4 When the job ends",
] as const);

export const TOUR: readonly TourStep[] = Object.freeze([
  {
    action: { label: "Start claim", target: "wallet-mc-start" },
    app: "wallet",
    body: "Someone reversed into Alex's parked car. Before telling anyone, Alex starts the claim in their own pod: what happened, two photos and the other driver's details, in a folder for claim CLM-1. Press Start claim.",
    chapter: "1 The claim file",
    clock: { day: DAY.incident },
    done: { event: write("alex", `${CLAIM}incident`, "alex") },
    expect: [
      write("alex", PHOTO, "alex"),
      write("alex", `${CLAIM}other-party`, "alex"),
      write("alex", `${CLAIM}incident`, "alex"),
    ],
    id: "new-claim",
    lens: {
      chips: [
        { kind: "pod write", label: "Incident report" },
        { kind: "pod write", label: "Photos" },
      ],
      headline: "The claim file starts in Alex's pod",
    },
    mode: "interactive",
    path: "claim",
    realWorld: {
      rule: "Today a first notice of loss is usually a phone call or a web form, and the photos follow by email.",
      stage: "First notice of loss",
    },
    title: "Start the claim in Alex's pod",
  },
  {
    action: { label: "Report claim", target: "insurer-mc-report" },
    app: "insurer",
    body: "On Wrenfield Mutual's claims page Alex reports the claim. Wrenfield asks for three things, the driving licence, the motor policy and this claim's folder, until the claim closes. Alex approves grant C1 there and then. Press Report claim.",
    chapter: "2 The insurer",
    clock: { day: DAY.incident },
    // The case record is reportClaim's last write: the step is done only once nothing is in flight.
    done: { event: write("insurer", "/claims/CLM-1", "insurer") },
    expect: [
      write("alex", "/policies/c1"),
      write("alex", "/consents/c1-given"),
      grant(CLAIM),
      write("insurer", "/claims/CLM-1", "insurer"),
    ],
    id: "report",
    lens: {
      chips: [{ kind: "grant", label: "C1 to Wrenfield" }],
      headline: "The insurer reads what it needs for this claim",
    },
    mode: "interactive",
    path: "claims",
    realWorld: {
      rule: "Motor policies generally ask the policyholder to report an accident promptly and to cooperate with the claim.",
      stage: "First notice of loss",
    },
    title: "Report it to the insurer",
  },
  {
    action: { label: "Check and assess", target: "insurer-mc-check" },
    app: "insurer",
    body: "The claims handler checks the licence and the policy at source. Both are signed credentials, so nobody has to phone anyone. Then the handler reads the claim file and writes a damage report into it. Press Check and assess.",
    chapter: "2 The insurer",
    clock: { day: DAY.desk },
    done: { event: write("insurer", "/claims/CLM-1", "insurer") },
    expect: [
      read("alex", "/identity/driver-licence", "insurer"),
      read("alex", "/insurance/motor-policy", "insurer"),
      read("alex", `${CLAIM}incident`, "insurer"),
      read("alex", `${CLAIM}other-party`, "insurer"),
      read("alex", PHOTO, "insurer"),
      { kind: "verified", org: "insurer" },
      write("alex", `${CLAIM}damage-report`, "insurer"),
      write("insurer", "/claims/CLM-1", "insurer"),
    ],
    id: "claims-desk",
    lens: {
      chips: [
        { kind: "credential", label: "Licence and policy" },
        { kind: "pod write", label: "Damage report" },
      ],
      headline: "Licence and cover verified without a phone call",
    },
    mode: "interactive",
    path: "claims/desk",
    realWorld: {
      rule: "Insurers usually confirm the driver and the cover before they assess the damage.",
      stage: "Claim assessment",
    },
    title: "The claims desk checks and assesses",
  },
  {
    action: { label: "Approve", target: "wallet-mc-approve-repairer" },
    app: "wallet",
    body: "Wrenfield referred the job to Anvil Collision Repair, and Anvil asked Alex for access. Grant C2 covers the damage report and the photos, and lets Anvil add its estimate and invoice, until the job is complete. Press Approve.",
    chapter: "3 The repairer",
    clock: { day: DAY.desk },
    // Anvil's job record is the last write the approval leads to (the grant notice opens it).
    done: { event: write("repairer", "/jobs/CLM-1", "repairer") },
    expect: [
      write("alex", "/policies/c2"),
      write("alex", "/consents/c2-given"),
      grant(`${CLAIM}damage-report`),
      grant(`${CLAIM}photos/`),
      write("repairer", "/jobs/CLM-1", "repairer"),
    ],
    id: "repairer-consent",
    lens: {
      chips: [{ kind: "grant", label: "C2 to Anvil" }],
      headline: "The repairer gets the damage, not the driver",
    },
    mode: "interactive",
    path: "claim/requests",
    realWorld: {
      stage: "Repair",
    },
    title: "Let the repairer see the damage",
  },
  {
    action: { label: "Write estimate", target: "repairer-write-estimate" },
    app: "repairer",
    body: "At Anvil's workshop the job card opens the damage report and the photos, straight from Alex's pod. Press Write estimate: the estimate goes back into the claim folder, where the insurer will read it.",
    chapter: "3 The repairer",
    clock: { day: DAY.estimate },
    done: { event: write("alex", `${CLAIM}estimate`, "repairer") },
    expect: [
      read("alex", `${CLAIM}damage-report`, "repairer"),
      read("alex", PHOTO, "repairer"),
      write("alex", `${CLAIM}estimate`, "repairer"),
    ],
    id: "job-card",
    lens: {
      chips: [
        { kind: "pod read", label: "Damage report and photos" },
        { kind: "pod write", label: "Estimate" },
      ],
      headline: "The workshop read two things",
    },
    mode: "interactive",
    path: "jobs/CLM-1",
    realWorld: {
      rule: "Repairers usually send an estimate for the insurer to approve before they start work.",
      stage: "Repair",
    },
    title: "The job card and the estimate",
  },
  {
    app: "wallet",
    body: "Cairn lists who read each part of the claim file, from the pod's own log. Anvil read the damage report and the photos. It never saw the licence, the policy or the other driver's details: no rule let it.",
    chapter: "3 The repairer",
    clock: { day: DAY.estimate },
    done: {},
    expect: [],
    id: "not-shared",
    lens: {
      chips: [{ kind: "pod read", label: "Two things read" }],
      headline: "Anvil did not see: licence, policy, the other party's details",
    },
    mode: "summary",
    path: "claim/seen",
    realWorld: {
      stage: "Repair",
    },
    title: "What the workshop never saw",
  },
  {
    action: { label: "Approve estimate", target: "insurer-mc-approve-estimate" },
    app: "insurer",
    body: "Wrenfield's handler reads Anvil's estimate where Anvil wrote it, in Alex's claim folder: no attachment and no re-keying. Press Approve estimate: Wrenfield records it on the claim and authorises the repair.",
    chapter: "3 The repairer",
    clock: { day: DAY.estimate },
    done: { event: write("insurer", "/claims/CLM-1", "insurer") },
    expect: [
      read("alex", `${CLAIM}estimate`, "insurer"),
      { kind: "org-to-org", org: "insurer" },
      write("insurer", "/claims/CLM-1", "insurer"),
    ],
    id: "approve-estimate",
    lens: {
      chips: [{ kind: "pod read", label: "Estimate" }],
      headline: "The insurer reads the estimate where the repairer wrote it",
    },
    mode: "interactive",
    path: "claims/desk",
    realWorld: {
      stage: "Repair authorisation",
    },
    title: "The insurer approves the estimate",
  },
  {
    action: { label: "Complete job", target: "repairer-complete-job" },
    app: "repairer",
    body: "Five days later the car is ready. Press Complete job: Anvil files its invoice in the claim folder. C2 was for this job only, so Alex's wallet sees the invoice, marks the grant expired and removes Anvil's rules.",
    chapter: "4 When the job ends",
    clock: { day: DAY.complete },
    // The wallet removes Anvil's rules first and records the expiry once they are gone.
    done: { event: write("alex", "/consents/c2-expired") },
    expect: [
      write("alex", `${CLAIM}invoice`, "repairer"),
      write("repairer", "/jobs/CLM-1", "repairer"),
      revoke(`${CLAIM}photos/`),
      write("alex", "/consents/c2-expired"),
    ],
    id: "complete",
    lens: {
      chips: [
        { kind: "pod write", label: "Invoice" },
        { kind: "grant", label: "C2 expired" },
      ],
      headline: "The grant ended with the job",
    },
    mode: "interactive",
    path: "jobs/CLM-1",
    realWorld: {
      stage: "Repair complete",
    },
    title: "The job ends, and so does C2",
  },
  {
    action: { label: "Open photos", target: "repairer-open-photos" },
    app: "repairer",
    body: "Later, someone at the workshop opens the job's photos again. Press Open photos. Anvil's request reaches Alex's pod, and the pod refuses it. Nothing at Anvil was deleted; its access ended with the job.",
    chapter: "4 When the job ends",
    clock: { day: DAY.complete },
    done: { event: { actor: actedBy("repairer"), kind: "denied", path: PHOTO, pod: "alex" } },
    expect: [{ actor: actedBy("repairer"), kind: "denied", path: PHOTO, pod: "alex", status: 403 }],
    id: "refused",
    lens: {
      chips: [{ kind: "denied", label: "Anvil" }],
      headline: "403",
    },
    mode: "interactive",
    path: "jobs/CLM-1",
    realWorld: {
      stage: "After the repair",
    },
    title: "Open the photos again: refused",
  },
  {
    action: { label: "Close claim", target: "wallet-mc-close" },
    app: "wallet",
    body: "Wrenfield has paid the invoice. Press Close claim: Alex withdraws C1, so Wrenfield no longer reads the licence or the claim folder. Grant P1 stays, and Wrenfield still keeps the motor policy current. The ledger below counts it all.",
    chapter: "4 When the job ends",
    clock: { day: DAY.close },
    // The wallet rewrites the rules first (the claim's revoke, then the policy's, where Wrenfield
    // keeps its read under P1) and records the withdrawal once they are written.
    done: { event: write("alex", "/consents/c1-withdrawn") },
    expect: [
      revoke(CLAIM),
      rulesRewritten("/insurance/motor-policy"),
      write("alex", "/consents/c1-withdrawn"),
    ],
    id: "close",
    lens: {
      chips: [{ kind: "grant", label: "C1 withdrawn" }],
      headline: "The policy grant stays. The claim grant is gone",
    },
    mode: "interactive",
    path: "claim/sharing",
    realWorld: {
      stage: "Claim closed",
    },
    title: "Close the claim",
  },
]);

/** Every `data-tour` action target, for the apps' tests. */
export const ACTION_TARGETS: readonly string[] = Object.freeze(
  TOUR.flatMap((step) => (step.action === undefined ? [] : [step.action.target])),
);
