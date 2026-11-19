// AUTHORED-BY Claude Opus 5.5
/** WAC inheritance: acl:default flows to descendants; the nearest ACL wins outright (no merging). */
import { beforeAll, describe, expect, test } from "vitest";
import {
  acl,
  BASE,
  BUREAU,
  doc,
  initWasm,
  newPod,
  OWNER,
  ownerRule,
  PARTNER,
  req,
  TURTLE,
} from "./helpers.js";

beforeAll(initWasm);
const S = `${BASE}shared/`;

async function sharedPod(rule: { accessTo?: boolean; default?: boolean }) {
  const pod = newPod();
  for (const p of ["shared/doc", "shared/sub/deep"]) {
    await req(pod, "PUT", `/${p}`, { headers: TURTLE, body: doc(`${BASE}${p}`), as: OWNER });
  }
  const put = await req(pod, "PUT", "/shared/.acl", {
    headers: TURTLE,
    body: acl(`${S}.acl`, [
      ownerRule(S),
      {
        id: "partner",
        ...(rule.accessTo ? { accessTo: S } : {}),
        ...(rule.default ? { default: S } : {}),
        agents: [PARTNER],
        modes: ["Read"],
      },
    ]),
    as: OWNER,
  });
  expect(put.status).toBe(201);
  return pod;
}

describe("acl:default", () => {
  test("a container .acl rule with acl:default applies to children and grandchildren that have no .acl", async () => {
    const pod = await sharedPod({ default: true });
    expect((await req(pod, "GET", "/shared/doc", { as: PARTNER })).status).toBe(200);
    expect((await req(pod, "GET", "/shared/sub/deep", { as: PARTNER })).status).toBe(200);
    expect((await req(pod, "GET", "/shared/doc", { as: BUREAU })).status).toBe(403);
  });

  test("acl:default alone does NOT cover the container itself (listing needs acl:accessTo)", async () => {
    const pod = await sharedPod({ default: true });
    expect((await req(pod, "GET", "/shared/", { as: PARTNER })).status).toBe(403);
  });

  test("acl:accessTo alone covers the container only, not its members", async () => {
    const pod = await sharedPod({ accessTo: true });
    expect((await req(pod, "GET", "/shared/", { as: PARTNER })).status).toBe(200);
    expect((await req(pod, "GET", "/shared/doc", { as: PARTNER })).status).toBe(403);
  });

  test("the root .acl (provisioned with acl:default) governs every resource with no closer .acl", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/a/b/c/d", { headers: TURTLE, body: doc(`${BASE}a/b/c/d`), as: OWNER });
    expect((await req(pod, "GET", "/a/b/c/d", { as: OWNER })).status).toBe(200);
  });
});

describe("nearest ACL wins", () => {
  test("a resource .acl replaces the inherited rules entirely; deleting it restores inheritance", async () => {
    const pod = await sharedPod({ accessTo: true, default: true });
    await req(pod, "PUT", "/shared/doc.acl", {
      headers: TURTLE,
      body: acl(`${S}doc.acl`, [
        { id: "owner", accessTo: `${S}doc`, agents: [OWNER], modes: ["Read", "Write", "Control"] },
      ]),
      as: OWNER,
    });
    expect((await req(pod, "GET", "/shared/doc", { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "DELETE", "/shared/doc.acl", { as: OWNER })).status).toBe(204);
    expect((await req(pod, "GET", "/shared/doc", { as: PARTNER })).status).toBe(200);
  });

  test("a container .acl that omits the owner locks the owner out of that subtree even though the root .acl grants them", async () => {
    const pod = newPod();
    const C = `${BASE}locked/`;
    await req(pod, "PUT", "/locked/x", { headers: TURTLE, body: doc(`${C}x`), as: OWNER });
    await req(pod, "PUT", "/locked/.acl", {
      headers: TURTLE,
      body: acl(`${C}.acl`, [
        { id: "l", accessTo: C, default: C, agents: [PARTNER], modes: ["Read"] },
      ]),
      as: OWNER,
    });
    expect((await req(pod, "GET", "/locked/x", { as: OWNER })).status).toBe(403);
    expect((await req(pod, "GET", "/locked/x", { as: PARTNER })).status).toBe(200);
  });

  test("an absent .acl is 404 to a Control holder and 403 to others", async () => {
    const pod = await sharedPod({ accessTo: true, default: true });
    expect((await req(pod, "GET", "/shared/doc.acl", { as: OWNER })).status).toBe(404);
    expect((await req(pod, "GET", "/shared/doc.acl", { as: PARTNER })).status).toBe(403);
  });
});
