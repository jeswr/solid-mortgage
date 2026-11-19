// AUTHORED-BY Claude Opus 5.5
/**
 * Host mode end to end in Node: app origins → bridge (identity from event.origin) → the real
 * service-worker role (identity honoured only from the bridge client) → the real runtime and wasm.
 * Owners and identities are fixed at build time; nothing an app sends can change them.
 */
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import { beforeEach, describe, expect, test } from "vitest";
import {
  BRIDGE_REPLY,
  BRIDGE_REQUEST,
  hostModeIdentity,
  startBridge,
} from "../../src/bridge/index.js";
import {
  AGENT_HEADER,
  BRIDGE_PATH,
  type ControlReply,
  type ControlRequest,
} from "../../src/protocol.js";
import { ORIGIN, OWNERS } from "../helpers.js";
import { type FakeClient, type FakeServiceWorker, fakeServiceWorker } from "./fake-sw.js";

const BRIDGE: FakeClient = { id: "bridge", url: `${ORIGIN}${BRIDGE_PATH}` };
const OTHER_PAGE: FakeClient = { id: "other", url: `${ORIGIN}/somewhere/` };
/** Build-time config: app slug → owner. `wallet` acts as alex. */
const FIXED = {
  identities: { bank: "bank", bureau: "bureau", payroll: "payroll", wallet: "alex" } as const,
  owners: OWNERS,
};

type Listener = (event: { origin: string; source: unknown; data: unknown }) => void;
let worker: FakeServiceWorker;
let listener: Listener | undefined;

beforeEach(() => {
  worker = fakeServiceWorker(true, [BRIDGE, OTHER_PAGE], { fixedConfig: FIXED });
  startBridge({
    control: (message) => worker.post(message, BRIDGE),
    fetch: (request) => worker.fetch(request, BRIDGE),
    identify: hostModeIdentity("example", Object.keys(FIXED.identities)),
    podsOrigin: ORIGIN,
    target: {
      addEventListener: (_: "message", l: Listener) => {
        listener = l;
      },
      removeEventListener: () => undefined,
    },
  });
});

let nextId = 1;
function fromApp(slug: string, message: ControlRequest): Promise<ControlReply> {
  const origin = `https://${slug}.example`;
  return new Promise((resolve) => {
    const source = {
      postMessage(reply: { type: string; reply: ControlReply }, targetOrigin: string) {
        expect(reply.type).toBe(BRIDGE_REPLY);
        expect(targetOrigin).toBe(origin);
        resolve(reply.reply);
      },
    };
    listener?.({ data: { id: nextId++, message, type: BRIDGE_REQUEST }, origin, source });
  });
}

const request = (
  method: string,
  path: string,
  body?: string,
  headers: Array<[string, string]> = [],
): ControlRequest => ({
  body: body === undefined ? null : (new TextEncoder().encode(body).buffer as ArrayBuffer),
  headers: body === undefined ? headers : [["content-type", "text/plain"], ...headers],
  method,
  type: "fetch",
  url: `${ORIGIN}${path}`,
});
const status = (reply: ControlReply) => (reply.ok ? reply.response?.status : reply.error);

async function start(): Promise<void> {
  const hello = await fromApp("bank", { identities: {}, owners: ["bank"], type: "hello" });
  expect(hello.ok).toBe(true);
  expect(
    status(await fromApp("wallet", request("PUT", "/pods/alex/private/x.txt", "alex only"))),
  ).toBe(201);
}

describe("host mode", () => {
  test("a hello from an app cannot remap identities or owners", async () => {
    await start();
    const remap = await fromApp("payroll", {
      identities: { payroll: "alex" },
      owners: ["payroll"],
      type: "hello",
    });
    expect(remap.ok).toBe(true);
    if (remap.ok) expect(remap.hello?.info.owners).toEqual(OWNERS);
    // payroll is still payroll: alex's resource stays refused.
    expect(status(await fromApp("payroll", request("GET", "/pods/alex/private/x.txt")))).toBe(403);
    expect(status(await fromApp("wallet", request("GET", "/pods/alex/private/x.txt")))).toBe(200);
    // Every pod still exists.
    expect(status(await fromApp("bureau", request("GET", "/pods/bureau/profile/card")))).toBe(200);
  });

  test("a note's org is the calling app, whatever the note says", async () => {
    await start();
    const reply = await fromApp("payroll", {
      note: { kind: "verified", org: "bank" as OrgSlug, text: "looks official" },
      type: "note",
    });
    expect(reply.ok && reply.entry?.source === "app" && reply.entry.org).toBe("payroll");
  });

  test("the service worker honours the identity header only from the bridge page", async () => {
    await start();
    const asAlex = () =>
      new Request(`${ORIGIN}/pods/alex/private/x.txt`, { headers: { [AGENT_HEADER]: "wallet" } });
    expect((await worker.fetch(asAlex(), BRIDGE)).status).toBe(200);
    expect((await worker.fetch(asAlex(), OTHER_PAGE)).status).toBe(401);
    expect((await worker.fetch(asAlex())).status).toBe(401); // no client (clientId "")
  });

  test("control messages are accepted only from the bridge page", async () => {
    await start();
    const refused = await worker.post({ type: "reset" }, OTHER_PAGE);
    expect(refused.ok).toBe(false);
    const hello = await worker.post(
      { identities: { bank: "alex" }, owners: ["bank"], type: "hello" },
      OTHER_PAGE,
    );
    expect(hello.ok).toBe(false);
    expect(status(await fromApp("bank", request("GET", "/pods/alex/private/x.txt")))).toBe(403);
  });

  test("prototype names are not identities", async () => {
    await start();
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"]) {
      const reply = await worker.fetch(
        new Request(`${ORIGIN}/pods/alex/private/x.txt`, { headers: { [AGENT_HEADER]: name } }),
        BRIDGE,
      );
      expect(reply.status, name).toBe(401);
    }
  });
});
