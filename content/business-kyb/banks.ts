// AUTHORED-BY Claude Opus 5.5
/**
 * What the two banks do with Northwind's credentials (flows.md section 3, steps 6, 8, 10 and
 * 11). Every read goes to Northwind's pod under the bank's grant; every credential is checked at
 * source: the signature against the key in Halyard's own WebID profile, the shape, the validity
 * window on the demo calendar, and Halyard's status list.
 *
 * - Alder Bank's due diligence writes a CDD decision record in Alder's own pod: the credentials
 *   checked, the owners at or above 25 percent, the control person, "account opened". The bank
 *   keeps it after Northwind withdraws K1 (31 CFR 1010.230(i)).
 * - Both banks' back offices re-read the ownership credential when the register re-issues it
 *   (step 10) and Alder's monitoring read after the withdrawal is refused (step 11).
 */

import { parseRdf } from "@jeswr/fetch-rdf";
import {
  BeneficialOwnershipCredential,
  buildCddDecisionRecord,
  CddDecisionRecord,
  type MortgageResourceKind,
  OfficerAuthorisationCredential,
  OrganisationalIdentityCredential,
} from "@mortgage/data-model";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import { checkAtSource, type SourceCheck } from "../mortgage/issuers.js";
import {
  at,
  dateOf,
  PodRequestError,
  podUrl,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { CONTROL_PERSON, ENTITY, HOLDER, THRESHOLD_BPS } from "./facts.js";
import type { KybBank } from "./grants.js";
import { credentialUrl, type RegisterCredential } from "./register.js";

const KIND: Readonly<Record<RegisterCredential, MortgageResourceKind>> = {
  "beneficial-ownership": "beneficial-ownership-credential",
  "officer-authorisation": "officer-authorisation-credential",
  "org-identity": "organisational-identity-credential",
};

export const CDD_PATH = "kyb/cdd/northwind";

export function cddUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "bank", CDD_PATH);
}

export interface CheckedCredential {
  readonly name: RegisterCredential;
  readonly url: string;
  readonly verified: boolean;
  readonly errors: readonly string[];
  readonly check: SourceCheck;
}

/** Read one credential as `bank` and check it at source. A refused read throws. */
export async function checkCredential(
  world: World,
  bank: KybBank,
  name: RegisterCredential,
  time = "10:00",
): Promise<CheckedCredential> {
  const url = credentialUrl(world, name);
  const check = await checkAtSource(world, bank, url, KIND[name], ["registry"], time);
  return {
    check,
    errors: check.result.errors.map((error) => `${error.code}: ${error.message}`),
    name,
    url,
    verified: check.result.verified,
  };
}

async function parse(check: SourceCheck) {
  return parseRdf(check.body, "text/turtle", { baseIRI: check.url });
}

export interface OwnershipView {
  readonly owners: readonly { name: string; bps: number }[];
  readonly beneficialOwners: readonly string[];
}

export async function ownershipOf(check: SourceCheck): Promise<OwnershipView> {
  const credential = new BeneficialOwnershipCredential(check.url, await parse(check), DataFactory);
  const owners = credential.credentialSubject.ownerships.map((ownership) => ({
    bps: ownership.bps,
    name: ownership.owner.personName,
  }));
  return {
    beneficialOwners: owners.filter((owner) => owner.bps >= THRESHOLD_BPS).map((o) => o.name),
    owners,
  };
}

export interface DueDiligence {
  readonly checks: readonly CheckedCredential[];
  readonly decision: "opened" | "declined";
  readonly beneficialOwners: readonly string[];
  readonly controlPerson: string;
  readonly lei: string;
  /** The bank's own record. */
  readonly record: string;
}

/**
 * Step 6: Alder Bank reads the three credentials under K1, checks each at source, identifies the
 * owners at or above 25 percent and the control person, and records its decision in its own pod.
 */
export async function runDueDiligence(world: World, time = "10:30"): Promise<DueDiligence> {
  const checks: CheckedCredential[] = [];
  for (const name of ["org-identity", "officer-authorisation", "beneficial-ownership"] as const) {
    checks.push(await checkCredential(world, "bank", name, time));
  }
  const byName = (name: RegisterCredential) => {
    const found = checks.find((check) => check.name === name);
    if (found === undefined) throw new Error(`${name} was not checked`);
    return found.check;
  };
  const identity = new OrganisationalIdentityCredential(
    byName("org-identity").url,
    await parse(byName("org-identity")),
    DataFactory,
  ).credentialSubject;
  const officers = new OfficerAuthorisationCredential(
    byName("officer-authorisation").url,
    await parse(byName("officer-authorisation")),
    DataFactory,
  ).credentialSubject.officers.map((officer) => officer.personName);
  const { beneficialOwners } = await ownershipOf(byName("beneficial-ownership"));
  const allVerified = checks.every((check) => check.verified);
  const controlPerson = officers.includes(CONTROL_PERSON) ? CONTROL_PERSON : (officers[0] ?? "");
  const decision =
    allVerified && identity.lei.illustrative && controlPerson !== "" ? "opened" : "declined";
  const record = await putResource(
    world.fetchAs("bank"),
    buildCddDecisionRecord({
      bank: webid(world, "bank"),
      beneficialOwners,
      checkDate: dateOf(world, world.day),
      checkedCredentials: checks.map((check) => check.url),
      controlPerson: controlPerson || "Not identified",
      customer: webid(world, HOLDER),
      decision,
      iri: cddUrl(world),
      name: `Customer due diligence: ${ENTITY.legalName}`,
    }),
  );
  world.note({
    kind: "verified",
    org: "bank",
    refs: [record],
    text:
      decision === "opened"
        ? `Business account opened. Owners at 25% or more: ${beneficialOwners.join(" and ")}. Control person: ${controlPerson}.`
        : "Due diligence did not pass; the account was not opened.",
  });
  return {
    beneficialOwners,
    checks,
    controlPerson,
    decision,
    lei: identity.lei.text,
    record,
  };
}

/** Alder's own record of its decision (it keeps it whatever Northwind later withdraws). */
export async function readCddRecord(world: World): Promise<CddDecisionRecord | undefined> {
  const fetcher = world.fetchAs("bank");
  const url = cddUrl(world);
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  return new CddDecisionRecord(url, await readDataset(fetcher, url), DataFactory);
}

export interface Reread {
  readonly bank: KybBank;
  /** 200 with a check, or the status the pod refused with. */
  readonly status: number;
  readonly ownership?: OwnershipView;
  readonly verified?: boolean;
}

/**
 * A bank's back office reads the ownership credential again under its grant and checks it. A
 * refusal (the grant withdrawn) is returned, not thrown: that is the answer.
 */
export async function rereadOwnership(
  world: World,
  bank: KybBank,
  time = "11:00",
): Promise<Reread> {
  try {
    const checked = await checkCredential(world, bank, "beneficial-ownership", time);
    return {
      bank,
      ownership: await ownershipOf(checked.check),
      status: 200,
      verified: checked.verified,
    };
  } catch (error) {
    if (error instanceof PodRequestError) return { bank, status: error.status };
    throw error;
  }
}

/** Step 8: Brackenridge's deal sheet: identity and ownership under K2, checked at source. */
export async function readDealSheet(world: World, time = "14:10") {
  const identity = await checkCredential(world, "business-lender", "org-identity", time);
  const ownership = await checkCredential(world, "business-lender", "beneficial-ownership", time);
  const subject = new OrganisationalIdentityCredential(
    identity.url,
    await parse(identity.check),
    DataFactory,
  ).credentialSubject;
  return {
    identity,
    legalName: subject.legalName,
    lei: subject.lei.text,
    ownership: await ownershipOf(ownership.check),
    verified: identity.verified && ownership.verified,
  };
}

export type { OrgSlug };
export { at };
