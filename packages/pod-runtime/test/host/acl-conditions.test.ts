// AUTHORED-BY Claude Opus 5.5
/**
 * Conditions on authorisations (`acl:origin`): an owner rule limited by one is not Control, and
 * conditions survive every rewrite the helpers make and show up in the event diff.
 */
import { Authorization } from "@solid/object";
import { DataFactory, Store } from "n3";
import { beforeEach, describe, expect, test } from "vitest";
import { ACL, grantAccess, ownerKeepsControl, revokeAccess, rulesOf } from "../../src/acl.js";
import type { PodHost } from "../../src/node.js";
import { parseToStore, toTurtle } from "../../src/rdf.js";
import { doc, makeHost, put, recorder, url, webid } from "../helpers.js";

const NOWHERE = "https://nowhere.invalid";
const APP = "https://app.example";

let host: PodHost;
beforeEach(async () => {
  host = makeHost();
  await host.ready;
});

/** An ACL with the given authorisations, written with the @solid/object wrapper and n3.Writer. */
async function aclWith(
  aclUrl: string,
  rules: Array<{ agents: string[]; modes: string[]; origins?: string[]; members?: boolean }>,
): Promise<string> {
  const store = new Store();
  const target = aclUrl.slice(0, -".acl".length);
  rules.forEach((rule, i) => {
    const auth = new Authorization(
      DataFactory.namedNode(`${aclUrl}#rule-${i}`),
      store,
      DataFactory,
    );
    auth.type.add(`${ACL}Authorization`);
    auth.accessTo = target;
    if (rule.members) auth.default = target;
    for (const agent of rule.agents) auth.agent.add(agent);
    for (const mode of rule.modes) auth.mode.add(`${ACL}${mode}`);
    for (const origin of rule.origins ?? []) auth.origin.add(origin);
  });
  return toTurtle(store, { acl: ACL });
}

async function rulesAt(aclUrl: string) {
  const response = await host.fetchAs("alex")(aclUrl);
  expect(response.status).toBe(200);
  return rulesOf(
    await parseToStore(await response.text(), "text/turtle", aclUrl),
    url("alex", "/"),
  );
}

const options = () => ({
  fetch: host.fetchAs("alex"),
  owner: webid("alex"),
  podRoot: url("alex", "/"),
});

describe("acl:origin", () => {
  test("an owner rule limited to an origin does not keep Control: refused, and the owner keeps access", async () => {
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/d/x"), await doc(url("alex", "/d/x")));
    const aclUrl = url("alex", "/d/.acl");
    const limited = await aclWith(aclUrl, [
      {
        agents: [webid("alex")],
        members: true,
        modes: ["Read", "Write", "Control"],
        origins: [NOWHERE],
      },
    ]);
    const log = recorder(host);
    expect((await put(alex, aclUrl, limited)).status).toBe(409);
    expect((await alex(url("alex", "/d/x"))).status).toBe(200);
    expect(log.events.some((e) => e.kind === "grant" || e.kind === "revoke")).toBe(false);
  });

  test("an origin-limited grant is reported with its origins in the event diff", async () => {
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/e/x"), await doc(url("alex", "/e/x")));
    const aclUrl = url("alex", "/e/.acl");
    const log = recorder(host);
    const body = await aclWith(aclUrl, [
      { agents: [webid("alex")], members: true, modes: ["Read", "Write", "Control"] },
      { agents: [webid("bank")], members: true, modes: ["Read"], origins: [APP] },
    ]);
    expect((await put(alex, aclUrl, body)).status).toBe(201);
    const granted = log.events.find((e) => e.kind === "grant")?.acl?.granted ?? [];
    const bank = granted.filter((r) => r.agent === webid("bank"));
    expect(bank).toHaveLength(2);
    for (const rule of bank) expect(rule).toMatchObject({ origins: [APP] });
  });

  test("grantAccess copies inherited rules with their origins (no broadening)", async () => {
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/f/x"), await doc(url("alex", "/f/x")));
    const parentAcl = url("alex", "/f/.acl");
    await put(
      alex,
      parentAcl,
      await aclWith(parentAcl, [
        { agents: [webid("alex")], members: true, modes: ["Read", "Write", "Control"] },
        { agents: [webid("bank")], members: true, modes: ["Read"], origins: [APP] },
      ]),
    );
    const granted = await grantAccess({
      ...options(),
      grant: { agent: webid("bureau"), modes: ["Read"] },
      resourceUrl: url("alex", "/f/x"),
    });
    expect(granted.status).toBe(201);
    const bank = (await rulesAt(url("alex", "/f/x.acl"))).filter((r) => r.agent === webid("bank"));
    expect(bank).toEqual([
      { agent: webid("bank"), inherited: false, modes: ["Read"], origins: [APP], resource: "/f/x" },
    ]);
  });

  test("revokeAccess splits a shared conditional rule and keeps the condition on both halves", async () => {
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/g/x"), await doc(url("alex", "/g/x")));
    const aclUrl = url("alex", "/g/.acl");
    await put(
      alex,
      aclUrl,
      await aclWith(aclUrl, [
        { agents: [webid("alex")], members: true, modes: ["Read", "Write", "Control"] },
        {
          agents: [webid("bank"), webid("bureau")],
          members: true,
          modes: ["Read", "Write"],
          origins: [APP],
        },
      ]),
    );
    const revoked = await revokeAccess({
      ...options(),
      agent: webid("bureau"),
      modes: ["Write"],
      resourceUrl: url("alex", "/g/"),
    });
    expect(revoked.ok).toBe(true);
    const rules = (await rulesAt(aclUrl)).filter((r) => r.agent !== webid("alex"));
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule).toMatchObject({ origins: [APP] });
    expect(
      rules.filter((r) => r.agent === webid("bureau")).every((r) => !r.modes.includes("Write")),
    ).toBe(true);
  });

  test("a rule with a condition the helpers cannot copy stops the change instead of broadening it", async () => {
    const alex = host.fetchAs("alex");
    await put(alex, url("alex", "/m/x"), await doc(url("alex", "/m/x")));
    const aclUrl = url("alex", "/m/.acl");
    const store = await parseToStore(
      await aclWith(aclUrl, [
        { agents: [webid("alex")], members: true, modes: ["Read", "Write", "Control"] },
        { agents: [webid("bank"), webid("bureau")], members: true, modes: ["Read"] },
      ]),
      "text/turtle",
      aclUrl,
    );
    store.addQuad(
      DataFactory.namedNode(`${aclUrl}#rule-1`),
      DataFactory.namedNode("https://example.org/ns#until"),
      DataFactory.literal("2020-01-01"),
    );
    expect((await put(alex, aclUrl, await toTurtle(store))).status).toBe(201);
    await expect(
      grantAccess({
        ...options(),
        grant: { agent: webid("payroll"), modes: ["Read"] },
        resourceUrl: url("alex", "/m/x"),
      }),
    ).rejects.toThrow(/condition/);
    await expect(
      revokeAccess({ ...options(), agent: webid("bureau"), resourceUrl: url("alex", "/m/") }),
    ).rejects.toThrow(/condition/);
  });

  test("ownerKeepsControl needs an owner rule with no condition and nothing it does not understand", async () => {
    const aclUrl = url("alex", "/k/.acl");
    const target = url("alex", "/k/");
    const check = async (rules: Parameters<typeof aclWith>[1], extra?: (store: Store) => void) => {
      const store = await parseToStore(await aclWith(aclUrl, rules), "text/turtle", aclUrl);
      extra?.(store);
      return ownerKeepsControl(store, webid("alex"), target);
    };
    const owner = { agents: [webid("alex")], members: true, modes: ["Read", "Write", "Control"] };
    expect(await check([owner])).toBe(true);
    expect(await check([{ ...owner, origins: [APP] }])).toBe(false);
    expect(await check([{ ...owner, origins: [APP] }, owner])).toBe(true);
    const unknown = (store: Store) =>
      store.addQuad(
        DataFactory.namedNode(`${aclUrl}#rule-0`),
        DataFactory.namedNode("https://example.org/ns#until"),
        DataFactory.literal("2020-01-01"),
      );
    expect(await check([owner], unknown)).toBe(false);
  });
});
