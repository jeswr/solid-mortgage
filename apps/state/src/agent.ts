// AUTHORED-BY Claude Opus 5.5
/**
 * State Online Services' back office. When Alex's wallet grants it the address (H1), it subscribes
 * to the address; when the address changes, it reads it again and, if the licence no longer
 * matches, signs a new licence and revokes the old one (`@mortgage/content/moving-house/agents`).
 */
import "@mortgage/vc-kit/browser/buffer";
import { movingHouseChanged, movingHouseInbox } from "@mortgage/content/moving-house/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await movingHouseInbox("state", message, ctx);
  },
  async changed(message, ctx) {
    await movingHouseChanged("state", message, ctx);
  },
});
