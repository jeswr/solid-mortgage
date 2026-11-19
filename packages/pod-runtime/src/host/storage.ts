// AUTHORED-BY Claude Opus 5.5
/**
 * Where the host keeps its state: one snapshot per pod (`SolidServer.snapshot()` bytes, rewritten
 * after every mutating request), the seed snapshot per pod (what "Restart the demo" returns to),
 * the Lens event log and a few settings. `memoryStorage` for tests and headless runs;
 * `idbStorage` (IndexedDB through `idb`) in the browser. It also keeps the fallback host lease
 * (`claimLease`), which elects one hosting tab when the browser has no Web Locks.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { type IDBPDatabase, openDB } from "idb";

export type SnapshotKind = "current" | "seed";

/** Who holds a lease, until when, and which tenure this is (it grows on every change of holder). */
export interface Lease {
  holder: string;
  expires: number;
  term: number;
}

/**
 * The one decision a lease claim makes, in one atomic step: `holder` gets (or keeps) the lease when
 * it is free, expired or already its own. Returns the lease after the claim; the claim succeeded
 * when its holder is `holder`. A `ttlMs` of 0 by the holder releases it.
 */
export function decideLease(
  current: Lease | undefined,
  holder: string,
  ttlMs: number,
  now: number,
): Lease {
  if (current !== undefined && current.holder !== holder && current.expires > now) return current;
  const term =
    current === undefined
      ? 1
      : current.holder === holder && current.expires > now
        ? current.term
        : current.term + 1;
  return { expires: now + ttlMs, holder, term };
}

export interface PodStorage {
  getSnapshot(owner: string, kind: SnapshotKind): Promise<Uint8Array | undefined>;
  putSnapshot(owner: string, kind: SnapshotKind, bytes: Uint8Array): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  putMeta(key: string, value: unknown): Promise<void>;
  appendEvent(entry: LensEntry): Promise<void>;
  events(): Promise<LensEntry[]>;
  clearEvents(): Promise<void>;
  /**
   * Atomically claim, renew or (with `ttlMs` 0) release the lease `name` for `holder`; see
   * `decideLease`. Leases are not part of the pod state: `clear` keeps them.
   */
  claimLease(name: string, holder: string, ttlMs: number, now: number): Promise<Lease>;
  /** Forget everything (pods are re-seeded on the next start). */
  clear(): Promise<void>;
}

export function memoryStorage(): PodStorage {
  const snapshots = new Map<string, Uint8Array>();
  const meta = new Map<string, unknown>();
  const leases = new Map<string, Lease>();
  let log: LensEntry[] = [];
  return {
    async appendEvent(entry) {
      log.push(structuredClone(entry));
    },
    async claimLease(name, holder, ttlMs, now) {
      const lease = decideLease(leases.get(name), holder, ttlMs, now);
      leases.set(name, lease);
      return { ...lease };
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
    db ??= openDB(name, 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore("snapshots");
          database.createObjectStore("meta");
          database.createObjectStore("events", { keyPath: "id" });
        }
        if (oldVersion < 2) database.createObjectStore("leases");
      },
    });
    return db;
  };
  return {
    async appendEvent(entry) {
      await (await open()).put("events", entry);
    },
    async claimLease(leaseName, holder, ttlMs, now) {
      // One readwrite transaction: IndexedDB runs overlapping readwrite transactions one at a
      // time, so two tabs' claims cannot both read a free lease.
      const tx = (await open()).transaction("leases", "readwrite");
      const store = tx.objectStore("leases");
      const lease = decideLease(
        (await store.get(leaseName)) as Lease | undefined,
        holder,
        ttlMs,
        now,
      );
      await store.put(lease, leaseName);
      await tx.done;
      return lease;
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
