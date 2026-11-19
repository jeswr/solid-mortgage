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
import { agents } from "@mortgage/content/mortgage/journey";
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
    enqueue((world) => agents.walletApplyExpiries(world), backOfficeWorld).then(
      () => rememberExpiryDay(day),
      (error: unknown) => console.warn("applying expiry failed", error),
    );
  }, [ready, day, enqueue]);

  const value = useMemo<WalletRuntime>(
    () => ({ day, run, version: ready ? version : -1, world: () => worldOn(currentDay) }),
    [day, run, version, ready],
  );
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/**
 * Load data for a screen from the pod. Re-reads when the runtime's version changes. `version`
 * is -1 until the pods are ready, and nothing is read before then.
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: `load` changes identity each render; deps say when to re-read.
  useEffect(() => {
    if (version < 0) return;
    let live = true;
    setState((previous) => ({ ...previous, loading: true }));
    load(world()).then(
      (data) => live && setState({ data, error: undefined, loading: false }),
      (error: unknown) => live && setState({ data: undefined, error, loading: false }),
    );
    return () => {
      live = false;
    };
  }, [version, ...deps]);
  return state;
}
