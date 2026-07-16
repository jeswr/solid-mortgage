/**
 * Mode-1 in-browser pod host tests (sm-23) — the REAL `--target web` wasm `SolidServer`
 * driven directly through the dispatch boundary: boot + persona-seeded reads, writable
 * round-trip (Mode 1 pods are writable, unlike the Mode-2a org pods), 413 body-cap parity,
 * the 503 trap-recycle contract with reseeding, and the origin fail-close.
 */
import { SolidServer } from "@jeswr/solid-server/wasm";
import type { Persona } from "@mortgage/data-model";
import { beforeAll, describe, expect, test } from "vitest";
import {
  type BrowserPodHost,
  createBrowserPod,
  MAX_POD_BODY_BYTES,
  type PodServerInstance,
  personaPodOrigin,
  personaSeedFixtures,
} from "../src/browser-pod/worker.js";
import { buildAlexRivera, loadWasmBytes, NOTE_TURTLE } from "./browser-pod-helpers.js";

const TURTLE = "text/turtle";

let alex: Persona;
let wasmBytes: Uint8Array;

beforeAll(async () => {
  [alex, wasmBytes] = await Promise.all([buildAlexRivera(), loadWasmBytes()]);
}, 60_000);

function alexHost(overrides: Partial<Parameters<typeof createBrowserPod>[0]> = {}): BrowserPodHost {
  return createBrowserPod({
    podBaseUrl: personaPodOrigin(alex),
    ownerWebId: alex.webId,
    displayName: alex.displayName,
    seedFixtures: personaSeedFixtures(alex),
    wasm: wasmBytes,
    ...overrides,
  });
}

describe("browser pod host — boot and persona seeding (real wasm)", () => {
  let host: BrowserPodHost;

  beforeAll(async () => {
    host = alexHost();
    await host.ready;
  }, 60_000);

  test("serves the seeded borrower profile resource", async () => {
    const response = await host.podFetch("/mortgage/profile", { headers: { accept: TURTLE } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(TURTLE);
    const body = await response.text();
    expect(body).toContain("Alex Rivera");
    expect(body).toContain(alex.webId);
  });

  test("serves the seeded WebID profile document at the WebID's own path", async () => {
    const response = await host.podFetch(new URL(alex.webId).href.replace(/#.*$/, ""));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Alex Rivera");
    expect(body).toContain("http://www.w3.org/ns/pim/space#");
  });

  test("seeds every persona resource (all nine mortgage documents)", async () => {
    for (const resource of alex.resources) {
      const response = await host.podFetch(resource.path);
      expect(response.status, `GET ${resource.path}`).toBe(200);
    }
  });

  test("pod is writable: PUT then GET round-trips (Mode 1, not the read-only Mode 2a)", async () => {
    const put = await host.podFetch("/notes/demo", {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: NOTE_TURTLE,
    });
    expect(put.status).toBeGreaterThanOrEqual(200);
    expect(put.status).toBeLessThan(300);
    const get = await host.podFetch("/notes/demo");
    expect(get.status).toBe(200);
    expect(await get.text()).toContain("browser pod round-trip payload");
  });

  test("answers 413 for bodies over the 2 MiB cap without crossing the wasm boundary", async () => {
    const response = await host.podFetch("/notes/too-big", {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: new Uint8Array(MAX_POD_BODY_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });

  test("serves concurrent requests (dispatch is serialized, callers are not)", async () => {
    const paths = ["/mortgage/profile", "/mortgage/application", "/mortgage/decision"];
    const responses = await Promise.all(paths.map((path) => host.podFetch(path)));
    for (const response of responses) expect(response.status).toBe(200);
  });

  test("fail-closed: refuses requests off the pod origin", async () => {
    await expect(host.podFetch("https://evil.example/mortgage/profile")).rejects.toThrow(TypeError);
  });
});

describe("browser pod host — trap-recycle contract (real wasm, injected trap)", () => {
  test("a trapped request answers 503; the next is served by a fresh, reseeded pod", async () => {
    let created = 0;
    let trapNextRequest = false;
    const host = alexHost({
      // Wrap the REAL SolidServer: the trap itself is injected (a genuine
      // WebAssembly.RuntimeError, the exact class a Rust panic surfaces as), everything
      // else — provisioning, seeding, the recycled instance — is the real wasm.
      createPod: (base, owner): PodServerInstance => {
        created += 1;
        const real = new SolidServer(base, owner);
        return {
          handleRequest(method, path, headers, body, webid) {
            if (trapNextRequest) {
              trapNextRequest = false;
              return Promise.reject(new WebAssembly.RuntimeError("injected trap (test)"));
            }
            return real.handleRequest(method, path, headers, body, webid);
          },
          free: () => real.free(),
        };
      },
    });
    await host.ready;
    expect(created).toBe(1);

    // A visitor write, then a trap: the recycled pod must be RESEEDED (state wiped).
    await host.podFetch("/notes/pre-trap", {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: NOTE_TURTLE,
    });
    trapNextRequest = true;
    const trapped = await host.podFetch("/mortgage/profile");
    expect(trapped.status).toBe(503);
    expect(await trapped.text()).toContain("wasm trap");

    const recovered = await host.podFetch("/mortgage/profile");
    expect(recovered.status).toBe(200);
    expect(await recovered.text()).toContain("Alex Rivera");
    expect(created).toBe(2);
    // Reseeded from fixtures — the pre-trap visitor write is honestly gone.
    const wiped = await host.podFetch("/notes/pre-trap");
    expect(wiped.status).toBe(404);
  }, 60_000);
});

describe("browser pod host — boot failure", () => {
  test("ready and dispatch reject when seeding fails (duplicate fixture path)", async () => {
    const fixture = { path: "/mortgage/profile", body: "<> a <http://example.org/T> ." };
    const host = alexHost({ seedFixtures: [fixture, fixture] });
    await expect(host.ready).rejects.toThrow(/already exists/);
    await expect(host.podFetch("/mortgage/profile")).rejects.toThrow(/already exists/);
  });
});
