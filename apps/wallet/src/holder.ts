// AUTHORED-BY Claude Opus 5.5
/**
 * Whose pod Cairn shows. One wallet holds every registered holder's pod (docs/rebuild/flows.md
 * §1); the page shows one at a time. On load it is, in order:
 *
 * 1. `?holder=<id>`, when it names a registered holder (a link, or a reload after switching);
 * 2. the holder whose inbox a `?request=<url>` names (an organisation's consent redirect);
 * 3. the current demo's holder (its tour's `holder`);
 * 4. Alex.
 *
 * So the mortgage demo, which names no holder anywhere, shows Alex exactly as before.
 */
import {
  DEFAULT_HOLDER,
  type HolderId,
  holderOfPodUrl,
  isHolderId,
} from "@mortgage/demo-kit/registry";

export const HOLDER_PARAM = "holder";

export function initialHolder(href: string, demoHolder: HolderId | undefined): HolderId {
  const params = new URL(href).searchParams;
  const named = params.get(HOLDER_PARAM);
  if (isHolderId(named)) return named;
  const request = params.get("request");
  const fromRequest = request === null ? undefined : holderOfPodUrl(request);
  return fromRequest ?? demoHolder ?? DEFAULT_HOLDER;
}

/**
 * Keep the shown holder in the address bar, so a reload shows the same pod. The demo's own
 * holder needs no parameter, so the mortgage demo's URLs stay as they were.
 */
export function recordHolder(holder: HolderId, demoHolder: HolderId): void {
  try {
    const url = new URL(globalThis.location.href);
    if (holder === demoHolder) url.searchParams.delete(HOLDER_PARAM);
    else url.searchParams.set(HOLDER_PARAM, holder);
    if (url.href !== globalThis.location.href) history.replaceState(history.state, "", url.href);
  } catch {
    // No location (tests): nothing to record.
  }
}
