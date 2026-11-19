// AUTHORED-BY Claude Opus 5.5
/** What `authenticatedWebid` means: null/undefined = anonymous; any string = that agent, matched exactly. */
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

async function podWithPrivateDoc() {
  const pod = newPod();
  await req(pod, "PUT", "/private/doc", {
    headers: TURTLE,
    body: doc(`${BASE}private/doc`),
    as: OWNER,
  });
  return pod;
}

describe("anonymous", () => {
  test.each([
    ["undefined (argument omitted)", undefined],
    ["null", null],
  ])(
    "authenticatedWebid = %s is anonymous: 401 with WWW-Authenticate: DPoP",
    async (_label, as) => {
      const pod = await podWithPrivateDoc();
      const res = await req(pod, "GET", "/private/doc", { as });
      expect(res.status).toBe(401);
      expect(header(res, "www-authenticate")).toBe('DPoP error="invalid_token", scope="webid"');
    },
  );

  test("HAZARD: the empty string is NOT anonymous - it is an authenticated agent (403, and it matches acl:AuthenticatedAgent)", async () => {
    const pod = await podWithPrivateDoc();
    expect((await req(pod, "GET", "/private/doc", { as: "" })).status).toBe(403);
    const C = `${BASE}authed/`;
    await req(pod, "PUT", "/authed/x", { headers: TURTLE, body: doc(`${C}x`), as: OWNER });
    await req(pod, "PUT", "/authed/.acl", {
      headers: TURTLE,
      body: acl(`${C}.acl`, [
        ownerRule(C),
        {
          id: "auth",
          accessTo: C,
          default: C,
          agentClass: ["acl:AuthenticatedAgent"],
          modes: ["Read"],
        },
      ]),
      as: OWNER,
    });
    expect((await req(pod, "GET", "/authed/x", { as: "" })).status).toBe(200);
    expect((await req(pod, "GET", "/authed/x", { as: BUREAU })).status).toBe(200);
    expect((await req(pod, "GET", "/authed/x", { as: null })).status).toBe(401);
  });

  test("a non-URL string is accepted as an agent identity too (no validation)", async () => {
    const pod = await podWithPrivateDoc();
    expect((await req(pod, "GET", "/private/doc", { as: "alice" })).status).toBe(403);
  });
});

describe("denied status codes", () => {
  test("authenticated agent without access: 403 (body 'forbidden', no WWW-Authenticate)", async () => {
    const pod = await podWithPrivateDoc();
    const res = await req(pod, "GET", "/private/doc", { as: PARTNER });
    expect(res.status).toBe(403);
    expect(res.text.trim()).toBe("forbidden");
    expect(header(res, "www-authenticate")).toBeUndefined();
  });

  test("existence is not leaked: a missing resource is 401/403 to those who could not read it, 404 only to readers", async () => {
    const pod = await podWithPrivateDoc();
    expect((await req(pod, "GET", "/private/missing", { as: null })).status).toBe(401);
    expect((await req(pod, "GET", "/private/missing", { as: PARTNER })).status).toBe(403);
    expect((await req(pod, "GET", "/private/missing", { as: OWNER })).status).toBe(404);
  });
});

describe("acl:agent matching is exact string equality on the WebID IRI", () => {
  test.each([
    ["the exact WebID", OWNER, 200],
    ["without the fragment", `${BASE}profile/card`, 403],
    ["http instead of https", OWNER.replace("https:", "http:"), 403],
    ["with a trailing slash", `${OWNER}/`, 403],
    ["upper-cased host", OWNER.replace("pods.example", "PODS.EXAMPLE"), 403],
  ])("%s -> %i", async (_label, as, status) => {
    const pod = await podWithPrivateDoc();
    expect((await req(pod, "GET", "/private/doc", { as })).status).toBe(status);
  });
});

describe("acl:origin", () => {
  test("a rule with acl:agent + acl:origin needs a matching Origin request header; a rule without acl:origin ignores Origin", async () => {
    const pod = newPod();
    const C = `${BASE}origin/`;
    await req(pod, "PUT", "/origin/x", { headers: TURTLE, body: doc(`${C}x`), as: OWNER });
    await req(pod, "PUT", "/origin/.acl", {
      headers: TURTLE,
      body: acl(`${C}.acl`, [
        ownerRule(C),
        {
          id: "l",
          accessTo: C,
          default: C,
          agents: [PARTNER],
          origins: ["https://partner.example"],
          modes: ["Read"],
        },
      ]),
      as: OWNER,
    });
    expect((await req(pod, "GET", "/origin/x", { as: PARTNER })).status).toBe(403);
    expect(
      (
        await req(pod, "GET", "/origin/x", {
          headers: { origin: "https://partner.example" },
          as: PARTNER,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req(pod, "GET", "/origin/x", {
          headers: { origin: "https://evil.example" },
          as: PARTNER,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req(pod, "GET", "/origin/x", {
          headers: { origin: "https://evil.example" },
          as: OWNER,
        })
      ).status,
    ).toBe(200);
  });
});
