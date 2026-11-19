// AUTHORED-BY Claude Opus 5.5
/** Small pieces every Sextant screen uses: refusals, errors, loading and the catch-up offer. */
import { CatchUp as SharedCatchUp } from "@mortgage/demo-kit/react";
import { catchUpTo, stepsBefore, useCatchUp } from "./runtime.ts";

export { OutcomeNote, podPath, Refusal } from "@mortgage/demo-kit/react";

const control = { catchUpTo, useCatchUp };

/**
 * Free play: when this screen's step needs earlier steps, offer to restart the demo and run
 * them. The tour never needs this; it runs the steps in order.
 */
export function CatchUp({ step, label, needed }: { step: string; label: string; needed: boolean }) {
  return (
    <SharedCatchUp
      control={control}
      count={stepsBefore(step)}
      label={label}
      needed={needed}
      step={step}
    />
  );
}
