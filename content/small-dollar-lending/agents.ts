// AUTHORED-BY Claude Opus 5.5
/**
 * The back-office handler Finchly's `src/agent.ts` calls: when Maya's wallet tells Finchly that
 * grant L1 was withdrawn, Finchly's servicing file asks for her cash-flow summary again, the pod
 * refuses (403), and Finchly records that its access ended. Returns `undefined` when the message
 * is not this demo's.
 *
 *   export const handlers = defineAgent({
 *     inbox: (message, ctx) => lendingInbox(message, ctx),
 *   });
 *
 * Contexts are typed structurally: content does not depend on the pod runtime.
 */

import { type AgentContextLike, agentWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";
import { isWithdrawalNotice } from "./grants.js";
import { finchlyReadsAgain } from "./journey.js";

/** The world an agent acts in (on the day of the event). Overridable for headless runs. */
export type LendingWorldFor = (ctx: AgentContextLike) => World;

const defaultWorld: LendingWorldFor = (ctx) => agentWorld(ctx);

export interface WithdrawalOutcome {
  /** The status Maya's pod gave Finchly's read after the withdrawal. */
  readonly status: number;
}

/** A message landed in Finchly's inbox. Only a grant withdrawal is this demo's to handle. */
export async function lendingInbox(
  message: { path: string; url: string },
  ctx: AgentContextLike,
  worldFor: LendingWorldFor = defaultWorld,
): Promise<WithdrawalOutcome | undefined> {
  if (ctx.owner !== "fintech-lender" || !isWithdrawalNotice(message.path)) return undefined;
  return { status: await finchlyReadsAgain(worldFor(ctx)) };
}
