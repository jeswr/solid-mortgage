// AUTHORED-BY Claude Opus 5.5
import { useCallback, useState } from "react";

export type ActionState =
  | { readonly phase: "idle" }
  | { readonly phase: "running" }
  | { readonly phase: "done" }
  | { readonly phase: "failed"; readonly message: string; readonly status?: number };

/** The status a pod refusal carries (`PodRequestError.status`), when the error is one. */
export function statusOfError(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

/** Plain words for a failed step: a refusal says so, anything else says what broke. */
export function failureText(error: unknown): string {
  const status = statusOfError(error);
  if (status === 401 || status === 403) return `Alex's pod refused the request (${status}).`;
  if (status !== undefined) return `The pod answered ${status}.`;
  return error instanceof Error ? error.message : String(error);
}

/** Run one journey call from a button and keep its outcome for the screen. */
export function useAction(run: () => Promise<unknown>): [ActionState, () => void] {
  const [state, setState] = useState<ActionState>({ phase: "idle" });
  const start = useCallback(() => {
    setState({ phase: "running" });
    run().then(
      () => setState({ phase: "done" }),
      (error: unknown) => {
        console.error(error);
        const status = statusOfError(error);
        setState({
          message: failureText(error),
          phase: "failed",
          ...(status === undefined ? {} : { status }),
        });
      },
    );
  }, [run]);
  return [state, start];
}
