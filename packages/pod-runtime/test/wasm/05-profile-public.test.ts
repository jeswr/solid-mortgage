// AUTHORED-BY Claude Opus 5.5
/** WebID profile documents, public-read resources, CORS. */
import { beforeAll, describe, expect, test } from "vitest";
import {
  acl,
  BASE,
  doc,
  FOAF,
  header,
  initWasm,
  newPod,
  OWNER,
  PARTNER,
  parse,
  RDF_TYPE,
  req,
  TURTLE,
} from "./helpers.js";

beforeAll(initWasm);
const P = `${BASE}profile/`;

async function profilePod() {
  const pod = newPod();
  await req(pod, "PUT", "/profile/card", {
    headers: TURTLE,
    body: doc(OWNER, `${FOAF}Person`),
    as: OWNER,
  });
  const put = await req(pod, "PUT", "/profile/card.acl", {
    headers: TURTLE,
    body: acl(`${P}card.acl`, [
      { id: "owner", accessTo: `${P}card`, agents: [OWNER], modes: ["Read", "Write", "Control"] },
      { id: "public", accessTo: `${P}card`, agentClass: ["foaf:Agent"], modes: ["Read"] },
    ]),
    as: OWNER,
  });
  expect(put.status).toBe(201);
  return pod;
}

describe("WebID profile with foaf:Agent read", () => {
  test('anonymous and any agent can read the profile; WAC-Allow reports public="read"', async () => {
    const pod = await profilePod();
    const anon = await req(pod, "GET", "/profile/card", { as: null });
    expect(anon.status).toBe(200);
    expect(header(anon, "wac-allow")).toBe('user="read",public="read"');
    expect(
      parse(anon.text, `${P}card`).some(
        (q) =>
          q.subject.value === OWNER &&
          q.predicate.value === RDF_TYPE &&
          q.object.value === `${FOAF}Person`,
      ),
    ).toBe(true);
    expect((await req(pod, "GET", "/profile/card", { as: PARTNER })).status).toBe(200);
    expect((await req(pod, "HEAD", "/profile/card", { as: null })).status).toBe(200);
  });

  test("the profile can be fetched as JSON-LD", async () => {
    const pod = await profilePod();
    const res = await req(pod, "GET", "/profile/card", {
      headers: { accept: "application/ld+json" },
      as: null,
    });
    expect(header(res, "content-type")).toBe("application/ld+json");
    expect(JSON.parse(res.text)[0]["@id"]).toBe(OWNER);
  });

  test("public read does not extend to writes, the .acl, or the container", async () => {
    const pod = await profilePod();
    expect(
      (await req(pod, "PUT", "/profile/card", { headers: TURTLE, body: doc(OWNER), as: null }))
        .status,
    ).toBe(401);
    expect(
      (await req(pod, "PUT", "/profile/card", { headers: TURTLE, body: doc(OWNER), as: PARTNER }))
        .status,
    ).toBe(403);
    expect((await req(pod, "GET", "/profile/card.acl", { as: null })).status).toBe(401);
    expect((await req(pod, "GET", "/profile/", { as: null })).status).toBe(401);
  });
});

describe("CORS is owned by the wasm router", () => {
  test("a GET with Origin echoes it with credentials and exposes the Solid headers", async () => {
    const pod = await profilePod();
    const res = await req(pod, "GET", "/profile/card", {
      headers: { origin: "https://partner.example" },
      as: null,
    });
    expect(header(res, "access-control-allow-origin")).toBe("https://partner.example");
    expect(header(res, "access-control-allow-credentials")).toBe("true");
    expect(header(res, "access-control-expose-headers")).toMatch(/WAC-Allow/);
    expect(header(res, "vary")).toBe("Accept, Origin");
  });

  test("a preflight is answered 204 without authentication and reflects requested headers (e.g. X-Demo-Agent)", async () => {
    const pod = await profilePod();
    const res = await req(pod, "OPTIONS", "/profile/card", {
      headers: {
        origin: "https://partner.example",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type,x-demo-agent",
      },
      as: null,
    });
    expect(res.status).toBe(204);
    expect(header(res, "access-control-allow-headers")).toBe("content-type,x-demo-agent");
    expect(header(res, "access-control-allow-methods")).toMatch(/PATCH/);
  });
});
