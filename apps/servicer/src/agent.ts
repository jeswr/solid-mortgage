// AUTHORED-BY Claude Opus 5.5
/**
 * Marigold's back office (design.md §d.2). Juniper's boarding message lands in Marigold's inbox
 * in step 21, but `agents` in content/mortgage/journey.ts has no servicer function: the
 * transfer needs nothing from Marigold until Alex connects a pod on the Connect screen.
 */
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({});
