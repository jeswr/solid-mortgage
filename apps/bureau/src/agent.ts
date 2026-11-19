// AUTHORED-BY Claude Opus 5.5
/**
 * Quillon's back office (design.md §d.2): when a lender's credit report order lands in the inbox,
 * Quillon checks the consumer's authorisation at source and releases the report to the lender,
 * organisation to organisation. The journey also calls this in line at step 9; the order is
 * answered once, whichever runs first.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { readMessage } from "@mortgage/content/mortgage/messages";
import { MORT } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    const inbound = await readMessage(agentWorld(ctx), ctx.owner, message.url);
    if (inbound.messageKind !== MORT.MessageKind_CreditReportOrder) return;
    // The day the lender sent it, so the report is dated when it was ordered.
    const day = createDemoCalendar().dayOf(inbound.published);
    await agents.bureauFulfilCreditOrder(agentWorld(ctx, { day }), message.url);
  },
});
