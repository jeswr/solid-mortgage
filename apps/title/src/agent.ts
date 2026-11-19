// AUTHORED-BY Claude Opus 5.5
/**
 * Sextant's back office: when Juniper's service order lands in the inbox, ask Alex for exactly
 * the part of the pod title and settlement need (grant G6). Everything else Sextant does is the
 * escrow officer's own work in the app.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { readMessage } from "@mortgage/content/mortgage/messages";
import { MORT } from "@mortgage/data-model";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    const world = agentWorld(ctx);
    const received = await readMessage(world, "title", message.url);
    if (received.messageKind !== MORT.MessageKind_ServiceOrder) return;
    await agents.requestFromOrder(world, "title", message.url);
  },
});
