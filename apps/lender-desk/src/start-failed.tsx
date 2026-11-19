// AUTHORED-BY Claude Opus 5.5
import { StartFailed as SharedStartFailed } from "@mortgage/demo-kit/react";
import { org } from "./org.ts";

/** Shown when the in-browser pods could not start (no service worker or worker available). */
export function StartFailed({ error }: { error: unknown }) {
  return <SharedStartFailed error={error} org={org} />;
}
