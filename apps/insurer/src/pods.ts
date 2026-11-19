// AUTHORED-BY Claude Opus 5.5
/**
 * The pod runtime for this page: Wrenfield's identity, the shared mortgage seed, and the `World`
 * the journey functions run in (`@mortgage/content/mortgage/browser`).
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import {
  configure,
  note,
  podFetch,
  podUrl,
  type RuntimeInfo,
  ready,
  setDay,
} from "@mortgage/pod-runtime";

export const APP = "insurer" as const;

let configured = false;

/** Configure the runtime once and wait until the pods are seeded. */
export function startPods(): Promise<RuntimeInfo> {
  if (!configured) {
    configure({ app: APP, registry: ORGS, seed: mortgageSeed() });
    configured = true;
  }
  return ready();
}

/** The world a journey step runs in, on the step's demo day. */
export async function worldOn(day: number): Promise<World> {
  const info = await startPods();
  await setDay(day);
  return createBrowserWorld({
    actsAs: ORGS[APP].actsAs,
    day,
    dayOne: info.dayOne,
    note,
    podFetch,
  });
}

export { podUrl };
