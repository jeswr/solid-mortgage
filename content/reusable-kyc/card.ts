// AUTHORED-BY Claude Opus 5.5
/**
 * Pennant as the relying party (flows.md section 8, steps 3 and 5). It reads Alex's attestation
 * once under Y1 and checks three things with vc-kit's `verifyWithTrustList`, failing closed on
 * each: the signature (against the key in Alder Bank's own WebID profile), the status (Alder's
 * status list says it has not been withdrawn, and a status entry must be there at all), and that
 * Alder Bank is on Pennant's copy of the scheme's trusted-issuer list for KYC attestations. It
 * keeps a pointer (digest and outcome, not a copy) in its own pod. The second read is refused by
 * the pod: the runtime closed the one-time grant after the first.
 */

import { parseRdf } from "@jeswr/fetch-rdf";
import {
  buildCredentialPointer,
  CredentialPointer,
  KycAttestationCredential,
} from "@mortgage/data-model";
import type { TrustListVerificationResult } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { digestOf } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  statusOf,
  type World,
} from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import { ATTESTATION_CLASS, attestationUrl } from "./attestation.js";
import { readTrustedListText, TRUSTED_LIST_NAME, trustedListUrl } from "./scheme.js";

const CARD = "card-issuer" as const;

/** Pennant's own record of the check (pod-relative). */
export const CHECK_PATH = "applications/alex-identity-check";

export function checkUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, CARD, CHECK_PATH);
}

export interface VerifiedIdentity {
  readonly result: TrustListVerificationResult;
  /** The attestation as Pennant read it. */
  readonly body: string;
  /** What the statement says, for the prefilled form (only when verified). */
  readonly claims?: {
    readonly name: string;
    readonly birthDate: string;
    readonly address: string;
    readonly checks: readonly { method: string; date: string; description: string }[];
  };
}

/** Read the attestation as Pennant. A refused read throws a {@link PodRequestError}. */
async function readAttestation(world: World): Promise<string> {
  const url = attestationUrl(world);
  const response = await world.fetchAs(CARD)(url, { headers: { accept: "text/turtle" } });
  if (!response.ok) throw new PodRequestError("GET", url, response.status);
  return response.text();
}

async function claimsOf(world: World, body: string): Promise<VerifiedIdentity["claims"]> {
  const url = attestationUrl(world);
  const dataset = await parseRdf(body, "text/turtle", { baseIRI: url });
  const subject = new KycAttestationCredential(url, dataset, DataFactory).credentialSubject;
  const address = subject.address;
  return {
    address: `${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`,
    birthDate: subject.birthDate.toISOString().slice(0, 10),
    checks: subject.checks
      .map((check) => ({
        date: check.date.toISOString().slice(0, 10),
        description: check.description,
        method: check.method.slice(check.method.lastIndexOf("-") + 1),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    name: subject.name,
  };
}

/**
 * Step 3: read once, verify against the trusted-issuer list, record the outcome in Pennant's
 * pod, and tell the Lens what was checked (an app note: no pod request can show it).
 */
export async function verifyIdentity(world: World, time: string): Promise<VerifiedIdentity> {
  const body = await readAttestation(world);
  const card = world.fetchAs(CARD);
  const { verifyWithTrustList } = await vcKit();
  const result = await verifyWithTrustList(body, {
    expectShape: "kyc-attestation-credential",
    now: at(world, time),
    statusFetch: card,
    trustList: { document: await readTrustedListText(world), iri: trustedListUrl(world) },
    webIdFetch: card,
  });
  await putResource(
    card,
    buildCredentialPointer({
      asOf: at(world, time),
      checkedAt: at(world, time),
      credentialType: ATTESTATION_CLASS,
      iri: checkUrl(world),
      issuer: result.credential?.issuer ?? podUrl(world, "bank", "profile/card#me"),
      sha256: digestOf(body),
      signatureVerified: result.gates.signature,
      statusChecked: result.gates.status,
      url: attestationUrl(world),
    }),
  );
  if (result.verified) {
    world.note({
      kind: "verified",
      org: CARD,
      refs: [attestationUrl(world), trustedListUrl(world)],
      text: `${ORGS[CARD].short} checked the attestation: signed by ${result.entry?.name ?? "the issuer"}, not withdrawn, and the issuer is on ${TRUSTED_LIST_NAME} (agreement ${result.entry?.agreement ?? "unknown"})`,
    });
  }
  return {
    body,
    result,
    ...(result.verified ? { claims: await claimsOf(world, body) } : {}),
  };
}

/** Pennant's record of the check, if it has made one. */
export async function readCheck(world: World): Promise<CredentialPointer | undefined> {
  const url = checkUrl(world);
  const card = world.fetchAs(CARD);
  if ((await statusOf(card, url)) !== 200) return undefined;
  return new CredentialPointer(url, await readDataset(card, url), DataFactory);
}

/**
 * Step 5: Pennant asks again. Returns the pod's status: 403 once the one-time grant is used.
 * Nothing is read on a refusal.
 */
export async function refreshIdentity(world: World): Promise<number> {
  const response = await world.fetchAs(CARD)(attestationUrl(world), {
    headers: { accept: "text/turtle" },
  });
  if (response.ok) await response.text();
  return response.status;
}
