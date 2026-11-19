// AUTHORED-BY Claude Opus 5.5
/** Which registered holder a demo centres on (DOM-free, so tests and tools can use it). */
import { DEFAULT_HOLDER, HOLDERS, type HolderId, isHolderId } from "@mortgage/demo-kit/registry";

/**
 * The holder a demo centres on: the tour's (each demo registers its holder with its tour), else
 * the one named in `holder`, else the default. A tour and a `holder.id` that disagree are a
 * wiring mistake, not something to guess between.
 */
export function demoHolder(opts: {
  holder?: { id?: HolderId; name?: string };
  tour?: { holder?: HolderId };
}): {
  id: HolderId;
  name: string;
} {
  const fromTour = opts.tour?.holder;
  const fromOption = opts.holder?.id;
  for (const id of [fromTour, fromOption])
    if (id !== undefined && !isHolderId(id)) throw new Error(`mountDemo: ${id} is not a holder`);
  if (fromTour !== undefined && fromOption !== undefined && fromTour !== fromOption)
    throw new Error(`mountDemo: the tour's holder is ${fromTour}, not ${fromOption}`);
  const id = fromTour ?? fromOption ?? DEFAULT_HOLDER;
  return { id, name: opts.holder?.name ?? HOLDERS[id].short };
}
