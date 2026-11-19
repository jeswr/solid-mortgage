// AUTHORED-BY Claude Opus 5.5
/**
 * Cairn's back office: whenever something lands in Alex's inbox (an organisation's access
 * request), the wallet applies expiry first, so a grant whose end has been reached loses its
 * access rules before Alex is asked anything new. It acts as Alex's wallet through `ctx.podFetch`
 * (marked as an agent in the Lens: "expiry applied by Alex's wallet"). The page applies the same
 * function when the simulated day moves (src/runtime.tsx).
 */
import "@mortgage/vc-kit/browser/buffer";
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { defineAgent } from "@mortgage/pod-runtime/agents";
import { withGrantLock } from "./acl-lock.ts";

export const handlers = defineAgent({
  async inbox(_message, ctx) {
    // The same lock as the wallet page's Approve and Revoke (src/acl-lock.ts).
    await withGrantLock(() => agents.walletApplyExpiries(agentWorld(ctx)));
  },
});
