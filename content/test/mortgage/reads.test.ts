// AUTHORED-BY Claude Opus 5.5
import { MORT } from "@mortgage/data-model";
import { TermWrapper } from "@rdfjs/wrapper";
import { describe, expect, it } from "vitest";
import { beatsBefore, SKIPPED_IN_CATCH_UP, stepsBefore } from "../../mortgage/catch-up.js";
import {
  isOk,
  listMembers,
  loadWrapped,
  oks,
  refusalOf,
  typedSubject,
} from "../../mortgage/reads.js";
import { PodRequestError, readDataset } from "../../mortgage/world.js";

const BASE = "http://127.0.0.1:4000/pods/lender/";

/** A fetch that answers from a map of Turtle documents; anything else is `status`. */
function fakeFetch(documents: Record<string, string>, status = 404): typeof fetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = documents[url];
    if (body === undefined) return new Response(null, { status });
    return new Response(body, { headers: { "content-type": "text/turtle" }, status: 200 });
  };
}

class Node extends TermWrapper {}

describe("refusalOf", () => {
  it("stands for a 401 or 403 pod request error only", () => {
    expect(refusalOf(new PodRequestError("GET", "u", 403))).toEqual({
      method: "GET",
      status: 403,
      url: "u",
    });
    expect(refusalOf(new PodRequestError("GET", "u", 401))?.status).toBe(401);
    expect(refusalOf(new PodRequestError("GET", "u", 404))).toBeUndefined();
    expect(refusalOf({ method: "GET", status: 403, url: "u" })).toBeUndefined();
  });
});

describe("loadWrapped and listMembers", () => {
  const docs = {
    [`${BASE}loans/`]: `@prefix ldp: <http://www.w3.org/ns/ldp#> .
<> ldp:contains <b>, <a> .`,
    [`${BASE}loans/a`]: `<#it> a <${MORT.LoanEstimate}> .`,
  };

  it("wraps the document root, or the given IRI", async () => {
    const loaded = await loadWrapped(fakeFetch(docs), `${BASE}loans/a`, Node, `${BASE}loans/a#it`);
    expect(isOk(loaded)).toBe(true);
    if (!isOk(loaded)) return;
    expect(loaded.value.value).toBe(`${BASE}loans/a#it`);
    expect(loaded.url).toBe(`${BASE}loans/a`);
  });

  it("lists a container's members, sorted", async () => {
    const listed = await listMembers(fakeFetch(docs), `${BASE}loans/`);
    expect(listed).toEqual({
      state: "ok",
      url: `${BASE}loans/`,
      value: [`${BASE}loans/a`, `${BASE}loans/b`],
    });
  });

  it("turns failures into results", async () => {
    expect(await loadWrapped(fakeFetch({}), `${BASE}x`, Node)).toEqual({
      state: "missing",
      url: `${BASE}x`,
    });
    expect(await loadWrapped(fakeFetch({}, 403), `${BASE}x`, Node)).toEqual({
      state: "refused",
      status: 403,
      url: `${BASE}x`,
    });
    expect(await listMembers(fakeFetch({}, 500), `${BASE}x/`)).toEqual({
      message: "the pod answered 500",
      state: "error",
      url: `${BASE}x/`,
    });
    const broken: typeof fetch = async () => {
      throw new Error("offline");
    };
    expect(await loadWrapped(broken, `${BASE}x`, Node)).toEqual({
      message: "offline",
      state: "error",
      url: `${BASE}x`,
    });
  });

  it("keeps only the loaded values", async () => {
    const fetcher = fakeFetch(docs);
    const all = await Promise.all([
      loadWrapped(fetcher, `${BASE}loans/a`, Node),
      loadWrapped(fetcher, `${BASE}missing`, Node),
    ]);
    expect(oks(all).map((entry) => entry.url)).toEqual([`${BASE}loans/a`]);
  });
});

describe("typedSubject", () => {
  it("finds the named node of a class, not the document URL", async () => {
    const url = `${BASE}credential`;
    const dataset = await readDataset(
      fakeFetch({
        [url]: `<https://issuer.example/cred/1> a <https://www.w3.org/2018/credentials#VerifiableCredential> .`,
      }),
      url,
    );
    expect(typedSubject(dataset, "https://www.w3.org/2018/credentials#VerifiableCredential")).toBe(
      "https://issuer.example/cred/1",
    );
    expect(typedSubject(dataset, "https://www.w3.org/2018/credentials#Other")).toBeUndefined();
  });
});

describe("catch-up order", () => {
  it("runs the beats before a step, without the two proof beats", async () => {
    const beats = await beatsBefore("apply-submit");
    const steps = beats.map((beat) => beat.step);
    expect(steps[0]).toBe("welcome");
    expect(steps).not.toContain("wallet-prove");
    expect(steps).not.toContain("lender-b-received");
    expect(steps).not.toContain("apply-submit");
    expect(steps.at(-1)).toBe("apply-consent");
    await expect(beatsBefore("no-such-step")).rejects.toThrow("no beat belongs to step");
  });

  it("counts the tour steps a catch-up runs", () => {
    expect(stepsBefore("welcome")).toBe(0);
    expect(stepsBefore("bank-share")).toBe(2);
    expect(SKIPPED_IN_CATCH_UP.has("wallet-prove")).toBe(true);
    expect(stepsBefore("apply-consent")).toBe(4);
  });
});
