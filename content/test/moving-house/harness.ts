// AUTHORED-BY Claude Opus 5.5
/**
 * A headless moving-house world over the REAL pod runtime host (`createNodePodHost`, the same host
 * and wasm the service worker runs), with the six holders' agents running through the runtime's
 * own agent runner and change notification. The only stand-in is the transport for a request
 * that names another owner in the path-mode header, which goes to the host as that owner, as the
 * service worker does. Every status is the pod server's.
 */

import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import {
  type AgentContext,
  type AgentRunner,
  runAgentsOnHost,
} from "../../../packages/pod-runtime/dist/agents/index.js";
import { createNodePodHost, type PodHost } from "../../../packages/pod-runtime/dist/node.js";
import {
  agentWorld,
  type KeyStore,
  keyRing,
  memoryKeyStore,
  mortgageSeed,
  PATH_MODE_HEADERS,
} from "../../mortgage/browser.js";
import type { World } from "../../mortgage/world.js";
import { movingHouseChanged, movingHouseInbox } from "../../moving-house/agents.js";
import { DAY } from "../../moving-house/facts.js";
import { HOLDERS, type Holder } from "../../moving-house/grants.js";
import { ORGS } from "../../orgs.js";

export const ORIGIN = "https://pods.demo.test";
/** A fixed Monday, so the run does not depend on today's date. */
export const DAY_ONE = "2026-07-06";

export interface Harness {
  host: PodHost;
  calendar: DemoCalendar;
  keys: KeyStore;
  log: LensEntry[];
  runner: AgentRunner;
  errors: unknown[];
  /** The simulated day pod events are stamped with. */
  day: number;
  world(day?: number): World;
  stop(): void;
}

export async function createHarness(): Promise<Harness> {
  const calendar = createDemoCalendar(DAY_ONE);
  const keys = memoryKeyStore();
  const identities: Record<string, PodOwner> = {};
  for (const record of Object.values(ORGS)) identities[record.slug] = record.actsAs;
  const state = { day: DAY.moved };
  const host = createNodePodHost({
    clock: () => calendar.time(state.day, "12:00"),
    identities,
    origin: ORIGIN,
    owners: podOwners(ORGS),
    seed: mortgageSeed({ dayOne: DAY_ONE, keys }),
  });
  await host.ready;
  const log: LensEntry[] = [];
  host.subscribe((message) => {
    if (message.type === "event") log.push(message.entry);
  });

  /** What the service worker does with the path-mode identity header. */
  const transport: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const owner = request.headers.get(PATH_MODE_HEADERS.agent);
    const viaAgent = request.headers.get(PATH_MODE_HEADERS.viaAgent) === "1";
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => {
      if (!name.startsWith("x-demo-")) headers[name] = value;
    });
    const body =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    return host.fetchAs(owner, { viaAgent })(request.url, {
      headers,
      method: request.method,
      ...(body === undefined ? {} : { body }),
    });
  };

  const worldFor = (ctx: AgentContext): World =>
    agentWorld(ctx, { dayOne: DAY_ONE, fetch: transport, keys });

  const agents: Record<string, Parameters<typeof runAgentsOnHost>[0]["agents"][string]> = {};
  for (const holder of HOLDERS) {
    agents[holder] = {
      changed: (message, ctx) => movingHouseChanged(holder as Holder, message, ctx, worldFor),
      inbox: (message, ctx) => movingHouseInbox(holder as Holder, message, ctx, worldFor),
    };
  }
  const errors: unknown[] = [];
  const runner = runAgentsOnHost({
    agents,
    host,
    identities,
    onError: (error) => errors.push(error),
  });

  const keyFor = keyRing(ORIGIN, keys);
  const harness: Harness = {
    calendar,
    get day() {
      return state.day;
    },
    set day(value: number) {
      state.day = value;
    },
    errors,
    host,
    keys,
    log,
    runner,
    stop: () => runner.stop(),
    world: (day = state.day) => ({
      calendar,
      day,
      fetchAs: (owner) => host.fetchAs(owner),
      keyFor,
      note: (note) => {
        void host.note(note);
      },
      podOrigin: ORIGIN,
    }),
  };
  return harness;
}
