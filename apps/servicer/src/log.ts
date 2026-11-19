// AUTHORED-BY Claude Opus 5.5
/**
 * What the pods have already answered, from the runtime's event log. Screens use it to decide
 * which action the pod state allows (free play) without sending requests of their own: a probe
 * that the pod refuses would show in the Lens as a refusal that is not part of the story. The
 * fold and the hook are shared (`@mortgage/demo-kit/react`).
 */
import { createUsePodLog } from "@mortgage/demo-kit/react";
import { onEvent, onReset } from "@mortgage/pod-runtime";

export {
  EMPTY_LOG,
  foldEntry,
  hasWritten,
  hasWrittenUnder,
  type PodLog,
} from "@mortgage/demo-kit/react";

/** The log as it stands, kept current from every tab; cleared by "Restart the demo". */
export const usePodLog = createUsePodLog({ onEvent, onReset });
