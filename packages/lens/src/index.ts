// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/lens`: the Solid Lens (`<solid-lens>`) and the journey ledger (`<journey-ledger>`).
 * Importing this module defines both elements. The DOM-free model is also at
 * `@mortgage/lens/model`.
 */
import { defineSolidLens } from "./element.js";
import { defineJourneyLedger } from "./ledger-element.js";

export { chipSeen, defineSolidLens, SolidLens } from "./element.js";
export { defineJourneyLedger, JourneyLedger } from "./ledger-element.js";
export { LEDGER_CSS, type LedgerViewOptions, renderLedger } from "./ledger-view.js";
export { LensMap, type MotionKind } from "./map.js";
export * from "./model-index.js";

if (typeof customElements !== "undefined") {
  defineSolidLens();
  defineJourneyLedger();
}
