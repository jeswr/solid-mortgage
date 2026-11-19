// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's ACL documents keep the rules it does not manage. The pod server uses only the
 * nearest ACL document, so when the wallet writes one for a resource it must repeat what was in
 * force there before: the runtime's public read on the WebID profile (`profile/card.acl`), or a
 * public rule inherited from a drawer above. Before this was pinned, approving G6 (which reads
 * `profile/card`) made Alex's WebID profile unreadable to anyone but Alex and the grantees.
 *
 * Real pod runtime host and wasm (`createNodePodHost`) with the mortgage seed; every status is the
 * pod server's.
 */

import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import { beforeEach, describe, expect, test } from "vitest";
import { createNodePodHost, type PodHost } from "../../../packages/pod-runtime/dist/node.js";
import { aclDataset, aclTurtle, PUBLIC_READ } from "../../mortgage/acl.js";
import { keyRing, memoryKeyStore, mortgageSeed } from "../../mortgage/browser.js";
import { approveRequest, readAcl, requestAccess, revokeGrant } from "../../mortgage/grants.js";
import { podUrl, put, type World, webid } from "../../mortgage/world.js";
import { ORGS } from "../../orgs.js";

const ORIGIN = "https://pods.demo.test";
const DAY_ONE = "2026-08-03";
const FOAF_AGENT = "http://xmlns.com/foaf/0.1/Agent";

let host: PodHost;
let world: World;

beforeEach(async () => {
  const calendar = createDemoCalendar(DAY_ONE);
  const keys = memoryKeyStore();
  const identities: Record<string, PodOwner> = {};
  for (const record of Object.values(ORGS)) identities[record.slug] = record.actsAs;
  host = createNodePodHost({
    clock: () => calendar.time(10, "12:00"),
    identities,
    origin: ORIGIN,
    owners: podOwners(ORGS),
    seed: mortgageSeed({ dayOne: DAY_ONE, keys }),
  });
  await host.ready;
  world = {
    calendar,
    day: 10,
    fetchAs: (owner) => host.fetchAs(owner),
    keyFor: keyRing(ORIGIN, keys),
    note: () => undefined,
    podOrigin: ORIGIN,
  };
}, 120_000);

const alex = (path: string) => podUrl(world, "alex", path);
const status = async (who: PodOwner | null, path: string) =>
  (await host.fetchAs(who)(alex(path), { headers: { accept: "text/turtle" } })).status;

/** Does the ACL document of `path` name `owner`? */
async function names(path: string, owner: PodOwner): Promise<boolean> {
  const rules = await readAcl(world.fetchAs("alex"), `${alex(path)}.acl`);
  return rules.some((rule) => rule.agent.has(webid(world, owner)));
}

async function grant(code: "G5" | "G6"): Promise<void> {
  await approveRequest(world, await requestAccess(world, code));
}

describe("the wallet keeps the rules it does not manage", () => {
  test("Alex's WebID profile stays public when G6 adds Sextant to its ACL document", async () => {
    expect(await status(null, "profile/card")).toBe(200);
    await grant("G6");
    expect(await status("title", "profile/card")).toBe(200);
    expect(await status(null, "profile/card")).toBe(200);
    const rules = await readAcl(world.fetchAs("alex"), `${alex("profile/card")}.acl`);
    expect(rules.some((rule) => rule.agentClass.has(FOAF_AGENT))).toBe(true);
    // Withdrawing G6 removes Sextant's rule and keeps the public one.
    await revokeGrant(world, "G6", "10:00");
    expect(await names("profile/card", "title")).toBe(false);
    expect(await status(null, "profile/card")).toBe(200);
  }, 120_000);

  test("a public rule inherited from a drawer above is repeated in a new document below", async () => {
    // Alex makes the property drawer public herself; no agreement manages that rule.
    await put(
      world.fetchAs("alex"),
      `${alex("property/")}.acl`,
      await aclTurtle(aclDataset(webid(world, "alex"), alex("property/"), [PUBLIC_READ])),
      "text/turtle",
    );
    expect(await status(null, "property/subject-property")).toBe(200);
    await grant("G5");
    expect(await status("appraisal", "property/subject-property")).toBe(200);
    expect(await status(null, "property/subject-property")).toBe(200);
    await revokeGrant(world, "G5", "10:00");
    expect(await names("property/subject-property", "appraisal")).toBe(false);
    expect(await status(null, "property/subject-property")).toBe(200);
  }, 120_000);

  test("an organisation's rule is never carried over as if it were the seed's", async () => {
    await grant("G6");
    expect(await names("profile/card", "title")).toBe(true);
    await revokeGrant(world, "G6", "10:00");
    expect(await names("profile/card", "title")).toBe(false);
    // Sextant's write access to the closing drawer, which nothing public covers, is gone too.
    const late = await host.fetchAs("title")(alex("mortgage/closing/late"), {
      body: "",
      headers: { "content-type": "text/turtle" },
      method: "PUT",
    });
    expect(late.status).toBe(403);
  }, 120_000);
});
