// @vitest-environment jsdom
// AUTHORED-BY Claude Opus 5.5
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LensEntry } from "../src/contracts/index.js";
import {
  CatchUp,
  createCatchUp,
  createPodHooks,
  createPodsContext,
  createUsePod,
  createUsePodLog,
  createUsePodResource,
  createUseRunAction,
  EMPTY_LOG,
  foldEntry,
  hasWritten,
  hasWrittenUnder,
  OutcomeNote,
  type PodEvents,
  podPath,
  Refusal,
  readFailure,
  StartFailed,
  statusOfError,
} from "../src/react.js";
import type { OrgRecord } from "../src/registry.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** A stand-in for the runtime's two subscriptions, driven by the test. */
function fakeEvents() {
  const listeners = new Set<(entry: LensEntry) => void>();
  const resets = new Set<() => void>();
  const log: LensEntry[] = [];
  const events: PodEvents = {
    onEvent(callback, options) {
      if (options?.replay) for (const entry of log) callback(entry);
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    onReset(callback) {
      resets.add(callback);
      return () => resets.delete(callback);
    },
  };
  return {
    emit(entry: LensEntry) {
      log.push(entry);
      for (const listener of listeners) listener(entry);
    },
    events,
    listeners,
    reset() {
      for (const reset of resets) reset();
    },
    resets,
  };
}

let id = 0;
const entry = (pod: string, path: string, kind = "write", status = 201): LensEntry =>
  ({
    actor: { org: pod, viaAgent: false, webid: `https://x/pods/${pod}/profile/card#me` },
    at: "2026-08-03T10:00:00Z",
    id: ++id,
    kind,
    method: kind === "delete" ? "DELETE" : kind === "read" ? "GET" : "PUT",
    path,
    pod,
    source: "pod",
    status,
  }) as LensEntry;

class RequestError extends Error {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly status: number,
  ) {
    super(`${method} ${url} answered ${status}`);
  }
}
const refusalOf = (error: unknown) =>
  error instanceof RequestError && (error.status === 401 || error.status === 403)
    ? { method: error.method, status: error.status, url: error.url }
    : undefined;

describe("small helpers", () => {
  it("reads a status off an error, and nothing off anything else", () => {
    expect(statusOfError(new RequestError("GET", "u", 403))).toBe(403);
    expect(statusOfError({ status: "403" })).toBeUndefined();
    expect(statusOfError(new Error("x"))).toBeUndefined();
    expect(statusOfError(null)).toBeUndefined();
  });

  it("shows a pod URL relative to the pods", () => {
    expect(podPath("http://127.0.0.1:4000/pods/alex/property/subject")).toBe(
      "/alex/property/subject",
    );
  });

  it("classifies failed reads", () => {
    expect(readFailure(new RequestError("GET", "u", 401))).toEqual({
      phase: "refused",
      status: 401,
    });
    expect(readFailure(new RequestError("GET", "u", 404))).toEqual({ phase: "missing" });
    expect(readFailure(new Error("boom"))).toEqual({ message: "boom", phase: "failed" });
  });

  it("folds successful writes and deletes, ignoring reads and failures", () => {
    let log = foldEntry(EMPTY_LOG, entry("alex", "/a?x=1"));
    log = foldEntry(log, entry("alex", "/b/c"));
    log = foldEntry(log, entry("alex", "/d", "write", 403));
    log = foldEntry(log, entry("alex", "/e", "read", 200));
    expect(hasWritten(log, "alex", "/a")).toBe(true);
    expect(hasWritten(log, "alex", "/d")).toBe(false);
    expect(hasWritten(log, "alex", "/e")).toBe(false);
    expect(hasWrittenUnder(log, "alex", "/b/")).toBe(true);
    expect(log.size).toBe(2);
    log = foldEntry(log, entry("alex", "/a", "delete", 204));
    expect(hasWritten(log, "alex", "/a")).toBe(false);
  });
});

describe("createPodsContext", () => {
  function setup() {
    const fake = fakeEvents();
    const setDay = vi.fn(async (_day: number) => undefined);
    const beat = async (_world: string) => undefined;
    const kit = createPodsContext<string, { day: number; dayOne: string }>({
      beatDayOf: (run) => (run === beat ? 4 : undefined),
      createWorld: (app, day, info) => `${app}@${day}/${info.dayOne}`,
      events: fake.events,
      setDay,
    });
    return { beat, fake, kit, setDay };
  }

  it("re-reads after a pod change (not a read) and runs a beat on its day", async () => {
    vi.useFakeTimers();
    const { beat, fake, kit, setDay } = setup();
    const load = vi.fn(async (pods: { world(): string }) => pods.world());
    const seen: { pods: ReturnType<typeof kit.usePods> } = { pods: null };
    function Screen() {
      seen.pods = kit.usePods();
      const loaded = kit.usePodData(load);
      return <p>{loaded.state === "ready" ? loaded.data : loaded.state}</p>;
    }
    render(
      <kit.PodsProvider app="bank" info={{ day: 2, dayOne: "2026-08-03" }}>
        <Screen />
      </kit.PodsProvider>,
    );
    await act(async () => {});
    expect(screen.getByText("bank@2/2026-08-03")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);

    act(() => fake.emit(entry("alex", "/x", "read", 200)));
    await act(async () => vi.advanceTimersByTime(200));
    expect(load).toHaveBeenCalledTimes(1);

    act(() => fake.emit(entry("alex", "/x", "grant", 205)));
    await act(async () => vi.advanceTimersByTime(200));
    expect(load).toHaveBeenCalledTimes(2);

    const run = vi.fn(beat);
    await act(async () => {
      // A beat's day is looked up by identity; this wrapper is not a beat, so it runs today.
      await seen.pods?.runBeat(run);
    });
    expect(setDay).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith("bank@2/2026-08-03");
    await act(async () => {
      await seen.pods?.runBeat(beat);
    });
    expect(setDay).toHaveBeenCalledWith(4);
    expect(seen.pods?.day).toBe(4);

    act(() => fake.reset());
    await act(async () => vi.advanceTimersByTime(200));
    expect(seen.pods?.day).toBe(1);
  });

  it("reports a failed read and has no pods outside the provider", async () => {
    const { kit } = setup();
    const outside = renderHook(() => kit.usePods());
    expect(outside.result.current).toBeNull();
    function Screen() {
      const loaded = kit.usePodData(async () => {
        throw new Error("no");
      });
      return <p>{loaded.state}</p>;
    }
    render(
      <kit.PodsProvider app="bank" info={{ day: 1, dayOne: "2026-08-03" }}>
        <Screen />
      </kit.PodsProvider>,
    );
    await waitFor(() => expect(screen.getByText("failed")).toBeTruthy());
  });
});

describe("createPodHooks", () => {
  it("re-reads when a watched pod changes or the demo restarts, and drops stale answers", async () => {
    vi.useFakeTimers();
    const fake = fakeEvents();
    const hooks = createPodHooks<"alex" | "lender">({ events: fake.events, refusalOf });
    let calls = 0;
    const { result } = renderHook(() =>
      hooks.usePodState(async () => {
        calls += 1;
        return calls;
      }, ["alex"]),
    );
    await act(async () => {});
    expect(result.current.outcome).toEqual({ state: "ok", value: 1 });

    act(() => fake.emit(entry("lender", "/x")));
    act(() => fake.emit(entry("alex", "/x", "denied", 403)));
    await act(async () => vi.advanceTimersByTime(200));
    expect(calls).toBe(1);

    act(() => fake.emit(entry("alex", "/x")));
    await act(async () => vi.advanceTimersByTime(200));
    expect(result.current.outcome).toEqual({ state: "ok", value: 2 });

    await act(async () => fake.reset());
    expect(result.current.outcome).toEqual({ state: "ok", value: 3 });
  });

  it("turns a 401/403 into a refusal and anything else into an error", async () => {
    const fake = fakeEvents();
    const hooks = createPodHooks({ events: fake.events, refusalOf });
    expect(hooks.outcomeOf(new RequestError("PUT", "http://h/pods/alex/a", 403))).toEqual({
      method: "PUT",
      state: "refused",
      status: 403,
      url: "http://h/pods/alex/a",
    });
    expect(hooks.outcomeOf(new RequestError("PUT", "u", 500))).toEqual({
      message: "PUT u answered 500",
      state: "error",
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => hooks.useAction());
    expect(result.current.outcome).toEqual({ state: "idle" });
    await act(() =>
      result.current.run(async () => {
        throw new RequestError("GET", "http://h/pods/alex/a", 401);
      }),
    );
    expect(result.current.outcome.state).toBe("refused");
    await act(() => result.current.run(async () => undefined));
    expect(result.current.outcome).toEqual({ state: "ok", value: true });
  });

  it("renders outcomes", () => {
    const { rerender } = render(<OutcomeNote outcome={{ state: "loading" }} />);
    expect(screen.getByText("Reading the pods…")).toBeTruthy();
    rerender(
      <OutcomeNote
        outcome={{ method: "GET", state: "refused", status: 403, url: "http://h/pods/alex/a" }}
        why="No grant."
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Refused by the pod (403). GET /alex/a No grant.",
    );
    rerender(<OutcomeNote outcome={{ message: "boom", state: "error" }} />);
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong: boom");
    rerender(<OutcomeNote outcome={{ state: "idle" }} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<Refusal method="PUT" status={401} url="http://h/pods/bank/b" />);
    expect(screen.getByRole("alert").textContent).toBe("Refused by the pod (401). PUT /bank/b");
  });
});

describe("createCatchUp", () => {
  it("restarts, runs the earlier steps in order, and keeps progress outside React", async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const control = createCatchUp({
      async beatsBefore(step) {
        order.push(`plan ${step}`);
        return [
          {
            name: "first",
            run: async () => {
              order.push("first");
              await gate;
            },
          },
          { name: "second", run: async () => order.push("second") },
        ];
      },
      reset: async () => order.push("reset"),
    });
    render(<CatchUp control={control} count={2} label="Nothing yet." needed step="s3" />);
    expect(screen.getByRole("heading").textContent).toBe("Nothing to work on yet");
    expect(screen.getByText(/runs the 2 earlier steps/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Running: first"));
    expect(screen.getByRole("heading").textContent).toBe("Catching up");
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    // A second request while running is ignored.
    await control.catchUpTo("s3");
    await act(async () => release());
    await waitFor(() =>
      expect(screen.getByRole("heading").textContent).toBe("Nothing to work on yet"),
    );
    expect(order).toEqual(["reset", "plan s3", "first", "second"]);
  });

  it("shows where a run stopped, even when no longer needed", async () => {
    const control = createCatchUp({
      beatsBefore: async () => [
        {
          name: "x",
          run: async () => {
            throw new Error("refused");
          },
        },
      ],
      reset: async () => undefined,
    });
    const { container } = render(
      <CatchUp control={control} count={1} label="l" needed={false} step="s" />,
    );
    expect(container.textContent).toBe("");
    await act(() => control.catchUpTo("s"));
    expect(screen.getByRole("alert").textContent).toBe("The catch-up stopped: refused");
  });
});

describe("the smaller loaders", () => {
  it("usePod loads, reloads on restart, and survives a runtime that is not there", async () => {
    const fake = fakeEvents();
    const usePod = createUsePod(fake.events);
    let n = 0;
    const { result, unmount } = renderHook(() => usePod(async () => ++n));
    await waitFor(() => expect(result.current[0]).toEqual({ status: "ready", value: 1 }));
    await act(async () => fake.reset());
    expect(result.current[0]).toEqual({ status: "ready", value: 2 });
    unmount();
    expect(fake.resets.size).toBe(0);

    const absent = createUsePod({
      onReset: () => {
        throw new Error("no runtime");
      },
    });
    const failing = renderHook(() =>
      absent(async () => {
        throw "plain";
      }),
    );
    await waitFor(() => expect(failing.result.current[0].status).toBe("error"));
  });

  it("useAction keeps a failure in the app's words, with its status", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const useAction = createUseRunAction((error) => `said: ${statusOfError(error)}`);
    const failing = async () => {
      throw new RequestError("PUT", "u", 403);
    };
    const { result } = renderHook(() => useAction(failing));
    act(() => result.current[1]());
    expect(result.current[0]).toEqual({ phase: "running" });
    await waitFor(() =>
      expect(result.current[0]).toEqual({ message: "said: 403", phase: "failed", status: 403 }),
    );
  });

  it("usePodLog replays the log and clears on restart", async () => {
    const fake = fakeEvents();
    fake.emit(entry("alex", "/early"));
    const usePodLog = createUsePodLog(fake.events);
    const { result } = renderHook(() => usePodLog());
    expect(hasWritten(result.current, "alex", "/early")).toBe(true);
    act(() => fake.emit(entry("bank", "/later")));
    expect(hasWritten(result.current, "bank", "/later")).toBe(true);
    act(() => fake.reset());
    expect(result.current).toBe(EMPTY_LOG);
  });

  it("usePodResource reads once enabled and reports refusals", async () => {
    const read = vi.fn(async (url: string) => {
      if (url.endsWith("/secret")) throw new RequestError("GET", url, 403);
      return `body of ${url}`;
    });
    const usePodResource = createUsePodResource(read);
    const wrap = (url: string, data: string) => `${url}: ${data}`;
    const { result, rerender } = renderHook(
      ({ url, enabled }) => usePodResource(url, enabled, wrap),
      { initialProps: { enabled: false, url: "/a" } },
    );
    expect(result.current).toEqual({ phase: "idle" });
    expect(read).not.toHaveBeenCalled();
    rerender({ enabled: true, url: "/a" });
    await waitFor(() => expect(result.current).toEqual({ phase: "ok", value: "/a: body of /a" }));
    rerender({ enabled: true, url: "/secret" });
    await waitFor(() => expect(result.current).toEqual({ phase: "refused", status: 403 }));
  });
});

describe("StartFailed", () => {
  it("keeps the trust banner when the pods cannot start", () => {
    const org: OrgRecord = {
      actsAs: "lender",
      organisation: "Example Home Loans",
      persona: { name: "Pat Example", role: "processor" },
      role: "Lender",
      short: "Example",
      slug: "lender-desk",
      themeColor: "#123456",
      title: "Example Desk",
    };
    const { container } = render(<StartFailed error={new Error("no worker")} org={org} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The pods could not start");
    expect(container.textContent).toContain("They did not start here: no worker");
    expect(container.querySelector("[data-demo-trust]")).not.toBeNull();
  });
});
