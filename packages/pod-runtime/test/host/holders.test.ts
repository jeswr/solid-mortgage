// AUTHORED-BY Claude Opus 5.5
/**
 * More than one pod holder (lane E3): every registered holder gets a pod, a WebID and a
 * baseline profile, and the pod server's WAC protects a non-Alex holder's data exactly as it
 * protects Alex's. The wallet may act for any holder; no organisation may. All against the real
 * wasm, through the host's own dispatch.
 */
import { parseRdf } from "@jeswr/fetch-rdf";
import { HOLDER_IDS, type PodOwner } from "@mortgage/demo-kit/registry";
import { beforeEach, describe, expect, test } from "vitest";
import { grantAccess, revokeAccess } from "../../src/acl.js";
import { makeGrantOneTime, watchResource } from "../../src/agents/index.js";
import {
  BRIDGE_REPLY,
  BRIDGE_REQUEST,
  hostModeIdentity,
  startBridge,
} from "../../src/bridge/index.js";
import type { PodHost } from "../../src/node.js";
import { AGENT_HEADER, type ControlReply, HOLDER_HEADER } from "../../src/protocol.js";
import { doc, makeHost, ORIGIN, put, recorder, url, webid } from "../helpers.js";

const OWNERS: PodOwner[] = [...HOLDER_IDS, "bank", "bureau", "payroll"];
const INCOME = url("maya", "/credentials/income");

let host: PodHost;
beforeEach(async () => {
  host = makeHost({ identities: { "bank-app": "bank", wallet: "alex" }, owners: OWNERS });
  await host.ready;
  expect((await put(host.fetchAs("maya"), INCOME, await doc(INCOME))).status).toBe(201);
});

async function mayaShares(agent: string, resource = url("maya", "/credentials/")) {
  const response = await grantAccess({
    fetch: host.fetchAs("maya"),
    grant: { agent, modes: ["Read"] },
    owner: webid("maya"),
    podRoot: url("maya", "/"),
    resourceUrl: resource,
  });
  expect(response.ok).toBe(true);
}

describe("provisioning", () => {
  test("every registered holder has a pod and a public profile saying who it is", async () => {
    for (const holder of HOLDER_IDS) {
      const card = url(holder, "/profile/card");
      const response = await host.fetchAs(null)(card);
      expect(response.status, holder).toBe(200);
      const dataset = await parseRdf(await response.text(), response.headers.get("content-type"), {
        baseIRI: card,
      });
      const objects = (predicate: string) =>
        [...dataset]
          .filter((q) => q.subject.value === webid(holder) && q.predicate.value === predicate)
          .map((q) => q.object.value);
      expect(objects("http://www.w3.org/ns/pim/space#storage")).toEqual([url(holder, "/")]);
      expect(objects("https://schema.org/name")).toHaveLength(1);
    }
    const typeOf = async (holder: PodOwner) => {
      const card = url(holder, "/profile/card");
      const text = await (await host.fetchAs(null)(card)).text();
      return [...(await parseRdf(text, "text/turtle", { baseIRI: card }))]
        .filter((q) => q.predicate.value.endsWith("#type") && q.subject.value === webid(holder))
        .map((q) => q.object.value);
    };
    expect(await typeOf("maya")).toEqual(["https://schema.org/Person"]);
    expect(await typeOf("northwind")).toEqual(["https://schema.org/Organization"]);
    // Organisations keep the plain baseline profile.
    expect(await typeOf("bank")).toEqual([]);
  });
});

describe("a non-Alex holder's data", () => {
  test("is readable by its holder and refused to everyone else without a grant", async () => {
    expect((await host.fetchAs("maya")(INCOME)).status).toBe(200);
    expect((await host.fetchAs("bank")(INCOME)).status).toBe(403);
    expect((await host.fetchAs("bank-app")(INCOME)).status).toBe(403);
    // Another holder, and the wallet's own default identity (Alex), are strangers here too.
    expect((await host.fetchAs("alex")(INCOME)).status).toBe(403);
    expect((await host.fetchAs("wallet")(INCOME)).status).toBe(403);
    expect((await host.fetchAs("rosa")(INCOME)).status).toBe(403);
    expect((await host.fetchAs(null)(INCOME)).status).toBe(401);
    // And Maya cannot write into Alex's pod.
    const alexDoc = url("alex", "/documents/x");
    expect((await put(host.fetchAs("maya"), alexDoc, await doc(alexDoc))).status).toBe(403);
  });

  test("a grant by Maya to an organisation works, reaches only that organisation, and ends on revoke", async () => {
    const log = recorder(host);
    await mayaShares(webid("bank"));
    expect((await host.fetchAs("bank")(INCOME)).status).toBe(200);
    expect((await host.fetchAs("bureau")(INCOME)).status).toBe(403);
    expect((await host.fetchAs("alex")(INCOME)).status).toBe(403);

    const grant = log.events.find((e) => e.kind === "grant");
    expect(grant).toMatchObject({ actor: { org: "maya", webid: webid("maya") }, pod: "maya" });
    expect(grant?.acl?.granted.length).toBeGreaterThan(0);
    for (const rule of grant?.acl?.granted ?? [])
      expect(rule).toMatchObject({ agent: webid("bank"), modes: ["Read"] });
    const read = log.events.find((e) => e.kind === "read" && e.actor.org === "bank");
    expect(read).toMatchObject({ pod: "maya", status: 200 });

    const revoked = await revokeAccess({
      agent: webid("bank"),
      fetch: host.fetchAs("maya"),
      owner: webid("maya"),
      podRoot: url("maya", "/"),
      resourceUrl: url("maya", "/credentials/"),
    });
    expect(revoked.ok).toBe(true);
    expect((await host.fetchAs("bank")(INCOME)).status).toBe(403);
    expect((await host.fetchAs("maya")(INCOME)).status).toBe(200);
    expect(log.events.at(-2)).toMatchObject({
      actor: { org: "bank" },
      kind: "denied",
      pod: "maya",
    });
  });

  test("a holder may grant another holder (a carer): Rosa shares with Alex", async () => {
    const meds = url("rosa", "/health/medications");
    await put(host.fetchAs("rosa"), meds, await doc(meds));
    expect((await host.fetchAs("alex")(meds)).status).toBe(403);
    const response = await grantAccess({
      fetch: host.fetchAs("rosa"),
      grant: { agent: webid("alex"), modes: ["Read"] },
      owner: webid("rosa"),
      podRoot: url("rosa", "/"),
      resourceUrl: meds,
    });
    expect(response.ok).toBe(true);
    expect((await host.fetchAs("alex")(meds)).status).toBe(200);
    expect((await put(host.fetchAs("alex"), meds, await doc(meds))).status).toBe(403);
  });
});

describe("the wallet acts for holders; organisations do not", () => {
  test("runtime services accept the wallet for any holder and refuse an organisation", async () => {
    await mayaShares(webid("bank"));
    // The wallet page acting for Maya (identity "maya") names its app, as watch() does.
    const asMaya = await watchResource(host.fetchAs("maya"), INCOME, { app: "wallet" });
    expect(asMaya).toMatchObject({ app: "wallet", subscriber: "maya" });
    await expect(watchResource(host.fetchAs("bank"), INCOME, { app: "wallet" })).rejects.toThrow(
      /403/,
    );
  });

  test("a one-time grant on Maya's pod is closed by the wallet, as Maya", async () => {
    await mayaShares(webid("bank"), INCOME);
    await makeGrantOneTime(host.fetchAs("maya"), { agent: webid("bank"), resource: INCOME });
    const log = recorder(host);
    expect((await host.fetchAs("bank")(INCOME)).status).toBe(200);
    expect((await host.fetchAs("bank")(INCOME)).status).toBe(403);
    expect(log.all.find((e) => e.source === "app")).toMatchObject({
      kind: "grant-used",
      org: "wallet",
    });
    expect(log.events.find((e) => e.kind === "revoke")?.actor).toMatchObject({
      org: "maya",
      viaAgent: true,
    });
  });

  test("host mode: the bridge lets the wallet's origin act for a holder, and nobody else", async () => {
    type Listener = (event: { origin: string; source: unknown; data: unknown }) => void;
    let listener: Listener | undefined;
    const stop = startBridge({
      control: async () => ({ ok: true }),
      fetch: (request) => host.handle(request, { identity: request.headers.get(AGENT_HEADER) }),
      holders: (app) => (app === "wallet" ? HOLDER_IDS : []),
      identify: hostModeIdentity("example", ["bank", "wallet"]),
      podsOrigin: ORIGIN,
      target: {
        addEventListener: (_: "message", l: Listener) => {
          listener = l;
        },
        removeEventListener: () => {
          listener = undefined;
        },
      },
    });
    const send = (origin: string, headers: Array<[string, string]>) =>
      new Promise<ControlReply>((resolve) => {
        const source = {
          postMessage: (reply: { type: string; reply: ControlReply }) => {
            expect(reply.type).toBe(BRIDGE_REPLY);
            resolve(reply.reply);
          },
        };
        listener?.({
          data: {
            id: 1,
            message: { body: null, headers, method: "GET", type: "fetch", url: INCOME },
            type: BRIDGE_REQUEST,
          },
          origin,
          source,
        });
      });
    const status = (reply: ControlReply) => (reply.ok ? reply.response?.status : reply.error);

    expect(status(await send("https://wallet.example", [[HOLDER_HEADER, "maya"]]))).toBe(200);
    // Without the holder header the wallet is Alex, who has no access to Maya's pod.
    expect(status(await send("https://wallet.example", []))).toBe(403);
    // An organisation naming a holder, a forged identity header, an unknown holder: refused.
    expect(status(await send("https://bank.example", [[HOLDER_HEADER, "maya"]]))).toMatch(
      /may not act/,
    );
    expect(status(await send("https://wallet.example", [[HOLDER_HEADER, "bank"]]))).toMatch(
      /may not act/,
    );
    expect(status(await send("https://evil.test", [[HOLDER_HEADER, "maya"]]))).toMatch(
      /may not act/,
    );
    expect(status(await send("https://bank.example", [[AGENT_HEADER, "maya"]]))).toBe(403);
    stop();
  });
});
