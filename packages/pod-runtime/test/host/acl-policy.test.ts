// AUTHORED-BY Claude Opus 5.5
/** The runtime's ACL invariant: the pod owner never loses acl:Control. */
import { beforeEach, describe, expect, test } from "vitest";
import { aclDocument, grantAccess, revokeAccess } from "../../src/acl.js";
import type { PodHost } from "../../src/node.js";
import { doc, makeHost, put, recorder, url, webid } from "../helpers.js";

let host: PodHost;
beforeEach(async () => {
  host = makeHost();
  await host.ready;
});

describe("refused ACL writes", () => {
  test("an ACL without the owner's Control is refused (409), even from the owner, and changes nothing", async () => {
    const alex = host.fetchAs("alex");
    const aclUrl = url("alex", "/.acl");
    const body = await aclDocument({ aclUrl, owner: webid("bank") });
    expect((await put(alex, aclUrl, body)).status).toBe(409);
    expect((await alex(url("alex", "/.acl"))).status).toBe(200);
  });

  test("deleting the root ACL is refused; deleting a resource ACL is allowed (inheritance resumes)", async () => {
    const alex = host.fetchAs("alex");
    expect((await alex(url("alex", "/.acl"), { method: "DELETE" })).status).toBe(409);
    const target = url("alex", "/docs/x");
    await put(alex, target, await doc(target));
    await put(
      alex,
      `${target}.acl`,
      await aclDocument({ aclUrl: `${target}.acl`, owner: webid("alex") }),
    );
    expect((await alex(`${target}.acl`, { method: "DELETE" })).status).toBe(204);
    expect((await alex(target)).status).toBe(200);
  });

  test("a non-RDF ACL is refused with 415 (the wasm would store it and deny everyone)", async () => {
    const res = await put(host.fetchAs("alex"), url("alex", "/x.acl"), "x", "text/plain");
    expect(res.status).toBe(415);
  });

  test("invalid RDF in an ACL is 400; PATCH on an ACL is 409", async () => {
    const alex = host.fetchAs("alex");
    expect((await put(alex, url("alex", "/x.acl"), "not turtle")).status).toBe(400);
    const patch = await alex(url("alex", "/.acl"), {
      body: "INSERT DATA { <a> <b> <c> . }",
      headers: { "content-type": "application/sparql-update" },
      method: "PATCH",
    });
    expect(patch.status).toBe(409);
  });

  test("a Control holder who is not the owner cannot drop the owner either", async () => {
    const alex = host.fetchAs("alex");
    const container = url("alex", "/shared/");
    await put(alex, `${container}x`, await doc(`${container}x`));
    const aclUrl = `${container}.acl`;
    await put(
      alex,
      aclUrl,
      await aclDocument({
        aclUrl,
        grants: [{ agent: webid("bank"), modes: ["Control"] }],
        owner: webid("alex"),
      }),
    );
    const hijack = await aclDocument({ aclUrl, owner: webid("bank") });
    expect((await put(host.fetchAs("bank"), aclUrl, hijack)).status).toBe(409);
  });
});

describe("grantAccess / revokeAccess", () => {
  const options = () => ({
    fetch: host.fetchAs("alex"),
    owner: webid("alex"),
    podRoot: url("alex", "/"),
  });

  test("grant then revoke on a container: access follows, the owner keeps everything, events carry the diff", async () => {
    const alex = host.fetchAs("alex");
    const container = url("alex", "/statements/");
    await put(alex, `${container}march`, await doc(`${container}march`));
    const log = recorder(host);

    const granted = await grantAccess({
      ...options(),
      grant: { agent: webid("bank"), modes: ["Read"] },
      resourceUrl: container,
    });
    expect(granted.status).toBe(201);
    expect((await host.fetchAs("bank")(`${container}march`)).status).toBe(200);
    const grantEvent = log.events.find((e) => e.kind === "grant");
    expect(grantEvent?.acl?.granted).toEqual([
      { agent: webid("bank"), inherited: false, modes: ["Read"], resource: "/statements/" },
      { agent: webid("bank"), inherited: true, modes: ["Read"], resource: "/statements/" },
    ]);
    expect(grantEvent?.acl?.revoked).toEqual([]);

    const revoked = await revokeAccess({
      ...options(),
      agent: webid("bank"),
      resourceUrl: container,
    });
    expect(revoked.status).toBe(204);
    const revokeEvent = log.events.find((e) => e.kind === "revoke");
    expect(revokeEvent?.acl?.revoked.map((r) => r.agent)).toEqual([webid("bank"), webid("bank")]);
    expect(revokeEvent?.acl?.granted).toEqual([]);

    const denied = await host.fetchAs("bank")(`${container}march`);
    expect(denied.status).toBe(403);
    expect(log.events.at(-1)).toMatchObject({ kind: "denied", status: 403, pod: "alex" });
    expect((await alex(`${container}march`)).status).toBe(200);
    expect((await alex(`${container}.acl`)).status).toBe(200);
  });

  test("granting on a resource with no ACL keeps the inherited rules (nobody loses access)", async () => {
    const alex = host.fetchAs("alex");
    const container = url("alex", "/docs/");
    await put(alex, `${container}a`, await doc(`${container}a`));
    await grantAccess({
      ...options(),
      grant: { agent: webid("bureau"), modes: ["Read"] },
      resourceUrl: container,
    });
    const log = recorder(host);
    await grantAccess({
      ...options(),
      grant: { agent: webid("bank"), modes: ["Read"] },
      resourceUrl: `${container}a`,
    });
    expect((await host.fetchAs("bureau")(`${container}a`)).status).toBe(200);
    expect((await host.fetchAs("bank")(`${container}a`)).status).toBe(200);
    // The event lists only the new rule: the copied inherited rules are not a change.
    expect(log.events.find((e) => e.kind === "grant")?.acl?.granted).toEqual([
      { agent: webid("bank"), inherited: false, modes: ["Read"], resource: "/docs/a" },
    ]);
  });

  test("revoking some modes keeps the others; the owner's own access cannot be revoked", async () => {
    const container = url("alex", "/box/");
    await put(host.fetchAs("alex"), `${container}a`, await doc(`${container}a`));
    await grantAccess({
      ...options(),
      grant: { agent: webid("bank"), modes: ["Read", "Append"] },
      resourceUrl: container,
    });
    await revokeAccess({
      ...options(),
      agent: webid("bank"),
      modes: ["Read"],
      resourceUrl: container,
    });
    const bank = host.fetchAs("bank");
    expect((await bank(`${container}a`)).status).toBe(403);
    expect(
      (
        await bank(container, {
          body: await doc(""),
          headers: { "content-type": "text/turtle" },
          method: "POST",
        })
      ).status,
    ).toBe(201);
    await expect(
      revokeAccess({ ...options(), agent: webid("alex"), resourceUrl: container }),
    ).rejects.toThrow(/owner/);
  });

  test("a successful read by a grantee names the authorisation that allowed it", async () => {
    const container = url("alex", "/files/");
    await put(
      host.fetchAs("alex"),
      `${container}a`,
      await doc(`${container}a`, "https://schema.org/Report"),
    );
    await grantAccess({
      ...options(),
      grant: { agent: webid("bank"), modes: ["Read"] },
      resourceUrl: container,
    });
    const log = recorder(host);
    await host.fetchAs("bank")(`${container}a`);
    const read = log.events.at(-1);
    expect(read).toMatchObject({
      kind: "read",
      status: 200,
      actor: { org: "bank", viaAgent: false },
    });
    expect(read?.grant).toMatch(new RegExp(`^${container}\\.acl#grant-\\d+$`));
    expect(read?.resource).toMatchObject({
      drawer: "files",
      label: "a",
      types: ["https://schema.org/Report"],
    });
  });
});
