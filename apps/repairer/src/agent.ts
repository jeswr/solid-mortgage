// AUTHORED-BY Claude Opus 5.5
/**
 * Anvil Collision Repair's back office (motor-claim demo). Wrenfield's referral makes it ask Alex
 * for the damage report and the photos (grant C2); the copy of Alex's agreement opens the job
 * record; Wrenfield's authorisation records the accepted estimate
 * (`@mortgage/content/motor-claim/agents`). Each message is answered once, whether this worker or
 * the page that sent it gets there first.
 */
import "@mortgage/vc-kit/browser/buffer";
import { motorClaimRepairerInbox } from "@mortgage/content/motor-claim/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await motorClaimRepairerInbox(message, ctx);
  },
});
