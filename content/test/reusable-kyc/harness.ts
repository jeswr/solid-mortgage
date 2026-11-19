// AUTHORED-BY Claude Opus 5.5
/**
 * A headless reusable-KYC world over the REAL pod runtime host (`createNodePodHost`, the same host
 * and wasm the service worker runs), with Alex's wallet back office running through the runtime's
 * own agent runner, and the one-time grant registered with the runtime's own service. The only
 * stand-in is the transport for a request that names another owner in the path-mode header,
 * which goes to the host as that owner, as the service worker does. Every status is the pod
 * server's.
 */

import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import {
  type AgentContext,
  type AgentRunner,
  listOneTimeGrants,
  makeGrantOneTime,
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
import { agents as mortgageAgents } from "../../mortgage/journey.js";
import type { World } from "../../mortgage/world.js";
import { ORGS } from "../../orgs.js";
import { DAY } from "../../reusable-kyc/facts.js";
import type { GrantOneTime } from "../../reusable-kyc/grants.js";

export const ORIGIN = "https://pods.demo.test";
/** A fixed Monday, so the run does not depend on today's date. */
export const DAY_ONE = "2026-07-06";

export interface Harness {
  host: PodHost;
  calendar: DemoCalendar;
  log: LensEntry[];
  runner: AgentRunner;
  errors: unknown[];
  /** The simulated day pod events are stamped with. */
  day: number;
  world(day?: number): World;
  /** The runtime's one-time-grant service, called as Alex (the pod owner). */
  grantOneTime: GrantOneTime;
  pendingOneTime(): Promise<{ path: string; agent: string }[]>;
  stop(): void;
}

export async function createHarness(): Promise<Harness> {
  const calendar = createDemoCalendar(DAY_ONE);
  const keys: KeyStore = memoryKeyStore();
  const identities: Record<string, PodOwner> = {};
  for (const record of Object.values(ORGS)) identities[record.slug] = record.actsAs;
  const state = { day: DAY.apply };
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

  const errors: unknown[] = [];
  // Cairn's back office, as apps/wallet/src/agent.ts runs it: expiry first, on every inbox write.
  const runner = runAgentsOnHost({
    agents: {
      wallet: {
        inbox: async (_message, ctx) => {
          await mortgageAgents.walletApplyExpiries(worldFor(ctx));
        },
      },
    },
    host,
    identities,
    onError: (error) => errors.push(error),
  });

  const keyFor = keyRing(ORIGIN, keys);
  const alex = host.fetchAs("alex");
  return {
    calendar,
    get day() {
      return state.day;
    },
    set day(value: number) {
      state.day = value;
    },
    errors,
    grantOneTime: (input) => makeGrantOneTime(alex, input),
    host,
    log,
    pendingOneTime: () => listOneTimeGrants(alex, ORIGIN),
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
}
