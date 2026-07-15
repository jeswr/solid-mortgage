import type { CSSProperties, ReactNode } from "react";
import { ILLUSTRATIVE_FIGURE_TAG } from "./disclaimers";

export interface IllustrativeFigureProps {
  /** The rendered rate/fee/payment/decision, e.g. "6.875%". */
  children: ReactNode;
}

const TAG_STYLE: CSSProperties = {
  fontSize: "0.75em",
  fontWeight: 400,
};

/**
 * R5 illustrative-figure tag (regn-optics §4.4): wraps any rendered rate, fee, payment, or
 * decision so the "illustrative figure, not an offer" qualifier sits in the same element
 * and travels with the number into any screenshot. Self-contained inline styles by design.
 */
export function IllustrativeFigure({ children }: IllustrativeFigureProps) {
  return (
    <span data-illustrative-figure="">
      {children}
      <span style={TAG_STYLE}>{` — ${ILLUSTRATIVE_FIGURE_TAG}`}</span>
    </span>
  );
}
