// AUTHORED-BY Claude Opus 5.5
/**
 * The five issuers of the lending story, signing for Maya. Ledgerly (payroll), Alder Bank and
 * Quillon already publish a key and a status list from the mortgage seed; Trueline Identity (idv)
 * and Finchly Loans (fintech-lender) publish theirs when the story is prepared (`prepare.ts`).
 * Every issuer works the same way as in the mortgage (`../mortgage/issuers.ts`): the key in its
 * WebID profile, one Bitstring Status List in its pod, the demo calendar as the clock, and a
 * pointer record of each issuance in its own `issued/` drawer. The mortgage helpers are typed to
 * the mortgage's six issuers, so the two parts that name the issuer are restated here for any
 * pod owner.
 */

import {
  buildAgentProfile,
  buildCredentialPointer,
  RESOURCE_TARGET_CLASSES,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type {
  CredentialClaims,
  CredentialKind,
  IssuedCredential,
  StatusListClient,
} from "@mortgage/vc-kit";
import type { Quad } from "@rdfjs/types";
import { STATUS_LIST_LIFETIME_DAYS } from "../mortgage/facts.js";
import { digestOf, statusListUrl } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import { at, podUrl, put, putResource, statusOf, type World, webid } from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import { MAYA } from "./facts.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The organisations that sign credentials for Maya, in the order they do it. */
export const LENDING_ISSUERS = ["idv", "payroll", "bank", "bureau", "fintech-lender"] as const;
export type LendingIssuer = (typeof LENDING_ISSUERS)[number];

/** The two issuers this demo adds; the other three publish from the mortgage seed. */
export const NEW_ISSUERS = ["idv", "fintech-lender"] as const;

export function isLendingIssuer(value: string): value is LendingIssuer {
  return (LENDING_ISSUERS as readonly string[]).includes(value);
}

/** The issuer's own client for its hosted status list. */
export async function issuerStatusList(world: World, issuer: PodOwner): Promise<StatusListClient> {
  const { StatusListClient } = await vcKit();
  return new StatusListClient({
    fetch: world.fetchAs(issuer),
    issuer: webid(world, issuer),
    key: await world.keyFor(issuer),
    listLifetimeMs: STATUS_LIST_LIFETIME_DAYS * DAY_MS,
    url: statusListUrl(world, issuer),
  });
}

/**
 * Publish an issuer's verification key in its WebID profile and host an all-clear status list.
 * Does nothing when the list already exists. Returns whether it published.
 */
export async function publishLendingIssuer(
  world: World,
  issuer: (typeof NEW_ISSUERS)[number],
  time: string,
): Promise<boolean> {
  const fetcher = world.fetchAs(issuer);
  if ((await statusOf(fetcher, statusListUrl(world, issuer))) === 200) return false;
  const key = await world.keyFor(issuer);
  const profile = buildAgentProfile({
    inbox: podUrl(world, issuer, "inbox/"),
    iri: podUrl(world, issuer, "profile/card"),
    kind: "organisation",
    name: ORGS[issuer].organisation,
    storage: podUrl(world, issuer),
    webId: webid(world, issuer),
  });
  const { publishVerificationMethod } = await vcKit();
  const published = await publishVerificationMethod({ controller: webid(world, issuer), key });
  for (const quad of published.quads as readonly Quad[]) profile.dataset.add(quad);
  await putResource(fetcher, profile);
  await (await issuerStatusList(world, issuer)).create({ now: at(world, time) });
  return true;
}

export interface IssueOptions {
  readonly issuer: LendingIssuer;
  readonly kind: CredentialKind;
  /** Path in Maya's pod; the URL is also the credential's IRI. */
  readonly path: string;
  readonly claims: CredentialClaims;
  readonly validDays: number;
  readonly time: string;
  /** The name of the issuer's own record in `issued/`. */
  readonly record: string;
}

/** The issuer's record of one issuance: where it went, its type, digest and date. No copy. */
async function recordIssuance(
  world: World,
  issuer: LendingIssuer,
  name: string,
  credential: IssuedCredential,
  time: string,
): Promise<string> {
  return putResource(
    world.fetchAs(issuer),
    buildCredentialPointer({
      asOf: at(world, time),
      credentialType: RESOURCE_TARGET_CLASSES[credential.kind],
      iri: podUrl(world, issuer, `issued/${name}`),
      issuer: webid(world, issuer),
      sha256: digestOf(credential.body),
      url: credential.credentialId,
    }),
  );
}

/**
 * Sign a credential about Maya on the current demo day, PUT it into her pod as the issuer (under
 * its slot grant), and record the issuance in the issuer's own pod.
 */
export async function issueToMaya(world: World, options: IssueOptions): Promise<IssuedCredential> {
  const { deriveStatusIndex, issueCredential, validityOn } = await vcKit();
  const credentialId = podUrl(world, MAYA, options.path);
  const list = await issuerStatusList(world, options.issuer);
  const credential = await issueCredential({
    claims: options.claims,
    credentialId,
    issuer: webid(world, options.issuer),
    key: await world.keyFor(options.issuer),
    kind: options.kind,
    status: list.entry(deriveStatusIndex(credentialId)),
    subject: webid(world, MAYA),
    validity: validityOn(world.calendar, world.day, {
      time: options.time,
      validDays: options.validDays,
    }),
  });
  await put(world.fetchAs(options.issuer), credentialId, credential.body, credential.contentType);
  await recordIssuance(world, options.issuer, options.record, credential, options.time);
  return credential;
}

/**
 * The same issuer signs the encoding of one hidden value of a credential it issued, so a later
 * threshold proof can be checked against the issuer without the value being shown.
 */
export async function anchorField(
  world: World,
  issuer: LendingIssuer,
  credential: IssuedCredential,
  field: string,
  path: string,
  options: { readonly time: string; readonly validDays: number; readonly record: string },
): Promise<IssuedCredential> {
  const anchorId = podUrl(world, MAYA, path);
  const { deriveStatusIndex, mintCapturedOperandAnchor, validityOn } = await vcKit();
  const anchor = await mintCapturedOperandAnchor({
    anchorId,
    credential,
    field,
    issuer: webid(world, issuer),
    key: await world.keyFor(issuer),
    status: (await issuerStatusList(world, issuer)).entry(deriveStatusIndex(anchorId)),
    subject: webid(world, MAYA),
    validity: validityOn(world.calendar, world.day, {
      time: options.time,
      validDays: options.validDays,
    }),
  });
  await put(world.fetchAs(issuer), anchorId, anchor.credential.body, anchor.credential.contentType);
  await recordIssuance(world, issuer, options.record, anchor.credential, options.time);
  return anchor.credential;
}
