// AUTHORED-BY Claude Opus 5.5
/**
 * The Recorder's back office: an eRecording submission in the inbox is recorded, and the
 * confirmation goes back to the submitter. The register is public; nothing is read from Alex's pod.
 *
 * Moving-house demo: a grant notice for Alex's address is handled first
 * (`@mortgage/content/moving-house/agents`), and so is a change to the address it watches.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { readMessage } from "@mortgage/content/mortgage/messages";
import { movingHouseChanged, movingHouseInbox } from "@mortgage/content/moving-house/agents";
import { MORT } from "@mortgage/data-model";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    if (await movingHouseInbox("county", message, ctx)) return;
    const world = agentWorld(ctx);
    const received = await readMessage(world, "county", message.url);
    if (received.messageKind !== MORT.MessageKind_RecordingSubmission) return;
    await agents.countyRecord(world, message.url);
  },
  async changed(message, ctx) {
    await movingHouseChanged("county", message, ctx);
  },
});
