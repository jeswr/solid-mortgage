// AUTHORED-BY Claude Opus 5.5
/**
 * Ledgerly's connection to the pods: the runtime started once with the shared mortgage seed, a
 * `World` acting as Ledgerly for the journey functions, and a hook that re-reads a screen's data
 * whenever the pods report a change (the shared provider in `@mortgage/demo-kit/react`).
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import { createPodsContext, type Pods as SharedPods } from "@mortgage/demo-kit/react";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import {
  configure,
  note,
  onEvent,
  onReset,
  podFetch,
  type RuntimeInfo,
  ready,
  setDay,
} from "@mortgage/pod-runtime";

export type { Loaded } from "@mortgage/demo-kit/react";
export type Pods = SharedPods<World>;

/** Start the pod runtime for `app` with the seed every mortgage app passes. */
export function startPods(app: AppSlug): Promise<RuntimeInfo> {
  configure({ app, registry: ORGS, seed: mortgageSeed() });
  return ready();
}

export const { PodsProvider, usePodData, usePods } = createPodsContext<World, RuntimeInfo>({
  beatDayOf: (run) => JOURNEY.find((beat) => beat.run === run)?.day,
  createWorld(app, day, info) {
    const actsAs = ORGS[app as keyof typeof ORGS]?.actsAs;
    if (actsAs === undefined) throw new Error(`${app} is not an organisation app`);
    return createBrowserWorld({ actsAs, day, dayOne: info.dayOne, note, podFetch });
  },
  events: { onEvent, onReset },
  setDay,
});
