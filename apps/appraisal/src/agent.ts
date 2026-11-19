// AUTHORED-BY Claude Opus 5.5
/**
 * Plumbline's back office: when Juniper's service order lands in the inbox, ask Alex for exactly
 * the part of the pod the appraisal needs (grant G5). Everything else Plumbline does is the
 * appraiser's own work in the field app.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { readMessage } from "@mortgage/content/mortgage/messages";
import { MORT } from "@mortgage/data-model";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    const world = agentWorld(ctx);
    const received = await readMessage(world, "appraisal", message.url);
    if (received.messageKind !== MORT.MessageKind_ServiceOrder) return;
    await agents.requestFromOrder(world, "appraisal", message.url);
  },
});
