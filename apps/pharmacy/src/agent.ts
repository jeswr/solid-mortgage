// AUTHORED-BY Claude Opus 5.5
/**
 * Corner Dispensary's back office. When Rosa withdraws its grant, her wallet tells it in its
 * inbox; it tries her live list once more and the pod refuses (403). Its own dispensing records
 * stay in its own pod (`@mortgage/content/medication-handover/agents`).
 */
import "@mortgage/vc-kit/browser/buffer";
import { medicationPharmacyInbox } from "@mortgage/content/medication-handover/agents";
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({
  async inbox(message, ctx) {
    await medicationPharmacyInbox(message, ctx);
  },
});
