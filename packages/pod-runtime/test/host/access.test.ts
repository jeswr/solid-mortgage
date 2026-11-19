// AUTHORED-BY Claude Opus 5.5
/** Access control through the host: the wasm's own WAC decides, with the caller's WebID. */
import { beforeEach, describe, expect, test } from "vitest";
import { aclDocument, PUBLIC } from "../../src/acl.js";
import type { PodHost } from "../../src/node.js";
import { doc, makeHost, put, url, webid } from "../helpers.js";

let host: PodHost;
beforeEach(async () => {
  host = makeHost({ identities: { "bank-app": "bank" } });
  await host.ready;
});

async function share(container: string, grants: Parameters<typeof aclDocument>[0]["grants"]) {
  const alex = host.fetchAs("alex");
  await put(alex, url("alex", `${container}seed`), await doc(url("alex", `${container}seed`)));
  const aclUrl = url("alex", `${container}.acl`);
  const res = await put(alex, aclUrl, await aclDocument({ aclUrl, grants, owner: webid("alex") }));
  expect(res.status).toBe(201);
}

describe("owner and strangers", () => {
  test("the owner can write and read; an organisation with no rule gets 403; anonymous gets 401", async () => {
    const target = url("alex", "/documents/a");
    expect((await put(host.fetchAs("alex"), target, await doc(target))).status).toBe(201);
    expect((await host.fetchAs("alex")(target)).status).toBe(200);
    expect((await host.fetchAs("bank")(target)).status).toBe(403);
    expect((await host.fetchAs(null)(target)).status).toBe(401);
  });

  test('an identity key maps to the owner it acts as; unknown and empty identities are anonymous, never ""', async () => {
    await share("/documents/", [{ agent: webid("bank"), modes: ["Read"] }]);
    const target = url("alex", "/documents/seed");
    expect((await host.fetchAs("bank-app")(target)).status).toBe(200);
    expect((await host.fetchAs("nobody")(target)).status).toBe(401);
    expect((await host.fetchAs("")(target)).status).toBe(401);
  });

  test("an X-Demo-* header in the request never reaches the pod or changes the identity", async () => {
    const target = url("alex", "/documents/b");
    await put(host.fetchAs("alex"), target, await doc(target));
    const res = await host.fetchAs("bank")(target, { headers: { "x-demo-agent": "alex" } });
    expect(res.status).toBe(403);
  });
});

describe("modes", () => {
  test("acl:Read can read and not write", async () => {
    await share("/documents/", [{ agent: webid("bank"), modes: ["Read"] }]);
    const bank = host.fetchAs("bank");
    expect((await bank(url("alex", "/documents/seed"))).status).toBe(200);
    expect((await put(bank, url("alex", "/documents/seed"), await doc("x"))).status).toBe(403);
  });

  test("acl:Append on a container can create (POST) and not read, not even what it created", async () => {
    await share("/inbox/", [{ agent: webid("bureau"), modes: ["Append"] }]);
    const bureau = host.fetchAs("bureau");
    const posted = await bureau(url("alex", "/inbox/"), {
      body: await doc(""),
      headers: { "content-type": "text/turtle" },
      method: "POST",
    });
    expect(posted.status).toBe(201);
    const location = posted.headers.get("location") ?? "";
    expect(location.startsWith(url("alex", "/inbox/"))).toBe(true);
    expect((await bureau(location)).status).toBe(403);
    expect((await bureau(url("alex", "/inbox/"))).status).toBe(403);
    expect((await host.fetchAs("alex")(location)).status).toBe(200);
  });

  test("public read on a profile works for anyone; every pod's WebID profile is public from the start", async () => {
    const card = url("bank", "/profile/card");
    const res = await host.fetchAs(null)(card);
    expect(res.status).toBe(200);
    expect(res.headers.get("wac-allow")).toContain('public="read"');
    expect(await res.text()).toContain(url("bank", "/"));
    await share("/public/", [{ agent: PUBLIC, modes: ["Read"] }]);
    expect((await host.fetchAs(null)(url("alex", "/public/seed"))).status).toBe(200);
  });
});

describe("routing", () => {
  test("requests outside a hosted pod are 404 from the host", async () => {
    expect(
      (await host.fetchAs("alex")(`${url("alex", "/")}`.replace("/alex/", "/nobody/"))).status,
    ).toBe(404);
    expect((await host.fetchAs("alex")("https://elsewhere.example/pods/alex/")).status).toBe(404);
  });
});
