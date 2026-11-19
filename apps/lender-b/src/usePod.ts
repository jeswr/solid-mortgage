// AUTHORED-BY Claude Opus 5.5
/**
 * Load something from the pods when the screen opens, again after "Restart the demo", and on
 * `reload()` (the shared hook in `@mortgage/demo-kit/react`, bound to this runtime).
 */
import { createUsePod } from "@mortgage/demo-kit/react";
import { onReset } from "@mortgage/pod-runtime";

export type { PodState } from "@mortgage/demo-kit/react";

export const usePod = createUsePod({ onReset });
