// AUTHORED-BY Claude Opus 5.5
/** acl:Read vs acl:Append vs acl:Write vs acl:Control, and who may write .acl resources. */
import { beforeAll, describe, expect, test } from "vitest";
import {
  acl,
  BASE,
  BUREAU,
  doc,
  header,
  initWasm,
  newPod,
  OWNER,
  ownerRule,
  PARTNER,
  req,
  TURTLE,
} from "./helpers.js";

beforeAll(initWasm);

const C = `${BASE}inbox/`;
const N3_INSERT = (s: string) =>
  `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:p a solid:InsertDeletePatch; solid:inserts { <${s}> <http://example.org/p> "v" . }.`;
const N3_DELETE = (s: string) =>
  `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:p a solid:InsertDeletePatch; solid:deletes { <${s}> a <http://example.org/Thing> . }.`;
const N3_WHERE = (s: string) =>
  `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:p a solid:InsertDeletePatch; solid:where { <${s}> a ?t . }; solid:inserts { <${s}> <http://example.org/q> ?t . }.`;
const SPARQL_INSERT = (s: string) => `INSERT DATA { <${s}> <http://example.org/p> "sp" . }`;
const N3 = { "content-type": "text/n3" };

/** inbox/ with PARTNER = Append, BUREAU = Read (both accessTo + default). */
async function inboxPod() {
  const pod = newPod();
  await req(pod, "PUT", "/inbox/existing", {
    headers: TURTLE,
    body: doc(`${C}existing`),
    as: OWNER,
  });
  await req(pod, "PUT", "/inbox/.acl", {
    headers: TURTLE,
    body: acl(`${C}.acl`, [
      ownerRule(C),
      { id: "append", accessTo: C, default: C, agents: [PARTNER], modes: ["Append"] },
      { id: "read", accessTo: C, default: C, agents: [BUREAU], modes: ["Read"] },
    ]),
    as: OWNER,
  });
  return pod;
}

describe("acl:Append (PARTNER on inbox/)", () => {
  test("can POST a new member (RDF or not) to the container", async () => {
    const pod = await inboxPod();
    expect(
      (await req(pod, "POST", "/inbox/", { headers: TURTLE, body: doc(""), as: PARTNER })).status,
    ).toBe(201);
    expect(
      (
        await req(pod, "POST", "/inbox/", {
          headers: { "content-type": "text/plain" },
          body: "hi",
          as: PARTNER,
        })
      ).status,
    ).toBe(201);
  });

  test("can PATCH insert-only (N3 solid:inserts and SPARQL INSERT DATA), including creating a new resource by PATCH", async () => {
    const pod = await inboxPod();
    expect(
      (
        await req(pod, "PATCH", "/inbox/existing", {
          headers: N3,
          body: N3_INSERT(`${C}existing`),
          as: PARTNER,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await req(pod, "PATCH", "/inbox/existing", {
          headers: { "content-type": "application/sparql-update" },
          body: SPARQL_INSERT(`${C}existing`),
          as: PARTNER,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await req(pod, "PATCH", "/inbox/patched", {
          headers: N3,
          body: N3_INSERT(`${C}patched`),
          as: PARTNER,
        })
      ).status,
    ).toBe(201);
  });

  test("cannot PUT (create or replace), PATCH with deletes, PATCH with a where clause, DELETE, or create a sub-container", async () => {
    const pod = await inboxPod();
    expect(
      (await req(pod, "PUT", "/inbox/new", { headers: TURTLE, body: doc(`${C}new`), as: PARTNER }))
        .status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/inbox/existing", {
          headers: TURTLE,
          body: doc(`${C}existing`),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PATCH", "/inbox/existing", {
          headers: N3,
          body: N3_DELETE(`${C}existing`),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PATCH", "/inbox/existing", {
          headers: N3,
          body: N3_WHERE(`${C}existing`),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect((await req(pod, "DELETE", "/inbox/existing", { as: PARTNER })).status).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/inbox/sub/x", {
          headers: TURTLE,
          body: doc(`${C}sub/x`),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
  });

  test("cannot read the container, a member, or even what it just wrote", async () => {
    const pod = await inboxPod();
    const posted = await req(pod, "POST", "/inbox/", {
      headers: TURTLE,
      body: doc(""),
      as: PARTNER,
    });
    const path = new URL(header(posted, "location") ?? "").pathname.replace("/pods/alex", "");
    expect((await req(pod, "GET", "/inbox/", { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "GET", "/inbox/existing", { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "HEAD", "/inbox/existing", { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "GET", path, { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "GET", path, { as: OWNER })).status).toBe(200);
  });
});

describe("acl:Read (BUREAU on inbox/)", () => {
  test("can GET/HEAD container and members; every write method is 403", async () => {
    const pod = await inboxPod();
    expect((await req(pod, "GET", "/inbox/", { as: BUREAU })).status).toBe(200);
    const got = await req(pod, "GET", "/inbox/existing", { as: BUREAU });
    expect(got.status).toBe(200);
    expect(header(got, "wac-allow")).toBe('user="read",public=""');
    expect((await req(pod, "HEAD", "/inbox/existing", { as: BUREAU })).status).toBe(200);
    expect(
      (await req(pod, "POST", "/inbox/", { headers: TURTLE, body: doc(""), as: BUREAU })).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/inbox/existing", {
          headers: TURTLE,
          body: doc(`${C}existing`),
          as: BUREAU,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PATCH", "/inbox/existing", {
          headers: N3,
          body: N3_INSERT(`${C}existing`),
          as: BUREAU,
        })
      ).status,
    ).toBe(403);
    expect((await req(pod, "DELETE", "/inbox/existing", { as: BUREAU })).status).toBe(403);
  });
});

describe("acl:Write and acl:Control", () => {
  const D = `${BASE}docs/`;
  async function docsPod() {
    const pod = newPod();
    await req(pod, "PUT", "/docs/a", { headers: TURTLE, body: doc(`${D}a`), as: OWNER });
    await req(pod, "PUT", "/docs/.acl", {
      headers: TURTLE,
      body: acl(`${D}.acl`, [
        ownerRule(D),
        { id: "write", accessTo: D, default: D, agents: [PARTNER], modes: ["Read", "Write"] },
        { id: "control", accessTo: D, default: D, agents: [BUREAU], modes: ["Control"] },
      ]),
      as: OWNER,
    });
    return pod;
  }

  test("Write (without Control) can create, replace and delete resources but cannot read or write any .acl", async () => {
    const pod = await docsPod();
    expect(
      (await req(pod, "PUT", "/docs/b", { headers: TURTLE, body: doc(`${D}b`), as: PARTNER }))
        .status,
    ).toBe(201);
    expect((await req(pod, "DELETE", "/docs/b", { as: PARTNER })).status).toBe(204);
    expect((await req(pod, "GET", "/docs/.acl", { as: PARTNER })).status).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/docs/.acl", {
          headers: TURTLE,
          body: acl(`${D}.acl`, [ownerRule(D)]),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/docs/a.acl", {
          headers: TURTLE,
          body: acl(`${D}a.acl`, [ownerRule(D)]),
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
  });

  test("Control (without Read/Write) can read and write .acl resources but not the resources, and can grant itself access", async () => {
    const pod = await docsPod();
    expect((await req(pod, "GET", "/docs/a", { as: BUREAU })).status).toBe(403);
    const aclRes = await req(pod, "GET", "/docs/.acl", { as: BUREAU });
    expect(aclRes.status).toBe(200);
    expect(header(aclRes, "wac-allow")).toBe('user="control",public=""');
    const selfGrant = await req(pod, "PUT", "/docs/a.acl", {
      headers: TURTLE,
      body: acl(`${D}a.acl`, [
        { id: "b", accessTo: `${D}a`, agents: [BUREAU], modes: ["Read", "Control"] },
      ]),
      as: BUREAU,
    });
    expect(selfGrant.status).toBe(201);
    expect((await req(pod, "GET", "/docs/a", { as: BUREAU })).status).toBe(200);
    // ...and the owner, absent from a.acl, is now locked out of a and a.acl.
    expect((await req(pod, "GET", "/docs/a", { as: OWNER })).status).toBe(403);
    expect((await req(pod, "DELETE", "/docs/a.acl", { as: OWNER })).status).toBe(403);
  });
});

describe("owner has no implicit super-user rights", () => {
  test("rewriting the root .acl without the owner locks the owner out of the whole pod, irrecoverably", async () => {
    const pod = newPod();
    const put = await req(pod, "PUT", "/.acl", {
      headers: TURTLE,
      body: acl(`${BASE}.acl`, [
        { id: "l", accessTo: BASE, default: BASE, agents: [PARTNER], modes: ["Read"] },
      ]),
      as: OWNER,
    });
    expect(put.status).toBe(204);
    expect((await req(pod, "GET", "/.acl", { as: OWNER })).status).toBe(403);
    expect(
      (
        await req(pod, "PUT", "/.acl", {
          headers: TURTLE,
          body: acl(`${BASE}.acl`, [ownerRule(BASE)]),
          as: OWNER,
        })
      ).status,
    ).toBe(403);
  });

  test("DELETE /.acl succeeds and leaves a pod nobody can access", async () => {
    const pod = newPod();
    expect((await req(pod, "DELETE", "/.acl", { as: OWNER })).status).toBe(204);
    expect((await req(pod, "GET", "/.acl", { as: OWNER })).status).toBe(403);
    expect(
      (await req(pod, "PUT", "/x", { headers: TURTLE, body: doc(`${BASE}x`), as: OWNER })).status,
    ).toBe(403);
  });
});

describe("ACL body validation", () => {
  test("invalid Turtle in an .acl is rejected with 400", async () => {
    const pod = newPod();
    expect(
      (await req(pod, "PUT", "/x.acl", { headers: TURTLE, body: "not turtle", as: OWNER })).status,
    ).toBe(400);
  });

  test("UPSTREAM GAP: a non-RDF .acl (text/plain) is accepted (201) and silently denies everyone, owner included", async () => {
    const pod = newPod();
    expect(
      (
        await req(pod, "PUT", "/x.acl", {
          headers: { "content-type": "text/plain" },
          body: "x",
          as: OWNER,
        })
      ).status,
    ).toBe(201);
    expect(
      (await req(pod, "PUT", "/x", { headers: TURTLE, body: doc(`${BASE}x`), as: OWNER })).status,
    ).toBe(403);
    expect((await req(pod, "GET", "/x.acl", { as: OWNER })).status).toBe(403);
  });

  test("a JSON-LD .acl is accepted and enforced", async () => {
    const pod = newPod();
    const jsonld = [
      {
        "@id": `${BASE}x.acl#o`,
        "@type": ["http://www.w3.org/ns/auth/acl#Authorization"],
        "http://www.w3.org/ns/auth/acl#agent": [{ "@id": OWNER }],
        "http://www.w3.org/ns/auth/acl#accessTo": [{ "@id": `${BASE}x` }],
        "http://www.w3.org/ns/auth/acl#mode": [
          { "@id": "http://www.w3.org/ns/auth/acl#Read" },
          { "@id": "http://www.w3.org/ns/auth/acl#Control" },
        ],
      },
    ];
    expect(
      (
        await req(pod, "PUT", "/x.acl", {
          headers: { "content-type": "application/ld+json" },
          body: JSON.stringify(jsonld),
          as: OWNER,
        })
      ).status,
    ).toBe(201);
    expect(header(await req(pod, "GET", "/x.acl", { as: OWNER }), "wac-allow")).toBe(
      'user="read control",public=""',
    );
    expect(
      (await req(pod, "PUT", "/x", { headers: TURTLE, body: doc(`${BASE}x`), as: OWNER })).status,
    ).toBe(403);
  });
});
