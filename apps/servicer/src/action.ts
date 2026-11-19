// AUTHORED-BY Claude Opus 5.5
/** Run one journey call from a button and keep its outcome (`@mortgage/demo-kit/react`). */
import { createUseRunAction, statusOfError } from "@mortgage/demo-kit/react";

export type { ActionState } from "@mortgage/demo-kit/react";
export { statusOfError };

/** Plain words for a failed step: a refusal says so, anything else says what broke. */
export function failureText(error: unknown): string {
  const status = statusOfError(error);
  if (status === 401 || status === 403) return `Alex's pod refused the request (${status}).`;
  if (status !== undefined) return `The pod answered ${status}.`;
  return error instanceof Error ? error.message : String(error);
}

export const useAction = createUseRunAction(failureText);
