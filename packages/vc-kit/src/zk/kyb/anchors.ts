// AUTHORED-BY Claude Opus 5.5
/**
 * Business KYB operand anchors (decision 0012 applied to the register's beneficial ownership
 * credential). Both read the owner shares from the SIGNED claim graph of the just-issued
 * credential, never from caller input, so an anchor can only bind what the register attested.
 *
 * - {@link mintOwnerShareAnchor} (Tier A): one owner's `mort:ownershipPercentageBps`, from the
 *   captured sparq encodings (an uncaptured share throws, it is never guessed).
 * - {@link mintOwnerArrayAnchor} (Tier B): the commitment over the full owner array, computed
 *   here (`commitment.ts`), field `mort:beneficialOwnershipArrayCommitment`.
 *
 * The anchor subject is the entity's WebID, the presenter the verifier authenticates.
 */

import type {
  BitstringStatusListEntry,
  BitstringStatusListEntryInput,
  KeyPair,
} from "@jeswr/solid-vc";
import { BeneficialOwnershipSubject, MORT } from "@mortgage/data-model";
import { DataFactory, Store } from "n3";
import type { IssuedCredential, ValidityWindow } from "../../issue.js";
import { issueCredential } from "../../issue.js";
import { capturedOperandEncoding } from "../anchors.js";
import { ZkError } from "../backend.js";
import { ownershipArrayCommitment } from "./commitment.js";

export interface KybAnchorOptions {
  /** The just-issued beneficial ownership credential. */
  readonly credential: IssuedCredential;
  /** The entity WebID: the credential's subject and the anchor's. */
  readonly subject: string;
  /** The register's WebID: the same issuer as the anchored credential. */
  readonly issuer: string;
  readonly anchorId: string;
  readonly status: BitstringStatusListEntry | BitstringStatusListEntryInput;
  readonly validity: ValidityWindow;
  readonly key: KeyPair;
}

export interface KybAnchor {
  readonly field: string;
  readonly operandEnc: string;
  readonly credential: IssuedCredential;
}

/** One owner as the signed credential states it. */
export interface SignedOwner {
  readonly name: string;
  readonly bps: number;
}

/**
 * The owners in the signed claim graph, in canonical order (largest share first, then name):
 * the order the owner array is committed in.
 */
export function signedOwners(credential: IssuedCredential, subject: string): SignedOwner[] {
  if (credential.kind !== "beneficial-ownership-credential") {
    throw new ZkError("WRONG_CREDENTIAL", `expected a beneficial ownership credential`);
  }
  const node = new BeneficialOwnershipSubject(
    DataFactory.namedNode(subject),
    new Store([...credential.claimQuads]),
    DataFactory,
  );
  const owners = node.ownerships.map((ownership) => ({
    bps: ownership.bps,
    name: ownership.owner.personName,
  }));
  if (owners.length === 0) throw new ZkError("NO_OWNERS", "the credential names no owner");
  return owners;
}

function anchor(options: KybAnchorOptions, field: string, operandEnc: string) {
  return issueCredential({
    claims: { field, kind: "zk-operand-anchor", operandEnc },
    credentialId: options.anchorId,
    issuer: options.issuer,
    key: options.key,
    kind: "zk-operand-anchor",
    status: options.status,
    subject: options.subject,
    validity: options.validity,
  });
}

/** Tier A: anchor one named owner's share. Throws for an uncaptured share. */
export async function mintOwnerShareAnchor(
  options: KybAnchorOptions & { readonly owner: string },
): Promise<KybAnchor> {
  const owner = signedOwners(options.credential, options.subject).find(
    (candidate) => candidate.name === options.owner,
  );
  if (owner === undefined) {
    throw new ZkError("UNKNOWN_OWNER", `${options.owner} is not an owner in the credential`);
  }
  const field = MORT.ownershipPercentageBps;
  const operandEnc = capturedOperandEncoding(owner.bps);
  return { credential: await anchor(options, field, operandEnc), field, operandEnc };
}

/** Tier B: anchor the commitment over the full owner array. */
export async function mintOwnerArrayAnchor(options: KybAnchorOptions): Promise<KybAnchor> {
  const bps = signedOwners(options.credential, options.subject).map((owner) => owner.bps);
  const field = MORT.beneficialOwnershipArrayCommitment;
  const operandEnc = ownershipArrayCommitment(bps);
  return { credential: await anchor(options, field, operandEnc), field, operandEnc };
}
