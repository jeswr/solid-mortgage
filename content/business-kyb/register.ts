// AUTHORED-BY Claude Opus 5.5
/**
 * Halyard LEI Services as the register and credential issuer (flows.md section 3, steps 2 to 4
 * and 9): its key in its WebID profile, its own Bitstring Status List, and the three credentials
 * it signs into Northwind's `credentials/` drawer. Each issuance is recorded in the register's
 * own `issued/` drawer, versioned, so a re-issue can revoke exactly the version it replaces.
 *
 * Writing into Northwind's pod is Northwind's wallet storing what it was given: the register
 * signs, the wallet's agent stores (`world.fetchAs("northwind")`), as in the mortgage's
 * `issueToPod({ writer })`.
 */

import {
  BeneficialOwnershipCredential,
  buildAgentProfile,
  buildCredentialPointer,
  OfficerAuthorisationCredential,
  OrganisationalIdentityCredential,
  RESOURCE_TARGET_CLASSES,
} from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { CredentialClaims, IssuedCredential, StatusListClient } from "@mortgage/vc-kit";
import type { Quad } from "@rdfjs/types";
import { DataFactory } from "n3";
import { aclDataset, aclTurtle, PUBLIC_READ, SIGNED_IN_APPEND } from "../mortgage/acl.js";
import { STATUS_LIST_LIFETIME_DAYS } from "../mortgage/facts.js";
import { membersOf } from "../mortgage/grants.js";
import { digestOf, statusListUrl } from "../mortgage/issuers.js";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  podUrl,
  put,
  putResource,
  readDataset,
  remove,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import {
  CREDENTIAL_VALID_DAYS,
  ENTITY,
  HOLDER,
  OFFICERS,
  OWNERS_BEFORE,
  type Owner,
  PATHS,
  shareAnchorPath,
  THRESHOLD_BPS,
} from "./facts.js";

const REGISTRY = "registry" as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RegisterCredential = "org-identity" | "officer-authorisation" | "beneficial-ownership";

const PATH_OF: Readonly<Record<RegisterCredential, string>> = {
  "beneficial-ownership": PATHS.ownership,
  "officer-authorisation": PATHS.officers,
  "org-identity": PATHS.identity,
};

export const holderUrl = (world: Pick<World, "podOrigin">, path = "") =>
  podUrl(world, HOLDER, path);

export function credentialUrl(world: Pick<World, "podOrigin">, name: RegisterCredential): string {
  return holderUrl(world, PATH_OF[name]);
}

export async function registryStatusList(world: World): Promise<StatusListClient> {
  const { StatusListClient } = await vcKit();
  return new StatusListClient({
    fetch: world.fetchAs(REGISTRY),
    issuer: webid(world, REGISTRY),
    key: await world.keyFor(REGISTRY),
    listLifetimeMs: STATUS_LIST_LIFETIME_DAYS * DAY_MS,
    url: statusListUrl(world, REGISTRY),
  });
}

async function ensureContainer(
  fetcher: typeof fetch,
  owner: string,
  url: string,
  rules: Parameters<typeof aclDataset>[2],
): Promise<void> {
  if ((await statusOf(fetcher, url)) === 200) return;
  await put(fetcher, url, "", "text/turtle");
  if (rules.length > 0) {
    await put(fetcher, `${url}.acl`, await aclTurtle(aclDataset(owner, url, rules)), "text/turtle");
  }
}

/** Is the story's starting point in the pods? */
export async function isPrepared(world: World): Promise<boolean> {
  const [holder, list] = await Promise.all([
    statusOf(world.fetchAs(HOLDER), holderUrl(world, PATHS.inbox)),
    statusOf(world.fetchAs(REGISTRY), statusListUrl(world, REGISTRY)),
  ]);
  return holder === 200 && list === 200;
}

/**
 * Bring the pods to the start of the story, once: Northwind's empty `credentials/` drawer and an
 * inbox any signed-in agent may add to; the register's key in its profile and its all-clear
 * status list (publicly readable); Brackenridge's inbox. Each part checks first.
 */
export async function prepareBusinessKyb(world: World, time = "08:00"): Promise<boolean> {
  if (await isPrepared(world)) return false;
  const holder = world.fetchAs(HOLDER);
  const holderId = webid(world, HOLDER);
  await ensureContainer(holder, holderId, holderUrl(world, PATHS.credentials), []);
  await ensureContainer(holder, holderId, holderUrl(world, PATHS.inbox), [SIGNED_IN_APPEND]);
  const lender = world.fetchAs("business-lender");
  await ensureContainer(
    lender,
    webid(world, "business-lender"),
    podUrl(world, "business-lender", "inbox/"),
    [SIGNED_IN_APPEND],
  );
  const registry = world.fetchAs(REGISTRY);
  if ((await statusOf(registry, statusListUrl(world, REGISTRY))) !== 200) {
    const profile = buildAgentProfile({
      inbox: podUrl(world, REGISTRY, "inbox/"),
      iri: podUrl(world, REGISTRY, "profile/card"),
      kind: "organisation",
      name: ORGS.registry.organisation,
      storage: podUrl(world, REGISTRY),
      webId: webid(world, REGISTRY),
    });
    const { publishVerificationMethod } = await vcKit();
    const published = await publishVerificationMethod({
      controller: webid(world, REGISTRY),
      key: await world.keyFor(REGISTRY),
    });
    for (const quad of published.quads as readonly Quad[]) profile.dataset.add(quad);
    await putResource(registry, profile);
    await ensureContainer(registry, webid(world, REGISTRY), podUrl(world, REGISTRY, "status/"), [
      PUBLIC_READ,
    ]);
    await (await registryStatusList(world)).create({ now: at(world, time) });
  }
  return true;
}

// --- Issuance records ---------------------------------------------------------------------------

export function issuanceUrl(
  world: Pick<World, "podOrigin">,
  name: RegisterCredential | "owner-array",
  version: number,
): string {
  return podUrl(world, REGISTRY, `issued/${name}-v${version}`);
}

/** The versions of `name` the register has issued, from its own `issued/` drawer. */
export async function issuedVersions(
  world: World,
  name: RegisterCredential | "owner-array",
): Promise<number[]> {
  const container = podUrl(world, REGISTRY, "issued/");
  const registry = world.fetchAs(REGISTRY);
  if ((await statusOf(registry, container)) !== 200) return [];
  const pattern = new RegExp(`/issued/${name}-v(\\d+)$`);
  return (await membersOf(registry, container))
    .map((url) => pattern.exec(url)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

async function statusIndex(url: string, version: number): Promise<number> {
  const { deriveStatusIndex } = await vcKit();
  return deriveStatusIndex(`${url}#v${version}`);
}

async function validity(world: World, time: string) {
  const { validityOn } = await vcKit();
  return validityOn(world.calendar, world.day, { time, validDays: CREDENTIAL_VALID_DAYS });
}

async function record(
  world: World,
  name: RegisterCredential | "owner-array",
  version: number,
  credential: IssuedCredential,
  time: string,
): Promise<void> {
  await putResource(
    world.fetchAs(REGISTRY),
    buildCredentialPointer({
      asOf: at(world, time),
      credentialType: RESOURCE_TARGET_CLASSES[credential.kind],
      iri: issuanceUrl(world, name, version),
      issuer: webid(world, REGISTRY),
      sha256: digestOf(credential.body),
      url: credential.credentialId,
    }),
  );
}

async function store(world: World, credential: IssuedCredential): Promise<void> {
  await put(
    world.fetchAs(HOLDER),
    credential.credentialId,
    credential.body,
    credential.contentType,
  );
}

export interface Issued {
  readonly credential: IssuedCredential;
  readonly version: number;
  readonly revoked?: number;
}

/**
 * Sign version n+1 of a register credential, store it in Northwind's drawer, record it, then
 * revoke version n. Northwind is never left without a valid credential.
 */
async function issue(
  world: World,
  name: Exclude<RegisterCredential, "beneficial-ownership">,
  claims: CredentialClaims,
  time: string,
): Promise<Issued> {
  await prepareBusinessKyb(world);
  const previous = (await issuedVersions(world, name)).at(-1);
  const version = (previous ?? 0) + 1;
  const url = credentialUrl(world, name);
  const list = await registryStatusList(world);
  const { issueCredential } = await vcKit();
  const credential = await issueCredential({
    claims,
    credentialId: url,
    issuer: webid(world, REGISTRY),
    key: await world.keyFor(REGISTRY),
    kind: claims.kind as never,
    status: list.entry(await statusIndex(url, version)),
    subject: webid(world, HOLDER),
    validity: await validity(world, time),
  });
  await store(world, credential);
  await record(world, name, version, credential, time);
  if (previous !== undefined) {
    await list.revoke(await statusIndex(url, previous), { now: at(world, time) });
  }
  return { credential, version, ...(previous === undefined ? {} : { revoked: previous }) };
}

/** Step 2: the organisational identity (legal name, form, address, illustrative LEI). */
export function issueOrganisationalIdentity(world: World, time = "09:10"): Promise<Issued> {
  return issue(
    world,
    "org-identity",
    {
      address: { ...ENTITY.address },
      kind: "organisational-identity-credential",
      legalForm: ENTITY.legalForm,
      legalName: ENTITY.legalName,
      lei: ENTITY.lei,
    },
    time,
  );
}

/** Step 3: the officer authorisation (Jordan Blake, managing member and signatory). */
export function issueOfficerAuthorisation(world: World, time = "09:20"): Promise<Issued> {
  return issue(
    world,
    "officer-authorisation",
    {
      entityName: ENTITY.legalName,
      kind: "officer-authorisation-credential",
      officers: OFFICERS.map((officer) => ({ ...officer })),
    },
    time,
  );
}

export interface OwnershipIssue extends Issued {
  /** The owner-array anchor (Tier B) and the share anchors (Tier A) written with it. */
  readonly anchors: readonly string[];
  /** Owners at or above the threshold whose share has no captured encoding (no Tier A anchor). */
  readonly unanchored: readonly string[];
}

/**
 * Steps 4 and 9: the beneficial ownership credential, then its anchors. Version n+1 is signed
 * and stored, every anchor of version n is revoked and replaced: the owner-array commitment
 * always, and a share anchor for each owner at or above 25 percent whose share has a captured
 * encoding (Jordan's 6000 bps after the sale has none, so his share anchor is withdrawn, never
 * guessed).
 */
export async function issueBeneficialOwnership(
  world: World,
  owners: readonly Owner[] = OWNERS_BEFORE,
  time = "09:30",
): Promise<OwnershipIssue> {
  await prepareBusinessKyb(world);
  const name = "beneficial-ownership";
  const previous = (await issuedVersions(world, name)).at(-1);
  const version = (previous ?? 0) + 1;
  const url = credentialUrl(world, name);
  const list = await registryStatusList(world);
  const kit = await vcKit();
  const window = await validity(world, time);
  const key = await world.keyFor(REGISTRY);
  const credential = await kit.issueCredential({
    claims: {
      entityName: ENTITY.legalName,
      kind: "beneficial-ownership-credential",
      owners: owners.map((owner) => ({ ...owner })),
    },
    credentialId: url,
    issuer: webid(world, REGISTRY),
    key,
    kind: "beneficial-ownership-credential",
    status: list.entry(await statusIndex(url, version)),
    subject: webid(world, HOLDER),
    validity: window,
  });
  await store(world, credential);
  await record(world, name, version, credential, time);

  const holderFetch = world.fetchAs(HOLDER);
  const base = {
    credential,
    issuer: webid(world, REGISTRY),
    key,
    subject: webid(world, HOLDER),
    validity: window,
  };
  const arrayUrl = holderUrl(world, PATHS.arrayAnchor);
  const array = await kit.mintOwnerArrayAnchor({
    ...base,
    anchorId: arrayUrl,
    status: list.entry(await statusIndex(arrayUrl, version)),
  });
  await store(world, array.credential);
  const anchors = [arrayUrl];
  const unanchored: string[] = [];
  const signed = kit.signedOwners(credential, webid(world, HOLDER));
  for (const [index, owner] of signed.entries()) {
    const shareUrl = holderUrl(world, shareAnchorPath(index + 1));
    if (owner.bps < THRESHOLD_BPS) {
      if ((await statusOf(holderFetch, shareUrl)) === 200) await remove(holderFetch, shareUrl);
      continue;
    }
    try {
      const share = await kit.mintOwnerShareAnchor({
        ...base,
        anchorId: shareUrl,
        owner: owner.name,
        status: list.entry(await statusIndex(shareUrl, version)),
      });
      await store(world, share.credential);
      anchors.push(shareUrl);
    } catch (error) {
      if ((error as { code?: string }).code !== "NO_CAPTURED_ENCODING") throw error;
      unanchored.push(owner.name);
      if ((await statusOf(holderFetch, shareUrl)) === 200) await remove(holderFetch, shareUrl);
    }
  }
  if (previous !== undefined) {
    const indices = [
      await statusIndex(url, previous),
      await statusIndex(arrayUrl, previous),
      ...(await Promise.all(
        [1, 2, 3, 4].map((rank) => statusIndex(holderUrl(world, shareAnchorPath(rank)), previous)),
      )),
    ];
    for (const index of indices) await list.revoke(index, { now: at(world, time) });
  }
  return {
    anchors,
    credential,
    unanchored,
    version,
    ...(previous === undefined ? {} : { revoked: previous }),
  };
}

// --- Reading the credentials back (the wallet's view) -----------------------------------------

export interface HeldCredentials {
  readonly identity?: OrganisationalIdentityCredential;
  readonly officers?: OfficerAuthorisationCredential;
  readonly ownership?: BeneficialOwnershipCredential;
}

/** The register credentials in Northwind's drawer, read as `reader` (default: Northwind). */
export async function readHeld(world: World, reader: PodOwner = HOLDER): Promise<HeldCredentials> {
  const fetcher = world.fetchAs(reader);
  const datasetOf = async (name: RegisterCredential) => {
    const url = credentialUrl(world, name);
    if ((await statusOf(fetcher, url)) !== 200) return undefined;
    return { dataset: await readDataset(fetcher, url), url };
  };
  const [identity, officers, ownership] = await Promise.all([
    datasetOf("org-identity"),
    datasetOf("officer-authorisation"),
    datasetOf("beneficial-ownership"),
  ]);
  return {
    ...(identity === undefined
      ? {}
      : {
          identity: new OrganisationalIdentityCredential(
            identity.url,
            identity.dataset,
            DataFactory,
          ),
        }),
    ...(officers === undefined
      ? {}
      : {
          officers: new OfficerAuthorisationCredential(officers.url, officers.dataset, DataFactory),
        }),
    ...(ownership === undefined
      ? {}
      : {
          ownership: new BeneficialOwnershipCredential(
            ownership.url,
            ownership.dataset,
            DataFactory,
          ),
        }),
  };
}
