// AUTHORED-BY Claude Opus 5.5
/** How to create a pod and dispatch a request; base-URL and path semantics; basic LDP. */
import { readFile } from "node:fs/promises";
import init, { initSync, SolidServer } from "@sparq-org/solid-server/wasm";
import { beforeAll, describe, expect, test } from "vitest";
import {
  ACL,
  BASE,
  contains,
  doc,
  header,
  initWasm,
  newPod,
  OWNER,
  parse,
  req,
  TURTLE,
  wasmPath,
} from "./helpers.js";

beforeAll(initWasm);

describe("init", () => {
  test("init is idempotent per realm: later init/initSync calls return the cached exports and live pods survive", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/x", { headers: TURTLE, body: doc(`${BASE}x`), as: OWNER });
    const bytes = await readFile(wasmPath());
    const a = await init({ module_or_path: bytes });
    const b = initSync({ module: bytes });
    expect(a).toBe(b);
    expect((await req(pod, "GET", "/x", { as: OWNER })).status).toBe(200);
  });
});

describe("construction and base URL", () => {
  test("new SolidServer(base, owner) provisions only the root .acl (absolute IRIs, owner R/W/C, accessTo + default)", async () => {
    const pod = newPod();
    const res = await req(pod, "GET", "/.acl", { as: OWNER });
    expect(res.status).toBe(200);
    const quads = parse(res.text, `${BASE}.acl`);
    const modes = quads
      .filter((q) => q.predicate.value === `${ACL}mode`)
      .map((q) => q.object.value)
      .sort();
    expect(modes).toEqual([`${ACL}Control`, `${ACL}Read`, `${ACL}Write`]);
    expect(quads.find((q) => q.predicate.value === `${ACL}agent`)?.object.value).toBe(OWNER);
    expect(quads.find((q) => q.predicate.value === `${ACL}accessTo`)?.object.value).toBe(BASE);
    expect(quads.find((q) => q.predicate.value === `${ACL}default`)?.object.value).toBe(BASE);
  });

  test("the root container itself does not exist until something is written (GET / is 404)", async () => {
    const pod = newPod();
    expect((await req(pod, "GET", "/", { as: OWNER })).status).toBe(404);
    await req(pod, "PUT", "/a/b/c", { headers: TURTLE, body: doc(`${BASE}a/b/c`), as: OWNER });
    const root = await req(pod, "GET", "/", { as: OWNER });
    expect(root.status).toBe(200);
    expect(contains(root, BASE)).toEqual([`${BASE}a/`]);
    expect(contains(await req(pod, "GET", "/a/", { as: OWNER }), `${BASE}a/`)).toEqual([
      `${BASE}a/b/`,
    ]);
  });

  test("a base URL with a path is accepted; the request path is RELATIVE to it (host must strip /pods/<slug>)", async () => {
    const pod = newPod("https://pods.example/pods/alex/", OWNER);
    const put = await req(pod, "PUT", "/notes/n1", {
      headers: TURTLE,
      body: doc(`${BASE}notes/n1`),
      as: OWNER,
    });
    expect(put.status).toBe(201);
    expect(header(put, "location")).toBe("https://pods.example/pods/alex/notes/n1");
    // The full path is NOT understood: it is treated as /pods/alex/pods/alex/notes/n1.
    expect((await req(pod, "GET", "/pods/alex/notes/n1", { as: OWNER })).status).toBe(404);
    // Trailing slash on the base is optional.
    const noSlash = newPod("https://pods.example/pods/alex", OWNER);
    expect(
      parse((await req(noSlash, "GET", "/.acl", { as: OWNER })).text, BASE).some(
        (q) => q.object.value === BASE,
      ),
    ).toBe(true);
  });

  test("handleRequest rejects (plain Error, not a trap) on an absolute-form or empty path and odd header arrays; the pod keeps working", async () => {
    const pod = newPod();
    await expect(req(pod, "GET", `${BASE}x`, { as: OWNER })).rejects.toThrow(/origin-form/);
    await expect(req(pod, "GET", "", { as: OWNER })).rejects.toThrow(/empty string/);
    await expect(pod.handleRequest("GET", "/", ["odd"], new Uint8Array(), OWNER)).rejects.toThrow(
      /name\/value pairs/,
    );
    expect((await req(pod, "GET", "/.acl", { as: OWNER })).status).toBe(200);
    expect((await req(pod, "GET", "/../../etc", { as: OWNER })).status).toBe(400);
  });
});

describe("LDP basics", () => {
  test("POST ignores an exact Slug: the server appends a random suffix; Location is absolute", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/inbox/seed", {
      headers: TURTLE,
      body: doc(`${BASE}inbox/seed`),
      as: OWNER,
    });
    const res = await req(pod, "POST", "/inbox/", {
      headers: { ...TURTLE, slug: "msg" },
      body: doc(""),
      as: OWNER,
    });
    expect(res.status).toBe(201);
    expect(header(res, "location")).toMatch(
      /^https:\/\/pods\.example\/pods\/alex\/inbox\/msg-[0-9a-f]{24}$/,
    );
    const noSlug = await req(pod, "POST", "/inbox/", {
      headers: { "content-type": "text/plain" },
      body: "hi",
      as: OWNER,
    });
    expect(header(noSlug, "location")).toMatch(/\/inbox\/resource-[0-9a-f]{24}$/);
  });

  test("responses carry flat, repeated headers: Link per type, acl link, WAC-Allow, Accept-Patch/Post", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/c/x", { headers: TURTLE, body: doc(`${BASE}c/x`), as: OWNER });
    const res = await req(pod, "GET", "/c/", { as: OWNER });
    expect(res.headers.get("link")).toEqual(
      expect.arrayContaining([
        '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        `<${BASE}c/.acl>; rel="acl"`,
      ]),
    );
    expect(header(res, "wac-allow")).toBe('user="read write control",public=""');
    expect(header(res, "accept-patch")).toBe("text/n3, application/sparql-update");
    expect(header(res, "accept-post")).toBe("text/turtle, application/ld+json");
  });

  test("UPSTREAM GAP: pim:Storage is advertised on every first-level container, never on the pod root", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/profile/card", { headers: TURTLE, body: doc(OWNER), as: OWNER });
    const storage = '<http://www.w3.org/ns/pim/space#Storage>; rel="type"';
    expect((await req(pod, "GET", "/", { as: OWNER })).headers.get("link")).not.toContain(storage);
    expect((await req(pod, "GET", "/profile/", { as: OWNER })).headers.get("link")).toContain(
      storage,
    );
  });

  test("content: Turtle and JSON-LD are converted both ways; binary bodies round-trip byte-exact; bad Turtle and missing content-type are 400", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/j", {
      headers: { "content-type": "application/ld+json" },
      body: JSON.stringify({ "@id": `${BASE}j`, "@type": "http://example.org/T" }),
      as: OWNER,
    });
    const asTurtle = await req(pod, "GET", "/j", { headers: { accept: "text/turtle" }, as: OWNER });
    expect(header(asTurtle, "content-type")).toBe("text/turtle");
    expect(parse(asTurtle.text, BASE)[0]?.object.value).toBe("http://example.org/T");
    const bin = new Uint8Array([137, 80, 78, 71, 0, 255]);
    await req(pod, "PUT", "/img.png", {
      headers: { "content-type": "image/png" },
      body: bin,
      as: OWNER,
    });
    const got = await req(pod, "GET", "/img.png", { as: OWNER });
    expect(header(got, "content-type")).toBe("image/png");
    expect(Array.from(got.bytes)).toEqual(Array.from(bin));
    expect(
      (await req(pod, "PUT", "/bad", { headers: TURTLE, body: "not turtle", as: OWNER })).status,
    ).toBe(400);
    expect((await req(pod, "PUT", "/noct", { body: "x", as: OWNER })).status).toBe(400);
  });

  test("conditional requests and container deletes behave as LDP expects (412, 304, 409)", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/c/x", { headers: TURTLE, body: doc(`${BASE}c/x`), as: OWNER });
    expect(
      (
        await req(pod, "PUT", "/c/x", {
          headers: { ...TURTLE, "if-none-match": "*" },
          body: doc(`${BASE}c/x`),
          as: OWNER,
        })
      ).status,
    ).toBe(412);
    const etag = header(await req(pod, "GET", "/c/x", { as: OWNER }), "etag") ?? "";
    expect(
      (await req(pod, "GET", "/c/x", { headers: { "if-none-match": etag }, as: OWNER })).status,
    ).toBe(304);
    expect((await req(pod, "DELETE", "/c/", { as: OWNER })).status).toBe(409);
  });

  test("Last-Modified comes from the real clock (Date.now); there is no Date header and no way to inject demo time", async () => {
    const pod = newPod();
    await req(pod, "PUT", "/x", { headers: TURTLE, body: doc(`${BASE}x`), as: OWNER });
    const res = await req(pod, "GET", "/x", { as: OWNER });
    const lm = Date.parse(header(res, "last-modified") ?? "");
    expect(Math.abs(lm - Date.now())).toBeLessThan(5_000);
    expect(header(res, "date")).toBeUndefined();
  });

  test("overlapping handleRequest calls on one instance are safe and applied in call order (no aliasing error)", async () => {
    const pod = newPod();
    const calls = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0
        ? req(pod, "PUT", `/conc/r${i >> 1}`, {
            headers: TURTLE,
            body: doc(`${BASE}conc/r${i >> 1}`),
            as: OWNER,
          })
        : req(pod, "GET", `/conc/r${i >> 1}`, { as: OWNER }),
    );
    const statuses = (await Promise.all(calls)).map((r) => r.status);
    expect(statuses).toEqual(Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 201 : 200)));
  });
});

test("SolidServer is the same class from the root export (Node only) and ./wasm", async () => {
  const root = await import("@sparq-org/solid-server");
  expect(root.SolidServer).toBe(SolidServer);
});
