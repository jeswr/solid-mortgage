// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's ACL documents keep the rules it does not manage. The pod server uses only the
 * nearest ACL document, so when the wallet writes one for a resource it must repeat what was in
 * force there before: a rule Alex wrote herself (a public read on her card, as the pod runtime's
 * baseline gives every other pod's), or a public rule inherited from a drawer above. Before this
 * was pinned, approving G6 (which reads `profile/card`) dropped the public read on the card.
 * The mortgage seed takes that baseline rule off Alex's card, so these tests write it back first.
 *
 * Real pod runtime host and wasm (`createNodePodHost`) with the mortgage seed; every status is the
 * pod server's.
 */

import { DPV } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import { Authorization, Group } from "@solid/object";
import { DataFactory } from "n3";
import { beforeEach, describe, expect, test } from "vitest";
import { createNodePodHost, type PodHost } from "../../../packages/pod-runtime/dist/node.js";
import { ACL, type AclRule, aclDataset, aclTurtle, PUBLIC_READ } from "../../mortgage/acl.js";
import { keyRing, memoryKeyStore, mortgageSeed } from "../../mortgage/browser.js";
import {
  approveRequest,
  type GrantCode,
  grantRecords,
  readAcl,
  requestAccess,
  revokeGrant,
  writeConsent,
} from "../../mortgage/grants.js";
import { podUrl, put, type World, webid } from "../../mortgage/world.js";
import { ORGS } from "../../orgs.js";
import { failingAcl } from "../failing-acl.js";

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

async function grant(code: GrantCode, on: World = world): Promise<void> {
  await approveRequest(on, await requestAccess(world, code));
}

/** Alex writes `path`'s ACL document herself: the owner and `rules`, no agreement behind them. */
async function writeOwnAcl(path: string, rules: readonly AclRule[]): Promise<void> {
  await put(
    world.fetchAs("alex"),
    `${alex(path)}.acl`,
    await aclTurtle(aclDataset(webid(world, "alex"), alex(path), rules)),
    "text/turtle",
  );
}

/**
 * The world with Alex's requests passed through `intercept`, which may answer a request itself
 * (an injected failure) or do something first (a concurrent change) before it goes to the pod.
 */
function intercepted(
  intercept: (url: string, init: RequestInit | undefined) => Promise<Response | undefined>,
): World {
  return {
    ...world,
    fetchAs: (owner) => {
      const real = world.fetchAs(owner);
      if (owner !== "alex") return real;
      return (async (input: RequestInfo | URL, init?: RequestInit) =>
        (await intercept(String(input), init)) ?? real(input, init)) as typeof fetch;
    },
  };
}

async function stateOf(code: GrantCode): Promise<string | undefined> {
  return (await grantRecords(world)).find((record) => record.code === code)?.state;
}

describe("the wallet keeps the rules it does not manage", () => {
  test("a public read Alex put on her card stays when G6 adds Sextant to its ACL document", async () => {
    expect(await status(null, "profile/card")).toBe(401);
    await writeOwnAcl("profile/card", [PUBLIC_READ]);
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

  test("an organisation's rule is never carried over as if no agreement managed it", async () => {
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

describe("rules above a document are never copied into it as agent rules", () => {
  test("withdrawing a drawer grant also ends the access it gave to a document below", async () => {
    // G4 lets Juniper read the credentials drawer; G2 then gives the bank its own rule on the
    // assets credential, so that document gets an ACL document of its own.
    await grant("G4");
    await grant("G2");
    await put(world.fetchAs("bank"), alex("credentials/assets"), "", "text/turtle");
    expect(await status("lender", "credentials/assets")).toBe(200);
    expect(await names("credentials/assets", "bank")).toBe(true);
    await revokeGrant(world, "G4", "10:00");
    // A copy of Juniper's drawer rule in the document below would keep this read open.
    expect(await status("lender", "credentials/assets")).toBe(403);
    expect(await status("lender", "credentials/")).toBe(403);
    expect(await names("credentials/assets", "lender")).toBe(false);
    expect(await names("credentials/assets", "bank")).toBe(true);
  }, 120_000);

  test("removing an agent's rule on the drawer above leaves no copy of it in force below", async () => {
    // Alex lets the county read the property drawer herself; no agreement names the county.
    const county = { agent: webid(world, "county"), inheritable: true, modes: ["Read"] } as const;
    await writeOwnAcl("property/", [county]);
    expect(await status("county", "property/subject-property")).toBe(200);
    // G5 gives the subject property an ACL document of its own.
    await grant("G5");
    expect(await status("appraisal", "property/subject-property")).toBe(200);
    // Alex takes the county's rule off the drawer: no copy of it may stay in force below.
    await writeOwnAcl("property/", []);
    expect(await status("county", "property/")).toBe(403);
    expect(await status("county", "property/subject-property")).toBe(403);
    expect(await status("appraisal", "property/subject-property")).toBe(200);
    // The new document repeated no agent rule from above: the county's read had narrowed to
    // the drawer as soon as the document existed.
    expect(await names("property/subject-property", "county")).toBe(false);
  }, 120_000);
});

describe("a grant is recorded as ended only once its access is gone", () => {
  for (const failing of ["GET", "PUT"] as const) {
    test(`a ${failing} of an ACL document answered 503 leaves the grant active, and ending it again works`, async () => {
      await writeOwnAcl("profile/card", [PUBLIC_READ]);
      await grant("G6");
      let failed = 0;
      const flaky = intercepted(async (url, init) => {
        if (!url.endsWith(".acl") || (init?.method ?? "GET") !== failing || failed > 0) return;
        failed++;
        return new Response(null, { status: 503 });
      });
      await expect(revokeGrant(flaky, "G6", "10:00")).rejects.toThrow(/503/);
      expect(failed).toBe(1);
      // Nothing says the grant ended, and it has not: Sextant's rule is still there.
      expect(await status("alex", "consents/g6-withdrawn")).toBe(404);
      expect(await stateOf("G6")).toBe("active");
      expect(await names("profile/card", "title")).toBe(true);
      // Withdrawing again finishes the job.
      await revokeGrant(world, "G6", "10:01");
      expect(await stateOf("G6")).toBe("revoked");
      expect(await status("alex", "consents/g6-withdrawn")).toBe(200);
      expect(await names("profile/card", "title")).toBe(false);
      expect(await status(null, "profile/card")).toBe(200);
    }, 120_000);
  }
});

describe("the wallet never overwrites an ACL document it read before someone changed it", () => {
  test("a change made between the wallet's read and its write is kept (412, read again)", async () => {
    await writeOwnAcl("profile/card", [PUBLIC_READ]);
    const county = webid(world, "county");
    let raced = 0;
    const racing = intercepted(async (url, init) => {
      if (url !== `${alex("profile/card")}.acl` || init?.method !== "PUT" || raced > 0) return;
      raced++;
      // Between the wallet's read and its write, Alex (in another tab) adds the county's read.
      const current = await readAcl(world.fetchAs("alex"), url);
      expect(current.some((rule) => rule.agentClass.has(FOAF_AGENT))).toBe(true);
      await writeOwnAcl("profile/card", [
        PUBLIC_READ,
        { agent: county, inheritable: false, modes: ["Read"] },
      ]);
      const response = await world.fetchAs("alex")(url, init);
      expect(response.status).toBe(412);
      return response;
    });
    await grant("G6", racing);
    expect(raced).toBe(1);
    // The retry read the new copy: Sextant's rule is added, the county's and the public one kept.
    expect(await names("profile/card", "title")).toBe(true);
    expect(await names("profile/card", "county")).toBe(true);
    expect(await status(null, "profile/card")).toBe(200);
  }, 120_000);
});

describe("rules the wallet keeps stay as they were", () => {
  test("a members-only rule on a container keeps its scope", async () => {
    const county = webid(world, "county");
    await writeOwnAcl("mortgage/closing/", [
      { agent: county, inheritable: false, membersOnly: true, modes: ["Read"] },
    ]);
    // G6 lets Sextant write the closing drawer: the wallet rewrites its ACL document.
    await grant("G6");
    expect(await names("mortgage/closing/", "title")).toBe(true);
    const rules = await readAcl(world.fetchAs("alex"), `${alex("mortgage/closing/")}.acl`);
    const kept = rules.filter((rule) => rule.agent.has(county));
    expect(kept.map((rule) => [rule.accessTo, rule.default])).toEqual([
      [undefined, alex("mortgage/closing/")],
    ]);
  }, 120_000);

  test("an origin-limited rule is carried with its origin, never widened", async () => {
    const county = webid(world, "county");
    await writeOwnAcl("profile/card", [
      PUBLIC_READ,
      { agent: county, inheritable: false, modes: ["Write"], origins: ["https://records.example"] },
    ]);
    await grant("G6");
    const rules = await readAcl(world.fetchAs("alex"), `${alex("profile/card")}.acl`);
    const kept = rules.filter((rule) => rule.agent.has(county));
    expect(kept.map((rule) => [...rule.origin])).toEqual([["https://records.example"]]);
    expect(kept.map((rule) => [...rule.mode])).toEqual([[`${ACL}Write`]]);
    // Without the origin the county may not write.
    const write = await host.fetchAs("county")(alex("profile/card"), {
      body: "",
      headers: { "content-type": "text/turtle" },
      method: "PUT",
    });
    expect(write.status).toBe(403);
  }, 120_000);

  test("a group on an authorization is left out; the agents named beside it are kept", async () => {
    const county = webid(world, "county");
    const target = alex("profile/card");
    const dataset = aclDataset(webid(world, "alex"), target, [
      PUBLIC_READ,
      { agent: county, inheritable: false, modes: ["Read"] },
    ]);
    // Its members are defined in another document the wallet does not read.
    new Authorization(`${target}.acl#rule-2`, dataset, DataFactory).agentGroup = new Group(
      alex("groups/staff#group"),
      dataset,
      DataFactory,
    );
    await put(world.fetchAs("alex"), `${target}.acl`, await aclTurtle(dataset), "text/turtle");
    await grant("G6");
    const rules = await readAcl(world.fetchAs("alex"), `${target}.acl`);
    expect(rules.some((rule) => rule.agentGroup !== undefined)).toBe(false);
    expect(rules.filter((rule) => rule.agent.has(county)).map((rule) => [...rule.mode])).toEqual([
      [`${ACL}Read`],
    ]);
    expect(await names("profile/card", "title")).toBe(true);
  }, 120_000);
});

describe("grant changes that meet each other", () => {
  test("two withdrawals at once, on a document both cover, end with neither grant restored", async () => {
    // G5 (Plumb Line) and G6 (Sextant) both read the purchase agreement.
    await grant("G5");
    await grant("G6");
    expect(await names("property/purchase-agreement", "appraisal")).toBe(true);
    expect(await names("property/purchase-agreement", "title")).toBe(true);
    // Each change takes the grant lock (content/mortgage/grant-lock.ts), so neither writes the
    // document from a set of grants in which the other is still active.
    await Promise.all([revokeGrant(world, "G5", "10:00"), revokeGrant(world, "G6", "10:00")]);
    expect(await stateOf("G5")).toBe("revoked");
    expect(await stateOf("G6")).toBe("revoked");
    expect(await names("property/purchase-agreement", "appraisal")).toBe(false);
    expect(await names("property/purchase-agreement", "title")).toBe(false);
    expect(await status("appraisal", "property/purchase-agreement")).toBe(403);
    expect(await status("title", "property/purchase-agreement")).toBe(403);
  }, 120_000);

  test("a write retried after 412 is recomputed from the grants on record then", async () => {
    await grant("G5");
    await grant("G6");
    const county = webid(world, "county");
    const target = `${alex("property/purchase-agreement")}.acl`;
    let raced = 0;
    const racing = intercepted(async (url, init) => {
      if (url !== target || init?.method !== "PUT" || raced > 0) return;
      raced++;
      // Between the read and the write of G5's withdrawal, something outside this change ends
      // G6 on record and adds the county's read to the document.
      const g6 = (await grantRecords(world)).find((record) => record.code === "G6");
      if (g6 === undefined) throw new Error("no G6");
      await writeConsent(world, g6, DPV.ConsentWithdrawn, "withdrawn", "10:00");
      await writeOwnAcl("property/purchase-agreement", [
        { agent: county, inheritable: false, modes: ["Read"] },
      ]);
      return undefined;
    });
    await revokeGrant(racing, "G5", "10:01");
    expect(raced).toBe(1);
    // The retry read G6's end as well as the county's rule: neither grant's rule is written back.
    expect(await names("property/purchase-agreement", "appraisal")).toBe(false);
    expect(await names("property/purchase-agreement", "title")).toBe(false);
    expect(await names("property/purchase-agreement", "county")).toBe(true);
  }, 120_000);

  test("an approval whose ACL write failed is finished by approving again", async () => {
    const request = await requestAccess(world, "G6");
    const failing = failingAcl(world, "alex", "PUT");
    await expect(approveRequest(failing.world, request)).rejects.toThrow(/503/);
    expect(failing.failed()).toBe(1);
    // The consent is on record but Sextant has no rule yet.
    expect(await stateOf("G6")).toBe("active");
    expect(await status("title", "property/purchase-agreement")).toBe(403);
    // Approving again writes the ACL documents instead of refusing an active grant.
    const again = await approveRequest(world, request);
    expect(again.acls.length).toBeGreaterThan(0);
    expect(await status("title", "property/purchase-agreement")).toBe(200);
    expect(await names("profile/card", "title")).toBe(true);
  }, 120_000);
});
