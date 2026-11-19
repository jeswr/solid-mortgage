// AUTHORED-BY Claude Opus 5.5
/**
 * State Online Services as a credential issuer: its key in its WebID profile, its own Bitstring
 * Status List, and Alex's driver licence. The licence uses vc-kit's identity-credential kind
 * (name, date of birth, address, last four of the tax id): the fields a licence's identity claims
 * share. A new address means a new licence: the state signs version n+1 and revokes version n's
 * status entry, so a copy of the old licence fails its status check at source.
 */

import { buildAgentProfile, RESOURCE_TARGET_CLASSES } from "@mortgage/data-model";
import type { IssuedCredential, StatusListClient } from "@mortgage/vc-kit";
import type { Quad } from "@rdfjs/types";
import { BORROWER, STATUS_LIST_LIFETIME_DAYS } from "../mortgage/facts.js";
import { membersOf } from "../mortgage/grants.js";
import { digestOf, keyId, statusListUrl } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  PodRequestError,
  podUrl,
  put,
  putResource,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import { buildCredentialPointer, CredentialPointer } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { readDataset } from "../mortgage/world.js";
import { type AddressValue, streetLine } from "./facts.js";

const STATE = "state" as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a licence is valid in the demo (a fictional eight-year term). */
export const LICENCE_VALID_DAYS = 8 * 365;

export { keyId };

export function licenceUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "alex", "identity/driver-licence");
}

/** The state's record of licence version `n`. */
export function issuanceUrl(world: Pick<World, "podOrigin">, version: number): string {
  return podUrl(world, STATE, `issued/driver-licence-v${version}`);
}

/** The status index of licence version `n` (each version has its own). */
export async function licenceStatusIndex(world: Pick<World, "podOrigin">, version: number) {
  const { deriveStatusIndex } = await vcKit();
  return deriveStatusIndex(`${licenceUrl(world)}#v${version}`);
}

export async function stateStatusList(world: World): Promise<StatusListClient> {
  const { StatusListClient } = await vcKit();
  return new StatusListClient({
    fetch: world.fetchAs(STATE),
    issuer: webid(world, STATE),
    key: await world.keyFor(STATE),
    listLifetimeMs: STATUS_LIST_LIFETIME_DAYS * DAY_MS,
    url: statusListUrl(world, STATE),
  });
}

/**
 * Publish the state's verification key in its WebID profile and host an all-clear status list.
 * Idempotent: does nothing when the list already exists.
 */
export async function publishState(world: World, time = "07:50"): Promise<boolean> {
  const state = world.fetchAs(STATE);
  if ((await statusOf(state, statusListUrl(world, STATE))) === 200) return false;
  const key = await world.keyFor(STATE);
  const profile = buildAgentProfile({
    inbox: podUrl(world, STATE, "inbox/"),
    iri: podUrl(world, STATE, "profile/card"),
    kind: "organisation",
    name: ORGS.state.organisation,
    storage: podUrl(world, STATE),
    webId: webid(world, STATE),
  });
  const { publishVerificationMethod } = await vcKit();
  const published = await publishVerificationMethod({ controller: webid(world, STATE), key });
  for (const quad of published.quads as readonly Quad[]) profile.dataset.add(quad);
  await putResource(state, profile);
  await (await stateStatusList(world)).create({ now: at(world, time) });
  return true;
}

/** The licence versions the state has issued, from its own `issued/` drawer. */
export async function issuedVersions(world: World): Promise<number[]> {
  const container = podUrl(world, STATE, "issued/");
  const state = world.fetchAs(STATE);
  if ((await statusOf(state, container)) !== 200) return [];
  return (await membersOf(state, container))
    .map((url) => /driver-licence-v(\d+)$/.exec(url)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

/** The state's record of one issuance. */
export async function readIssuance(world: World, version: number): Promise<CredentialPointer> {
  const url = issuanceUrl(world, version);
  return new CredentialPointer(url, await readDataset(world.fetchAs(STATE), url), DataFactory);
}

export interface LicenceIssue {
  readonly version: number;
  readonly credential: IssuedCredential;
  /** The version whose status entry was revoked, if there was one. */
  readonly revoked?: number;
}

/**
 * Sign licence version n+1 for `address`, write it to Alex's `identity/driver-licence` (the state
 * may write there under Alex's grant H1, or Alex's wallet writes it during set-up), record the
 * issuance, then revoke version n. The order matters: Alex is never left without a valid licence.
 */
export async function issueLicence(
  world: World,
  address: AddressValue,
  options: { readonly writer: "state" | "alex"; readonly time: string },
): Promise<LicenceIssue> {
  const versions = await issuedVersions(world);
  const previous = versions.at(-1);
  const version = (previous ?? 0) + 1;
  const { issueCredential, validityOn } = await vcKit();
  const list = await stateStatusList(world);
  const credential = await issueCredential({
    claims: {
      address: {
        addressLocality: address.locality,
        addressRegion: address.region,
        postalCode: address.postalCode,
        streetAddress: streetLine(address),
      },
      birthDate: BORROWER.birthDate,
      kind: "identity-credential",
      name: BORROWER.name,
      taxIdLast4: BORROWER.taxIdLast4,
    },
    credentialId: licenceUrl(world),
    issuer: webid(world, STATE),
    key: await world.keyFor(STATE),
    kind: "identity-credential",
    status: list.entry(await licenceStatusIndex(world, version)),
    subject: webid(world, "alex"),
    validity: validityOn(world.calendar, world.day, {
      time: options.time,
      validDays: LICENCE_VALID_DAYS,
    }),
  });
  await put(
    world.fetchAs(options.writer),
    credential.credentialId,
    credential.body,
    credential.contentType,
  );
  await putResource(
    world.fetchAs(STATE),
    buildCredentialPointer({
      asOf: at(world, options.time),
      credentialType: RESOURCE_TARGET_CLASSES[credential.kind],
      iri: issuanceUrl(world, version),
      issuer: webid(world, STATE),
      sha256: digestOf(credential.body),
      url: credential.credentialId,
    }),
  );
  if (previous !== undefined) {
    await list.revoke(await licenceStatusIndex(world, previous), { now: at(world, options.time) });
  }
  return { credential, version, ...(previous === undefined ? {} : { revoked: previous }) };
}

export { PodRequestError };
