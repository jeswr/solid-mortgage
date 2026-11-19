// AUTHORED-BY Claude Fable 5.2
/**
 * The seed (design.md sections b.4 and d.2): the first block of every pod's journal.
 *
 * `seedRequests` is data: the requests that create each pod's profile, drawers, ACL documents
 * and Alex's seeded documents. Every body is built with the data-model wrappers and written by
 * `n3.Writer`. Each request is made by the pod's own owner.
 *
 * `firstRun` is the part that needs a key: each issuer publishes its public key and hosts its
 * status list, and Alder Bank signs Alex's identity credential. Keys are created in the
 * visitor's browser, so nothing signed can ship in the bundle.
 *
 * The pod server already writes the root ACL (owner only) when a pod is created, and creates no
 * containers until something is written. The seed adds the documents that open specific things:
 * profiles and status lists are public, inboxes take appends from any signed-in agent, and the
 * county's register is public. Everything else in every pod is owner-only until a grant.
 */

import {
  buildAgentProfile,
  buildContactDetails,
  buildPurchaseAgreement,
  buildSubjectProperty,
  type MortgageResource,
} from "@mortgage/data-model";
import type { DemoCalendar } from "@mortgage/demo-kit/calendar";
import {
  isHolderId,
  ORG_SLUGS,
  type PodOwner,
  podOwners,
  webidFor,
} from "@mortgage/demo-kit/registry";
import { ORGS, POD_HOLDER } from "../orgs.js";
import { type AclRule, aclDataset, aclTurtle, PUBLIC_READ, SIGNED_IN_APPEND } from "./acl.js";
import { BORROWER, CURRENT_ADDRESS, DAY, LOAN, PROPERTY, SELLER_NAME } from "./facts.js";
import { ISSUERS, type Issuer, issueToPod, publishIssuer } from "./issuers.js";
import { PodRequestError, podUrl, toTurtle, type World, webid } from "./world.js";

export interface SeedEnvironment {
  readonly podOrigin: string;
  readonly calendar: DemoCalendar;
}

export interface SeedRequest {
  /** The pod the request goes to. It is made as that pod's owner. */
  readonly pod: PodOwner;
  readonly method: "PUT";
  /** Path inside the pod, with a leading slash. A trailing slash is a container. */
  readonly path: string;
  readonly contentType: "text/turtle";
  readonly body: string;
}

/** The drawers of Alex's pod (design.md section b.4), in creation order. */
export const ALEX_DRAWERS = [
  "profile/",
  "identity/",
  "credentials/",
  "property/",
  "mortgage/",
  "mortgage/juniper/",
  "mortgage/closing/",
  "mortgage/servicing/",
  "insurance/",
  "banking/",
  "inbox/",
  "policies/",
  "consents/",
] as const;

/** Drawers an organisation keeps beside `profile/` and `inbox/`, and which of them are public. */
export const ORGANISATION_DRAWERS: Readonly<
  Partial<Record<PodOwner, readonly { path: string; public?: true }[]>>
> = Object.freeze({
  appraisal: [{ path: "status/", public: true }, { path: "issued/" }, { path: "orders/" }],
  aus: [{ path: "casefiles/" }, { path: "deliveries/" }],
  bank: [{ path: "status/", public: true }, { path: "issued/" }],
  bureau: [{ path: "status/", public: true }, { path: "issued/" }, { path: "orders/" }],
  county: [{ path: "records/", public: true }],
  insurer: [{ path: "status/", public: true }, { path: "issued/" }],
  lender: [{ path: "loans/" }, { path: "quotes/" }, { path: "prequalification/", public: true }],
  "lender-b": [{ path: "quotes/" }, { path: "prequalification/", public: true }],
  payroll: [{ path: "status/", public: true }, { path: "issued/" }],
  servicer: [{ path: "accounts/" }],
  title: [{ path: "status/", public: true }, { path: "issued/" }, { path: "files/" }],
});

function organisationName(owner: PodOwner): string {
  if (owner === "alex") return POD_HOLDER.name;
  const slug = ORG_SLUGS.find((candidate) => ORGS[candidate].actsAs === owner);
  if (slug === undefined) throw new Error(`no organisation acts as ${owner}`);
  return ORGS[slug].organisation;
}

export async function seedRequests(env: SeedEnvironment): Promise<SeedRequest[]> {
  const requests: SeedRequest[] = [];
  const url = (owner: PodOwner, path: string) => podUrl(env, owner, path);
  const container = (pod: PodOwner, path: string) => {
    requests.push({ body: "", contentType: "text/turtle", method: "PUT", path: `/${path}`, pod });
  };
  const acl = async (pod: PodOwner, path: string, rules: readonly AclRule[]) => {
    const dataset = aclDataset(webidFor(pod, env.podOrigin), url(pod, path), rules);
    requests.push({
      body: await aclTurtle(dataset),
      contentType: "text/turtle",
      method: "PUT",
      path: `/${path}.acl`,
      pod,
    });
  };
  const resource = async (pod: PodOwner, built: MortgageResource) => {
    const root = url(pod, "");
    if (!built.value.startsWith(root)) throw new Error(`${built.value} is not in ${pod}'s pod`);
    requests.push({
      body: await toTurtle(built),
      contentType: "text/turtle",
      method: "PUT",
      path: `/${built.value.slice(root.length)}`,
      pod,
    });
  };
  const day = (number: number) => new Date(`${env.calendar.date(number)}T00:00:00Z`);

  // --- Alex ---
  for (const drawer of ALEX_DRAWERS) container("alex", drawer);
  await acl("alex", "inbox/", [SIGNED_IN_APPEND]);
  await resource(
    "alex",
    buildAgentProfile({
      inbox: url("alex", "inbox/"),
      iri: url("alex", "profile/card"),
      kind: "person",
      name: BORROWER.name,
      storage: url("alex", ""),
      titleVesting: BORROWER.titleVesting,
      webId: webidFor("alex", env.podOrigin),
    }),
  );
  await resource(
    "alex",
    buildContactDetails({
      address: CURRENT_ADDRESS,
      emails: BORROWER.emails,
      iri: url("alex", "profile/contact"),
      telephone: BORROWER.telephone,
    }),
  );
  await resource(
    "alex",
    buildPurchaseAgreement({
      buyer: webidFor("alex", env.podOrigin),
      closingDate: day(DAY.closing),
      earnestMoneyDepositUsd: LOAN.earnestMoneyDepositUsd,
      iri: url("alex", "property/purchase-agreement"),
      // The offer was accepted the Friday before the story starts.
      issued: new Date(day(1).getTime() - 3 * 24 * 60 * 60 * 1000),
      name: "Residential purchase agreement, 14 Larch Lane",
      propertyAddress: PROPERTY.address,
      purchasePriceUsd: LOAN.purchasePriceUsd,
      sellerName: SELLER_NAME,
    }),
  );
  await resource(
    "alex",
    buildSubjectProperty({
      address: PROPERTY.address,
      bathrooms: PROPERTY.bathrooms,
      bedrooms: PROPERTY.bedrooms,
      constructionType: PROPERTY.constructionType,
      floorSizeSqFt: PROPERTY.floorSizeSqFt,
      iri: url("alex", "property/subject-property"),
      legalDescription: PROPERTY.legalDescription,
      parcelNumber: PROPERTY.parcelNumber,
      roofType: PROPERTY.roofType,
      yearBuilt: PROPERTY.yearBuilt,
    }),
  );

  // --- Organisations ---
  for (const owner of podOwners(ORGS)) {
    if (isHolderId(owner)) continue;
    container(owner, "profile/");
    await acl(owner, "profile/", [PUBLIC_READ]);
    await resource(
      owner,
      buildAgentProfile({
        inbox: url(owner, "inbox/"),
        iri: url(owner, "profile/card"),
        kind: "organisation",
        name: organisationName(owner),
        storage: url(owner, ""),
        webId: webidFor(owner, env.podOrigin),
      }),
    );
    container(owner, "inbox/");
    await acl(owner, "inbox/", [SIGNED_IN_APPEND]);
    for (const drawer of ORGANISATION_DRAWERS[owner] ?? []) {
      container(owner, drawer.path);
      if (drawer.public) await acl(owner, drawer.path, [PUBLIC_READ]);
    }
  }
  return requests;
}

/** Replay the seed against live pods, each request as its pod's owner. */
export async function applySeed(world: World, requests: readonly SeedRequest[]): Promise<void> {
  for (const request of requests) {
    const url = podUrl(world, request.pod, request.path.slice(1));
    const response = await world.fetchAs(request.pod)(url, {
      body: request.body,
      headers: { "content-type": request.contentType },
      method: request.method,
    });
    if (!response.ok) throw new PodRequestError(request.method, url, response.status);
  }
}

/** Where the seeded identity credential lives. */
export function identityCredentialUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, "alex", "identity/identity-credential");
}

/**
 * The signing part of the seed, run once per visitor after the keys exist: every issuer
 * publishes its key and status list, then Alder Bank, which checked Alex's identity when the
 * account was opened, signs the identity credential and Alex's wallet stores it.
 */
export async function firstRun(world: World): Promise<void> {
  for (const issuer of ISSUERS) await publishIssuer(world, issuer as Issuer);
  await issueToPod(world, {
    claims: {
      address: CURRENT_ADDRESS,
      birthDate: BORROWER.birthDate,
      kind: "identity-credential",
      name: BORROWER.name,
      taxIdLast4: BORROWER.taxIdLast4,
    },
    credentialId: identityCredentialUrl(world),
    issuer: "bank",
    kind: "identity-credential",
    record: "identity",
    subject: webid(world, "alex"),
    time: "08:10",
    validDays: 365,
    writer: "alex",
  });
}
