// AUTHORED-BY Claude Opus 5.5
/**
 * Anvil Collision Repair's side (steps 4, 5, 8 and 9, and its back office). Every read of Alex's
 * pod is made as the repairer, so the pod decides it under grant C2: the damage report and the
 * photos, and nothing else. Anvil keeps its own job record in its own pod.
 */

import {
  buildClaimCase,
  buildRepairEstimate,
  buildRepairInvoice,
  type CaseStatusIri,
  CLAIM_SCHEMA,
  ClaimCase,
  DamageReport,
  MORT,
  type MortgageResource,
  type RepairEstimate,
  type RepairInvoice,
} from "@mortgage/data-model";
import { DataFactory } from "n3";
import {
  at,
  documentUrl,
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  readText,
  statusOf,
  toTurtle,
  type World,
  webid,
} from "../mortgage/world.js";
import { alexUrl } from "./claim.js";
import { CLAIM_NUMBER, ESTIMATE, ORG_PATHS, PATHS } from "./facts.js";
import {
  applyMotorClaimExpiries,
  findClaimRequest,
  motorPolicyUrl,
  readGrantNotice,
  requestClaimGrant,
} from "./grants.js";
import { withAlexGrantLock } from "./lock.js";
import { answerMotorOnce, readMotorMessage, send } from "./messages.js";
import { PHOTO_TYPE } from "./photos.js";

export const jobUrl = (world: Pick<World, "podOrigin">): string =>
  podUrl(world, "repairer", ORG_PATHS.repairerJob);

/** Anvil's job record, once Alex's grant has reached it. */
export async function readJob(world: World): Promise<ClaimCase | undefined> {
  const repairer = world.fetchAs("repairer");
  const url = jobUrl(world);
  if ((await statusOf(repairer, url)) !== 200) return undefined;
  return new ClaimCase(url, await readDataset(repairer, url), DataFactory);
}

async function writeJob(
  world: World,
  fields: { status?: CaseStatusIri; acceptedEstimate?: string; description: string; time: string },
): Promise<ClaimCase> {
  const current = await readJob(world);
  const acceptedEstimate = fields.acceptedEstimate ?? current?.acceptedEstimateIri;
  const url = await putResource(
    world.fetchAs("repairer"),
    buildClaimCase({
      caseKind: MORT.CaseKind_RepairJob,
      claimFile: alexUrl(world, PATHS.claim),
      claimNumber: CLAIM_NUMBER,
      customer: webid(world, "alex"),
      description: fields.description,
      iri: jobUrl(world),
      modified: at(world, fields.time),
      policy: motorPolicyUrl(world, "C2"),
      status:
        fields.status ??
        (current?.status as CaseStatusIri | undefined) ??
        CLAIM_SCHEMA.ActiveActionStatus,
      ...(acceptedEstimate === undefined ? {} : { acceptedEstimate }),
    }),
  );
  return new ClaimCase(url, await readDataset(world.fetchAs("repairer"), url), DataFactory);
}

/**
 * Create a document in Alex's claim folder unless it is there already. Anvil may write its two
 * documents but not read them back (C2 has no Read on them), so it asks the pod to refuse an
 * overwrite (`If-None-Match: *`) instead of looking first. Returns whether it was written.
 */
async function createOnce(world: World, resource: MortgageResource): Promise<boolean> {
  const url = documentUrl(resource.value);
  const response = await world.fetchAs("repairer")(url, {
    body: await toTurtle(resource),
    headers: { "content-type": "text/turtle", "if-none-match": "*" },
    method: "PUT",
  });
  if (response.status === 412) return false;
  if (!response.ok) throw new PodRequestError("PUT", url, response.status);
  return true;
}

// --- Back office ---------------------------------------------------------------------------------

/**
 * Wrenfield's referral landed: Anvil asks Alex for C2 (an ODRL request in Alex's inbox). Returns
 * the request's URL, or `undefined` when another caller holds the referral.
 */
export function takeReferral(world: World, referralUrl: string): Promise<string | undefined> {
  return answerMotorOnce(world, "repairer", referralUrl, "10:26", async () => {
    await readMotorMessage(world, "repairer", referralUrl);
    // One request per job: a referral repeated after Anvil has asked changes nothing.
    return (await findClaimRequest(world, "C2")) ?? requestClaimGrant(world, "C2", "10:26");
  });
}

/** Alex's wallet sent Anvil a copy of its agreement: Anvil opens the job record. */
export function takeGrantNotice(world: World, noticeUrl: string): Promise<ClaimCase | undefined> {
  return answerMotorOnce(world, "repairer", noticeUrl, "11:01", async () => {
    const notice = await readGrantNotice(world, "repairer", noticeUrl);
    if (notice.grantCode !== "C2") throw new Error(`unexpected grant notice ${notice.grantCode}`);
    return (
      (await readJob(world)) ??
      writeJob(world, {
        description:
          "Job opened. The policyholder granted the damage report and the photos until the job is complete.",
        status: CLAIM_SCHEMA.ActiveActionStatus,
        time: "11:02",
      })
    );
  });
}

/** Wrenfield authorised the repair: the job record names the accepted estimate. */
export function takeAuthorisation(
  world: World,
  authorisationUrl: string,
): Promise<ClaimCase | undefined> {
  return answerMotorOnce(world, "repairer", authorisationUrl, "15:01", async () => {
    const message = await readMotorMessage(world, "repairer", authorisationUrl);
    const estimate = [...message.objectIris].find((url) => url === alexUrl(world, PATHS.estimate));
    if (estimate === undefined) throw new Error("the authorisation names no estimate of this job");
    return writeJob(world, {
      acceptedEstimate: estimate,
      description: "Estimate approved by Wrenfield Mutual. Parts ordered.",
      time: "15:01",
    });
  });
}

// --- The job card ---------------------------------------------------------------------------------

/** What the job card reads from Alex's pod: exactly the two things C2 allows. */
export interface JobView {
  readonly damageReport: DamageReport;
  readonly photos: readonly { url: string; svg: string }[];
}

/** Anvil reads the damage report and the photos it names. A refusal is thrown. */
export async function openJob(world: World): Promise<JobView> {
  const repairer = world.fetchAs("repairer");
  const url = alexUrl(world, PATHS.damageReport);
  const damageReport = new DamageReport(url, await readDataset(repairer, url), DataFactory);
  const photos: { url: string; svg: string }[] = [];
  for (const photo of damageReport.photos) {
    photos.push({ svg: await readText(repairer, photo, PHOTO_TYPE), url: photo });
  }
  return { damageReport, photos };
}

/**
 * Step 5. The workshop opens the job (the damage report and the photos) and writes its estimate
 * into Alex's claim folder, where Wrenfield will read it. Writing again changes nothing.
 */
export async function sendEstimate(
  world: World,
): Promise<JobView & { readonly estimate: RepairEstimate }> {
  const view = await openJob(world);
  const estimate = buildRepairEstimate({
    about: view.damageReport.value,
    created: at(world, "11:40"),
    creator: webid(world, "repairer"),
    estimateNumber: ESTIMATE.estimateNumber,
    iri: alexUrl(world, PATHS.estimate),
    lineItems: ESTIMATE.lineItems.map((item) => ({ ...item })),
    name: `Repair estimate ${ESTIMATE.estimateNumber}`,
  });
  await createOnce(world, estimate);
  return { ...view, estimate };
}

/** What step 8 wrote and ended. */
export interface Completion {
  readonly invoice: RepairInvoice;
  readonly job: ClaimCase;
  /** The grants Alex's wallet expired: `["C2"]` the first time. */
  readonly expired: readonly string[];
}

/**
 * Step 8. The repair is finished: Anvil files its invoice in Alex's claim folder and closes the
 * job; Alex's wallet sees the end event's evidence (the invoice) and expires C2, which removes
 * Anvil's rules. Wrenfield is told the job is complete.
 */
export async function completeJob(world: World): Promise<Completion> {
  const url = alexUrl(world, PATHS.invoice);
  const before = await readJob(world);
  const invoice = buildRepairInvoice({
    created: at(world, "16:00"),
    creator: webid(world, "repairer"),
    estimate: alexUrl(world, PATHS.estimate),
    invoiceNumber: ESTIMATE.invoiceNumber,
    iri: url,
    lineItems: ESTIMATE.lineItems.map((item) => ({ ...item })),
    name: `Invoice ${ESTIMATE.invoiceNumber}`,
  });
  if (before?.completed !== true) await createOnce(world, invoice);
  const job =
    before?.completed === true
      ? before
      : await writeJob(world, {
          description: `Repair complete. Invoice ${ESTIMATE.invoiceNumber} filed in the policyholder's claim folder.`,
          status: CLAIM_SCHEMA.CompletedActionStatus,
          time: "16:02",
        });
  // Alex's wallet applies the end: the invoice is the evidence that the job is complete.
  const expired = await withAlexGrantLock(() => applyMotorClaimExpiries(world, "16:05"));
  if (before?.completed !== true) {
    await send(world, {
      from: "repairer",
      kind: MORT.MessageKind_RepairCompletion,
      objects: [url],
      summary: `Repair on claim ${CLAIM_NUMBER} complete. Invoice ${ESTIMATE.invoiceNumber} is in the policyholder's claim folder.`,
      time: "16:10",
      to: "insurer",
    });
  }
  return { expired, invoice, job };
}

/**
 * Step 9. The workshop opens the photos again. The answer is the pod's: after the job, 403.
 * Returns the status of each attempt, without throwing.
 */
export async function openPhotosAgain(world: World): Promise<{ url: string; status: number }> {
  const url = alexUrl(world, `${PATHS.photos}rear-bumper.svg`);
  const response = await world.fetchAs("repairer")(url, { headers: { accept: PHOTO_TYPE } });
  return { status: response.status, url };
}
