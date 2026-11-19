// AUTHORED-BY Claude Opus 5.5
/**
 * Where the medication handover starts: the morning of Rosa's discharge. The site has one seed
 * (the mortgage's), and Rosa's pod has only its baseline, so the first page of this demo brings
 * the pods to that point, once:
 *
 * - Rosa's drawers (medicines, allergies, discharge, and the bookkeeping drawers), her inbox open
 *   to appends from any signed-in agent;
 * - the medicines Rosa listed herself, and her allergy, written by Rosa before the admission;
 * - M1, given at admission: the hospital reads and writes her health drawers during the stay;
 * - Corner Dispensary's own record of its last supply to Rosa, a month before the admission;
 * - the pharmacy's and the practice's access requests, waiting in Rosa's inbox.
 *
 * Each part checks the pod first, so running it twice changes nothing. Everything is fictional.
 */

import type { PodOwner } from "@mortgage/demo-kit/registry";
import { aclDataset, aclTurtle, SIGNED_IN_APPEND } from "../mortgage/acl.js";
import { membersOf } from "../mortgage/grants.js";
import { at, podUrl, put, putResource, statusOf, type World, webid } from "../mortgage/world.js";
import { ADMISSION_LIST, ALLERGY, DAY, HOLDER, SUPPLY_QUANTITY } from "./facts.js";
import {
  buildAllergyIntolerance,
  buildMedicationDispense,
  buildMedicationStatement,
} from "./fhir.js";
import {
  giveAdmissionGrant,
  isMedicationRequest,
  medPolicyUrl,
  PATHS,
  requestMedAccess,
  rosaUrl,
} from "./grants.js";
import {
  allergyUrl,
  orgRef,
  PHARMACY_RECORDS,
  pharmacyRecordUrl,
  rosaRef,
  statementUrl,
} from "./journey.js";

const on = (world: World, day: number): World => ({ ...world, day });

/** Rosa's containers, parents first. */
export const ROSA_CONTAINERS: readonly string[] = Object.freeze([
  PATHS.medications,
  PATHS.provenance,
  PATHS.requests,
  PATHS.dispenses,
  PATHS.allergies,
  PATHS.discharge,
  PATHS.inbox,
  PATHS.policies,
  PATHS.consents,
]);

async function ensureContainer(world: World, owner: PodOwner, url: string): Promise<boolean> {
  const fetcher = world.fetchAs(owner);
  if ((await statusOf(fetcher, url)) === 200) return false;
  await put(fetcher, url, "", "text/turtle");
  return true;
}

/** Rosa's drawers, and her inbox's ACL. */
async function ensureDrawers(world: World): Promise<void> {
  const rosa = world.fetchAs(HOLDER);
  for (const path of ROSA_CONTAINERS) {
    const created = await ensureContainer(world, HOLDER, rosaUrl(world, path));
    if (created && path === PATHS.inbox) {
      const inbox = rosaUrl(world, PATHS.inbox);
      await put(
        rosa,
        `${inbox}.acl`,
        await aclTurtle(aclDataset(webid(world, HOLDER), inbox, [SIGNED_IN_APPEND])),
        "text/turtle",
      );
    }
  }
}

/** The medicines Rosa listed in her own wallet, and her allergy. */
async function ensureOwnList(world: World): Promise<void> {
  const rosa = world.fetchAs(HOLDER);
  const listed = on(world, DAY.admission - 3);
  for (const medicine of ADMISSION_LIST) {
    const url = statementUrl(world, medicine.key);
    if ((await statusOf(rosa, url)) === 200) continue;
    await putResource(
      rosa,
      buildMedicationStatement({
        adherence: "taking-as-directed",
        dateAsserted: at(listed, "19:00"),
        iri: url,
        medicine,
        subject: rosaRef(world),
      }),
    );
  }
  const allergy = allergyUrl(world);
  if ((await statusOf(rosa, allergy)) !== 200) {
    await putResource(
      rosa,
      buildAllergyIntolerance({
        iri: allergy,
        note: ALLERGY.note,
        patient: rosaRef(world),
        recordedDate: at(listed, "19:05"),
        substance: ALLERGY,
      }),
    );
  }
}

/** M1, given when Rosa was admitted. */
async function ensureAdmissionGrant(world: World): Promise<void> {
  const rosa = world.fetchAs(HOLDER);
  if ((await statusOf(rosa, rosaUrl(world, `${PATHS.consents}m1-given`))) === 200) return;
  if ((await statusOf(rosa, medPolicyUrl(world, "M1"))) === 200) {
    throw new Error("M1 is on record without its consent record");
  }
  await giveAdmissionGrant(on(world, DAY.admission), "15:20");
}

/** The pharmacy's own record of its last supply to Rosa, before the admission. */
async function ensureLastSupply(world: World): Promise<void> {
  const pharmacy = world.fetchAs("pharmacy");
  await ensureContainer(world, "pharmacy", podUrl(world, "pharmacy", PHARMACY_RECORDS));
  const supplied = on(world, DAY.lastSupply);
  for (const medicine of ADMISSION_LIST) {
    const url = pharmacyRecordUrl(world, medicine.key, DAY.lastSupply);
    if ((await statusOf(pharmacy, url)) === 200) continue;
    await putResource(
      pharmacy,
      buildMedicationDispense({
        iri: url,
        medicine,
        performer: orgRef(world, "pharmacy"),
        quantity: SUPPLY_QUANTITY,
        subject: rosaRef(world),
        whenHandedOver: at(supplied, "11:30"),
      }),
    );
  }
}

/** The pharmacy's and the practice's access requests in Rosa's inbox. */
async function ensureRequests(world: World): Promise<void> {
  const inbox = await membersOf(world.fetchAs(HOLDER), rosaUrl(world, PATHS.inbox));
  const waiting = inbox.filter(isMedicationRequest).map((url) => url.toLowerCase());
  const asked = on(world, DAY.discharge);
  if (!waiting.some((url) => url.includes("request-m2"))) {
    await requestMedAccess(asked, "M2", "08:10");
  }
  if (!waiting.some((url) => url.includes("request-m3"))) {
    await requestMedAccess(asked, "M3", "08:25");
  }
}

/** Is the story's starting point already in the pods? */
export async function isPrepared(world: World): Promise<boolean> {
  const rosa = world.fetchAs(HOLDER);
  if ((await statusOf(rosa, rosaUrl(world, `${PATHS.consents}m1-given`))) !== 200) return false;
  const inbox = await membersOf(rosa, rosaUrl(world, PATHS.inbox));
  return inbox.filter(isMedicationRequest).length >= 2;
}

/**
 * Bring the pods to the morning of the discharge. Returns `false` when they were already there.
 * Run as the visitor's own browser (every owner's fetch), never by an organisation agent.
 */
export async function prepareMedicationHandover(world: World): Promise<boolean> {
  if ((await statusOf(world.fetchAs(HOLDER), rosaUrl(world, PATHS.inbox))) === 200) {
    if (await isPrepared(world)) return false;
  }
  await ensureDrawers(world);
  await ensureOwnList(world);
  await ensureAdmissionGrant(world);
  await ensureLastSupply(world);
  await ensureRequests(world);
  return true;
}
