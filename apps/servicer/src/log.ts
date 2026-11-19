// AUTHORED-BY Claude Opus 5.5
/**
 * What the pods have already answered, from the runtime's event log. Screens use it to decide
 * which action the pod state allows (free play) without sending requests of their own: a probe
 * that the pod refuses would show in the Lens as a refusal that is not part of the story.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { onEvent, onReset } from "@mortgage/pod-runtime";
import { useEffect, useState } from "react";

/** Successful writes and deletes, folded in log order. */
export interface PodLog {
  /** `<pod>:<path>` of every resource that exists after the logged writes. */
  readonly written: ReadonlySet<string>;
  /** Grows with every entry, so React sees a change. */
  readonly size: number;
}

export const EMPTY_LOG: PodLog = { size: 0, written: new Set() };

const keyOf = (pod: string, path: string) => `${pod}:${path.split("?")[0]}`;

/** Fold one entry into the log. Pure: tests drive it with hand-written entries. */
export function foldEntry(log: PodLog, entry: LensEntry): PodLog {
  if (entry.source !== "pod" || entry.status < 200 || entry.status > 299) return log;
  if (entry.kind !== "write" && entry.kind !== "delete") return log;
  const written = new Set(log.written);
  if (entry.kind === "write") written.add(keyOf(entry.pod, entry.path));
  else written.delete(keyOf(entry.pod, entry.path));
  return { size: log.size + 1, written };
}

/** True when `path` (pod-relative, leading slash) was written in `pod` and not deleted since. */
export const hasWritten = (log: PodLog, pod: string, path: string): boolean =>
  log.written.has(keyOf(pod, path));

/** True when some resource whose path starts with `prefix` was written in `pod`. */
export const hasWrittenUnder = (log: PodLog, pod: string, prefix: string): boolean =>
  [...log.written].some((key) => key.startsWith(keyOf(pod, prefix)));

/** The log as it stands, kept current from every tab; cleared by "Restart the demo". */
export function usePodLog(): PodLog {
  const [log, setLog] = useState<PodLog>(EMPTY_LOG);
  useEffect(() => {
    const stop = onEvent((entry) => setLog((current) => foldEntry(current, entry)), {
      replay: true,
    });
    const stopReset = onReset(() => setLog(EMPTY_LOG));
    return () => {
      stop();
      stopReset();
    };
  }, []);
  return log;
}
