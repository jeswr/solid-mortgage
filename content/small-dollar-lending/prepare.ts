// AUTHORED-BY Claude Opus 5.5
/**
 * Where the lending story starts. The site has one seed (the mortgage's), which creates Maya's
 * pod empty and gives every organisation a profile and an inbox. The first page of this demo
 * adds, once:
 *
 * - Maya's drawers: her WebID profile, `credentials/`, `loans/` (one drawer per lender),
 *   `banking/`, an inbox any signed-in agent may append to, `policies/` and `consents/`;
 * - Trueline Identity's and Finchly's keys and status lists (the other issuers publish from the
 *   mortgage seed), and the drawers each organisation keeps for this story.
 *
 * Each part checks the pod first, so running it twice changes nothing. Nothing is put in
 * `credentials/`: Maya's pod starts empty (tour step 1).
 */

import { buildAgentProfile } from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { aclDataset, aclTurtle, PUBLIC_READ, SIGNED_IN_APPEND } from "../mortgage/acl.js";
import { podUrl, put, putResource, statusOf, type World, webid } from "../mortgage/world.js";
import { MAYA, PERSON } from "./facts.js";
import { mayaUrl } from "./grants.js";
import { NEW_ISSUERS, publishLendingIssuer } from "./issuers.js";

/** Maya's drawers, in creation order. */
export const MAYA_DRAWERS = [
  "profile/",
  "credentials/",
  "loans/",
  "loans/finchly/",
  "loans/alder/",
  "banking/",
  "inbox/",
  "policies/",
  "consents/",
] as const;

/** The drawers each organisation keeps for this story, and which of them are public. */
export const LENDING_ORG_DRAWERS: Readonly<
  Partial<Record<PodOwner, readonly { path: string; public?: true }[]>>
> = Object.freeze({
  bank: [{ path: "prequalification/", public: true }, { path: "quotes/" }, { path: "decisions/" }],
  bureau: [{ path: "reports/" }],
  "fintech-lender": [
    { path: "status/", public: true },
    { path: "issued/" },
    { path: "prequalification/", public: true },
    { path: "quotes/" },
    { path: "loans/" },
  ],
  idv: [{ path: "status/", public: true }, { path: "issued/" }, { path: "checks/" }],
  payout: [{ path: "payouts/" }],
});

/** Is the story's starting point already in the pods? (The last thing preparing writes.) */
export async function isPrepared(world: World): Promise<boolean> {
  return (await statusOf(world.fetchAs(MAYA), mayaUrl(world, "consents/"))) === 200;
}

async function container(
  world: World,
  owner: PodOwner,
  path: string,
  rule?: typeof PUBLIC_READ,
): Promise<void> {
  const fetcher = world.fetchAs(owner);
  const url = podUrl(world, owner, path);
  if ((await statusOf(fetcher, url)) !== 200) await put(fetcher, url, "", "text/turtle");
  if (rule === undefined) return;
  await put(
    fetcher,
    `${url}.acl`,
    await aclTurtle(aclDataset(webid(world, owner), url, [rule])),
    "text/turtle",
  );
}

async function ensureOrganisations(world: World): Promise<void> {
  for (const [owner, drawers] of Object.entries(LENDING_ORG_DRAWERS) as [
    PodOwner,
    readonly { path: string; public?: true }[],
  ][]) {
    for (const drawer of drawers) {
      const fetcher = world.fetchAs(owner);
      if ((await statusOf(fetcher, podUrl(world, owner, drawer.path))) === 200) continue;
      await container(world, owner, drawer.path, drawer.public ? PUBLIC_READ : undefined);
    }
  }
  for (const issuer of NEW_ISSUERS) await publishLendingIssuer(world, issuer, "07:50");
}

async function ensureMaya(world: World): Promise<void> {
  const fetcher = world.fetchAs(MAYA);
  const card = mayaUrl(world, "profile/card");
  if ((await statusOf(fetcher, card)) !== 200) {
    await container(world, MAYA, "profile/", PUBLIC_READ);
    await putResource(
      fetcher,
      buildAgentProfile({
        inbox: mayaUrl(world, "inbox/"),
        iri: card,
        kind: "person",
        name: PERSON.name,
        storage: mayaUrl(world),
        webId: webid(world, MAYA),
      }),
    );
  }
  for (const drawer of MAYA_DRAWERS) {
    if (drawer === "profile/") continue;
    if ((await statusOf(fetcher, mayaUrl(world, drawer))) === 200) continue;
    await container(world, MAYA, drawer, drawer === "inbox/" ? SIGNED_IN_APPEND : undefined);
  }
}

/**
 * Bring the pods to the start of the story. Returns `false` when they were already there. Run as
 * the visitor's own browser (every owner's fetch), never by an organisation agent.
 */
export async function prepareSmallDollarLending(world: World): Promise<boolean> {
  if (await isPrepared(world)) return false;
  await ensureOrganisations(world);
  await ensureMaya(world);
  return true;
}
