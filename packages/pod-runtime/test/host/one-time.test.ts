// AUTHORED-BY Claude Opus 5.5
/**
 * One-time grants (runtime service): the owner marks access it granted as one-time; the agent's
 * first successful read closes it (the host revokes it as the owner's wallet, inside the same
 * dispatch), and the pod server refuses the second read. All against the real wasm.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { DataFactory } from "n3";
import { beforeEach, describe, expect, test } from "vitest";
import { aclDocument, grantAccess } from "../../src/acl.js";
import { listOneTimeGrants, makeGrantOneTime } from "../../src/agents/index.js";
import { memoryStorage, type PodHost, type PodStorage, type Seed } from "../../src/node.js";
import { parseToStore, toTurtle } from "../../src/rdf.js";
import { doc, makeHost, ORIGIN, put, recorder, url, webid } from "../helpers.js";

const KYC = url("alex", "/credentials/kyc");
/** A seed, so a restart restores the saved pods instead of starting empty. */
const seed: Seed = async (ctx) => [
  {
    body: await doc(ctx.podUrl("alex", "credentials/kyc")),
    contentType: "text/turtle",
    method: "PUT",
    path: "/credentials/kyc",
    pod: "alex",
  },
];
let storage: PodStorage;
let host: PodHost;

async function share(agent: "bank" | "payroll", resource = KYC) {
  const response = await grantAccess({
    fetch: host.fetchAs("alex"),
    grant: { agent: webid(agent), modes: ["Read"] },
    owner: webid("alex"),
    podRoot: url("alex", "/"),
    resourceUrl: resource,
  });
  expect(response.ok).toBe(true);
}

const kinds = (all: LensEntry[]) =>
  all.map((e) => (e.source === "app" ? `note:${e.kind}` : `${e.kind}:${e.actor.org}:${e.status}`));

beforeEach(async () => {
  storage = memoryStorage();
  host = makeHost({ identities: { wallet: "alex" }, seed, storage });
  await host.ready;
});

describe("marking a grant one-time", () => {
  test("only the pod owner may; the agent must be someone else", async () => {
    await expect(
      makeGrantOneTime(host.fetchAs("bank"), { agent: webid("bank"), resource: KYC }),
    ).rejects.toThrow(/403/);
    await expect(
      makeGrantOneTime(host.fetchAs("alex"), { agent: webid("alex"), resource: KYC }),
    ).rejects.toThrow(/400/);
    await expect(
      makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: `${KYC}.acl` }),
    ).rejects.toThrow(/400/);
    const anonymous = await host.fetchAs(null)(`${ORIGIN}/pods/.runtime/one-time-grants`, {
      body: JSON.stringify({ agent: webid("bank"), resource: KYC }),
      method: "POST",
    });
    expect(anonymous.status).toBe(401);
    const made = await makeGrantOneTime(host.fetchAs("alex"), {
      agent: webid("bank"),
      resource: KYC,
    });
    expect(made).toMatchObject({ agent: webid("bank"), path: "/credentials/kyc", pod: "alex" });
    expect(await listOneTimeGrants(host.fetchAs("alex"), ORIGIN)).toHaveLength(1);
    expect(await listOneTimeGrants(host.fetchAs("bank"), ORIGIN)).toEqual([]);
  });
});

describe("using a one-time grant", () => {
  test("the first read succeeds, the grant closes, and the pod server refuses the second", async () => {
    await share("bank");
    await share("payroll");
    await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: KYC });
    const log = recorder(host);
    expect((await host.fetchAs("bank")(KYC)).status).toBe(200);
    expect(host.oneTimeGrants()).toEqual([]);
    expect((await host.fetchAs("bank")(KYC)).status).toBe(403);
    // Another agent's standing grant is untouched.
    expect((await host.fetchAs("payroll")(KYC)).status).toBe(200);

    const seq = kinds(log.all);
    expect(seq[0]).toBe("read:bank:200");
    expect(seq[1]).toBe("note:grant-used");
    expect(seq).toContain("revoke:alex:204");
    expect(seq.indexOf("revoke:alex:204")).toBeLessThan(seq.indexOf("denied:bank:403"));
    const note = log.all[1];
    expect(note).toMatchObject({ kind: "grant-used", org: "wallet", refs: [KYC, webid("bank")] });
    const revoke = log.events.find((e) => e.kind === "revoke");
    expect(revoke?.actor).toMatchObject({ org: "alex", viaAgent: true });
    expect(revoke?.acl?.revoked).toEqual([
      expect.objectContaining({ agent: webid("bank"), modes: ["Read"] }),
    ]);
    expect(revoke?.acl?.granted).toEqual([]);
  });

  test("a refused read does not use it; a read of a container member uses a container grant", async () => {
    const container = url("alex", "/credentials/");
    await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: container });
    expect((await host.fetchAs("bank")(KYC)).status).toBe(403);
    expect(host.oneTimeGrants()).toHaveLength(1);
    await share("bank", container);
    expect((await host.fetchAs("bank")(KYC)).status).toBe(200);
    expect(host.oneTimeGrants()).toEqual([]);
    expect((await host.fetchAs("bank")(KYC)).status).toBe(403);
    expect((await host.fetchAs("bank")(container)).status).toBe(403);
  });

  test("the tour step of the read is carried by the events that close the grant", async () => {
    await share("bank");
    await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: KYC });
    const log = recorder(host);
    await host.fetchAs("bank", { tour: { demo: "kyc", step: "verify" } })(KYC);
    const revoke = log.events.find((e) => e.kind === "revoke");
    expect(revoke?.tour).toEqual({ demo: "kyc", step: "verify" });
  });

  test("a one-time grant survives a restart over the same storage and is cleared by a reset", async () => {
    await share("bank");
    await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: KYC });
    const restarted = makeHost({ identities: { wallet: "alex" }, seed, storage });
    await restarted.ready;
    expect(restarted.oneTimeGrants()).toHaveLength(1);
    expect((await restarted.fetchAs("bank")(KYC)).status).toBe(200);
    expect((await restarted.fetchAs("bank")(KYC)).status).toBe(403);
    await makeGrantOneTime(restarted.fetchAs("alex"), { agent: webid("payroll"), resource: KYC });
    await restarted.reset();
    expect(restarted.oneTimeGrants()).toEqual([]);
  });

  test("when the ACL cannot be rewritten, the runtime itself refuses further reads (fail closed)", async () => {
    // A rule with a condition the helpers cannot copy: revokeAccess refuses to rewrite it.
    const aclUrl = `${KYC}.acl`;
    const store = await parseToStore(
      await aclDocument({
        aclUrl,
        grants: [{ agent: webid("bank"), modes: ["Read"] }],
        owner: webid("alex"),
      }),
      "text/turtle",
      aclUrl,
    );
    for (const quad of store.match(
      null,
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
      DataFactory.namedNode(webid("bank")),
    )) {
      store.addQuad(
        DataFactory.quad(
          quad.subject,
          DataFactory.namedNode("https://schema.org/validUntil"),
          DataFactory.literal("2030-01-01"),
        ),
      );
    }
    expect((await put(host.fetchAs("alex"), aclUrl, await toTurtle(store))).status).toBe(201);
    await makeGrantOneTime(host.fetchAs("alex"), { agent: webid("bank"), resource: KYC });
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      expect((await host.fetchAs("bank")(KYC)).status).toBe(200);
    } finally {
      console.error = original;
    }
    expect(errors).toHaveLength(1);
    const second = await host.fetchAs("bank")(KYC);
    expect(second.status).toBe(403);
    expect(await second.text()).toMatch(/one-time grant already used/);
  });
});
