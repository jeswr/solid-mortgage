// AUTHORED-BY Claude Opus 5.5
/**
 * Ledgerly's back office (design.md §d.2): when Juniper asks for employment to be re-verified,
 * Ledgerly re-issues the credential from its payroll record into the same slot and revokes the
 * old one. The journey also calls this in line at step 16; the message is answered once,
 * whichever runs first.
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
    if (inbound.messageKind !== MORT.MessageKind_RefreshRequest) return;
    // The day the lender sent it, so the re-issued credential is dated when it was asked for.
    const day = createDemoCalendar().dayOf(inbound.published);
    await agents.payrollRefresh(agentWorld(ctx, { day }), message.url);
  },
});
