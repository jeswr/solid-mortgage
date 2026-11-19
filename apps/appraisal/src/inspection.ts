// AUTHORED-BY Claude Opus 5.5
/**
 * The field checklist. It is the appraiser's own working state on this device, not pod data, so
 * it lives in `localStorage` (and in memory when storage is unavailable). A demo restart clears it.
 */
import { onReset } from "@mortgage/pod-runtime";
import { useEffect, useState } from "react";
import { INSPECTION_ITEMS } from "./view.ts";

const KEY = "plumbline-field-checklist";
const listeners = new Set<(ticked: boolean[]) => void>();
let memory: boolean[] = INSPECTION_ITEMS.map(() => false);

function load(): boolean[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === INSPECTION_ITEMS.length) {
      memory = parsed.map((value) => value === true);
    }
  } catch {
    // storage unavailable: keep the in-memory list
  }
  return memory;
}

function save(next: boolean[]): void {
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the list lasts as long as the page
  }
  for (const listener of listeners) listener(next);
}

let resetHooked = false;

export function useInspection() {
  const [ticked, setTicked] = useState<boolean[]>(load);
  useEffect(() => {
    if (!resetHooked) {
      resetHooked = true;
      onReset(() => save(INSPECTION_ITEMS.map(() => false)));
    }
    listeners.add(setTicked);
    return () => {
      listeners.delete(setTicked);
    };
  }, []);
  return {
    done: ticked.every(Boolean),
    ticked,
    toggle: (index: number) => save(ticked.map((value, i) => (i === index ? !value : value))),
  };
}
