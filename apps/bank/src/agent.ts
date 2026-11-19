// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank's back office (design.md §d.2). Nothing in the mortgage journey arrives in the
 * bank's inbox: the bank issues when Alex asks in the app, and answers no messages.
 *
 * Moving-house demo: a grant notice for Alex's address is handled first
 * (`@mortgage/content/moving-house/agents`), and so is a change to the address it watches.
 */
import { movingHouseChanged, movingHouseInbox } from "@mortgage/content/moving-house/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await movingHouseInbox("bank", message, ctx);
  },
  async changed(message, ctx) {
    await movingHouseChanged("bank", message, ctx);
  },
});
