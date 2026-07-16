"use client";

import { useEffect, useState } from "react";

/**
 * Live-status probes (showcase-patterns §1): client-side fetches to each zone's
 * same-origin `/api/health` route (proxied through the shell's multi-zone rewrites), with
 * periodic refresh and honest degradation — an unreachable zone is reported as
 * "not deployed", never hidden.
 */
export type ServiceStatus = "checking" | "live" | "not-deployed";

export const REFRESH_INTERVAL_MS = 30_000;
/** Per-probe budget: a stalled zone must not hold the others at "checking". */
export const PROBE_TIMEOUT_MS = 5_000;

async function probe(healthPath: string, signal: AbortSignal): Promise<ServiceStatus> {
  try {
    const response = await fetch(healthPath, { cache: "no-store", signal });
    if (!response.ok) return "not-deployed";
    const payload: unknown = await response.json();
    const ok =
      typeof payload === "object" && payload !== null && (payload as { ok?: unknown }).ok === true;
    return ok ? "live" : "not-deployed";
  } catch {
    return "not-deployed";
  }
}

/** Poll the given health paths; keys of the result are the health paths themselves. */
export function useServiceStatuses(healthPaths: string[]): Record<string, ServiceStatus> {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  // Deterministic serialization keeps the effect key stable for equal arrays without
  // embedding delimiter characters in the source (paths never contain quotes).
  const pathsKey = JSON.stringify(healthPaths);

  useEffect(() => {
    const paths = JSON.parse(pathsKey) as string[];
    let cancelled = false;
    const inFlight = new Set<string>();
    const controllers = new Set<AbortController>();

    async function refreshPath(path: string) {
      // Per-endpoint guard: a pending probe for this path is never doubled up
      // (e.g. interval ticks replayed in a burst after a background-tab wake),
      // and one endpoint's pending probe never gates any other endpoint.
      if (inFlight.has(path)) return;
      inFlight.add(path);
      const controller = new AbortController();
      controllers.add(controller);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // The timeout SETTLES the probe as well as aborting it: even a fetch that
        // ignores its abort signal cannot wedge this endpoint — the race resolves
        // "not-deployed" and polling resumes on the next interval.
        const status = await Promise.race([
          probe(path, controller.signal),
          new Promise<ServiceStatus>((resolve) => {
            timer = setTimeout(() => {
              controller.abort();
              resolve("not-deployed");
            }, PROBE_TIMEOUT_MS);
          }),
        ]);
        if (!cancelled) {
          setStatuses((previous) =>
            previous[path] === status ? previous : { ...previous, [path]: status },
          );
        }
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
        inFlight.delete(path);
      }
    }

    function refreshAll() {
      for (const path of paths) void refreshPath(path);
    }

    refreshAll();
    const interval = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      for (const controller of controllers) controller.abort();
    };
  }, [pathsKey]);

  return statuses;
}

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  checking: "Checking…",
  live: "Live",
  "not-deployed": "Not deployed",
};
