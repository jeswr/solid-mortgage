// AUTHORED-BY Claude Opus 5.5
import { onReset } from "@mortgage/pod-runtime";
import { useCallback, useEffect, useRef, useState } from "react";

export type PodState<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "error"; readonly error: Error };

/**
 * Load something from the pods when the screen opens, again after "Restart the demo", and on
 * `reload()`. A slow answer that arrives after a newer one is dropped.
 */
export function usePod<T>(load: () => Promise<T>): [PodState<T>, () => Promise<void>] {
  const [state, setState] = useState<PodState<T>>({ status: "loading" });
  const generation = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const value = await loadRef.current();
      if (mine === generation.current) setState({ status: "ready", value });
    } catch (error) {
      if (mine === generation.current)
        setState({
          error: error instanceof Error ? error : new Error(String(error)),
          status: "error",
        });
    }
  }, []);
  useEffect(() => {
    void reload();
    let stop: (() => void) | undefined;
    try {
      stop = onReset(() => void reload());
    } catch {
      // No runtime in this environment (unit tests): nothing to follow.
    }
    return () => {
      generation.current++;
      stop?.();
    };
  }, [reload]);
  return [state, reload];
}
