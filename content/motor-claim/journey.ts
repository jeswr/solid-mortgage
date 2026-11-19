// AUTHORED-BY Claude Opus 5.5
/**
 * What each of the ten steps of flows.md section 7 does to the pods, as plain functions over a
 * `World`. The pages call them (the wallet as Alex, the insurer and the repairer pages as
 * themselves); Anvil's back office reacts through `agents.ts`; the headless test runs them in
 * order against the real wasm. Copy lives in `tour.ts`.
 *
 *  1 wallet    startClaimFile      W claims/CLM-1/ (incident, other party, photos)
 *  2 insurer   reportClaim         C1 requested and approved; Wrenfield's claim record
 *  3 insurer   checkClaim          licence and policy checked at source; W damage-report; referral
 *  4 wallet    approveRepairer     C2 approved; a copy of the agreement to Anvil; Anvil's job
 *  5 repairer  sendEstimate        R damage-report, photos; W estimate
 *  6 wallet    (the not-shared view: nothing is written)
 *  7 insurer   approveEstimate     R estimate; authorisation to Anvil
 *  8 repairer  completeJob         W invoice; C2 expires
 *  9 repairer  openPhotosAgain     403
 * 10 wallet    closeClaim          C1 withdrawn; P1 stays
 */

import { AccessRequest, type ClaimCase } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { membersOf } from "../mortgage/grants.js";
import { answerOrAwait } from "../mortgage/messages.js";
import { readDataset, type World } from "../mortgage/world.js";
import { alexUrl, type ClaimFileView, readClaimFile } from "./claim.js";
import {
  approveClaimGrant,
  CLAIM_CODES,
  findClaimRequest,
  type GrantRecord,
  isMotorCode,
  type MotorCode,
  motorGrant,
  motorGrants,
  noticeOfGrant,
  withdrawMotorGrant,
} from "./grants.js";
import { withAlexGrantLock } from "./lock.js";
import { prepareMotorClaim } from "./prepare.js";
import { readJob, takeGrantNotice } from "./repairer.js";

export { startClaimFile } from "./claim.js";
export { approveEstimate, checkClaim, readInsurerCase, reportClaim } from "./insurer.js";
export { completeJob, openJob, openPhotosAgain, readJob, sendEstimate } from "./repairer.js";

/** Step 1, on opening "New claim": the story's starting point, then the claim folder as it is. */
export async function openNewClaim(world: World): Promise<ClaimFileView> {
  await prepareMotorClaim(world);
  return readClaimFile(world);
}

/** An access request for a claim grant in Alex's inbox, and where it stands. */
export interface ClaimRequest {
  readonly url: string;
  readonly code: MotorCode;
  readonly request: AccessRequest;
  /** "pending" until Alex answers; then the grant's own state. */
  readonly state: "pending" | GrantRecord["state"];
}

/** The claim grants' requests in Alex's inbox (the wallet's Requests screen). */
export async function claimRequests(world: World): Promise<ClaimRequest[]> {
  const alex = world.fetchAs("alex");
  const grants = await motorGrants(world);
  const found: ClaimRequest[] = [];
  for (const url of await membersOf(alex, alexUrl(world, "inbox/"))) {
    const request = await readDataset(alex, url)
      .then((dataset) => new AccessRequest(url, dataset, DataFactory))
      .catch(() => undefined);
    const code = request?.grantCode;
    if (request === undefined || code === undefined || !isMotorCode(code)) continue;
    if (!(CLAIM_CODES as readonly string[]).includes(code)) continue;
    const grant = grants.find((record) => record.code === code);
    found.push({ code, request, state: grant?.state ?? "pending", url });
  }
  return found.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Step 4. Alex approves Anvil's request: the damage report and the photos, until the job is
 * complete. The wallet sends Anvil a copy of the agreement, and Anvil's back office opens the job.
 */
export async function approveRepairer(world: World): Promise<ClaimCase> {
  const approved = await withAlexGrantLock(async () => {
    if ((await motorGrant(world, "C2")) !== undefined) return false;
    const request = await findClaimRequest(world, "C2");
    if (request === undefined) throw new Error("Anvil has not asked for access yet");
    await approveClaimGrant(world, request, "11:00");
    return true;
  });
  const job = await readJob(world);
  if (!approved && job !== undefined) return job;
  const notice = await noticeOfGrant(world, "C2", "11:00");
  return answerOrAwait(world, {
    answer: () => takeGrantNotice(world, notice),
    claimant: "repairer",
    look: () => readJob(world),
    messageUrl: notice,
  });
}

/**
 * Step 10. Alex closes the claim: the claim grant C1 is withdrawn, so Wrenfield's rules on the
 * licence and the claim folder go. The standing policy grant P1 stays, so Wrenfield still reads
 * and maintains the motor policy. Returns the ACL documents rewritten (none when already closed).
 */
export function closeClaim(world: World): Promise<string[]> {
  return withAlexGrantLock(async () => {
    if ((await motorGrant(world, "C1"))?.state !== "active") return [];
    return withdrawMotorGrant(world, "C1", "10:00");
  });
}
