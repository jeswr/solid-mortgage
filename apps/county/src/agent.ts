// AUTHORED-BY Claude Opus 5.5
/**
 * The Recorder's back office: an eRecording submission in the inbox is recorded, and the
 * confirmation goes back to the submitter. The register is public; nothing is read from Alex's pod.
 */
import { agentWorld } from "@mortgage/content/mortgage/browser";
import { agents } from "@mortgage/content/mortgage/journey";
import { readMessage } from "@mortgage/content/mortgage/messages";
import { MORT } from "@mortgage/data-model";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    const world = agentWorld(ctx);
    const received = await readMessage(world, "county", message.url);
    if (received.messageKind !== MORT.MessageKind_RecordingSubmission) return;
    await agents.countyRecord(world, message.url);
  },
});
