// AUTHORED-BY Claude Opus 5.5
/**
 * A stand-in for the pod runtime's event contract, for the tour's own tests only: it records
 * the entries the fixture pages emit in localStorage and replays them on every page, the way the
 * runtime's events store does. It is not a pod and nothing here checks access.
 */
import type { AppNote, LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";

const KEY = "tour-fixture-events";
const CTX = "tour-fixture-context";

type Listener = (e: LensEntry) => void;
const listeners = new Set<Listener>();

function all(): LensEntry[] {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LensEntry[];
}

window.addEventListener("storage", (ev) => {
  if (ev.key !== KEY || !ev.newValue) return;
  const list = JSON.parse(ev.newValue) as LensEntry[];
  const last = list.at(-1);
  if (last) for (const l of listeners) l(last);
});

export const fixtureRuntime = {
  onEvent(cb: Listener, opts: { replay?: boolean } = {}) {
    if (opts.replay) for (const e of all()) cb(e);
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  setTourContext(ctx: { demo: string; step: string } | null) {
    if (ctx) sessionStorage.setItem(CTX, JSON.stringify(ctx));
    else sessionStorage.removeItem(CTX);
  },
  async resetDemo() {
    localStorage.removeItem(KEY);
  },
  emitPod(e: Omit<PodEvent, "id" | "at" | "tour">) {
    const ctx = sessionStorage.getItem(CTX);
    const list = all();
    const entry: LensEntry = {
      source: "pod",
      ...e,
      id: list.length + 1,
      at: new Date().toISOString(),
      ...(ctx ? { tour: JSON.parse(ctx) as { demo: string; step: string } } : {}),
    };
    list.push(entry);
    localStorage.setItem(KEY, JSON.stringify(list));
    for (const l of listeners) l(entry);
  },
  emitNote(n: AppNote) {
    const list = all();
    const entry: LensEntry = {
      source: "app",
      ...n,
      id: list.length + 1,
      at: new Date().toISOString(),
    };
    list.push(entry);
    localStorage.setItem(KEY, JSON.stringify(list));
    for (const l of listeners) l(entry);
  },
};
