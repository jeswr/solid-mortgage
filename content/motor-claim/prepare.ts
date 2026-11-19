// AUTHORED-BY Claude Opus 5.5
/**
 * Where the motor claim starts: Alex lives at 14 Larch Lane, holds a driver licence from State
 * Online Services and a motor policy from Wrenfield Mutual. The site has one seed (the
 * mortgage's), so the first page of this demo brings the pods to that point, once:
 *
 * - State Online Services publishes its key and status list and, unless the moving-house demo
 *   already did, signs Alex's driver licence (in Alex's `identity/` drawer);
 * - the standing grant P1 lets Wrenfield keep the motor policy current;
 * - Wrenfield signs the motor policy credential, which Alex's wallet stores in `insurance/`.
 *
 * Each part checks the pod first, so running it twice changes nothing.
 */

import { aclDataset, aclTurtle, PUBLIC_READ } from "../mortgage/acl.js";
import { issueToPod, statusListUrl } from "../mortgage/issuers.js";
import { podUrl, put, statusOf, type World, webid } from "../mortgage/world.js";
import { NEW_ADDRESS } from "../moving-house/facts.js";
import { issuedVersions, issueLicence, publishState } from "../moving-house/issuer.js";
import { CAR, DAY, MOTOR_POLICY, ORG_PATHS, PATHS } from "./facts.js";
import { ensurePolicyGrant } from "./grants.js";

const on = (world: World, day: number): World => ({ ...world, day });

export function policyUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "alex", PATHS.policy);
}

/** Is the story's starting point already in the pods? */
export async function isPrepared(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs("alex"), policyUrl(world))) === 200;
}

/**
 * The state's public status drawer, key and status list, as the moving-house demo sets them up
 * (its own set-up function is private to that demo).
 */
async function ensureState(world: World): Promise<void> {
  const state = world.fetchAs("state");
  if ((await statusOf(state, statusListUrl(world, "state"))) === 200) return;
  const status = podUrl(world, "state", "status/");
  await put(state, status, "", "text/turtle");
  await put(
    state,
    `${status}.acl`,
    await aclTurtle(aclDataset(webid(world, "state"), status, [PUBLIC_READ])),
    "text/turtle",
  );
  await publishState(world, "07:15");
}

/** Alex's driver licence at the address Alex lives at now, unless one was issued already. */
async function ensureLicence(world: World): Promise<void> {
  if ((await issuedVersions(world)).length > 0) return;
  await issueLicence(world, NEW_ADDRESS, { time: "07:20", writer: "alex" });
}

/** The motor policy credential, signed by Wrenfield and stored by Alex's wallet. */
async function ensurePolicyCredential(world: World): Promise<void> {
  if (await isPrepared(world)) return;
  const end = MOTOR_POLICY.startDay + MOTOR_POLICY.termDays;
  await issueToPod(world, {
    claims: {
      coverages: [...MOTOR_POLICY.coverages],
      deductibleUsd: MOTOR_POLICY.deductibleUsd,
      kind: "motor-policy-credential",
      policyEnd: world.calendar.date(end),
      policyNumber: MOTOR_POLICY.policyNumber,
      policyStart: world.calendar.date(MOTOR_POLICY.startDay),
      vehicle: { ...CAR },
    },
    credentialId: policyUrl(world),
    issuer: "insurer",
    kind: "motor-policy-credential",
    record: ORG_PATHS.policyIssuance.replace(/^issued\//, ""),
    subject: webid(world, "alex"),
    time: "07:35",
    validDays: end - world.day,
    writer: "alex",
  });
}

/**
 * Bring the pods to the morning of the incident. Returns `false` when they were already there.
 * Run as the visitor's own browser (every owner's fetch), never by an organisation agent.
 */
export async function prepareMotorClaim(world: World): Promise<boolean> {
  if (await isPrepared(world)) return false;
  const morning = on(world, DAY.incident);
  await ensureState(morning);
  await ensureLicence(morning);
  await ensurePolicyGrant(morning, "07:30");
  await ensurePolicyCredential(morning);
  return true;
}
