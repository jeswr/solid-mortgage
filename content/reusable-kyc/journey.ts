// AUTHORED-BY Claude Opus 5.5
/**
 * What each step of flows.md section 8 does to the pods, as plain functions over a `World`. The
 * bank page calls them as Alder Bank (the statement) and Alex's wallet (storing it), Pennant's
 * page as Pennant, the wallet's pages as Alex; the headless test runs them in order against the
 * real pod runtime host. Copy lives in `tour.ts`.
 */

import { KycAttestationCredential } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { readDataset, statusOf, type World } from "../mortgage/world.js";
import {
  type AttestationIssue,
  attestationUrl,
  issueAttestation,
  issuedVersions,
} from "./attestation.js";
import { refreshIdentity, type VerifiedIdentity, verifyIdentity } from "./card.js";
import {
  approveVerifiedIdentity,
  type GrantOneTime,
  recordOneTimeUsed,
  requestVerifiedIdentity,
} from "./grants.js";
import { ensureTrustedList } from "./scheme.js";

/** The story's starting point: Pennant's copy of the scheme's list. Idempotent. */
export async function prepareReusableKyc(world: World): Promise<boolean> {
  return ensureTrustedList(world);
}

export interface AttestationView {
  /** The statement in Alex's pod, read as Alex; `undefined` before step 1. */
  readonly credential?: KycAttestationCredential;
  /** The versions Alder Bank has issued. */
  readonly versions: readonly number[];
}

/** What the bank's "Your identity" page and the wallet show: the statement Alex holds. */
export async function readAttestation(world: World): Promise<AttestationView> {
  const url = attestationUrl(world);
  const alex = world.fetchAs("alex");
  const versions = await issuedVersions(world);
  if ((await statusOf(alex, url)) !== 200) return { versions };
  return {
    credential: new KycAttestationCredential(url, await readDataset(alex, url), DataFactory),
    versions,
  };
}

/**
 * Step 1. Alex asks Alder Bank for the statement: the bank signs version 1 and Alex's wallet
 * stores it. Does nothing (returns `undefined`) when a statement already exists.
 */
export async function getAttestation(
  world: World,
  time = "10:00",
): Promise<AttestationIssue | undefined> {
  await prepareReusableKyc(world);
  if ((await issuedVersions(world)).length > 0) return undefined;
  return issueAttestation(world, time);
}

/** Step 2, Pennant's half: "Use verified identity" sends the Y1 request. Returns its URL. */
export async function applyWithVerifiedIdentity(world: World, time = "10:20"): Promise<string> {
  await prepareReusableKyc(world);
  return requestVerifiedIdentity(world, time);
}

/** Step 2, the wallet's half: Alex approves Y1. */
export function approveOneTimeRead(
  world: World,
  requestUrl: string,
  grantOneTime: GrantOneTime,
  time = "10:21",
) {
  return approveVerifiedIdentity(world, requestUrl, grantOneTime, time);
}

/** Step 3. Pennant reads the statement once and checks it. */
export function checkVerifiedIdentity(world: World, time = "10:22"): Promise<VerifiedIdentity> {
  return verifyIdentity(world, time);
}

/** Step 5. Pennant asks again; the pod's answer (403 once the grant is used). */
export function askAgain(world: World): Promise<number> {
  return refreshIdentity(world);
}

/** The wallet records that the runtime closed Y1 (see `recordOneTimeUsed`). */
export function closeUsedGrant(world: World, time = "10:30") {
  return recordOneTimeUsed(world, time);
}

/**
 * Step 6. Alex reports the identity document lost: Alder Bank checks a replacement, signs version
 * n+1 (Alex's wallet stores it in place of the old one) and revokes version n in its status list.
 */
export async function reportDocumentLost(world: World, time = "09:30"): Promise<AttestationIssue> {
  if ((await issuedVersions(world)).length === 0) {
    throw new Error("Alder Bank has issued no attestation to withdraw");
  }
  return issueAttestation(world, time);
}
