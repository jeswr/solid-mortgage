// AUTHORED-BY Claude Opus 5.5
/**
 * Copperfield's back-office agent (design.md §d.2). The only messages Copperfield receives are
 * threshold presentations, and the journey checks each one in line as it arrives
 * (`proveToLenders` calls `verifyPresentation`, which then deletes the single-use challenge).
 * Checking it again here would find no live challenge and overwrite the result, and no
 * `agents.*` function exists for Copperfield, so it registers no handler.
 */
import { defineAgent } from "@mortgage/pod-runtime/agents";

export const handlers = defineAgent({});
