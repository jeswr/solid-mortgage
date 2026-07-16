/**
 * Mode-1 in-browser pod RPC tests (sm-23): the page-side client against the worker-side
 * host over REAL structured-clone message ports (`MessageChannel` — vitest cannot run a
 * real SharedWorker, so the worker BOUNDARY is what gets mocked, never the wasm), plus the
 * SharedWorker→dedicated fallback selection, worker-scope detection, the simulated-login
 * honesty gate, and the 503 trap propagation.
 */
import { SolidServer } from "@jeswr/solid-server/wasm";
import type { Persona } from "@mortgage/data-model";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  connectBrowserPod,
  createPodPortClient,
  openPodEndpoint,
  type PodMessagePortLike,
  SIMULATED_LOGIN_DISCLOSURE,
  type SimulatedLoginDisclosure,
} from "../src/browser-pod/index.js";
import {
  attachPodHostPort,
  type BrowserPodHost,
  createBrowserPod,
  type PodServerInstance,
  type PodWorkerScopeLike,
  personaPodOrigin,
  personaSeedFixtures,
  startBrowserPodHost,
} from "../src/browser-pod/worker.js";
import { buildAlexRivera, loadWasmBytes, NOTE_TURTLE } from "./browser-pod-helpers.js";

const TURTLE = "text/turtle";

let alex: Persona;
let wasmBytes: Uint8Array;

beforeAll(async () => {
  [alex, wasmBytes] = await Promise.all([buildAlexRivera(), loadWasmBytes()]);
}, 60_000);

function alexOptions(): Parameters<typeof createBrowserPod>[0] {
  return {
    podBaseUrl: personaPodOrigin(alex),
    ownerWebId: alex.webId,
    displayName: alex.displayName,
    seedFixtures: personaSeedFixtures(alex),
    wasm: wasmBytes,
  };
}

/** A host wired to one end of a real MessageChannel; caller closes both ports. */
function channelHost(host: BrowserPodHost): {
  clientPort: PodMessagePortLike;
  close(): void;
} {
  const channel = new MessageChannel();
  const detach = attachPodHostPort(host, channel.port1 as unknown as PodMessagePortLike);
  return {
    clientPort: channel.port2 as unknown as PodMessagePortLike,
    close(): void {
      detach();
      channel.port1.close();
      channel.port2.close();
    },
  };
}

describe("browser pod RPC — client over real message ports (real wasm host)", () => {
  let host: BrowserPodHost;
  let wires: ReturnType<typeof channelHost>;
  let client: ReturnType<typeof createPodPortClient>;

  beforeAll(async () => {
    host = createBrowserPod(alexOptions());
    wires = channelHost(host);
    client = createPodPortClient(wires.clientPort);
    await client.ready;
  }, 60_000);

  afterAll(() => {
    client.close();
    wires.close();
    host.dispose();
  });

  test("handshake reports the persona and the pod base", async () => {
    await expect(client.ready).resolves.toEqual({
      podBaseUrl: personaPodOrigin(alex),
      webId: alex.webId,
      displayName: "Alex Rivera",
    });
  });

  test("seeded read crosses the structured-clone boundary", async () => {
    const response = await client.podFetch("/mortgage/profile", { headers: { accept: TURTLE } });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Alex Rivera");
  });

  test("writable round-trip over RPC (request bodies transfer intact)", async () => {
    const put = await client.podFetch("/notes/rpc-demo", {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: NOTE_TURTLE,
    });
    expect(put.status).toBeGreaterThanOrEqual(200);
    expect(put.status).toBeLessThan(300);
    const get = await client.podFetch("/notes/rpc-demo");
    expect(get.status).toBe(200);
    expect(await get.text()).toContain("browser pod round-trip payload");
  });

  test("concurrent in-flight requests correlate by id", async () => {
    const paths = [
      "/mortgage/profile",
      "/mortgage/application",
      "/mortgage/decision",
      "/mortgage/credentials/income",
      "/mortgage/closing",
    ];
    const bodies = await Promise.all(
      paths.map(async (path) => {
        const response = await client.podFetch(path);
        expect(response.status, `GET ${path}`).toBe(200);
        return response.text();
      }),
    );
    // Each response is the one asked for (correlation, not just completion).
    expect(bodies[0]).toContain("Alex Rivera");
    expect(bodies[1]).toContain("1121 Maple Hollow Court");
    expect(bodies[3]).toContain("Ridgeline Analytics");
    expect(bodies[4]).toContain("Franklin County");
  });

  test("closing the client rejects pod IO with fetch network-error semantics", async () => {
    const channel = new MessageChannel();
    const detach = attachPodHostPort(host, channel.port1 as unknown as PodMessagePortLike);
    const short = createPodPortClient(channel.port2 as unknown as PodMessagePortLike);
    await short.ready;
    short.close();
    await expect(short.podFetch("/mortgage/profile")).rejects.toThrow(TypeError);
    detach();
    channel.port1.close();
  });
});

describe("browser pod RPC — 503 trap propagation", () => {
  test("a wasm trap surfaces as HTTP 503 and the next request succeeds", async () => {
    let trapNextRequest = false;
    const host = createBrowserPod({
      ...alexOptions(),
      createPod: (base, owner): PodServerInstance => {
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
    const wires = channelHost(host);
    const client = createPodPortClient(wires.clientPort);
    await client.ready;
    trapNextRequest = true;
    const trapped = await client.podFetch("/mortgage/profile");
    expect(trapped.status).toBe(503);
    const recovered = await client.podFetch("/mortgage/profile");
    expect(recovered.status).toBe(200);
    client.close();
    wires.close();
    host.dispose();
  }, 60_000);
});

describe("browser pod RPC — boot-error propagation", () => {
  test("ready and connectBrowserPod reject when the host cannot seed", async () => {
    const fixture = { path: "/mortgage/profile", body: "<> a <http://example.org/T> ." };
    const host = createBrowserPod({ ...alexOptions(), seedFixtures: [fixture, fixture] });
    host.ready.catch(() => {});
    const wires = channelHost(host);
    await expect(
      connectBrowserPod({
        endpoint: wires.clientPort,
        acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
      }),
    ).rejects.toThrow(/failed to boot/);
    wires.close();
    host.dispose();
  });
});

describe("connectBrowserPod — decision-0011 honesty gate + simulated session", () => {
  let host: BrowserPodHost;
  let wires: ReturnType<typeof channelHost>;

  beforeAll(async () => {
    host = createBrowserPod(alexOptions());
    wires = channelHost(host);
    await host.ready;
  }, 60_000);

  afterAll(() => {
    wires.close();
    host.dispose();
  });

  test("refuses to construct without the acknowledgement (runtime, not just types)", async () => {
    await expect(
      connectBrowserPod({
        endpoint: wires.clientPort,
        acknowledgeSimulated: "i promise" as SimulatedLoginDisclosure,
      }),
    ).rejects.toThrow(/decision-0011/);
  });

  test("binds the persona as a simulated session over the worker fetch", async () => {
    const pod = await connectBrowserPod({
      endpoint: wires.clientPort,
      acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
    });
    expect(pod.session.simulated).toBe(true);
    expect(pod.disclosure).toBe(SIMULATED_LOGIN_DISCLOSURE);
    expect(pod.session.webId).toBe(alex.webId);
    expect(pod.webId).toBe(alex.webId);
    expect(pod.displayName).toBe("Alex Rivera");

    // Pod-relative IO through the SESSION fetch (what app UI code uses).
    const response = await pod.session.authFetch("/mortgage/profile");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Alex Rivera");

    // The session stays a real session object: logout clears the bound WebID.
    await pod.session.logout();
    expect(pod.session.webId).toBeNull();
  });
});

describe("openPodEndpoint — SharedWorker preference and dedicated fallback", () => {
  const fakePort = {} as PodMessagePortLike;

  test("prefers SharedWorker when available", () => {
    const endpoint = openPodEndpoint({
      createSharedWorker: () => ({ port: fakePort }),
      createDedicatedWorker: () => {
        throw new Error("must not fall back when SharedWorker is available");
      },
      sharedWorkerAvailable: true,
    });
    expect(endpoint).toEqual({ port: fakePort, kind: "shared" });
  });

  test("falls back to a dedicated worker without SharedWorker", () => {
    const endpoint = openPodEndpoint({
      createSharedWorker: () => {
        throw new Error("must not construct a SharedWorker when unavailable");
      },
      createDedicatedWorker: () => fakePort,
      sharedWorkerAvailable: false,
    });
    expect(endpoint).toEqual({ port: fakePort, kind: "dedicated" });
  });

  test("throws when no viable transport exists", () => {
    expect(() =>
      openPodEndpoint({
        createSharedWorker: () => ({ port: fakePort }),
        sharedWorkerAvailable: false,
      }),
    ).toThrow(/fallback/);
    expect(() => openPodEndpoint({})).toThrow(/provide/);
  });
});

describe("startBrowserPodHost — worker-scope detection (scope mocked, wasm real)", () => {
  test("SharedWorker scope: every connecting port is served by the one pod", async () => {
    const scope: PodWorkerScopeLike = { onconnect: null };
    const host = startBrowserPodHost({ ...alexOptions(), scope });
    expect(scope.onconnect).toBeTypeOf("function");

    const first = new MessageChannel();
    const second = new MessageChannel();
    scope.onconnect?.({ ports: [first.port1 as unknown as PodMessagePortLike] });
    scope.onconnect?.({ ports: [second.port1 as unknown as PodMessagePortLike] });
    const clientA = createPodPortClient(first.port2 as unknown as PodMessagePortLike);
    const clientB = createPodPortClient(second.port2 as unknown as PodMessagePortLike);

    // Tab A writes; tab B reads it back — one pod per VISITOR, not per tab.
    const put = await clientA.podFetch("/notes/shared-tabs", {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: NOTE_TURTLE,
    });
    expect(put.status).toBeLessThan(300);
    const get = await clientB.podFetch("/notes/shared-tabs");
    expect(get.status).toBe(200);

    clientA.close();
    clientB.close();
    first.port1.close();
    second.port1.close();
    host.dispose();
  }, 60_000);

  test("dedicated-worker scope: the scope itself is the port", async () => {
    const channel = new MessageChannel();
    const host = startBrowserPodHost({
      ...alexOptions(),
      scope: channel.port1 as unknown as PodWorkerScopeLike,
    });
    const client = createPodPortClient(channel.port2 as unknown as PodMessagePortLike);
    const response = await client.podFetch("/mortgage/profile");
    expect(response.status).toBe(200);
    client.close();
    channel.port1.close();
    host.dispose();
  }, 60_000);

  test("refuses a scope that is neither", () => {
    expect(() => startBrowserPodHost({ ...alexOptions(), scope: {} })).toThrow(/scope/);
  });
});

describe("browser pod dispatch — worker-mock unit layer (no wasm)", () => {
  test("the dispatch pipeline works against a pure fake pod (createPod seam, no wasm init)", async () => {
    const seen: string[] = [];
    const host = createBrowserPod({
      podBaseUrl: "https://unit.pod.example",
      ownerWebId: "https://unit.pod.example/profile/card#me",
      createPod: (): PodServerInstance => ({
        handleRequest: (method, path) => {
          seen.push(`${method} ${path}`);
          const body = new TextEncoder().encode("ok");
          return Promise.resolve({
            status: 200,
            headers: ["content-type", "text/plain"],
            body,
          });
        },
      }),
    });
    const response = await host.podFetch("/anything?q=1");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(seen).toEqual(["GET /anything?q=1"]);
    host.dispose();
  });
});
