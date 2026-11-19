// AUTHORED-BY Claude Opus 5.5
/**
 * Host-mode bridge: identity comes from the browser-set `event.origin`, never from the message.
 * The bridge forwards to the real host exactly as the service worker would.
 */
import { beforeEach, describe, expect, test } from "vitest";
import {
  BRIDGE_REPLY,
  BRIDGE_REQUEST,
  hostModeIdentity,
  startBridge,
} from "../../src/bridge/index.js";
import type { PodHost } from "../../src/node.js";
import {
  AGENT_HEADER,
  type ControlReply,
  type ControlRequest,
  TOUR_HEADER,
} from "../../src/protocol.js";
import { makeHost, ORIGIN, put, recorder, url } from "../helpers.js";

type Listener = (event: { origin: string; source: unknown; data: unknown }) => void;

let host: PodHost;
let listener: Listener | undefined;
const target = {
  addEventListener: (_: "message", l: Listener) => {
    listener = l;
  },
  removeEventListener: () => {
    listener = undefined;
  },
};

beforeEach(async () => {
  host = makeHost({ identities: { wallet: "alex" } });
  await host.ready;
  await put(host.fetchAs("bank"), url("bank", "/documents/a.txt"), "bank only", "text/plain");
});

function bridge(controls: ControlRequest[] = []) {
  const seen: Request[] = [];
  const stop = startBridge({
    control: async (message) => {
      controls.push(message);
      return { ok: true };
    },
    fetch: async (request) => {
      seen.push(request.clone());
      // What the service worker does with a bridge request: identity from the header.
      return host.handle(request, { identity: request.headers.get(AGENT_HEADER) });
    },
    identify: hostModeIdentity("example", ["bank", "wallet", "payroll"]),
    podsOrigin: ORIGIN,
    target,
  });
  return { seen, stop };
}

function send(origin: string, message: ControlRequest): Promise<ControlReply> {
  return new Promise((resolve) => {
    const source = {
      postMessage(reply: { type: string; id: number; reply: ControlReply }, targetOrigin: string) {
        expect(reply.type).toBe(BRIDGE_REPLY);
        expect(targetOrigin).toBe(origin);
        resolve(reply.reply);
      },
    };
    listener?.({ data: { id: 7, message, type: BRIDGE_REQUEST }, origin, source });
  });
}

const get = (
  path: string,
  headers: Array<[string, string]> = [],
): Extract<ControlRequest, { type: "fetch" }> => ({
  body: null,
  headers,
  method: "GET",
  type: "fetch",
  url: `${ORIGIN}${path}`,
});

describe("host-mode bridge", () => {
  test("the caller's origin is its identity; a header in the message cannot change it", async () => {
    const { seen, stop } = bridge();
    const log = recorder(host);
    const asBank = await send("https://bank.example", get("/pods/bank/documents/a.txt"));
    expect(asBank.ok && asBank.response?.status).toBe(200);
    const spoof = await send(
      "https://payroll.example",
      get("/pods/bank/documents/a.txt", [
        [AGENT_HEADER, "bank"],
        [TOUR_HEADER, "demo:2"],
      ]),
    );
    expect(spoof.ok && spoof.response?.status).toBe(403);
    expect(seen[1]?.headers.get(AGENT_HEADER)).toBe("payroll");
    expect(seen[1]?.headers.get(TOUR_HEADER)).toBe("demo:2");
    expect(log.events.map((e) => [e.actor.org, e.status])).toEqual([
      ["bank", 200],
      ["payroll", 403],
    ]);
    // An app slug acting as another owner (the wallet acts as alex) maps through the identities.
    const wallet = await send("https://wallet.example", get("/pods/alex/profile/card"));
    expect(wallet.ok && wallet.response?.status).toBe(200);
    expect(log.events.at(-1)?.actor.org).toBe("alex");
    stop();
    expect(listener).toBeUndefined();
  });

  test("an unknown origin is anonymous and cannot send control messages", async () => {
    const controls: ControlRequest[] = [];
    const { seen } = bridge(controls);
    const anonymous = await send(
      "https://evil.test",
      get("/pods/bank/documents/a.txt", [[AGENT_HEADER, "bank"]]),
    );
    expect(anonymous.ok && anonymous.response?.status).toBe(401);
    expect(seen[0]?.headers.has(AGENT_HEADER)).toBe(false);
    const reset = await send("https://evil.test", { type: "reset" });
    expect(reset.ok).toBe(false);
    expect(controls).toEqual([]);
    const known = await send("https://bank.example", { type: "events" });
    expect(known.ok).toBe(true);
    expect(controls).toEqual([{ type: "events" }]);
  });

  test("only this origin's pods are forwarded", async () => {
    const { seen } = bridge();
    const other = await send("https://bank.example", {
      ...get("/pods/bank/x"),
      url: "https://elsewhere.test/pods/bank/x",
    });
    expect(other.ok).toBe(false);
    const notPods = await send("https://bank.example", get("/site.json"));
    expect(notPods.ok).toBe(false);
    expect(seen).toEqual([]);
  });

  test("hostModeIdentity accepts only https://<known slug>.<domain>", () => {
    const identify = hostModeIdentity("example.org", ["bank", "desk-x"]);
    expect(identify("https://bank.example.org")).toBe("bank");
    expect(identify("https://desk-x.example.org")).toBe("desk-x");
    expect(identify("http://bank.example.org")).toBeUndefined();
    expect(identify("https://bank.example.org.evil.test")).toBeUndefined();
    expect(identify("https://unknown.example.org")).toBeUndefined();
    expect(identify("https://a.bank.example.org")).toBeUndefined();
    expect(identify("null")).toBeUndefined();
  });
});
