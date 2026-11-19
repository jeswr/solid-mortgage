// AUTHORED-BY Claude Opus 5.5
/**
 * Test-only bundle, injected into the app page by the e2e suite (never part of the app build).
 * It runs the journey beats that come before this app's step, against the page's REAL pod
 * service worker, so the app finds the pods as the earlier apps would have left them. Each
 * owner's requests carry that owner's path-mode identity, exactly as the shared browser World
 * sends them; the pod server checks every one against the access rules.
 */
import { createBrowserWorld, crossOwnerFetch } from "@mortgage/content/mortgage/browser";
import { approveRequest } from "@mortgage/content/mortgage/grants";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import type { World } from "@mortgage/content/mortgage/world";
import type { PodOwner } from "@mortgage/demo-kit/registry";

/** The threshold proofs (steps 5 and 6) need the proving toolchain and no later step needs them. */
const SKIPPED = new Set(["prove-to-lenders", "lender-b-received"]);

function worldAs(owner: PodOwner, day: number): World {
  return createBrowserWorld({ actsAs: owner, day, podFetch: crossOwnerFetch(owner) });
}

const harness = {
  /** Run every beat before `beat` (by name), in order, each on its own day. */
  async runUntil(beat: string): Promise<string[]> {
    const ran: string[] = [];
    for (const entry of JOURNEY) {
      if (entry.name === beat) return ran;
      if (SKIPPED.has(entry.name)) continue;
      await entry.run(worldAs("alex", entry.day));
      ran.push(entry.name);
    }
    throw new Error(`no beat named ${beat}`);
  },
  /** What the wallet does on Approve (lane A1's screen), for the hand-off tests. */
  async approve(requestUrl: string, day: number): Promise<string> {
    return (await approveRequest(worldAs("alex", day), requestUrl)).code;
  },
  /** GET a resource as its owner: the status and, when readable, the body. */
  async read(owner: PodOwner, url: string): Promise<{ status: number; body: string }> {
    const response = await crossOwnerFetch(owner)(url, { headers: { accept: "text/turtle" } });
    return { body: response.ok ? await response.text() : "", status: response.status };
  },
};

declare global {
  interface Window {
    __harness?: typeof harness;
  }
}

window.__harness = harness;
