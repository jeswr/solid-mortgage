// AUTHORED-BY Claude Opus 5.5
/**
 * `@mortgage/demo-kit/react`: the React plumbing every demo app needs between its screens and the
 * pod runtime. Domain-generic: the runtime's functions are passed in (this package does not
 * depend on the runtime), so an app binds them once in its own small runtime module.
 *
 * - {@link createPodsContext}: a provider that re-reads on pod changes and runs journey steps on
 *   their simulated day, with {@link Pods.runBeat} and a `usePodData` hook.
 * - {@link createPodHooks}: `usePodState` (re-read when a watched pod changes) and `useAction`
 *   (an action whose refusal by the pod ends as `refused`).
 * - {@link createCatchUp} and {@link CatchUp}: free play's "restart and run the earlier steps".
 * - {@link createUsePod}, {@link createUseRunAction}, {@link createUsePodLog},
 *   {@link createUsePodResource}: smaller loaders and the event-log fold.
 * - {@link Refusal}, {@link OutcomeNote}, {@link StartFailed}: the shared pieces of markup. Each
 *   app styles them with its own tokens.
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { LensEntry } from "./contracts/index.js";
import type { OrgRecord } from "./registry.js";
import { DemoTrust, TrustBanner } from "./trust.js";

/** The two runtime subscriptions the hooks follow (`onEvent` and `onReset` of the pod runtime). */
export interface PodEvents {
  onEvent(callback: (entry: LensEntry) => void, options?: { replay?: boolean }): () => void;
  onReset(callback: () => void): () => void;
}

/** A pod's refusal of one request: the status (401 or 403), the method and the URL. */
export interface PodRefusal {
  readonly status: number;
  readonly method: string;
  readonly url: string;
}

/** The numeric `status` an error carries (a pod request error), when it has one. */
export function statusOfError(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Pod-relative form of a pod URL, for display: "/alex/property/subject-property". */
export function podPath(url: string): string {
  return new URL(url).pathname.replace(/^\/pods/, "");
}

// ---------------------------------------------------------------------------------------------
// A pods context: one World per screen, re-read after every change.

/** What a screen gets from {@link createPodsContext}'s provider. */
export interface Pods<W> {
  /** A world acting as this app's organisation, on `day` (default: the demo's current day). */
  world(day?: number): W;
  /** Run a journey function on the simulated day of its beat, moving the demo clock forward. */
  runBeat(run: (world: W) => Promise<unknown>): Promise<void>;
  /** Changes whenever a pod reports a change, so screens re-read what they show. */
  readonly version: number;
  readonly day: number;
}

export type Loaded<T> =
  | { state: "waiting" }
  | { state: "ready"; data: T }
  | { state: "failed"; error: unknown };

export interface PodsContextOptions<W, I extends { day: number }> {
  readonly events: PodEvents;
  /** Move the demo clock (the runtime's `setDay`). */
  setDay(day: number): Promise<unknown>;
  /** The day a journey function belongs to, if it is one. */
  beatDayOf(run: (world: W) => Promise<unknown>): number | undefined;
  /** Build the world `app` acts in on `day`. */
  createWorld(app: string, day: number, info: I): W;
}

/** Pod event kinds that change what a screen shows. Reads would answer every read with another. */
const CHANGES = new Set(["write", "delete", "grant", "revoke"]);

export function createPodsContext<W, I extends { day: number }>(options: PodsContextOptions<W, I>) {
  const PodsContext = createContext<Pods<W> | null>(null);

  function PodsProvider({ app, info, children }: { app: string; info: I; children: ReactNode }) {
    const [version, setVersion] = useState(0);
    const [day, setCurrentDay] = useState(Math.max(1, info.day));
    const dayRef = useRef(day);
    useEffect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const bump = () => {
        clearTimeout(timer);
        timer = setTimeout(() => setVersion((v) => v + 1), 150);
      };
      const stopEvents = options.events.onEvent((entry) => {
        if (entry.source === "pod" && CHANGES.has(entry.kind)) bump();
      });
      const stopReset = options.events.onReset(() => {
        dayRef.current = 1;
        setCurrentDay(1);
        bump();
      });
      return () => {
        clearTimeout(timer);
        stopEvents();
        stopReset();
      };
    }, []);
    const pods = useMemo<Pods<W>>(() => {
      const world = (at?: number) => options.createWorld(app, at ?? dayRef.current, info);
      return {
        day,
        async runBeat(run) {
          const beatDay = options.beatDayOf(run) ?? dayRef.current;
          if (beatDay > dayRef.current) {
            await options.setDay(beatDay);
            dayRef.current = beatDay;
            setCurrentDay(beatDay);
          }
          await run(world(beatDay));
        },
        version,
        world,
      };
    }, [app, day, info, version]);
    return <PodsContext.Provider value={pods}>{children}</PodsContext.Provider>;
  }

  function usePods(): Pods<W> | null {
    return useContext(PodsContext);
  }

  /** Read something from the pods, again after every pod change. */
  function usePodData<T>(load: (pods: Pods<W>) => Promise<T>): Loaded<T> {
    const pods = usePods();
    const [loaded, setLoaded] = useState<Loaded<T>>({ state: "waiting" });
    const loadRef = useRef(load);
    loadRef.current = load;
    useEffect(() => {
      if (pods === null) return;
      let live = true;
      loadRef.current(pods).then(
        (data) => live && setLoaded({ data, state: "ready" }),
        (error: unknown) => live && setLoaded({ error, state: "failed" }),
      );
      return () => {
        live = false;
      };
    }, [pods]);
    return loaded;
  }

  return { PodsProvider, usePodData, usePods };
}

// ---------------------------------------------------------------------------------------------
// Pod state and actions that end in an outcome (a refusal is shown, never swallowed).

/** What a read or an action ended in. A 401 or 403 is a refusal by the pod, shown as such. */
export type Outcome<T> =
  | { state: "loading" }
  | { state: "ok"; value: T }
  | { state: "refused"; status: number; method: string; url: string }
  | { state: "error"; message: string };

export type ActionOutcome = Outcome<true> | { state: "idle" } | { state: "running" };

export interface PodHooksOptions {
  readonly events: PodEvents;
  /** The refusal an error stands for (a 401 or 403 from a pod), or `undefined`. */
  refusalOf(error: unknown): PodRefusal | undefined;
}

export function createPodHooks<Owner extends string = string>(options: PodHooksOptions) {
  function outcomeOf<T>(error: unknown): Outcome<T> {
    const refusal = options.refusalOf(error);
    if (refusal !== undefined) {
      return { method: refusal.method, state: "refused", status: refusal.status, url: refusal.url };
    }
    return { message: messageOf(error), state: "error" };
  }

  /** Read pod state, and read it again when a watched pod changes or the demo restarts. */
  function usePodState<T>(
    load: () => Promise<T>,
    watch: readonly Owner[],
    deps: readonly unknown[] = [],
  ) {
    const [outcome, setOutcome] = useState<Outcome<T>>({ state: "loading" });
    const loadRef = useRef(load);
    loadRef.current = load;
    const generation = useRef(0);
    const reload = useCallback(() => {
      const mine = ++generation.current;
      loadRef
        .current()
        .then((value) => {
          if (mine === generation.current) setOutcome({ state: "ok", value });
        })
        .catch((error: unknown) => {
          if (mine === generation.current) setOutcome(outcomeOf<T>(error));
        });
    }, []);
    useEffect(() => {
      reload();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const soon = () => {
        clearTimeout(timer);
        timer = setTimeout(reload, 150);
      };
      const stopEvents = options.events.onEvent((entry) => {
        if (
          entry.source === "pod" &&
          entry.kind !== "read" &&
          entry.kind !== "denied" &&
          watch.includes(entry.pod as Owner)
        )
          soon();
      });
      const stopReset = options.events.onReset(reload);
      return () => {
        clearTimeout(timer);
        stopEvents();
        stopReset();
      };
      // biome-ignore lint/correctness/useExhaustiveDependencies: the caller's inputs, as in useEffect
    }, deps);
    return { outcome, reload };
  }

  /** Run an action; a pod refusal ends as `refused`, never as a silent failure. */
  function useAction() {
    const [outcome, setOutcome] = useState<ActionOutcome>({ state: "idle" });
    const run = useCallback(async (action: () => Promise<unknown>) => {
      setOutcome({ state: "running" });
      try {
        await action();
        setOutcome({ state: "ok", value: true });
      } catch (error) {
        console.error(error);
        setOutcome(outcomeOf<true>(error));
      }
    }, []);
    return { outcome, run };
  }

  return { outcomeOf, useAction, usePodState };
}

// ---------------------------------------------------------------------------------------------
// Free play's catch-up: restart from the seed, then run every earlier step in order.

/**
 * Where a catch-up run is. It lives outside React so a screen that re-renders mid-run (the
 * condition that offered the catch-up becomes false as soon as an early step lands) still shows
 * the progress, and step buttons stay disabled until the run is over.
 */
export interface CatchUpState {
  readonly running: boolean;
  readonly beat?: string;
  readonly error?: string;
}

/** One earlier step a catch-up runs. */
export interface CatchUpBeat {
  readonly name: string;
  run(): Promise<unknown>;
}

export interface CatchUpOptions {
  /** Restart the demo from its seed (the runtime's `resetDemo`). */
  reset(): Promise<unknown>;
  /** The steps to run, in order, before `step`. */
  beatsBefore(step: string): Promise<readonly CatchUpBeat[]>;
}

export interface CatchUpControl {
  /** Restart the demo, then run every earlier step: the same order every time. */
  catchUpTo(step: string): Promise<void>;
  useCatchUp(): CatchUpState;
}

export function createCatchUp(options: CatchUpOptions): CatchUpControl {
  let state: CatchUpState = { running: false };
  const listeners = new Set<() => void>();
  const set = (next: CatchUpState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    async catchUpTo(step) {
      if (state.running) return;
      set({ beat: "restarting", running: true });
      try {
        await options.reset();
        for (const beat of await options.beatsBefore(step)) {
          set({ beat: beat.name, running: true });
          await beat.run();
        }
        set({ running: false });
      } catch (error) {
        set({ error: messageOf(error), running: false });
      }
    },
    useCatchUp() {
      return useSyncExternalStore(subscribe, () => state);
    },
  };
}

/**
 * Free play: when a screen's step needs earlier steps, offer to restart the demo and run them.
 * The tour never needs this; it runs the steps in order. `count` is how many steps that is.
 */
export function CatchUp({
  control,
  step,
  label,
  needed,
  count,
}: {
  control: CatchUpControl;
  step: string;
  label: string;
  needed: boolean;
  count: number;
}) {
  const state = control.useCatchUp();
  if (!needed && !state.running && state.error === undefined) return null;
  return (
    <section className="catch-up" aria-labelledby="catch-up-heading">
      <h2 id="catch-up-heading">{state.running ? "Catching up" : "Nothing to work on yet"}</h2>
      {state.running ? null : <p>{label}</p>}
      <p className="muted">
        Exploring on your own? This restarts the demo from its starting data and runs the {count}{" "}
        earlier steps of the journey, in order, against the pods in your browser.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={state.running}
        onClick={() => void control.catchUpTo(step)}
      >
        {state.running ? "Running…" : "Restart and run the earlier steps"}
      </button>
      <p className="muted" role="status">
        {state.running ? `Running: ${state.beat ?? "starting"}` : ""}
      </p>
      {state.error === undefined ? null : (
        <div className="failure" role="alert">
          The catch-up stopped: {state.error}
        </div>
      )}
    </section>
  );
}

export function Refusal({
  status,
  method,
  url,
  why,
}: {
  status: number;
  method: string;
  url: string;
  why?: string;
}) {
  return (
    <div className="refusal" role="alert">
      <strong>Refused by the pod ({status}).</strong> {method} {podPath(url)}
      {why === undefined ? null : <span className="refusal-why"> {why}</span>}
    </div>
  );
}

/** Render a loading, refused or failed outcome; `null` when the outcome is ok, idle or running. */
export function OutcomeNote({
  outcome,
  why,
}: {
  outcome: Outcome<unknown> | ActionOutcome;
  why?: string;
}) {
  switch (outcome.state) {
    case "loading":
      return <p className="muted">Reading the pods…</p>;
    case "refused":
      return <Refusal {...outcome} {...(why === undefined ? {} : { why })} />;
    case "error":
      return (
        <div className="failure" role="alert">
          Something went wrong: {outcome.message}
        </div>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Smaller loaders.

export type PodState<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "error"; readonly error: Error };

/**
 * `usePod(load)`: load when the screen opens, again after "Restart the demo", and on `reload()`.
 * A slow answer that arrives after a newer one is dropped.
 */
export function createUsePod(events: Pick<PodEvents, "onReset">) {
  return function usePod<T>(load: () => Promise<T>): [PodState<T>, () => Promise<void>] {
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
        stop = events.onReset(() => void reload());
      } catch {
        // No runtime in this environment (unit tests): nothing to follow.
      }
      return () => {
        generation.current++;
        stop?.();
      };
    }, [reload]);
    return [state, reload];
  };
}

export type ActionState =
  | { readonly phase: "idle" }
  | { readonly phase: "running" }
  | { readonly phase: "done" }
  | { readonly phase: "failed"; readonly message: string; readonly status?: number };

/** `useAction(run)`: run one call from a button and keep its outcome, in `failureText`'s words. */
export function createUseRunAction(failureText: (error: unknown) => string) {
  return function useAction(run: () => Promise<unknown>): [ActionState, () => void] {
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
  };
}

/** Successful writes and deletes from the runtime's event log, folded in log order. */
export interface PodLog {
  /** `<pod>:<path>` of every resource that exists after the logged writes. */
  readonly written: ReadonlySet<string>;
  /** Grows with every entry, so React sees a change. */
  readonly size: number;
}

export const EMPTY_LOG: PodLog = { size: 0, written: new Set() };

const keyOf = (pod: string, path: string) => `${pod}:${path.split("?")[0]}`;

/** Fold one entry into the log. Pure. */
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

/** `usePodLog()`: the log as it stands, kept current from every tab; cleared on restart. */
export function createUsePodLog(events: PodEvents) {
  return function usePodLog(): PodLog {
    const [log, setLog] = useState<PodLog>(EMPTY_LOG);
    useEffect(() => {
      const stop = events.onEvent((entry) => setLog((current) => foldEntry(current, entry)), {
        replay: true,
      });
      const stopReset = events.onReset(() => setLog(EMPTY_LOG));
      return () => {
        stop();
        stopReset();
      };
    }, []);
    return log;
  };
}

export type Read<T> =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "ok"; readonly value: T }
  | { readonly phase: "refused"; readonly status: number }
  | { readonly phase: "missing" }
  | { readonly phase: "failed"; readonly message: string };

/** Classify a failed read: refused (401/403), missing (404) or failed. Pure. */
export function readFailure<T>(error: unknown): Read<T> {
  const status = statusOfError(error);
  if (status === 401 || status === 403) return { phase: "refused", status };
  if (status === 404) return { phase: "missing" };
  return { message: messageOf(error), phase: "failed" };
}

/** `usePodResource(url, enabled, wrap, version)`: GET `url` with `read` once `enabled`. */
export function createUsePodResource<D>(read: (url: string) => Promise<D>) {
  return function usePodResource<T>(
    url: string,
    enabled: boolean,
    wrap: (url: string, data: D) => T,
    version = 0,
  ): Read<T> {
    const [state, setState] = useState<Read<T>>({ phase: "idle" });
    // biome-ignore lint/correctness/useExhaustiveDependencies: version is a deliberate re-read trigger
    useEffect(() => {
      if (!enabled) {
        setState({ phase: "idle" });
        return;
      }
      let live = true;
      setState({ phase: "loading" });
      read(url).then(
        (data) => live && setState({ phase: "ok", value: wrap(url, data) }),
        (error: unknown) => live && setState(readFailure<T>(error)),
      );
      return () => {
        live = false;
      };
    }, [url, enabled, wrap, version]);
    return state;
  };
}

/** Shown when the in-browser pods could not start (no service worker or worker available). */
export function StartFailed({ org, error }: { org: OrgRecord; error: unknown }) {
  return (
    <DemoTrust org={org}>
      <TrustBanner />
      <main id="main" className="work">
        <h1>The pods could not start</h1>
        <p>
          This demo keeps every pod in your browser. They did not start here:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      </main>
    </DemoTrust>
  );
}
