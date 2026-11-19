// AUTHORED-BY Claude Opus 5.5
/**
 * Wrenfield Mutual's claims desk (steps 2, 3 and 7). Every read of Alex's pod is made as the
 * insurer, so the pod decides it under grant C1; the insurer's own records (the claim case and
 * the pointers to the credentials it checked) are written in its own pod.
 */

import {
  buildClaimCase,
  buildCredentialPointer,
  buildDamageReport,
  type CaseStatusIri,
  CLAIM_SCHEMA,
  ClaimCase,
  MORT,
  type MortgageResourceKind,
  MotorIncidentReport,
  OtherPartyDetails,
  RESOURCE_TARGET_CLASSES,
  RepairEstimate,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { checkAtSource, digestOf } from "../mortgage/issuers.js";
import { answerOrAwait } from "../mortgage/messages.js";
import {
  at,
  podUrl,
  putResource,
  readDataset,
  readText,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { alexUrl } from "./claim.js";
import { CLAIM_NUMBER, DAMAGE, ORG_PATHS, PATHS } from "./facts.js";
import {
  approveClaimGrant,
  findClaimRequest,
  motorGrant,
  motorPolicyUrl,
  requestClaimGrant,
} from "./grants.js";
import { withAlexGrantLock } from "./lock.js";
import { send } from "./messages.js";
import { PHOTO_TYPE } from "./photos.js";
import { readJob, takeAuthorisation, takeReferral } from "./repairer.js";

export const insurerCaseUrl = (world: Pick<World, "podOrigin">): string =>
  podUrl(world, "insurer", ORG_PATHS.insurerCase);

/** Wrenfield's claim record, if the claim has been reported. */
export async function readInsurerCase(world: World): Promise<ClaimCase | undefined> {
  const insurer = world.fetchAs("insurer");
  const url = insurerCaseUrl(world);
  if ((await statusOf(insurer, url)) !== 200) return undefined;
  return new ClaimCase(url, await readDataset(insurer, url), DataFactory);
}

async function writeCase(
  world: World,
  fields: { status?: CaseStatusIri; acceptedEstimate?: string; description: string; time: string },
): Promise<ClaimCase> {
  const current = await readInsurerCase(world);
  const acceptedEstimate = fields.acceptedEstimate ?? current?.acceptedEstimateIri;
  const url = await putResource(
    world.fetchAs("insurer"),
    buildClaimCase({
      caseKind: MORT.CaseKind_InsuranceClaim,
      claimFile: alexUrl(world, PATHS.claim),
      claimNumber: CLAIM_NUMBER,
      customer: webid(world, "alex"),
      description: fields.description,
      iri: insurerCaseUrl(world),
      modified: at(world, fields.time),
      policy: motorPolicyUrl(world, "C1"),
      status:
        fields.status ??
        (current?.status as CaseStatusIri | undefined) ??
        CLAIM_SCHEMA.ActiveActionStatus,
      ...(acceptedEstimate === undefined ? {} : { acceptedEstimate }),
    }),
  );
  return new ClaimCase(url, await readDataset(world.fetchAs("insurer"), url), DataFactory);
}

/**
 * Step 2. Alex reports the claim on Wrenfield's claims page. Wrenfield asks for C1 (an ODRL
 * request in Alex's inbox), Alex approves it there and then (the agreement, the consent record
 * and the ACL change, under the one lock every writer of Alex's grants takes), and Wrenfield
 * opens its claim record. Pressing again changes nothing.
 */
export async function reportClaim(world: World): Promise<ClaimCase> {
  const existing = await readInsurerCase(world);
  if ((await motorGrant(world, "C1"))?.state !== "active") {
    const request =
      (await findClaimRequest(world, "C1")) ?? (await requestClaimGrant(world, "C1", "09:30"));
    await withAlexGrantLock(async () => {
      // Another tab may have approved it while this one waited for the lock.
      if ((await motorGrant(world, "C1"))?.state === "active") return;
      await approveClaimGrant(world, request, "09:32");
    });
  }
  if (existing !== undefined) return existing;
  return writeCase(world, {
    description: "Claim reported by the policyholder. Licence and policy to be checked at source.",
    status: CLAIM_SCHEMA.ActiveActionStatus,
    time: "09:34",
  });
}

/** A credential the desk checked at source, and the pointer it kept. */
export interface DeskCheck {
  readonly label: string;
  readonly url: string;
  readonly verified: boolean;
  readonly errors: readonly string[];
  readonly pointer: string;
}

async function checkAndKeep(
  world: World,
  label: string,
  path: string,
  kind: MortgageResourceKind,
  issuer: PodOwner,
  pointerPath: string,
  time: string,
): Promise<DeskCheck> {
  const url = alexUrl(world, path);
  const check = await checkAtSource(world, "insurer", url, kind, [issuer], time);
  const pointer = podUrl(world, "insurer", pointerPath);
  const errors = check.result.errors.map((error) => error.code);
  if (!check.result.verified) return { errors, label, pointer, url, verified: false };
  await putResource(
    world.fetchAs("insurer"),
    buildCredentialPointer({
      asOf: new Date(check.result.credential?.validFrom ?? at(world, time)),
      checkedAt: at(world, time),
      credentialType: RESOURCE_TARGET_CLASSES[kind],
      iri: pointer,
      issuer: webid(world, issuer),
      sha256: digestOf(check.body),
      signatureVerified: true,
      statusChecked: true,
      url,
    }),
  );
  world.note({
    kind: "verified",
    org: "insurer",
    refs: [url, pointer],
    text: `${label}: signature, issuer key and revocation status checked at source. A pointer and a digest are kept, not a copy.`,
  });
  return { errors, label, pointer, url, verified: true };
}

/** What the claims desk read and wrote in step 3. */
export interface DeskReview {
  readonly checks: readonly DeskCheck[];
  readonly incident: MotorIncidentReport;
  readonly otherParty: OtherPartyDetails | undefined;
  /** The photos as the insurer read them (SVG documents). */
  readonly photos: readonly { url: string; svg: string }[];
  readonly damageReport: string;
  /** Anvil's access request, which the referral produced, in Alex's inbox. */
  readonly repairerRequest: string;
}

/** The desk reads the incident report, the other driver's details and the photos. */
export async function readClaimAsInsurer(
  world: World,
): Promise<Pick<DeskReview, "incident" | "otherParty" | "photos">> {
  const insurer = world.fetchAs("insurer");
  const incidentUrl = alexUrl(world, PATHS.incident);
  const incident = new MotorIncidentReport(
    incidentUrl,
    await readDataset(insurer, incidentUrl),
    DataFactory,
  );
  const otherPartyUrl = incident.otherPartyIri;
  const otherParty =
    otherPartyUrl === undefined
      ? undefined
      : new OtherPartyDetails(
          otherPartyUrl,
          await readDataset(insurer, otherPartyUrl),
          DataFactory,
        );
  const photos: { url: string; svg: string }[] = [];
  for (const url of incident.photos)
    photos.push({ svg: await readText(insurer, url, PHOTO_TYPE), url });
  return { incident, otherParty, photos };
}

/**
 * Step 3. The handler checks the driver licence (signed by State Online Services) and the motor
 * policy (signed by Wrenfield itself) at source, reads the claim file, writes the damage report
 * into Alex's claim folder and refers the job to Anvil, whose back office asks Alex for C2.
 */
export async function checkClaim(world: World): Promise<DeskReview> {
  const checks = [
    await checkAndKeep(
      world,
      "Driver licence",
      PATHS.licence,
      "identity-credential",
      "state",
      ORG_PATHS.insurerLicenceCheck,
      "10:00",
    ),
    await checkAndKeep(
      world,
      "Motor policy",
      PATHS.policy,
      "motor-policy-credential",
      "insurer",
      ORG_PATHS.insurerPolicyCheck,
      "10:01",
    ),
  ];
  const failed = checks.filter((check) => !check.verified);
  if (failed.length > 0) {
    throw new Error(
      failed
        .map((check) => `${check.label} failed its check: ${check.errors.join(", ")}`)
        .join("; "),
    );
  }
  const { incident, otherParty, photos } = await readClaimAsInsurer(world);
  const damageReport = await putResource(
    world.fetchAs("insurer"),
    buildDamageReport({
      about: incident.value,
      created: at(world, "10:20"),
      creator: webid(world, "insurer"),
      damage: [...DAMAGE],
      description:
        "Assessed from the policyholder's photos. Cover confirmed: collision, deductible applies.",
      iri: alexUrl(world, PATHS.damageReport),
      name: `Damage report, claim ${CLAIM_NUMBER}`,
      photos: photos.map((photo) => photo.url),
      vehicle: {
        name: incident.vehicle.name,
        ...(incident.vehicle.vin === undefined ? {} : { vin: incident.vehicle.vin }),
        ...(incident.vehicle.color === undefined ? {} : { color: incident.vehicle.color }),
      },
    }),
  );
  await writeCase(world, {
    description:
      "Licence and policy verified at source. Damage report written. Referred to Anvil Collision Repair.",
    time: "10:22",
  });
  const asked = await findClaimRequest(world, "C2");
  if (asked !== undefined) {
    return { checks, damageReport, incident, otherParty, photos, repairerRequest: asked };
  }
  const referral = await send(world, {
    from: "insurer",
    kind: MORT.MessageKind_RepairReferral,
    objects: [damageReport],
    summary: `Repair referral for claim ${CLAIM_NUMBER}: ask the policyholder for the damage report and the photos.`,
    time: "10:25",
    to: "repairer",
  });
  const repairerRequest = await answerOrAwait(world, {
    answer: () => takeReferral(world, referral),
    claimant: "repairer",
    look: () => findClaimRequest(world, "C2"),
    messageUrl: referral,
  });
  return { checks, damageReport, incident, otherParty, photos, repairerRequest };
}

/**
 * Step 7. The handler reads Anvil's estimate where Anvil wrote it, in Alex's claim folder,
 * authorises the repair and records the accepted estimate on the claim.
 */
export async function approveEstimate(
  world: World,
): Promise<{ estimate: RepairEstimate; claim: ClaimCase }> {
  const url = alexUrl(world, PATHS.estimate);
  const estimate = new RepairEstimate(
    url,
    await readDataset(world.fetchAs("insurer"), url),
    DataFactory,
  );
  const current = await readInsurerCase(world);
  if (current?.acceptedEstimateIri === url) return { claim: current, estimate };
  const authorisation = await send(world, {
    from: "insurer",
    kind: MORT.MessageKind_RepairAuthorisation,
    objects: [url],
    summary: `Estimate ${estimate.estimateNumber} approved for claim ${CLAIM_NUMBER}. Go ahead with the repair.`,
    time: "15:00",
    to: "repairer",
  });
  await answerOrAwait(world, {
    answer: () => takeAuthorisation(world, authorisation),
    claimant: "repairer",
    look: async () => {
      const job = await readJob(world);
      return job?.acceptedEstimateIri === url ? job : undefined;
    },
    messageUrl: authorisation,
  });
  const claim = await writeCase(world, {
    acceptedEstimate: url,
    description: `Estimate ${estimate.estimateNumber} approved. Repair authorised.`,
    time: "15:02",
  });
  return { claim, estimate };
}
