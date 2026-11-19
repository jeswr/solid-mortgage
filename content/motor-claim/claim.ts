// AUTHORED-BY Claude Opus 5.5
/**
 * Alex's side of the claim: the claim file in Alex's own pod (`claims/CLM-1/`), written before
 * any organisation is involved, and read back by the wallet. Every RDF document goes through the
 * data-model wrappers and its SHACL shape (`putResource`); the photos are stored as images.
 */

export { PodRequestError } from "../mortgage/world.js";

import {
  buildMotorIncidentReport,
  buildOtherPartyDetails,
  DamageReport,
  MotorIncidentReport,
  OtherPartyDetails,
  RepairEstimate,
  RepairInvoice,
} from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { membersOf } from "../mortgage/grants.js";
import {
  at,
  podUrl,
  put,
  putResource,
  readDataset,
  readText,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { CAR, CLAIM_NUMBER, DAY, INCIDENT, OTHER_PARTY, PATHS } from "./facts.js";
import { PHOTO_FILES, PHOTO_TYPE } from "./photos.js";

export const alexUrl = (world: Pick<World, "podOrigin">, path = "") => podUrl(world, "alex", path);

export function photoUrls(world: Pick<World, "podOrigin">): string[] {
  return PHOTO_FILES.map((photo) => alexUrl(world, `${PATHS.photos}${photo.file}`));
}

/** Has Alex started the claim file? */
export async function hasClaimFile(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs("alex"), alexUrl(world, PATHS.incident))) === 200;
}

/**
 * Step 1. Alex records the incident in Alex's own pod: the photos, the other driver's details and
 * the incident report that links both. Nothing is sent anywhere. Writing it again changes
 * nothing that is already there.
 */
export async function startClaimFile(world: World): Promise<string> {
  const alex = world.fetchAs("alex");
  const report = alexUrl(world, PATHS.incident);
  if (await hasClaimFile(world)) return report;
  // A PUT creates the containers on its path: claims/, claims/CLM-1/ and its photos/.
  const photos = photoUrls(world);
  for (const [index, photo] of PHOTO_FILES.entries()) {
    await put(alex, photos[index] as string, photo.svg, PHOTO_TYPE);
  }
  const created = at(world, "09:05");
  await putResource(
    alex,
    buildOtherPartyDetails({
      created,
      creator: webid(world, "alex"),
      insurerName: OTHER_PARTY.insurerName,
      iri: alexUrl(world, PATHS.otherParty),
      name: OTHER_PARTY.name,
      policyNumber: OTHER_PARTY.policyNumber,
      telephone: OTHER_PARTY.telephone,
      vehicle: { ...OTHER_PARTY.vehicle },
    }),
  );
  return putResource(
    alex,
    buildMotorIncidentReport({
      claimNumber: CLAIM_NUMBER,
      created,
      creator: webid(world, "alex"),
      description: INCIDENT.description,
      iri: report,
      location: INCIDENT.location,
      name: "Incident report",
      occurredAt: world.calendar.clock(DAY.incident, INCIDENT.time),
      otherParty: alexUrl(world, PATHS.otherParty),
      photos,
      vehicle: { ...CAR },
    }),
  );
}

/** The documents a reader can open in the claim folder (only those it is allowed to read). */
export interface ClaimFileView {
  readonly incident?: MotorIncidentReport;
  readonly otherParty?: OtherPartyDetails;
  readonly damageReport?: DamageReport;
  readonly estimate?: RepairEstimate;
  readonly invoice?: RepairInvoice;
  /** The folder's members as the pod lists them. */
  readonly members: readonly string[];
}

async function optionalDataset(
  fetcher: typeof fetch,
  url: string,
): Promise<DatasetCore | undefined> {
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  return readDataset(fetcher, url);
}

/** Alex reads the claim folder in the wallet. */
export async function readClaimFile(world: World): Promise<ClaimFileView> {
  const alex = world.fetchAs("alex");
  const url = (path: string) => alexUrl(world, path);
  if ((await statusOf(alex, url(PATHS.claim))) !== 200) return { members: [] };
  const members = await membersOf(alex, url(PATHS.claim));
  const has = (path: string) => members.includes(url(path));
  const view = async <T>(
    path: string,
    ctor: new (iri: string, dataset: DatasetCore, factory: typeof DataFactory) => T,
  ) => {
    if (!has(path)) return undefined;
    const dataset = await optionalDataset(alex, url(path));
    return dataset === undefined ? undefined : new ctor(url(path), dataset, DataFactory);
  };
  const [incident, otherParty, damageReport, estimate, invoice] = await Promise.all([
    view(PATHS.incident, MotorIncidentReport),
    view(PATHS.otherParty, OtherPartyDetails),
    view(PATHS.damageReport, DamageReport),
    view(PATHS.estimate, RepairEstimate),
    view(PATHS.invoice, RepairInvoice),
  ]);
  return {
    members,
    ...(incident === undefined ? {} : { incident }),
    ...(otherParty === undefined ? {} : { otherParty }),
    ...(damageReport === undefined ? {} : { damageReport }),
    ...(estimate === undefined ? {} : { estimate }),
    ...(invoice === undefined ? {} : { invoice }),
  };
}

/** A photo as `reader` gets it. The pod's refusal is thrown ({@link PodRequestError}). */
export function readPhoto(
  world: World,
  reader: "alex" | "insurer" | "repairer",
  url: string,
): Promise<string> {
  return readText(world.fetchAs(reader), url, PHOTO_TYPE);
}
