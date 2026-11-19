// AUTHORED-BY Claude Opus 5.5
/**
 * The state's Department of Revenue (an office of State Online Services, the `state` app) attests
 * Northwind's tax compliance (flows.md section 6, step 2): filings up to date through the end of
 * the last quarter, and the band its annual turnover falls in. Never the figure.
 *
 * The state signs with the key in its WebID profile and its own Bitstring Status List (the same
 * ones the moving-house licence uses); Northwind's wallet stores the credential in
 * `credentials/tax-compliance`; the state keeps a record of the issuance (not a copy) in its
 * `issued/` drawer.
 */

import {
  buildCredentialPointer,
  RESOURCE_TARGET_CLASSES,
  TaxComplianceCredential,
} from "@mortgage/data-model";
import type { IssuedCredential } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { ENTITY } from "../business-kyb/facts.js";
import { aclDataset, aclTurtle, PUBLIC_READ } from "../mortgage/acl.js";
import { membersOf } from "../mortgage/grants.js";
import { digestOf, statusListUrl } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  dateOf,
  podUrl,
  put,
  putResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { publishState, stateStatusList } from "../moving-house/issuer.js";
import { HOLDER, PATHS, TAX } from "./facts.js";

const STATE = "state" as const;

export function taxCredentialUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, HOLDER, PATHS.tax);
}

/** The state's record of tax compliance credential version `n`. */
export function taxIssuanceUrl(world: Pick<World, "podOrigin">, version: number): string {
  return podUrl(world, STATE, `issued/tax-compliance-northwind-v${version}`);
}

/** The state's public status drawer, key and list (shared with the moving-house demo). */
export async function ensureStateIssuer(world: World): Promise<void> {
  const state = world.fetchAs(STATE);
  if ((await statusOf(state, statusListUrl(world, STATE))) === 200) return;
  const status = podUrl(world, STATE, "status/");
  if ((await statusOf(state, status)) !== 200) {
    await put(state, status, "", "text/turtle");
    await put(
      state,
      `${status}.acl`,
      await aclTurtle(aclDataset(webid(world, STATE), status, [PUBLIC_READ])),
      "text/turtle",
    );
  }
  await publishState(world, "07:50");
}

/** The versions the state has issued to Northwind, from its own `issued/` drawer. */
export async function taxVersions(world: World): Promise<number[]> {
  const container = podUrl(world, STATE, "issued/");
  const state = world.fetchAs(STATE);
  if ((await statusOf(state, container)) !== 200) return [];
  return (await membersOf(state, container))
    .map((url) => /tax-compliance-northwind-v(\d+)$/.exec(url)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

/** The end of the last calendar quarter before `day` (filings are due quarterly). */
export function lastQuarterEnd(world: Pick<World, "calendar">, day: number): Date {
  const date = dateOf(world, day);
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 0));
}

async function statusIndex(world: Pick<World, "podOrigin">, version: number): Promise<number> {
  const { deriveStatusIndex } = await vcKit();
  return deriveStatusIndex(`${taxCredentialUrl(world)}#v${version}`);
}

export interface TaxIssue {
  readonly credential: IssuedCredential;
  readonly version: number;
}

/**
 * The state signs the next version, Northwind's wallet stores it (`writer`), the state records the
 * issuance and revokes the previous version's status entry.
 */
export async function issueTaxCompliance(world: World, time = "10:15"): Promise<TaxIssue> {
  await ensureStateIssuer(world);
  const previous = (await taxVersions(world)).at(-1);
  const version = (previous ?? 0) + 1;
  const kit = await vcKit();
  const list = await stateStatusList(world);
  const credential = await kit.issueCredential({
    claims: {
      entityName: ENTITY.legalName,
      filingsCurrentThrough: lastQuarterEnd(world, world.day),
      kind: "tax-compliance-credential",
      status: "compliant",
      taxIdLast4: TAX.taxIdLast4,
      turnoverBand: TAX.turnoverBand,
    },
    credentialId: taxCredentialUrl(world),
    issuer: webid(world, STATE),
    key: await world.keyFor(STATE),
    kind: "tax-compliance-credential",
    status: list.entry(await statusIndex(world, version)),
    subject: webid(world, HOLDER),
    validity: kit.validityOn(world.calendar, world.day, { time, validDays: TAX.validDays }),
  });
  await put(
    world.fetchAs(HOLDER),
    credential.credentialId,
    credential.body,
    credential.contentType,
  );
  await putResource(
    world.fetchAs(STATE),
    buildCredentialPointer({
      asOf: at(world, time),
      credentialType: RESOURCE_TARGET_CLASSES[credential.kind],
      iri: taxIssuanceUrl(world, version),
      issuer: webid(world, STATE),
      sha256: digestOf(credential.body),
      url: credential.credentialId,
    }),
  );
  if (previous !== undefined) {
    await list.revoke(await statusIndex(world, previous), { now: at(world, time) });
  }
  return { credential, version };
}

/** The credential in Northwind's drawer, read as `reader`, or `undefined` when there is none. */
export async function readTaxCredential(
  world: World,
  reader: Parameters<World["fetchAs"]>[0] = HOLDER,
): Promise<TaxComplianceCredential | undefined> {
  const url = taxCredentialUrl(world);
  const fetcher = world.fetchAs(reader);
  if ((await statusOf(fetcher, url)) !== 200) return undefined;
  return new TaxComplianceCredential(url, await readDataset(fetcher, url), DataFactory);
}
