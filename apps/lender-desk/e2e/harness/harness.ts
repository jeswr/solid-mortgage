// AUTHORED-BY Claude Opus 5.5
/**
 * Test-only page, built by e2e/harness.vite.config.ts and served by e2e/server.mjs next to the
 * real dist/; it is never part of the site. It plays the beats of the journey that belong to
 * other apps (the wallet, the portal, the appraiser, …) through the same service-worker pods the
 * Loan Desk uses, and reads resources back as their owner, so the specs can click this app's
 * own steps in between and check what landed in the pods. No pod and no access check is mocked.
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import { ORGS } from "@mortgage/content/orgs";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { configure, podFetch, ready, setDay } from "@mortgage/pod-runtime";
import type { Harness } from "./api.ts";

async function main(): Promise<void> {
  configure({ app: "wallet", registry: ORGS, seed: mortgageSeed() });
  const info = await ready();
  const world = (day: number) =>
    createBrowserWorld({ actsAs: "alex", day, dayOne: info.dayOne, podFetch });
  const harness: Harness = {
    async read(owner, path, reader = owner) {
      const url = `${location.origin}/pods/${owner}/${path.replace(/^\/+/, "")}`;
      const response = await world(1).fetchAs(reader as PodOwner)(url, {
        headers: { accept: "text/turtle" },
      });
      return { body: await response.text(), status: response.status };
    },
    async run(...names) {
      for (const name of names) {
        const beat = JOURNEY.find((candidate) => candidate.name === name);
        if (beat === undefined) throw new Error(`no journey beat named ${name}`);
        await setDay(beat.day);
        await beat.run(world(beat.day));
      }
    },
  };
  window.harness = harness;
  const state = document.getElementById("harness-state");
  if (state !== null) state.textContent = "ready";
}

main().catch((error: unknown) => {
  const state = document.getElementById("harness-state");
  if (state !== null) state.textContent = `failed: ${String(error)}`;
  throw error;
});
