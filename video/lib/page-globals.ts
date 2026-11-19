// AUTHORED-BY Claude Opus 5.5
/**
 * What the recorder reaches for on a page: the overlay (`stage/overlay.js`), the card deck
 * (`stage/cards.js`) and the tour's `window.__demo` (packages/tour/src/mount.ts). Used only as
 * casts inside `page.evaluate` callbacks: `(window as unknown as PageGlobals).__wt`.
 */
export interface Overlay {
  setCursor(x: number, y: number): void;
  chapter(card: { eyebrow?: string; title: string; sub?: string }, holdMs?: number): Promise<void>;
  hideChapter(): Promise<void>;
  highlightEl(el: Element, tag?: string): void;
  highlight(
    rect: { x: number; y: number; width: number; height: number } | null,
    tag?: string,
  ): void;
  snap(src: string): Promise<void>;
  veil(on: boolean, instant?: boolean): Promise<void>;
  chip(text: string): void;
  label(text: string): void;
}

export interface Cards {
  show(id: string, step?: number, instant?: boolean): void;
  step(n: number): void;
}

export interface DemoApi {
  goto(stepId: string): Promise<void>;
  act(): Promise<string>;
  lens(view: string): void;
  totals(): unknown;
  state(): { step?: string; done: string[]; mode: string } | undefined;
}

export interface PageGlobals {
  __wt?: Overlay;
  cards: Cards;
  __demo?: DemoApi;
}
