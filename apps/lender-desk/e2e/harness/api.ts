// AUTHORED-BY Claude Opus 5.5
/** What the e2e harness page exposes on `window.harness` (see harness.ts). */
export interface PodRead {
  status: number;
  body: string;
}

export interface Harness {
  /** Run journey beats (content/mortgage/journey.ts `JOURNEY`) by name, in order. */
  run(...names: string[]): Promise<void>;
  /** GET `path` in `owner`'s pod, acting as `reader` (the owner itself by default). */
  read(owner: string, path: string, reader?: string): Promise<PodRead>;
}

declare global {
  interface Window {
    harness: Harness;
  }
}
