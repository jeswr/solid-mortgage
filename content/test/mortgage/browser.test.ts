// AUTHORED-BY Claude Opus 5.5
/**
 * The browser world, the browser seed and answering a message once, on the real
 * `@sparq-org/solid-server` wasm. The only stand-in is the transport: a request that declares an
 * owner in the path-mode identity header goes to the test host as that owner, which is what the
 * pod runtime's service worker does. The server decides every status.
 */

import { MORT } from "@mortgage/data-model";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createBrowserWorld,
  createSigningKey,
  currentTourContext,
  type KeyStore,
  memoryKeyStore,
  mortgageSeed,
  PATH_MODE_HEADERS,
  trackTourContext,
} from "../../mortgage/browser.js";
import { DAY } from "../../mortgage/facts.js";
import { approveRequest } from "../../mortgage/grants.js";
import { checkAtSource } from "../../mortgage/issuers.js";
import {
  agents,
  CREDIT_AUTHORISATION,
  completeApplicationAccess,
  requestApplicationAccess,
  shareEmployment,
} from "../../mortgage/journey.js";
import {
  answerOnce,
  answerOrAwait,
  awaitReply,
  claimMessage,
  deliver,
  handledUrl,
} from "../../mortgage/messages.js";
import { applySeed, type SeedRequest } from "../../mortgage/seed.js";
import { podUrl, statusOf, type World } from "../../mortgage/world.js";
import { POD_ORIGIN, TestHost } from "./host.js";

let host: TestHost;
let keys: KeyStore;

/** What the service worker does with the identity header, over the test host. */
const transport: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const owner = request.headers.get(PATH_MODE_HEADERS.agent) as PodOwner | null;
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    if (!name.startsWith("x-demo-")) headers[name] = value;
  });
  return host.fetchAs(owner)(request.url, {
    headers,
    method: request.method,
    ...(body === undefined ? {} : { body }),
  });
};

function browserWorld(actsAs: PodOwner, day: number = DAY.credentials): World {
  return createBrowserWorld({
    actsAs,
    day,
    dayOne: host.calendar.dayOne,
    fetch: transport,
    keys,
    note: () => undefined,
    podFetch: host.fetchAs(actsAs),
    podOrigin: POD_ORIGIN,
  });
}

beforeEach(async () => {
  host = await TestHost.create();
  keys = memoryKeyStore();
  const seed = await mortgageSeed({ dayOne: host.calendar.dayOne, keys })({ origin: POD_ORIGIN });
  await applySeed(host.world, seed as SeedRequest[]);
}, 120_000);

describe("the browser seed", () => {
  test("is the plain seed plus first run, every request a PUT into the owner's own pod", async () => {
    const seed = await mortgageSeed({ dayOne: host.calendar.dayOne, keys: memoryKeyStore() })({
      origin: POD_ORIGIN,
    });
    expect(seed.every((request) => request.method === "PUT")).toBe(true);
    const paths = seed.map((request) => `${request.pod}${request.path}`);
    for (const issuer of ["payroll", "bank", "bureau", "appraisal", "title", "insurer"]) {
      expect(paths).toContain(`${issuer}/status/list`);
    }
    expect(paths).toContain("alex/identity/identity-credential");
    expect(paths).toContain("bank/issued/identity");
  });

  test("seeded pods verify the identity credential against the key kept in the store", async () => {
    const world = browserWorld("lender");
    const check = await checkAtSource(
      world,
      "alex",
      podUrl(world, "alex", "identity/identity-credential"),
      "identity-credential",
      ["bank"],
      "12:00",
    );
    expect(check.result.verified).toBe(true);
  });
});

describe("the browser world", () => {
  test("a page acting as payroll runs step 2 with Alex's approval in line", async () => {
    await shareEmployment(browserWorld("payroll"));
    const url = podUrl(host.world, "alex", "credentials/employment-income");
    const check = await checkAtSource(
      browserWorld("lender"),
      "alex",
      url,
      "employment-income-credential",
      ["payroll"],
    );
    expect(check.result.verified).toBe(true);
    const approval = host.events.find((event) => event.kind === "grant");
    expect(approval?.actor).toBe("alex");
    // The payroll slot stays write-only for the page that filled it.
    expect(await statusOf(browserWorld("payroll").fetchAs("payroll"), url)).toBe(403);
  });

  test("cross-owner requests carry the identity, the back-office mark and the tour tag", async () => {
    const seen: Headers[] = [];
    const set = trackTourContext(() => undefined);
    set({ demo: "mortgage", step: "payroll-share" });
    const world = createBrowserWorld({
      actsAs: "payroll",
      fetch: async (input, init) => {
        seen.push(new Request(input, init).headers);
        return new Response(null, { status: 204 });
      },
      keys,
      podFetch: async () => new Response(null, { status: 204 }),
      podOrigin: POD_ORIGIN,
    });
    await world.fetchAs("alex")(podUrl(world, "alex", "inbox/"), {
      headers: { "x-demo-agent": "lender" },
    });
    set(null);
    expect(currentTourContext()).toBeNull();
    expect(seen[0]?.get("x-demo-agent")).toBe("alex");
    expect(seen[0]?.get("x-demo-via-agent")).toBe("1");
    expect(seen[0]?.get("x-demo-tour")).toBe("mortgage:payroll-share");
  });

  test("keys are created once per owner and the private key cannot be exported", async () => {
    const world = browserWorld("payroll");
    const [a, b] = await Promise.all([world.keyFor("payroll"), world.keyFor("payroll")]);
    expect(a).toBe(b);
    expect(a.privateKey.extractable).toBe(false);
    const store = memoryKeyStore();
    const first = await store.add("bank", await createSigningKey("urn:a"));
    expect(await store.add("bank", await createSigningKey("urn:b"))).toBe(first);
  });
});

describe("a message is answered once", () => {
  async function serviceOrder(world: World): Promise<string> {
    return deliver(world, {
      from: "lender",
      kind: MORT.MessageKind_ServiceOrder,
      summary: "Appraisal ordered for 14 Larch Lane",
      time: "09:30",
      to: "appraisal",
    });
  }

  const requestsInAlexInbox = () =>
    host.events.filter(
      (event) =>
        event.pod === "alex" &&
        event.method === "POST" &&
        event.path === "/inbox/" &&
        event.status === 201,
    );

  test("the second claim of a message is refused", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    expect(await claimMessage(world, "appraisal", message, "09:31")).toBe(true);
    expect(await claimMessage(world, "appraisal", message, "09:32")).toBe(false);
    expect(handledUrl(world, "appraisal", message)).toMatch(/\/pods\/appraisal\/handled\//);
  });

  test("an agent run twice in sequence answers once", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    const first = await agents.requestFromOrder(world, "appraisal", message);
    const second = await agents.requestFromOrder(world, "appraisal", message);
    expect(first).toMatch(/\/pods\/alex\/inbox\//);
    expect(second).toBeUndefined();
    expect(requestsInAlexInbox()).toHaveLength(1);
  });

  test("an agent run twice at once (in line and from the inbox) answers once", async () => {
    const page = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(page);
    const results = await Promise.all([
      agents.requestFromOrder(page, "appraisal", message),
      agents.requestFromOrder(browserWorld("appraisal", DAY.orders), "appraisal", message),
    ]);
    expect(results.filter((result) => result !== undefined)).toHaveLength(1);
    expect(requestsInAlexInbox()).toHaveLength(1);
  });

  test("the caller whose agent was refused finds the reply in its own inbox", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    const waiting = awaitReply(world, "lender", message, { intervalMs: 10, timeoutMs: 5_000 });
    const reply = await deliver(world, {
      from: "appraisal",
      inReplyTo: message,
      kind: MORT.MessageKind_AppraisalDelivery,
      summary: "A reply",
      time: "09:40",
      to: "lender",
    });
    expect(await waiting).toBe(reply);
  });

  test("waiting for a reply that never comes fails after the timeout", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    await expect(
      awaitReply(world, "lender", message, { intervalMs: 10, timeoutMs: 50 }),
    ).rejects.toThrow(/no reply/);
  });
});

describe("a failed answer does not leave its message stuck", () => {
  async function serviceOrder(world: World): Promise<string> {
    return deliver(world, {
      from: "lender",
      kind: MORT.MessageKind_ServiceOrder,
      summary: "Appraisal ordered for 14 Larch Lane",
      time: "09:30",
      to: "appraisal",
    });
  }

  const nothingYet = async (): Promise<string | undefined> => undefined;

  test("an answer that throws gives its claim back", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    await expect(
      answerOnce(world, "appraisal", message, "09:31", async () => {
        throw new Error("signing failed");
      }),
    ).rejects.toThrow(/signing failed/);
    const fetcher = world.fetchAs("appraisal");
    expect(await statusOf(fetcher, handledUrl(world, "appraisal", message))).toBe(404);
    expect(await claimMessage(world, "appraisal", message, "09:32")).toBe(true);
  });

  test("an answer that succeeds keeps its claim", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    expect(await answerOnce(world, "appraisal", message, "09:31", async () => "done")).toBe("done");
    expect(await answerOnce(world, "appraisal", message, "09:32", async () => "again")).toBe(
      undefined,
    );
  });

  test("a caller waiting on a claimant that fails runs the agent once more", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    let crash: () => void = () => undefined;
    let started: () => void = () => undefined;
    const holding = new Promise<void>((resolve) => {
      started = resolve;
    });
    // The other caller (the agent worker) claims the order, then crashes.
    const other = answerOnce(
      browserWorld("appraisal", DAY.orders),
      "appraisal",
      message,
      "09:31",
      () => {
        started();
        return new Promise<string>((_, reject) => {
          crash = () => reject(new Error("crashed"));
        });
      },
    );
    await holding;
    const waiting = answerOrAwait(
      world,
      {
        answer: () => agents.requestFromOrder(world, "appraisal", message),
        claimant: "appraisal",
        look: nothingYet,
        messageUrl: message,
      },
      { intervalMs: 10, timeoutMs: 5_000 },
    );
    crash();
    await expect(other).rejects.toThrow(/crashed/);
    expect(await waiting).toMatch(/\/pods\/alex\/inbox\//);
    const requests = host.events.filter(
      (event) =>
        event.pod === "alex" &&
        event.method === "POST" &&
        event.path === "/inbox/" &&
        event.status === 201,
    );
    expect(requests).toHaveLength(1);
  });

  test("a claim that stays held is waited on, never answered twice", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    expect(await claimMessage(world, "appraisal", message, "09:31")).toBe(true);
    let runs = 0;
    await expect(
      answerOrAwait(
        world,
        {
          answer: async () => {
            runs++;
            return answerOnce(world, "appraisal", message, "09:32", async () => "mine");
          },
          claimant: "appraisal",
          look: nothingYet,
          messageUrl: message,
        },
        { intervalMs: 10, timeoutMs: 100 },
      ),
    ).rejects.toThrow(/was not answered by appraisal/);
    expect(runs).toBe(1);
  });

  test("the agent runs at most twice, however often the claim disappears", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    let runs = 0;
    await expect(
      answerOrAwait(
        world,
        {
          answer: async () => {
            runs++;
            return undefined;
          },
          claimant: "appraisal",
          look: nothingYet,
          messageUrl: message,
        },
        { intervalMs: 10, timeoutMs: 100 },
      ),
    ).rejects.toThrow(/was not answered/);
    expect(runs).toBe(2);
  });

  test("the result another caller produced is found without running the agent again", async () => {
    const world = browserWorld("lender", DAY.orders);
    const message = await serviceOrder(world);
    expect(await claimMessage(world, "appraisal", message, "09:31")).toBe(true);
    let looks = 0;
    const found = await answerOrAwait(
      world,
      {
        answer: () => answerOnce(world, "appraisal", message, "09:32", async () => "mine"),
        claimant: "appraisal",
        look: async () => (++looks >= 3 ? "theirs" : undefined),
        messageUrl: message,
      },
      { intervalMs: 10, timeoutMs: 5_000 },
    );
    expect(found).toBe("theirs");
  });
});

describe("step 7 in two halves", () => {
  test("the completion refuses to run before Alex approves, and can run twice after", async () => {
    const world = browserWorld("lender", DAY.application);
    const request = await requestApplicationAccess(world);
    await expect(completeApplicationAccess(world)).rejects.toThrow(/G4 is not active/);
    await approveRequest(world, request, "10:02");
    await completeApplicationAccess(world);
    await completeApplicationAccess(world);
    expect(
      await statusOf(world.fetchAs("bureau"), podUrl(world, "alex", CREDIT_AUTHORISATION)),
    ).toBe(200);
  });
});
