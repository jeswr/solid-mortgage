// AUTHORED-BY Claude Opus 5.5
/**
 * Test-only page (built by e2e/serve.mjs into a copy of the site, never into dist/). It puts the
 * pods into the state a wallet step starts from by running the earlier journey beats, the same
 * functions the apps call, against the real service-worker pods; and it reads back as any owner.
 * Every request goes through the pod server, which checks it against the access rules.
 */
import "@mortgage/vc-kit/browser/buffer";
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import { type GrantCode, readAcl, requestAccess } from "@mortgage/content/mortgage/grants";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import { podUrl } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { configure, note, podFetch, ready } from "@mortgage/pod-runtime";

configure({ agents: false, app: "wallet", registry: ORGS, seed: mortgageSeed() });
const started = ready();

async function world(day: number) {
  const info = await started;
  return createBrowserWorld({ actsAs: "alex", day, dayOne: info.dayOne, note, podFetch });
}

const harness = {
  ready: () => started.then(() => true),
  /** Run journey beats by name, in journey order, each on its own day. */
  async beats(names: readonly string[]): Promise<string[]> {
    const ran: string[] = [];
    for (const beat of JOURNEY) {
      if (!names.includes(beat.name)) continue;
      await beat.run(await world(beat.day));
      ran.push(beat.name);
    }
    return ran;
  },
  /** An organisation asks Alex for access (what its Start or Connect screen does). */
  async request(code: GrantCode, day: number): Promise<string> {
    return requestAccess(await world(day), code);
  },
  /** The status `owner` gets for a request to `path` in `pod`. */
  async status(owner: PodOwner, pod: PodOwner, path: string, method = "GET"): Promise<number> {
    const w = await world(1);
    const response = await w.fetchAs(owner)(podUrl(w, pod, path), {
      headers: { accept: "text/turtle" },
      method,
    });
    return response.status;
  },
  /** PUT a plain-text document as `owner` into `pod`; the status the pod server answered. */
  async write(owner: PodOwner, pod: PodOwner, path: string, text: string): Promise<number> {
    const w = await world(1);
    const response = await w.fetchAs(owner)(podUrl(w, pod, path), {
      body: text,
      headers: { "content-type": "text/plain" },
      method: "PUT",
    });
    return response.status;
  },
  /** The agents named by the ACL document of `path` in Alex's pod, as Alex reads it. */
  async aclAgents(path: string): Promise<string[]> {
    const w = await world(1);
    const rules = await readAcl(w.fetchAs("alex"), `${podUrl(w, "alex", path)}.acl`);
    return [...new Set(rules.flatMap((rule) => [...rule.agent]))].sort();
  },
  webid(owner: PodOwner): string {
    return `${location.origin}/pods/${owner}/profile/card#me`;
  },
};

declare global {
  interface Window {
    __harness?: typeof harness;
  }
}
window.__harness = harness;
