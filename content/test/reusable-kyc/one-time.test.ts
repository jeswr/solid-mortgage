// AUTHORED-BY Claude Opus 5.5
/**
 * Y1 stays one-time, headless, against the real pod runtime host and wasm (nothing mocked):
 *
 * - after Pennant's one read, a change to an ancestor `credentials/` rule (the mortgage's G4
 *   approval rewrites the statement's ACL) does not put Pennant's rule back: its read is still 403;
 * - a one-time rule Pennant has not used yet survives such a rewrite, and still allows one read;
 * - the generic approval refuses a request limited in uses unless the runtime's one-time grant is
 *   registered, and refuses any limit other than one, before writing anything.
 */

import { AccessRequest, buildAccessRequest } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { approveRequest, isLimitedUse, readAcl } from "../../mortgage/grants.js";
import { requestApplicationAccess } from "../../mortgage/journey.js";
import {
  podUrl,
  postResource,
  readDataset,
  statusOf,
  type World,
  webid,
} from "../../mortgage/world.js";
import { attestationUrl } from "../../reusable-kyc/attestation.js";
import {
  oneTimePermission,
  pennantHasRule,
  policyUrl,
  readOneTimeRequest,
} from "../../reusable-kyc/grants.js";
import {
  applyWithVerifiedIdentity,
  approveOneTimeRead,
  askAgain,
  checkVerifiedIdentity,
  getAttestation,
} from "../../reusable-kyc/journey.js";
import { createHarness, type Harness } from "./harness.js";

/** The agents named in the statement's ACL document, read as Alex. */
async function aclAgents(world: World): Promise<string[]> {
  const rules = await readAcl(world.fetchAs("alex"), `${attestationUrl(world)}.acl`);
  return rules.flatMap((rule) => [...rule.agent]);
}

/** The mortgage's G4: Juniper asks to read Alex's credentials/ (among others); Alex approves. */
async function approveG4(world: World): Promise<string[]> {
  const url = await requestApplicationAccess(world);
  return (await approveRequest(world, url, "10:40")).acls;
}

describe("a used one-time grant is never put back", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  }, 180_000);
  afterAll(() => h?.stop());

  test("Y1 used, then an ancestor credentials/ rule changes: Pennant is still refused", async () => {
    const world = h.world();
    await getAttestation(world);
    const request = await applyWithVerifiedIdentity(world);
    await approveOneTimeRead(world, request, h.grantOneTime);
    await h.runner.idle();
    expect((await checkVerifiedIdentity(world)).result.verified).toBe(true);
    await h.runner.idle();
    // The runtime closed the grant; the record still says Y1 is active (the wallet has not yet
    // written its "used" record), which is the window this guards.
    expect(await pennantHasRule(world)).toBe(false);
    expect(await askAgain(world)).toBe(403);

    const written = await approveG4(world);
    await h.runner.idle();
    // G4's Read on credentials/ is inheritable, so the statement's own ACL document is rewritten.
    expect(written).toContain(`${attestationUrl(world)}.acl`);
    const agents = await aclAgents(world);
    expect(agents).toContain(webid(world, "lender"));
    expect(agents).not.toContain(webid(world, "card-issuer"));
    expect(await askAgain(world)).toBe(403);
    expect(h.errors).toEqual([]);
  });
});

describe("an unused one-time grant survives an unrelated rewrite", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  }, 180_000);
  afterAll(() => h?.stop());

  test("approved but not read, then G4: Pennant still gets exactly one read", async () => {
    const world = h.world();
    await getAttestation(world);
    const request = await applyWithVerifiedIdentity(world);
    await approveOneTimeRead(world, request, h.grantOneTime);
    await h.runner.idle();
    expect(await pennantHasRule(world)).toBe(true);

    const written = await approveG4(world);
    await h.runner.idle();
    expect(written).toContain(`${attestationUrl(world)}.acl`);
    const agents = await aclAgents(world);
    expect(agents).toContain(webid(world, "lender"));
    expect(agents).toContain(webid(world, "card-issuer"));
    // Still registered with the runtime as one-time.
    expect((await h.pendingOneTime()).length).toBe(1);

    expect((await checkVerifiedIdentity(world)).result.verified).toBe(true);
    await h.runner.idle();
    expect(await askAgain(world)).toBe(403);
    expect(h.errors).toEqual([]);
  });
});

describe("the generic approval fails closed on limited-use requests", () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  }, 180_000);
  afterAll(() => h?.stop());

  test("Y1 through the generic approval, without the runtime's one-time grant, is refused", async () => {
    const world = h.world();
    await getAttestation(world);
    const request = await applyWithVerifiedIdentity(world);
    expect((await readOneTimeRequest(world, request)).reason).toBeUndefined();
    await expect(approveRequest(world, request, "10:21")).rejects.toThrow(
      /limited to one use: it is answered on the one-time consent screen/,
    );
    // Nothing was written: no agreement, no rule, nothing registered, and Pennant is refused.
    expect(await statusOf(world.fetchAs("alex"), policyUrl(world))).toBe(404);
    expect(await pennantHasRule(world)).toBe(false);
    expect(await h.pendingOneTime()).toEqual([]);
    expect(await askAgain(world)).toBe(403);
  });

  test("a limit other than one is refused, even with the one-time grant", async () => {
    const world = h.world();
    const twice = await postResource(
      world.fetchAs("card-issuer"),
      podUrl(world, "alex", "inbox/"),
      "request-y1-twice",
      (iri) =>
        buildAccessRequest({
          assignee: webid(world, "card-issuer"),
          assigner: webid(world, "alex"),
          description: "Read your KYC attestation twice",
          grantCode: "Y1",
          iri,
          issued: h.calendar.clock(world.day, "10:25"),
          name: "Use verified identity",
          permissions: [{ ...oneTimePermission(world, "10:25"), maxUses: 2 }],
        }),
    );
    await expect(
      approveRequest(world, twice, "10:26", { registerOneTime: h.grantOneTime }),
    ).rejects.toThrow(/one-time access only, not 2 uses/);
    expect(await statusOf(world.fetchAs("alex"), policyUrl(world))).toBe(404);
    expect(await h.pendingOneTime()).toEqual([]);
    expect(await askAgain(world)).toBe(403);
  });

  test("isLimitedUse tells the wallet's screens which requests go to the one-time screen", async () => {
    const world = h.world();
    const { agreement } = await readOneTimeRequest(
      world,
      await applyWithVerifiedIdentity(world, "10:30"),
    );
    expect(isLimitedUse(agreement)).toBe(true);
    // The mortgage's G4 has no limit on uses: the generic Requests screen keeps it.
    const g4 = await requestApplicationAccess(world);
    const alex = world.fetchAs("alex");
    expect(isLimitedUse(new AccessRequest(g4, await readDataset(alex, g4), DataFactory))).toBe(
      false,
    );
  });
});
