// AUTHORED-BY Claude Opus 5.5
/**
 * Where the host keeps its state: one snapshot per pod (`SolidServer.snapshot()` bytes, rewritten
 * after every mutating request), the seed snapshot per pod (what "Restart the demo" returns to),
 * the Lens event log and a few settings. `memoryStorage` for tests and headless runs;
 * `idbStorage` (IndexedDB through `idb`) in the browser.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type IDBPDatabase, openDB } from "idb";

export type SnapshotKind = "current" | "seed";

export interface PodStorage {
  getSnapshot(owner: string, kind: SnapshotKind): Promise<Uint8Array | undefined>;
  putSnapshot(owner: string, kind: SnapshotKind, bytes: Uint8Array): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  putMeta(key: string, value: unknown): Promise<void>;
  appendEvent(entry: LensEntry): Promise<void>;
  events(): Promise<LensEntry[]>;
  clearEvents(): Promise<void>;
  /** Forget everything (pods are re-seeded on the next start). */
  clear(): Promise<void>;
}

export function memoryStorage(): PodStorage {
  const snapshots = new Map<string, Uint8Array>();
  const meta = new Map<string, unknown>();
  let log: LensEntry[] = [];
  return {
    async appendEvent(entry) {
      log.push(structuredClone(entry));
    },
    async clear() {
      snapshots.clear();
      meta.clear();
      log = [];
    },
    async clearEvents() {
      log = [];
    },
    async events() {
      return structuredClone(log);
    },
    async getMeta<T>(key: string) {
      return structuredClone(meta.get(key)) as T | undefined;
    },
    async getSnapshot(owner, kind) {
      const bytes = snapshots.get(`${kind}:${owner}`);
      return bytes === undefined ? undefined : bytes.slice();
    },
    async putMeta(key, value) {
      meta.set(key, structuredClone(value));
    },
    async putSnapshot(owner, kind, bytes) {
      snapshots.set(`${kind}:${owner}`, bytes.slice());
    },
  };
}

const STORES = ["snapshots", "meta", "events"] as const;

/** IndexedDB storage. Works in pages, dedicated workers and service workers. */
export function idbStorage(name = "pod-runtime"): PodStorage {
  let db: Promise<IDBPDatabase> | undefined;
  const open = () => {
    db ??= openDB(name, 1, {
      upgrade(database) {
        database.createObjectStore("snapshots");
        database.createObjectStore("meta");
        database.createObjectStore("events", { keyPath: "id" });
      },
    });
    return db;
  };
  return {
    async appendEvent(entry) {
      await (await open()).put("events", entry);
    },
    async clear() {
      const database = await open();
      const tx = database.transaction([...STORES], "readwrite");
      await Promise.all([...STORES.map((store) => tx.objectStore(store).clear()), tx.done]);
    },
    async clearEvents() {
      await (await open()).clear("events");
    },
    async events() {
      return (await (await open()).getAll("events")) as LensEntry[];
    },
    async getMeta<T>(key: string) {
      return (await (await open()).get("meta", key)) as T | undefined;
    },
    async getSnapshot(owner, kind) {
      const value = await (await open()).get("snapshots", `${kind}:${owner}`);
      return value === undefined ? undefined : new Uint8Array(value as ArrayBuffer);
    },
    async putMeta(key, value) {
      await (await open()).put("meta", value, key);
    },
    async putSnapshot(owner, kind, bytes) {
      await (await open()).put("snapshots", bytes.slice().buffer, `${kind}:${owner}`);
    },
  };
}
