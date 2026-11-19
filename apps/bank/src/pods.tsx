// AUTHORED-BY Claude Opus 5.5
/**
 * Alder Bank's connection to the pods: the runtime started once with the shared mortgage seed, a
 * `World` acting as Alder Bank for the journey functions, and a hook that re-reads a screen's data
 * whenever the pods report a change.
 */
import { createBrowserWorld, mortgageSeed } from "@mortgage/content/mortgage/browser";
import { JOURNEY } from "@mortgage/content/mortgage/journey";
import type { World } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import type { AppSlug } from "@mortgage/demo-kit/registry";
import {
  configure,
  note,
  onEvent,
  onReset,
  podFetch,
  type RuntimeInfo,
  ready,
  setDay,
} from "@mortgage/pod-runtime";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface Pods {
  /** A world acting as this app's organisation, on `day` (default: the demo's current day). */
  world(day?: number): World;
  /** Run a journey function on the simulated day of its beat, moving the demo clock forward. */
  runBeat(run: (world: World) => Promise<unknown>): Promise<void>;
  /** Changes whenever a pod reports a request, so screens re-read what they show. */
  readonly version: number;
  readonly day: number;
}

/** Start the pod runtime for `app` with the seed every mortgage app passes. */
export function startPods(app: AppSlug): Promise<RuntimeInfo> {
  configure({ app, registry: ORGS, seed: mortgageSeed() });
  return ready();
}

const CHANGES = new Set(["write", "delete", "grant", "revoke"]);

const PodsContext = createContext<Pods | null>(null);

export function PodsProvider({
  app,
  info,
  children,
}: {
  app: AppSlug;
  info: RuntimeInfo;
  children: ReactNode;
}) {
  const [version, setVersion] = useState(0);
  const [day, setCurrentDay] = useState(Math.max(1, info.day));
  const dayRef = useRef(day);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((v) => v + 1), 150);
    };
    // Only changes: re-reading on reads would answer every read with another read.
    const stopEvents = onEvent((entry) => {
      if (entry.source === "pod" && CHANGES.has(entry.kind)) bump();
    });
    const stopReset = onReset(() => {
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
  const pods = useMemo<Pods>(() => {
    const actsAs = ORGS[app as keyof typeof ORGS]?.actsAs;
    if (actsAs === undefined) throw new Error(`${app} is not an organisation app`);
    const world = (at?: number) =>
      createBrowserWorld({
        actsAs,
        day: at ?? dayRef.current,
        dayOne: info.dayOne,
        note,
        podFetch,
      });
    return {
      day,
      async runBeat(run) {
        const beatDay = JOURNEY.find((beat) => beat.run === run)?.day ?? dayRef.current;
        if (beatDay > dayRef.current) {
          await setDay(beatDay);
          dayRef.current = beatDay;
          setCurrentDay(beatDay);
        }
        await run(world(beatDay));
      },
      version,
      world,
    };
  }, [app, day, info.dayOne, version]);
  return <PodsContext.Provider value={pods}>{children}</PodsContext.Provider>;
}

export function usePods(): Pods | null {
  return useContext(PodsContext);
}

export type Loaded<T> =
  | { state: "waiting" }
  | { state: "ready"; data: T }
  | { state: "failed"; error: unknown };

/** Read something from the pods, again after every pod change. */
export function usePodData<T>(load: (pods: Pods) => Promise<T>): Loaded<T> {
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
