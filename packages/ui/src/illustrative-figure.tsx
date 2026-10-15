import type { CSSProperties, ReactNode } from "react";
import { ILLUSTRATIVE_FIGURE_TAG } from "./disclaimers";

export interface IllustrativeFigureProps {
  /** The rendered rate/fee/payment/decision, e.g. "6.875%" or "$8,500". */
  children: ReactNode;
  /**
   * Unit that belongs to the figure, e.g. "a month". Rendered INSIDE the tagged value, before
   * the tag ("$8,500 a month — illustrative figure, not an offer"), so the tag never reads as
   * "not an offer a month". Pass the unit here instead of writing it after the component.
   */
  unit?: ReactNode;
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
export function IllustrativeFigure({ children, unit }: IllustrativeFigureProps) {
  return (
    <span data-illustrative-figure="">
      {children}
      {unit !== undefined && <> {unit}</>}
      <span style={TAG_STYLE}>{` — ${ILLUSTRATIVE_FIGURE_TAG}`}</span>
    </span>
  );
}
