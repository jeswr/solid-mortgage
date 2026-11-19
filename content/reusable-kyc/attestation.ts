// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank as the issuer of Alex's KYC attestation (flows.md section 8, steps 1 and 6): what
 * the bank verified, by which method and when, signed with the key in its WebID profile and
 * withdrawable through its own Bitstring Status List (both already published by the mortgage
 * seed). No document image, scan, number or tax identifier is in it: vc-kit's
 * `kyc-attestation-credential` kind and its closed shape have no place for one.
 *
 * Alex's wallet stores each version at `alex:/credentials/kyc-attestation`; the bank keeps a
 * pointer (digest, not a copy) per version in `bank:/issued/`. A lost identity document means a
 * new version: the bank signs version n+1, the wallet stores it, and the bank revokes version n's
 * status entry, so a copy of the old statement fails its status check at source.
 */

import { CredentialPointer, MORT } from "@mortgage/data-model";
import type { IdentityCheckClaims, IssuedCredential, KycAttestationClaims } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { membersOf } from "../mortgage/grants.js";
import { recordIssuance, sign, statusListOf } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  podUrl,
  put,
  readDataset,
  readText,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { ACCOUNT_OPENED, ATTESTATION_VALID_DAYS, SUBJECT } from "./facts.js";

const BANK = "bank" as const;

/** Where the attestation lives in Alex's pod (pod-relative, no leading slash). */
export const ATTESTATION_PATH = "credentials/kyc-attestation";

export function attestationUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "alex", ATTESTATION_PATH);
}

/** The bank's record of version `n`. */
export function issuanceName(version: number): string {
  return `kyc-attestation-v${version}`;
}

/** The status index of version `n`: each version has its own, derived from its IRI. */
export async function attestationStatusIndex(
  world: Pick<World, "podOrigin">,
  version: number,
): Promise<number> {
  const { deriveStatusIndex } = await vcKit();
  return deriveStatusIndex(`${attestationUrl(world)}#v${version}`);
}

/** The versions the bank has issued, from its own `issued/` drawer. */
export async function issuedVersions(world: World): Promise<number[]> {
  const container = podUrl(world, BANK, "issued/");
  const bank = world.fetchAs(BANK);
  if ((await statusOf(bank, container)) !== 200) return [];
  return (await membersOf(bank, container))
    .map((url) => /kyc-attestation-v(\d+)$/.exec(url)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

/** The bank's pointer for version `n`: where it went, its type and digest. */
export async function readIssuance(world: World, version: number): Promise<CredentialPointer> {
  const url = podUrl(world, BANK, `issued/${issuanceName(version)}`);
  return new CredentialPointer(url, await readDataset(world.fetchAs(BANK), url), DataFactory);
}

/**
 * The checks behind version 1: the photo ID inspected when Alex opened the account, and two
 * checks run on the day of issue. Version 2 replaces the documentary check with the replacement
 * document inspected the day the loss was reported.
 */
export function checksFor(world: World, version: number): IdentityCheckClaims[] {
  const today = world.calendar.date(world.day);
  const documentary: IdentityCheckClaims =
    version === 1
      ? {
          attributes: ["name", "birthDate"],
          date: ACCOUNT_OPENED,
          description: "Unexpired government photo ID inspected in branch at account opening",
          method: "documentary",
        }
      : {
          attributes: ["name", "birthDate"],
          date: today,
          description: "Replacement government photo ID inspected in branch after a reported loss",
          method: "documentary",
        };
  return [
    documentary,
    {
      attributes: ["address", "taxIdLast4"],
      date: today,
      description: "Address and identifier matched against a consumer reporting agency",
      method: "non-documentary",
    },
    {
      attributes: ["name"],
      date: today,
      description: "Name screened against the government lists the bank must check",
      method: "government-list",
    },
  ];
}

export function attestationClaims(world: World, version: number): KycAttestationClaims {
  return {
    address: { ...SUBJECT.address },
    birthDate: SUBJECT.birthDate,
    checks: checksFor(world, version),
    kind: "kyc-attestation-credential",
    name: SUBJECT.name,
  };
}

export interface AttestationIssue {
  readonly version: number;
  readonly credential: IssuedCredential;
  /** The version whose status entry was revoked, if there was one. */
  readonly revoked?: number;
  /** The previous version's document as Alex held it, before it was replaced. */
  readonly previousBody?: string;
}

/**
 * Sign version n+1 on the current day, have Alex's wallet store it, record the issuance in the
 * bank's pod, then revoke version n. Alex is never left without a statement that stands.
 */
export async function issueAttestation(world: World, time: string): Promise<AttestationIssue> {
  const versions = await issuedVersions(world);
  const previous = versions.at(-1);
  const version = (previous ?? 0) + 1;
  const url = attestationUrl(world);
  const alex = world.fetchAs("alex");
  const previousBody =
    previous !== undefined && (await statusOf(alex, url)) === 200
      ? await readText(alex, url)
      : undefined;
  const credential = await sign(world, {
    claims: attestationClaims(world, version),
    credentialId: url,
    issuer: BANK,
    kind: "kyc-attestation-credential",
    statusIndex: await attestationStatusIndex(world, version),
    subject: webid(world, "alex"),
    time,
    validDays: ATTESTATION_VALID_DAYS,
  });
  // The bank hands the signed statement to Alex; Alex's wallet stores it in Alex's own pod.
  await put(alex, credential.credentialId, credential.body, credential.contentType);
  await recordIssuance(world, BANK, issuanceName(version), credential, time);
  if (previous !== undefined) {
    const list = await statusListOf(world, BANK);
    await list.revoke(await attestationStatusIndex(world, previous), { now: at(world, time) });
  }
  return {
    credential,
    version,
    ...(previous === undefined ? {} : { revoked: previous }),
    ...(previousBody === undefined ? {} : { previousBody }),
  };
}

/** The attestation's credential class, for the trusted-issuer list's `schema:about`. */
export const ATTESTATION_CLASS = MORT.KycAttestationCredential;
