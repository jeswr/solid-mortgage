// AUTHORED-BY Claude Opus 5.5
/**
 * Juniper's back office (design.md §d.2). When Plumbline's appraisal report lands in Juniper's
 * inbox while the visitor is elsewhere, Juniper checks it and gives Alex the creditor's copy
 * (`agents.lenderReceiveAppraisal`). It acts only as Juniper; content's agents skip a message
 * the journey already answered in line.
 *
 * Messages are told apart by the name `deliver()` asks for (the message kind's last segment,
 * lower case; the pod adds a random suffix), so other messages are not even read.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, context) {
    if (!message.path.startsWith("/inbox/appraisaldelivery-")) return;
    await agents.lenderReceiveAppraisal(agentWorld(context), message.url);
  },
});
