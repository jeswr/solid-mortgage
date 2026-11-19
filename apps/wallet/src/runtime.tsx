// AUTHORED-BY Claude Opus 5.5
/**
 * The wallet's connection to the pods: one `World` acting as the holder the wallet shows (Alex
 * unless the demo or the visitor picks another registered holder; src/holder.ts), from the
 * shared browser module in `@mortgage/content/mortgage/browser`, the simulated day, a queue that
 * runs the wallet's writes one at a time, and a refresh signal raised by every pod event.
 *
 * The day is the current tour step's day in the guided tour, otherwise the runtime's day. When
 * it moves, the wallet applies expiry (`agents.walletApplyExpiries`), because WAC has no expiry
 * of its own (design.md section b.4).
 */
import { createBrowserWorld, crossOwnerFetch } from "@mortgage/content/mortgage/browser";
import type { World } from "@mortgage/content/mortgage/world";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { DEFAULT_HOLDER, type HolderId } from "@mortgage/demo-kit/registry";
import {
  note,
  onEvent,
  onReset,
  podFetch,
  setDay,
  setHolder as setRuntimeHolder,
} from "@mortgage/pod-runtime";
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

/** A world acting as one holder, which it names. */
export interface WalletWorld extends World {
  readonly holder: HolderId;
}

/** What a screen needs from the runtime. */
export interface WalletRuntime {
  /** The holder whose pod the wallet shows and acts for. */
  holder: HolderId;
  /** Show and act for another registered holder (the holder switcher). */
  switchHolder(holder: HolderId): void;
  /** A world acting as the holder on the current day. */
  world(): WalletWorld;
  /** The simulated day. */
  day: number;
  /** Bumped after every pod event and every wallet action: screens re-read when it changes. */
  version: number;
  /** Run a pod action in the wallet's queue (one at a time), then refresh the screens. */
  run<T>(action: (world: WalletWorld) => Promise<T>): Promise<T>;
  /**
   * Run a pod action that writes no grant (the threshold proofs), outside the queue and the grant
   * lock, so a proof that takes minutes never holds up an approval, a withdrawal or expiry.
   */
  runApart<T>(action: (world: WalletWorld) => Promise<T>): Promise<T>;
}

type Action = <T>(
  action: (world: WalletWorld) => Promise<T>,
  world?: (day: number) => WalletWorld,
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

// --- The holder --------------------------------------------------------------------------------

let currentHolder: HolderId = DEFAULT_HOLDER;

/** A world acting as the shown holder through the page's own `podFetch`: the holder's clicks. */
export function worldOn(day: number): WalletWorld {
  const holder = currentHolder;
  const world = createBrowserWorld({
    actsAs: holder,
    day,
    note,
    podFetch,
    ...(dayOne === undefined ? {} : { dayOne }),
  });
  return { ...world, holder };
}

/**
 * A world acting as Alex's wallet back office: the same WebID, but its requests are marked as
 * made by an agent, so the Lens labels an ending "expiry applied by Alex's wallet" rather than
 * a withdrawal (packages/lens/README.md, "Grants"). Expiry is the mortgage demo's own rule for
 * Alex's grants (content/mortgage/grants.ts), so it acts as Alex whichever holder is shown.
 */
function backOfficeWorld(day: number): WalletWorld {
  const world = createBrowserWorld({
    actsAs: "alex",
    day,
    note,
    podFetch: crossOwnerFetch("alex"),
    ...(dayOne === undefined ? {} : { dayOne }),
  });
  return { ...world, holder: "alex" };
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

/** Pod events that change what the wallet shows: anything touching the shown holder's pod. */
function touchesHolder(entry: LensEntry): boolean {
  return entry.source === "pod" && entry.pod === currentHolder && entry.kind !== "read";
}

export function WalletProvider({
  children,
  started,
  holder: initial = DEFAULT_HOLDER,
  onHolder,
}: {
  children: ReactNode;
  /** Resolves once the pods are seeded; screens wait for it before reading. */
  started: Promise<unknown>;
  /** The holder shown first (src/holder.ts); the runtime must be configured for it. */
  holder?: HolderId;
  /** Called after the visitor switches holder. */
  onHolder?: (holder: HolderId) => void;
}) {
  const [holder, setHolderState] = useState<HolderId>(() => {
    currentHolder = initial;
    return initial;
  });
  const [day, setDayState] = useState(currentDay);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const enqueue = useCallback<Action>(
    (action, make = worldOn) => {
      // The world the action gets is marked as holding the lock, so the grant changes it calls
      // (which take the lock themselves) run at once instead of waiting for it.
      const next = queue.current.then(() => withGrantLock(make(currentDay), action));
      queue.current = next.catch(() => undefined);
      return next.finally(bump);
    },
    [bump],
  );
  const run = useCallback(
    <T,>(action: (world: WalletWorld) => Promise<T>) => enqueue(action),
    [enqueue],
  );
  const runApart = useCallback(
    <T,>(action: (world: WalletWorld) => Promise<T>) => action(worldOn(currentDay)).finally(bump),
    [bump],
  );
  const switchHolder = useCallback(
    (next: HolderId) => {
      if (next === currentHolder) return;
      setRuntimeHolder(next);
      currentHolder = next;
      setHolderState(next);
      onHolder?.(next);
      bump();
    },
    [bump, onHolder],
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
      if (!touchesHolder(entry)) return;
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
      holder,
      run,
      runApart,
      switchHolder,
      version: ready ? version : -1,
      world: () => worldOn(currentDay),
    }),
    [day, holder, run, runApart, switchHolder, version, ready],
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
  load: (world: WalletWorld) => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | undefined; error: unknown; loading: boolean } {
  const { holder, version, world } = useWallet();
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

  // A different thing to show (the deps are plain values: names, URLs; or another holder's
  // pod): forget reads in flight.
  const subject = JSON.stringify([holder, ...deps]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `subject` is what the effect keys on.
  useEffect(() => {
    generation.current += 1;
    running.current = false;
    again.current = false;
    return () => {
      generation.current += 1;
    };
  }, [subject]);

  // Another holder's pod: never show the previous holder's data while the new read runs.
  const shownFor = useRef(holder);
  useEffect(() => {
    if (shownFor.current === holder) return;
    shownFor.current = holder;
    setState({ data: undefined, error: undefined, loading: true });
  }, [holder]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `subject` restarts the read above.
  useEffect(() => {
    if (version >= 0) read();
  }, [version, read, subject]);
  return state;
}
