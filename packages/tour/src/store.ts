// AUTHORED-BY Claude Opus 5.5
/** Tour state persistence: IndexedDB (design.md §d.6), with an in-memory fallback. */
import { type IDBPDatabase, openDB } from "idb";

export type TourMode = "guided" | "free" | "present";

export interface TourState {
  demo: string;
  stepId: string;
  done: string[];
  mode: TourMode;
}

export interface TourStore {
  load(demo: string): Promise<TourState | undefined>;
  save(state: TourState): Promise<void>;
  clear(demo: string): Promise<void>;
}

export function memoryStore(): TourStore {
  const map = new Map<string, TourState>();
  return {
    load: async (demo) => {
      const s = map.get(demo);
      return s ? structuredClone(s) : undefined;
    },
    save: async (state) => void map.set(state.demo, structuredClone(state)),
    clear: async (demo) => void map.delete(demo),
  };
}

const DB = "solid-demo-tour";
const STORE = "state";

/** IndexedDB-backed store; falls back to memory where IndexedDB is unavailable or refuses. */
export function idbStore(factory: IDBFactory | undefined = globalThis.indexedDB): TourStore {
  if (!factory) return memoryStore();
  let db: Promise<IDBPDatabase> | undefined;
  const fallback = memoryStore();
  let broken = false;
  const open = () => {
    db ??= openDB(DB, 1, {
      upgrade(d) {
        d.createObjectStore(STORE, { keyPath: "demo" });
      },
    });
    return db;
  };
  const guard = async <T>(
    fn: (d: IDBPDatabase) => Promise<T>,
    alt: () => Promise<T>,
  ): Promise<T> => {
    if (broken) return alt();
    try {
      return await fn(await open());
    } catch {
      broken = true;
      return alt();
    }
  };
  return {
    load: (demo) =>
      guard(
        (d) => d.get(STORE, demo) as Promise<TourState | undefined>,
        () => fallback.load(demo),
      ),
    save: (state) =>
      guard(
        async (d) => void (await d.put(STORE, state)),
        () => fallback.save(state),
      ),
    clear: (demo) =>
      guard(
        (d) => d.delete(STORE, demo),
        () => fallback.clear(demo),
      ),
  };
}
