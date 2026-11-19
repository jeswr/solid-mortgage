// AUTHORED-BY Claude Opus 5.5
/**
 * The back-office handlers each holder app's `src/agent.ts` calls first, before its mortgage
 * handlers: a grant notice in the inbox, and a change notice for Alex's address. Each returns
 * `true` when the message was this demo's, so the mortgage handler does not see it.
 *
 *   export const handlers = defineAgent({
 *     async inbox(message, ctx) {
 *       if (await movingHouseInbox("county", message, ctx)) return;
 *       ...mortgage handling
 *     },
 *     changed: (message, ctx) => movingHouseChanged("county", message, ctx),
 *   });
 *
 * Contexts are typed structurally: content does not depend on the pod runtime.
 */

import { type AgentContextLike, agentWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";
import { addressUrl, type Holder, isGrantNotice } from "./grants.js";
import { type ChangeOutcome, type NoticeOutcome, takeChange, takeGrantNotice } from "./holders.js";

export interface MovingHouseAgentContext extends AgentContextLike {
  watch(topic: string): Promise<void>;
}

/** The world an agent acts in. Overridable for headless runs (shared keys, fixed calendar). */
export type WorldFor = (ctx: MovingHouseAgentContext) => World;

const defaultWorld: WorldFor = (ctx) => agentWorld(ctx);

/** A grant notice from Alex's wallet landed in `holder`'s inbox. */
export async function movingHouseInbox(
  holder: Holder,
  message: { path: string; url: string },
  ctx: MovingHouseAgentContext,
  worldFor: WorldFor = defaultWorld,
): Promise<NoticeOutcome | undefined> {
  if (!isGrantNotice(message.path)) return undefined;
  const world = worldFor(ctx);
  return takeGrantNotice(world, holder, message.url, (topic) => ctx.watch(topic));
}

/** Alex's address changed: read it again (or learn that the grant is gone). */
export async function movingHouseChanged(
  holder: Holder,
  message: { url: string },
  ctx: MovingHouseAgentContext,
  worldFor: WorldFor = defaultWorld,
): Promise<ChangeOutcome | undefined> {
  const world = worldFor(ctx);
  if (message.url !== addressUrl(world)) return undefined;
  return takeChange(world, holder);
}
