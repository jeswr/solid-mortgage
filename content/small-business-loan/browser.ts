// AUTHORED-BY Claude Opus 5.5
/**
 * The pages' side: a `World` for a small business loan page in the browser, on the day of its
 * tour step. Demo 3's `kybWorld` already does exactly this (the runtime typed structurally, the
 * demo clock moved first), so this module names it for this demo.
 *
 *   const world = await loanWorld(runtime, "business-lender", DAY.apply);
 */

export { type KybRuntime as LoanRuntime, kybWorld as loanWorld } from "../business-kyb/browser.js";
