// AUTHORED-BY Claude Opus 5.5
/**
 * Where the moving-house story starts: the day after closing. The site has one seed (the
 * mortgage's), so the first page of this demo brings the pods to that point, once:
 *
 * - from closing (only when the visitor has not played the mortgage demo to the end): the county's
 *   public record of the deed and the mortgage, and the recording receipt in Alex's closing drawer;
 * - State Online Services publishes its key and its status list, and holds Alex's driver licence
 *   (version 1, at the old address, in Alex's `identity/` drawer);
 * - Alex's address record (the old address, its evidence the purchase agreement's predecessor:
 *   none) and its data product description.
 *
 * Each part checks the pod first, so running it twice changes nothing.
 */

import { buildRecordedInstrument, buildRecordingReceipt } from "@mortgage/data-model";
import { aclDataset, aclTurtle, PUBLIC_READ } from "../mortgage/acl.js";
import { BORROWER, DAY as MORTGAGE_DAY, PROPERTY, SELLER_NAME } from "../mortgage/facts.js";
import { statusListUrl } from "../mortgage/issuers.js";
import { at, podUrl, put, putResource, statusOf, type World, webid } from "../mortgage/world.js";
import { buildAddressRecord, buildDataProduct } from "./address.js";
import { DAY, DEED_REFERENCE, MORTGAGE_REFERENCE, OLD_ADDRESS, OLD_ADDRESS_FROM } from "./facts.js";
import {
  ADDRESS_PATH,
  ADDRESS_PRODUCT_PATH,
  addressUrl,
  PURPOSE,
  PURPOSE_TEXT,
  RECEIPT_PATH,
} from "./grants.js";
import { issuedVersions, issueLicence, publishState } from "./issuer.js";

const on = (world: World, day: number): World => ({ ...world, day });

/** Is the story's starting point already in the pods? */
export async function isPrepared(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs("alex"), addressUrl(world))) === 200;
}

/** The deed and the mortgage in the county's public register, and Alex's recording receipt. */
async function ensureClosingRecords(world: World): Promise<void> {
  const closing = on(world, MORTGAGE_DAY.closing);
  const county = world.fetchAs("county");
  const instruments = [
    {
      grantees: [BORROWER.name],
      grantors: [SELLER_NAME],
      name: "Warranty deed",
      reference: DEED_REFERENCE,
    },
    {
      grantees: ["Juniper Home Loans"],
      grantors: [BORROWER.name],
      name: "Mortgage",
      reference: MORTGAGE_REFERENCE,
    },
  ];
  const recorded: string[] = [];
  for (const instrument of instruments) {
    const url = podUrl(world, "county", `records/${instrument.reference}`);
    recorded.push(url);
    if ((await statusOf(county, url)) === 200) continue;
    await putResource(
      county,
      buildRecordedInstrument({
        creator: webid(world, "county"),
        grantees: instrument.grantees,
        grantors: instrument.grantors,
        iri: url,
        name: instrument.name,
        parcelNumber: PROPERTY.parcelNumber,
        recordedAt: at(closing, "15:40"),
        recordingReference: instrument.reference,
      }),
    );
  }
  const alex = world.fetchAs("alex");
  const receipt = podUrl(world, "alex", RECEIPT_PATH);
  if ((await statusOf(alex, receipt)) === 200) return;
  await putResource(
    alex,
    buildRecordingReceipt({
      creator: webid(world, "title"),
      iri: receipt,
      issued: at(closing, "15:50"),
      name: "Recording receipt",
      propertyAddress: PROPERTY.address,
      recordedInstruments: recorded,
      recordingReferences: instruments.map((instrument) => instrument.reference),
    }),
  );
}

/** The state's public drawers, key and status list. */
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
  await publishState(world, "07:50");
}

/** Alex's address record and its data product description, at the old address. */
async function ensureAddress(world: World): Promise<void> {
  const alex = world.fetchAs("alex");
  const record = addressUrl(world);
  if ((await statusOf(alex, record)) !== 200) {
    await putResource(
      alex,
      buildAddressRecord({
        address: OLD_ADDRESS,
        iri: record,
        modified: at(world, "07:40"),
        validFrom: OLD_ADDRESS_FROM,
      }),
    );
  }
  await writeAddressProduct(world, [], "07:41", true);
}

/**
 * The data product description of Alex's address: owner Alex, purpose "keep my address current",
 * output port the address record, and the agreements of its consumers.
 */
export async function writeAddressProduct(
  world: World,
  policies: readonly string[],
  time: string,
  onlyIfMissing = false,
): Promise<string> {
  const alex = world.fetchAs("alex");
  const url = podUrl(world, "alex", ADDRESS_PRODUCT_PATH);
  if (onlyIfMissing && (await statusOf(alex, url)) === 200) return url;
  return putResource(
    alex,
    buildDataProduct({
      description:
        "Alex Rivera's postal address: one record, kept by Alex. Organisations read it under a standing grant instead of keeping their own form.",
      endpoint: podUrl(world, "alex", ADDRESS_PATH),
      iri: url,
      modified: at(world, time),
      owner: webid(world, "alex"),
      policies,
      purpose: PURPOSE_TEXT,
      purposeIri: PURPOSE,
      title: "My address",
    }),
  );
}

/** Alex's driver licence, version 1, at the old address. Alex's wallet stores it. */
async function ensureLicence(world: World): Promise<void> {
  if ((await issuedVersions(world)).length > 0) return;
  await issueLicence(world, OLD_ADDRESS, { time: "07:55", writer: "alex" });
}

/**
 * Bring the pods to the day after closing. Returns `false` when they were already there. Run as
 * the visitor's own browser (every owner's fetch), never by an organisation agent.
 */
export async function prepareMovingHouse(world: World): Promise<boolean> {
  if (await isPrepared(world)) return false;
  const moved = on(world, DAY.moved);
  await ensureClosingRecords(moved);
  await ensureState(moved);
  await ensureLicence(moved);
  await ensureAddress(moved);
  return true;
}
