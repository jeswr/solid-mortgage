// AUTHORED-BY Claude Opus 5.5
/**
 * Test-only bundle, injected into a page of the app by the e2e suite (never part of the app
 * build). It runs journey beats that belong to other apps against the page's REAL pod service
 * worker, through the shared browser World, so they sign with the same keys (the origin's shared
 * IndexedDB key store) the seed published. Each owner's requests carry that owner's path-mode
 * identity, exactly as the shared World sends them; the pod server checks every one.
 */
import "@mortgage/vc-kit/browser/buffer";
import { createBrowserWorld, crossOwnerFetch } from "@mortgage/content/mortgage/browser";
import { approveRequest } from "@mortgage/content/mortgage/grants";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import type { World } from "@mortgage/content/mortgage/world";
import type { PodOwner } from "@mortgage/demo-kit/registry";

function worldAs(owner: PodOwner, day: number): World {
  return createBrowserWorld({ actsAs: owner, day, podFetch: crossOwnerFetch(owner) });
}

const harness = {
  /** Run the named beats, in the order given, each on its own day. */
  async run(names: readonly string[]): Promise<void> {
    for (const name of names) {
      const beat = JOURNEY.find((entry) => entry.name === name);
      if (beat === undefined) throw new Error(`no beat named ${name}`);
      await beat.run(worldAs("alex", beat.day));
    }
  },
  /** What the wallet does on Approve (lane A1's screen). Returns the grant code. */
  async approve(requestUrl: string, day: number): Promise<string> {
    return (await approveRequest(worldAs("alex", day), requestUrl, "10:02")).code;
  },
};

declare global {
  interface Window {
    __harness?: typeof harness;
  }
}

window.__harness = harness;
