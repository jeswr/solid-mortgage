// AUTHORED-BY Claude Fable 5.2
/**
 * What every credential issuer in the demo does the same way: publish its key in its WebID
 * profile, host one Bitstring Status List, sign with the demo calendar as the clock, keep a
 * record of what it issued, and let any reader check a credential at source.
 */

import {
  buildAgentProfile,
  buildCredentialPointer,
  type MortgageResourceKind,
  RESOURCE_TARGET_CLASSES,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import {
  type CredentialClaims,
  type CredentialKind,
  deriveStatusIndex,
  type IssuedCredential,
  issueCredential,
  publishVerificationMethod,
  StatusListClient,
  sha256,
  type VerifyCredentialResult,
  validityOn,
  verifyCredential,
} from "@mortgage/vc-kit";
import type { Quad } from "@rdfjs/types";
import { ORGS } from "../orgs.js";
import { STATUS_LIST_LIFETIME_DAYS } from "./facts.js";
import { at, podUrl, put, putResource, readText, type World, webid } from "./world.js";

/** The organisations that sign credentials. Each has a key and a status list. */
export const ISSUERS = ["payroll", "bank", "bureau", "appraisal", "title", "insurer"] as const;
export type Issuer = (typeof ISSUERS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The verification method IRI of an organisation's signing key, inside its WebID profile. */
export function keyId(world: Pick<World, "podOrigin">, owner: PodOwner): string {
  return `${podUrl(world, owner, "profile/card")}#key-1`;
}

export function statusListUrl(world: Pick<World, "podOrigin">, issuer: PodOwner): string {
  return podUrl(world, issuer, "status/list");
}

/** The issuer's own client for its hosted status list. */
export async function statusListOf(world: World, issuer: Issuer): Promise<StatusListClient> {
  return new StatusListClient({
    fetch: world.fetchAs(issuer),
    issuer: webid(world, issuer),
    key: await world.keyFor(issuer),
    listLifetimeMs: STATUS_LIST_LIFETIME_DAYS * DAY_MS,
    url: statusListUrl(world, issuer),
  });
}

function organisationName(owner: PodOwner): string {
  if (owner === "alex") return "Alex Rivera";
  return ORGS[owner].organisation;
}

/**
 * First run, per issuer: publish the public key in the WebID profile (so a verifier can resolve
 * it from the issuer, not from the holder) and host an all-clear status list.
 */
export async function publishIssuer(world: World, issuer: Issuer, time = "08:00"): Promise<void> {
  const key = await world.keyFor(issuer);
  const profile = buildAgentProfile({
    inbox: podUrl(world, issuer, "inbox/"),
    iri: podUrl(world, issuer, "profile/card"),
    kind: "organisation",
    name: organisationName(issuer),
    storage: podUrl(world, issuer),
    webId: webid(world, issuer),
  });
  const published = await publishVerificationMethod({ controller: webid(world, issuer), key });
  for (const quad of published.quads as readonly Quad[]) profile.dataset.add(quad);
  await putResource(world.fetchAs(issuer), profile);
  await (await statusListOf(world, issuer)).create({ now: at(world, time) });
}

export interface IssueToPodOptions {
  readonly issuer: Issuer;
  readonly kind: CredentialKind;
  /** The URL the credential will live at, which is also its IRI. */
  readonly credentialId: string;
  readonly subject: string;
  readonly claims: CredentialClaims;
  readonly validDays: number;
  readonly time: string;
  /** The status list index. Default: derived from the credential's IRI. */
  readonly statusIndex?: number;
}

/** Sign a credential on the current demo day. Nothing is written. */
export async function sign(world: World, options: IssueToPodOptions): Promise<IssuedCredential> {
  const list = await statusListOf(world, options.issuer);
  return issueCredential({
    claims: options.claims,
    credentialId: options.credentialId,
    issuer: webid(world, options.issuer),
    key: await world.keyFor(options.issuer),
    kind: options.kind,
    status: list.entry(options.statusIndex ?? deriveStatusIndex(options.credentialId)),
    subject: options.subject,
    validity: validityOn(world.calendar, world.day, {
      time: options.time,
      validDays: options.validDays,
    }),
  });
}

const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** The SHA-256 of a credential document as stored, for a pointer record. */
export function digestOf(body: string): string {
  return hex(sha256(body));
}

/**
 * The issuer's own record of an issuance, in its `issued/` drawer: where the credential went,
 * its type, its digest and its date. Not a copy of the credential.
 */
export async function recordIssuance(
  world: World,
  issuer: Issuer,
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

/** Sign a credential, PUT it at its own URL as `writer`, and record the issuance. */
export async function issueToPod(
  world: World,
  options: IssueToPodOptions & { readonly writer?: PodOwner; readonly record: string },
): Promise<IssuedCredential> {
  const credential = await sign(world, options);
  await put(
    world.fetchAs(options.writer ?? options.issuer),
    credential.credentialId,
    credential.body,
    credential.contentType,
  );
  await recordIssuance(world, options.issuer, options.record, credential, options.time);
  return credential;
}

export interface SourceCheck {
  readonly url: string;
  readonly body: string;
  readonly kind: MortgageResourceKind;
  readonly result: VerifyCredentialResult;
}

/**
 * Read a credential from where it lives, as `reader`, and check it at source: the signature
 * against the key in the issuer's own WebID profile, the shape, the validity window on the demo
 * calendar, and the issuer's status list. A refused read throws; a failed check is returned.
 */
export async function checkAtSource(
  world: World,
  reader: PodOwner,
  url: string,
  kind: MortgageResourceKind,
  trustedIssuers: readonly PodOwner[],
  time = "12:00",
): Promise<SourceCheck> {
  const fetcher = world.fetchAs(reader);
  const body = await readText(fetcher, url);
  const result = await verifyCredential(body, {
    expectShape: kind,
    now: at(world, time),
    statusFetch: fetcher,
    trustedIssuers: trustedIssuers.map((issuer) => webid(world, issuer)),
    webIdFetch: fetcher,
  });
  return { body, kind, result, url };
}
