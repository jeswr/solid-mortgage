// AUTHORED-BY Claude Opus 5.5
/**
 * Castellan's back office (design.md §d.2): a casefile submission is underwritten by reading the
 * three credentials at source (`agents.ausRunCasefile`); a loan delivery is purchased
 * (`agents.ausPurchaseLoan`). Acts only as Castellan; content's agents skip a message the
 * journey already answered in line.
 *
 * Messages are told apart by the name `deliver()` asks for (the message kind's last segment,
 * lower case; the pod adds a random suffix), so unrelated messages are not read.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, context) {
    if (message.path.startsWith("/inbox/casefilesubmission-")) {
      await agents.ausRunCasefile(agentWorld(context), message.url);
    } else if (message.path.startsWith("/inbox/loandelivery-")) {
      await agents.ausPurchaseLoan(agentWorld(context), message.url);
    }
  },
});
