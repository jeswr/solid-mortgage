// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's connection to the pods: one `World` acting as Alex (from the shared browser
 * module in `@mortgage/content/mortgage/browser`), the simulated day, a queue that runs the
 * wallet's writes one at a time, and a refresh signal raised by every pod event.
 *
 * The day is the current tour step's day in the guided tour, otherwise the runtime's day. When
 * it moves, the wallet applies expiry (`agents.walletApplyExpiries`), because WAC has no expiry
 * of its own (design.md section b.4).
 */
import { createBrowserWorld, crossOwnerFetch } from "@mortgage/content/mortgage/browser";
import type { World } from "@mortgage/content/mortgage/world";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { note, onEvent, onReset, podFetch, setDay } from "@mortgage/pod-runtime";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { withGrantLock } from "./acl-lock.ts";

/** What a screen needs from the runtime. */
export interface WalletRuntime {
  /** A world acting as Alex on the current day. */
  world(): World;
  /** The simulated day. */
  day: number;
  /** Bumped after every pod event and every wallet action: screens re-read when it changes. */
  version: number;
  /** Run a pod action in the wallet's queue (one at a time), then refresh the screens. */
  run<T>(action: (world: World) => Promise<T>): Promise<T>;
  /**
   * Run a pod action that writes no grant (the threshold proofs), outside the queue and the grant
   * lock, so a proof that takes minutes never holds up an approval, a withdrawal or expiry.
   */
  runApart<T>(action: (world: World) => Promise<T>): Promise<T>;
}

type Action = <T>(
  action: (world: World) => Promise<T>,
  world?: (day: number) => World,
) => Promise<T>;

const RuntimeContext = createContext<WalletRuntime | undefined>(undefined);

export function useWallet(): WalletRuntime {
  const runtime = useContext(RuntimeContext);
  if (runtime === undefined) throw new Error("useWallet() outside <WalletProvider>");
  return runtime;
}

// --- The day -----------------------------------------------------------------------------------

type DayListener = (day: number) => void;
let currentDay = 1;
const dayListeners = new Set<DayListener>();

/** Set the simulated day (from the runtime's hello or the tour step) and tell the host. */
export function setWalletDay(day: number, tellHost: boolean): void {
  if (!Number.isInteger(day) || day < 1 || day === currentDay) return;
  currentDay = day;
  if (tellHost) setDay(day).catch((error: unknown) => console.warn("setDay failed", error));
  for (const listener of dayListeners) listener(day);
}

export function dayNow(): number {
  return currentDay;
}

let dayOne: string | undefined;

/** Day 1 of the demo calendar, from the runtime's hello (`RuntimeInfo.dayOne`). */
export function setDayOne(value: string): void {
  dayOne = value;
}

/** A world acting as Alex through the page's own `podFetch`: Alex's clicks. */
export function worldOn(day: number): World {
  return createBrowserWorld({
    actsAs: "alex",
    day,
    note,
    podFetch,
    ...(dayOne === undefined ? {} : { dayOne }),
  });
}

/**
 * A world acting as Alex's wallet back office: the same WebID, but its requests are marked as
 * made by an agent, so the Lens labels an ending "expiry applied by Alex's wallet" rather than
 * a withdrawal (packages/lens/README.md, "Grants").
 */
function backOfficeWorld(day: number): World {
  return createBrowserWorld({
    actsAs: "alex",
    day,
    note,
    podFetch: crossOwnerFetch("alex"),
    ...(dayOne === undefined ? {} : { dayOne }),
  });
}

// --- Expiry ------------------------------------------------------------------------------------

const EXPIRY_KEY = "cairn:expiry-applied-on-day";

function lastExpiryDay(): number | undefined {
  try {
    const value = localStorage.getItem(EXPIRY_KEY);
    return value === null ? undefined : Number(value);
  } catch {
    return undefined;
  }
}

function rememberExpiryDay(day: number): void {
  try {
    localStorage.setItem(EXPIRY_KEY, String(day));
  } catch {
    // Storage refused: expiry is simply checked again next time, which changes nothing.
  }
}

function forgetExpiryDay(): void {
  try {
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    // Nothing stored.
  }
}

// --- Provider ----------------------------------------------------------------------------------

/** Pod events that change what the wallet shows: anything touching Alex's pod. */
function touchesAlex(entry: LensEntry): boolean {
  return entry.source === "pod" && entry.pod === "alex" && entry.kind !== "read";
}

export function WalletProvider({
  children,
  started,
}: {
  children: ReactNode;
  /** Resolves once the pods are seeded; screens wait for it before reading. */
  started: Promise<unknown>;
}) {
  const [day, setDayState] = useState(currentDay);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const enqueue = useCallback<Action>(
    (action, make = worldOn) => {
      const next = queue.current.then(() => withGrantLock(() => action(make(currentDay))));
      queue.current = next.catch(() => undefined);
      return next.finally(bump);
    },
    [bump],
  );
  const run = useCallback(<T,>(action: (world: World) => Promise<T>) => enqueue(action), [enqueue]);
  const runApart = useCallback(
    <T,>(action: (world: World) => Promise<T>) => action(worldOn(currentDay)).finally(bump),
    [bump],
  );

  useEffect(() => {
    let live = true;
    started.then(
      () => live && setReady(true),
      (error: unknown) => console.error("pod runtime did not start", error),
    );
    const onDay: DayListener = (next) => setDayState(next);
    dayListeners.add(onDay);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopEvents = onEvent((entry) => {
      if (!touchesAlex(entry)) return;
      clearTimeout(timer);
      timer = setTimeout(bump, 150);
    });
    const stopReset = onReset(() => {
      forgetExpiryDay();
      bump();
    });
    return () => {
      live = false;
      dayListeners.delete(onDay);
      clearTimeout(timer);
      stopEvents();
      stopReset();
    };
  }, [started, bump]);

  // Apply expiry whenever the day the wallet runs on differs from the last day it did so.
  useEffect(() => {
    if (!ready || lastExpiryDay() === day) return;
    enqueue(
      async (world) =>
        // Loaded at the point of use: the journey module brings the signing library.
        (await import("@mortgage/content/mortgage/journey")).agents.walletApplyExpiries(world),
      backOfficeWorld,
    ).then(
      () => rememberExpiryDay(day),
      (error: unknown) => console.warn("applying expiry failed", error),
    );
  }, [ready, day, enqueue]);

  const value = useMemo<WalletRuntime>(
    () => ({
      day,
      run,
      runApart,
      version: ready ? version : -1,
      world: () => worldOn(currentDay),
    }),
    [day, run, runApart, version, ready],
  );
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/**
 * Load data for a screen from the pod. Re-reads when the runtime's version changes. `version`
 * is -1 until the pods are ready, and nothing is read before then.
 *
 * While the agents work, Alex's pod changes every few hundred milliseconds. A read is never
 * thrown away because a newer change arrived: one read runs at a time, it is shown when it
 * lands, and one more read follows if the pod changed meanwhile. Only a change of `deps` (a
 * different thing to show) discards a read in flight.
 */
export function usePodData<T>(
  load: (world: World) => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | undefined; error: unknown; loading: boolean } {
  const { version, world } = useWallet();
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({
    data: undefined,
    error: undefined,
    loading: true,
  });
  const latest = useRef({ load, world });
  latest.current = { load, world };
  const generation = useRef(0);
  const running = useRef(false);
  const again = useRef(false);

  const read = useCallback(() => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    again.current = false;
    const mine = generation.current;
    setState((previous) => ({ ...previous, loading: true }));
    const { load: loadNow, world: worldNow } = latest.current;
    loadNow(worldNow())
      .then(
        (data) =>
          mine === generation.current && setState({ data, error: undefined, loading: false }),
        (error: unknown) =>
          mine === generation.current && setState({ data: undefined, error, loading: false }),
      )
      .finally(() => {
        if (mine !== generation.current) return;
        running.current = false;
        if (again.current) read();
      });
  }, []);

  // A different thing to show (the deps are plain values: names, URLs): forget reads in flight.
  const subject = JSON.stringify(deps);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `subject` is what the effect keys on.
  useEffect(() => {
    generation.current += 1;
    running.current = false;
    again.current = false;
    return () => {
      generation.current += 1;
    };
  }, [subject]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `subject` restarts the read above.
  useEffect(() => {
    if (version >= 0) read();
  }, [version, read, subject]);
  return state;
}
