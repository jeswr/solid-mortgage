// AUTHORED-BY Claude Opus 5.5
/**
 * The back-office handlers the apps' `src/agent.ts` call for the motor claim. Each returns
 * `undefined` when the message was not this demo's, so the app's other handlers see it.
 *
 *   // apps/repairer/src/agent.ts
 *   export const handlers = defineAgent({
 *     inbox: (message, ctx) => motorClaimRepairerInbox(message, ctx),
 *   });
 *
 *   // apps/wallet/src/agent.ts, inside the wallet's grant lock
 *   await motorClaimWalletExpiries(ctx);
 *
 * Contexts are typed structurally: content does not depend on the pod runtime.
 */

import { MORT } from "@mortgage/data-model";
import { type AgentContextLike, agentWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";
import { applyMotorClaimExpiries, isClaimGrantNotice } from "./grants.js";
import { isMessageOf } from "./messages.js";
import { takeAuthorisation, takeGrantNotice, takeReferral } from "./repairer.js";

/** The world an agent acts in. Overridable for headless runs (shared keys, fixed calendar). */
export type MotorWorldFor = (ctx: AgentContextLike) => World;

const defaultWorld: MotorWorldFor = (ctx) => agentWorld(ctx);

/** Something landed in Anvil's inbox: a referral, a copy of Alex's agreement, an authorisation. */
export async function motorClaimRepairerInbox(
  message: { path: string; url: string },
  ctx: AgentContextLike,
  worldFor: MotorWorldFor = defaultWorld,
): Promise<"referral" | "notice" | "authorisation" | undefined> {
  const world = worldFor(ctx);
  if (isMessageOf(message.path, MORT.MessageKind_RepairReferral)) {
    await takeReferral(world, message.url);
    return "referral";
  }
  if (isClaimGrantNotice(message.path)) {
    await takeGrantNotice(world, message.url);
    return "notice";
  }
  if (isMessageOf(message.path, MORT.MessageKind_RepairAuthorisation)) {
    await takeAuthorisation(world, message.url);
    return "authorisation";
  }
  return undefined;
}

/**
 * Alex's wallet applies the motor grants' ends (the repair job's ends with its invoice). Call it
 * inside the wallet's grant lock, beside the mortgage's own expiry pass.
 */
export function motorClaimWalletExpiries(
  ctx: AgentContextLike,
  worldFor: MotorWorldFor = defaultWorld,
): Promise<string[]> {
  return applyMotorClaimExpiries(worldFor(ctx));
}
