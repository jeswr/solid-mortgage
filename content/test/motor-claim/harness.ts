// AUTHORED-BY Claude Opus 5.5
/**
 * A headless motor-claim world over the REAL pod runtime host (`createNodePodHost`, the same host
 * and wasm the service worker runs), with Alex's wallet and Anvil's back office running through
 * the runtime's own agent runner. The only stand-in is the transport for a request that names
 * another owner in the path-mode header, which goes to the host as that owner, as the service
 * worker does. Every status is the pod server's.
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
import { applyExpiries } from "../../mortgage/grants.js";
import type { World } from "../../mortgage/world.js";
import { motorClaimRepairerInbox, motorClaimWalletExpiries } from "../../motor-claim/agents.js";
import { DAY } from "../../motor-claim/facts.js";
import { withAlexGrantLock } from "../../motor-claim/lock.js";
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
  const state = { day: DAY.incident };
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
  const runner = runAgentsOnHost({
    agents: {
      repairer: {
        inbox: async (message, ctx) => {
          await motorClaimRepairerInbox(message, ctx, worldFor);
        },
      },
      // apps/wallet/src/agent.ts: the mortgage's expiry pass, then the motor claim's, in one lock.
      wallet: {
        inbox: async (_message, ctx) => {
          await withAlexGrantLock(async () => {
            await applyExpiries(worldFor(ctx));
            await motorClaimWalletExpiries(ctx, worldFor);
          });
        },
      },
    },
    host,
    identities,
    onError: (error) => errors.push(error),
  });

  const keyFor = keyRing(ORIGIN, keys);
  return {
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
}
