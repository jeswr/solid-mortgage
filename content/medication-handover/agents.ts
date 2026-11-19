// AUTHORED-BY Claude Opus 5.5
/**
 * The pharmacy's back office for the medication handover, called first from
 * `apps/pharmacy/src/agent.ts`. It reacts to two notices from Rosa's wallet in its inbox:
 *
 * - a grant notice (M2): it needs nothing more; the queue reads Rosa's list when the pharmacist
 *   opens her, so the handler only claims the message;
 * - a withdrawal notice: it reads the notice, then tries the live list once more, as its queue
 *   would on its next refresh. The pod refuses that read (403); the pharmacy's own dispensing
 *   records, in its own pod, are untouched.
 *
 * Contexts are typed structurally: content does not depend on the pod runtime.
 */

import { type AgentContextLike, agentWorld } from "../mortgage/browser.js";
import type { World } from "../mortgage/world.js";
import { HOLDER } from "./facts.js";
import { isGrantNotice, isWithdrawalNotice, readWithdrawalNotice } from "./grants.js";
import { pharmacyReadsList } from "./journey.js";

/** The world an agent acts in. Overridable for headless runs (shared keys, fixed calendar). */
export type MedicationWorldFor = (ctx: AgentContextLike) => World;

const defaultWorld: MedicationWorldFor = (ctx) => agentWorld(ctx);

export type PharmacyNoticeOutcome = { kind: "granted" } | { kind: "withdrawn"; status: number };

/** A notice from Rosa's wallet landed in the pharmacy's inbox. `undefined`: not this demo's. */
export async function medicationPharmacyInbox(
  message: { path: string; url: string },
  ctx: AgentContextLike,
  worldFor: MedicationWorldFor = defaultWorld,
): Promise<PharmacyNoticeOutcome | undefined> {
  if (isGrantNotice(message.path)) return { kind: "granted" };
  if (!isWithdrawalNotice(message.path)) return undefined;
  const world = worldFor(ctx);
  const notice = await readWithdrawalNotice(world, "pharmacy", message.url);
  if (!notice.dataSubjectIri.endsWith(`/${HOLDER}/profile/card#me`)) return undefined;
  const status = await pharmacyReadsList(world);
  return { kind: "withdrawn", status };
}
