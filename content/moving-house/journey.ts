// AUTHORED-BY Claude Opus 5.5
/**
 * What each of the ten steps of flows.md section 2 does to the pods, as plain functions over a
 * `World`. The pages call them (the wallet as Alex, the state, county and insurer pages as
 * themselves); organisation back offices react through `agents.ts`; the headless test runs them
 * in order against the real wasm. Copy lives in `tour.ts`.
 */

import { RecordingReceipt } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { podUrl, putResource, readDataset, type World } from "../mortgage/world.js";
import { AddressRecord, buildAddressRecord, DataProduct } from "./address.js";
import { type AddressValue, NEW_ADDRESS, NEW_ADDRESS_AS_SAVED, samePremises } from "./facts.js";
import {
  ADDRESS_PRODUCT_PATH,
  addressUrl,
  approveHolders,
  HOLDERS,
  type Holder,
  holderGrants,
  RECEIPT_PATH,
  withdrawHolder,
} from "./grants.js";
import { firstLook, readCopy, readEvidence, updateLicence } from "./holders.js";
import { prepareMovingHouse, writeAddressProduct } from "./prepare.js";

export interface AddressView {
  readonly record: AddressRecord;
  readonly product: DataProduct;
}

/** Step 1. Alex opens "Your address": the record and its data product description. */
export async function openAddress(world: World): Promise<AddressView> {
  await prepareMovingHouse(world);
  const alex = world.fetchAs("alex");
  const recordUrl = addressUrl(world);
  const productUrl = podUrl(world, "alex", ADDRESS_PRODUCT_PATH);
  return {
    product: new DataProduct(productUrl, await readDataset(alex, productUrl), DataFactory),
    record: new AddressRecord(recordUrl, await readDataset(alex, recordUrl), DataFactory),
  };
}

/** The evidence: the recording receipt from closing, and the premises it names. */
export async function readReceipt(world: World): Promise<RecordingReceipt> {
  const url = podUrl(world, "alex", RECEIPT_PATH);
  return new RecordingReceipt(url, await readDataset(world.fetchAs("alex"), url), DataFactory);
}

/** Does the receipt's property match the address (same number, street, town, state and ZIP)? */
export function receiptMatches(receipt: RecordingReceipt, address: AddressValue): boolean {
  const property = receipt.subjectProperty?.address;
  if (property === undefined) return false;
  const street = property.streetAddress.toLowerCase();
  return (
    street.startsWith(`${address.number} ${address.street}`.toLowerCase()) &&
    samePremises(
      { ...address },
      {
        country: address.country,
        locality: property.addressLocality,
        number: address.number,
        postalCode: property.postalCode,
        region: property.addressRegion,
        street: address.street,
      },
    )
  );
}

/** Write Alex's address, effective `validFrom`, with the recording receipt as its evidence. */
async function writeAddress(
  world: World,
  address: AddressValue,
  validFrom: string,
  time: string,
): Promise<string> {
  const receipt = await readReceipt(world);
  if (!receiptMatches(receipt, address)) {
    throw new Error("the recording receipt does not name this address");
  }
  return putResource(
    world.fetchAs("alex"),
    buildAddressRecord({
      address,
      derivedFrom: [receipt.value],
      iri: addressUrl(world),
      modified: world.calendar.clock(world.day, time),
      validFrom,
    }),
  );
}

/** Step 2. Alex changes the address once, effective today, evidenced by the recorded deed. */
export function saveNewAddress(
  world: World,
  address: AddressValue = NEW_ADDRESS_AS_SAVED,
): Promise<string> {
  return writeAddress(world, address, world.calendar.date(world.day), "10:05");
}

/**
 * Step 3. Alex approves the organisations that should know. The data product description is
 * written last, listing the consumers' agreements.
 */
export async function approveWhoShouldKnow(
  world: World,
  holders: readonly Holder[] = HOLDERS,
): Promise<string[]> {
  const { approvals } = await approveHolders(world, holders, "10:20");
  await refreshProduct(world, "10:22");
  return approvals.map((approval) => approval.code);
}

async function refreshProduct(world: World, time: string): Promise<void> {
  const active = (await holderGrants(world)).filter((record) => record.state === "active");
  await writeAddressProduct(
    world,
    active.map((record) => record.policy),
    time,
  );
}

/**
 * Step 4, on opening the state's page: Driver Services reads the address and its evidence (once).
 * Returns the state's copy. Without a grant the pod refuses, and the refusal is thrown.
 */
export function stateLooks(world: World): Promise<AddressRecord | undefined> {
  return firstLook(world, "state", "10:40", () => readEvidence(world));
}

/** Step 4, "Update licence": the state issues a licence at the address it read, revoking the old. */
export async function stateUpdatesLicence(world: World): Promise<number | undefined> {
  const copy = (await readCopy(world, "state")) ?? (await stateLooks(world));
  if (copy === undefined) throw new Error("Driver Services holds no address for Alex");
  return updateLicence(world, copy.address, "state", "10:45");
}

/** Steps 5 and 6, on opening the county's and the insurer's pages. */
export function holderLooks(
  world: World,
  holder: Exclude<Holder, "state">,
): Promise<AddressRecord | undefined> {
  return firstLook(world, holder, holder === "county" ? "10:50" : "10:55");
}

/** Alex withdraws one organisation's standing grant; the data product description follows. */
export async function withdrawAddressGrant(world: World, holder: Holder): Promise<string[]> {
  const acls = await withdrawHolder(world, holder, "16:40");
  await refreshProduct(world, "16:41");
  return acls;
}

/** Step 8. Alex withdraws Alder Bank's grant (closing the old account). */
export function revokeBank(world: World): Promise<string[]> {
  return withdrawAddressGrant(world, "bank");
}

/** Step 9. A week later Alex corrects the unit: 14 Larch Lane has none. */
export async function correctUnit(world: World): Promise<string> {
  const current = new AddressRecord(
    addressUrl(world),
    await readDataset(world.fetchAs("alex"), addressUrl(world)),
    DataFactory,
  );
  return writeAddress(world, NEW_ADDRESS, current.validFrom, "11:00");
}
