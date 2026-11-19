// AUTHORED-BY Claude Opus 5.5
/**
 * Marigold's back office (design.md §d.2). Juniper's boarding message lands in Marigold's inbox
 * in step 21, but `agents` in content/mortgage/journey.ts has no servicer function: the
 * transfer needs nothing from Marigold until Alex connects a pod on the Connect screen.
 *
 * Moving-house demo: a grant notice for Alex's address is handled first
 * (`@mortgage/content/moving-house/agents`), and so is a change to the address it watches.
 */
import { movingHouseChanged, movingHouseInbox } from "@mortgage/content/moving-house/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await movingHouseInbox("servicer", message, ctx);
  },
  async changed(message, ctx) {
    await movingHouseChanged("servicer", message, ctx);
  },
});
