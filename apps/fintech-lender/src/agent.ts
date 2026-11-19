// AUTHORED-BY Claude Opus 5.5
/**
 * Finchly's back office. When Maya's wallet tells Finchly that grant L1 was withdrawn, its
 * servicing file asks for her cash-flow summary again; the pod refuses (403) and Finchly records
 * that its access ended (`@mortgage/content/small-dollar-lending/agents`).
 */
import "@mortgage/vc-kit/browser/buffer";
import { lendingInbox } from "@mortgage/content/small-dollar-lending/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await lendingInbox(message, ctx);
  },
});
