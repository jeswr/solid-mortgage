// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  PROBE_TIMEOUT_MS,
  REFRESH_INTERVAL_MS,
  useServiceStatuses,
} from "../app/components/use-service-status";

function liveResponse(): Response {
  return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
}

/** A fetch that never settles — rejecting on abort only when the zone is well-behaved. */
function stalledFetch(options: { respectAbort: boolean }) {
  return (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      if (options.respectAbort) {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }
    });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("a stalled endpoint is aborted after the probe timeout and reported not-deployed", async () => {
  vi.stubGlobal("fetch", vi.fn(stalledFetch({ respectAbort: true })));
  const { result } = renderHook(() => useServiceStatuses(["/wallet/api/health"]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS + 1);
  });
  expect(result.current["/wallet/api/health"]).toBe("not-deployed");
});

test("endpoints update independently: a stalled zone does not hold a live one at checking", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "/api/health") return Promise.resolve(liveResponse());
    return stalledFetch({ respectAbort: true })(input, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useServiceStatuses(["/api/health", "/wallet/api/health"]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(result.current["/api/health"]).toBe("live");
  expect(result.current["/wallet/api/health"]).toBeUndefined();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS + 1);
  });
  expect(result.current["/wallet/api/health"]).toBe("not-deployed");
});

test("refresh cycles never overlap: while a cycle is still in flight, interval ticks are skipped", async () => {
  // Pathological zone: the fetch ignores its abort signal entirely, so the first
  // cycle never finishes. Later interval ticks must skip, not stack more requests.
  const fetchMock = vi.fn(stalledFetch({ respectAbort: false }));
  vi.stubGlobal("fetch", fetchMock);
  renderHook(() => useServiceStatuses(["/wallet/api/health"]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 3 + 1);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("completed cycles keep refreshing on the interval", async () => {
  const fetchMock = vi.fn(async () => liveResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useServiceStatuses(["/api/health"]));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(result.current["/api/health"]).toBe("live");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 2);
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("source contains no literal control characters (git must not treat it as binary)", async () => {
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  // vitest runs with --root apps/tour, so cwd is the app directory.
  const source = await readFile(
    resolve(process.cwd(), "app/components/use-service-status.ts"),
    "utf8",
  );
  const hasControl = [...source].some(
    (ch) => ch !== "\n" && ch !== "\t" && ch !== "\r" && ch < " ",
  );
  expect(hasControl).toBe(false);
});
