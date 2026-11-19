// AUTHORED-BY Claude Opus 5.5
/**
 * A headless business KYB world over the REAL pod runtime host (`createNodePodHost`, the same host
 * and wasm the service worker runs). No stand-in at all: every party's request goes to the host
 * as that party (`host.fetchAs(owner)`), every status is the pod server's, every credential and
 * proof is signed, proved and verified by vc-kit for real.
 */

import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import { createNodePodHost, type PodHost } from "../../../packages/pod-runtime/dist/node.js";
import { DAY } from "../../business-kyb/facts.js";
import { type KeyStore, keyRing, memoryKeyStore, mortgageSeed } from "../../mortgage/browser.js";
import type { World } from "../../mortgage/world.js";
import { ORGS } from "../../orgs.js";

export const ORIGIN = "https://pods.demo.test";
/** A fixed Monday, so the run does not depend on today's date. */
export const DAY_ONE = "2026-07-06";

export interface Harness {
  host: PodHost;
  calendar: DemoCalendar;
  keys: KeyStore;
  log: LensEntry[];
  /** The simulated day pod events are stamped with. */
  day: number;
  world(day?: number): World;
}

export async function createHarness(): Promise<Harness> {
  const calendar = createDemoCalendar(DAY_ONE);
  const keys = memoryKeyStore();
  const identities: Record<string, PodOwner> = {};
  for (const record of Object.values(ORGS)) identities[record.slug] = record.actsAs;
  const state = { day: DAY.register };
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
  const keyFor = keyRing(ORIGIN, keys);
  return {
    calendar,
    get day() {
      return state.day;
    },
    set day(value: number) {
      state.day = value;
    },
    host,
    keys,
    log,
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
