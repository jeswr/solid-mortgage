// AUTHORED-BY Claude Opus 5.5
/**
 * Wrenfield Mutual's back office (design.md §d.2). No message is ever addressed to the insurer's
 * inbox in the mortgage journey, and `agents` in content/mortgage/journey.ts has no insurer
 * function, so there is nothing to react to. The quote and the binding are the visitor's own
 * actions on the Quote screen.
 *
 * Moving-house demo: a grant notice for Alex's address is handled first
 * (`@mortgage/content/moving-house/agents`), and so is a change to the address it watches.
 */
import { movingHouseChanged, movingHouseInbox } from "@mortgage/content/moving-house/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await movingHouseInbox("insurer", message, ctx);
  },
  async changed(message, ctx) {
    await movingHouseChanged("insurer", message, ctx);
  },
});
