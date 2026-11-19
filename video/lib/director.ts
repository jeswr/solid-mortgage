// AUTHORED-BY Claude Opus 5.5 (ported from the Solid Suite walkthrough recorder)
/**
 * Helpers the scenes use to drive the browser like a person would on a screen
 * recording: the pointer glides to things before clicking, typing has a human rhythm,
 * and anything the narration talks about can be ringed.
 *
 * UI drift should not wreck a recording, so helpers that look for an element are soft:
 * if it isn't there they log a warning and carry on. Run with --strict to make any
 * warning fail the run (CI does this, so a renamed button is caught on the PR).
 */
import type { Locator, Page } from "@playwright/test";
import type { PageGlobals } from "./page-globals.ts";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Director {
  private cursor = { x: 640, y: 420 };
  readonly warnings: string[] = [];
  /** Set by the recorder so navigations can hold the frame. */
  nav?: { hold(on: boolean): void };

  constructor(
    readonly page: Page,
    private readonly strict: boolean,
  ) {}

  warn(msg: string) {
    this.warnings.push(msg);
    console.warn(`  ! ${msg}`);
    if (this.strict) throw new Error(msg);
  }

  /** Navigates and waits for the app to settle (no spinners, fonts loaded). */
  /** Hard cuts between pages instead of cross-fades (the old page still holds until the new one is drawn). */
  cut = false;

  async goto(
    url: string,
    opts: {
      settle?: boolean;
      keepCard?: boolean;
      veil?: boolean;
      ready?: () => Promise<boolean>;
    } = {},
  ) {
    // Cross-fade across the navigation instead of cutting or flashing a blank page: the
    // capture freezes on the current frame while the next page loads, the new page is covered
    // with a still of the old one, and that still fades out once the new page has drawn.
    const veil = opts.veil !== false;
    const shot = veil ? await this.still() : undefined;
    if (veil) this.nav?.hold(true);
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    if (veil) await this.reveal(shot, opts.ready);
    await this.settle(opts.settle !== false);
    // A chapter card carries across navigation; unless asked to keep it, fade it out now.
    if (!opts.keepCard)
      await this.page
        .evaluate(() => (window as unknown as PageGlobals).__wt?.hideChapter())
        .catch(() => {});
    await this.page
      .evaluate(
        ([x, y]) => (window as unknown as PageGlobals).__wt?.setCursor(x, y),
        [this.cursor.x, this.cursor.y],
      )
      .catch(() => {});
  }

  /** A still of the page as it is now, for a cross-fade. */
  async still(): Promise<string | undefined> {
    if (this.cut) return undefined;
    const buf = await this.page.screenshot({ type: "jpeg", quality: 88 }).catch(() => undefined);
    return buf ? `data:image/jpeg;base64,${buf.toString("base64")}` : undefined;
  }

  /** Covers the newly loaded page with the old still, waits for it to draw, then fades across. */
  async reveal(shot: string | undefined, ready?: () => Promise<boolean>) {
    if (shot)
      await this.page
        .evaluate((s) => (window as unknown as PageGlobals).__wt?.snap(s), shot)
        .catch(() => {});
    await this.page.waitForLoadState("load", { timeout: 3000 }).catch(() => {});
    await this.page.evaluate(() => document.fonts?.ready).catch(() => {});
    if (ready) for (let i = 0; i < 40 && !(await ready().catch(() => true)); i++) await sleep(200);
    await sleep(250);
    this.nav?.hold(false);
    await sleep(120);
    await this.page
      .evaluate(() => (window as unknown as PageGlobals).__wt?.veil(false))
      .catch(() => {});
  }

  async settle(spinners = true) {
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    if (spinners) {
      // No spinners for a moment in a row: some pages load in two waves.
      for (let quiet = 0, tries = 0; quiet < 3 && tries < 75; tries++) {
        const busy = await this.page
          .locator('[aria-busy="true"]')
          .count()
          .catch(() => 0);
        quiet = busy ? 0 : quiet + 1;
        await sleep(200);
      }
    }
    await this.page.evaluate(() => document.fonts?.ready).catch(() => {});
    await sleep(250);
  }

  /** Resolves a locator to its first visible match, or warns and returns undefined. */
  async find(target: Locator, what: string, timeout = 8000): Promise<Locator | undefined> {
    const l = target.first();
    try {
      await l.waitFor({ state: "visible", timeout });
      return l;
    } catch {
      this.warn(`Could not find ${what}`);
      return undefined;
    }
  }

  /** Glides the pointer to (x, y) with an ease-in-out curve. */
  async moveTo(x: number, y: number, ms = 650) {
    const from = { ...this.cursor };
    const steps = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      await this.page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await sleep(ms / steps);
    }
    this.cursor = { x, y };
  }

  async pointAt(target: Locator, what: string) {
    const l = await this.find(target, what);
    if (!l) return undefined;
    await l.scrollIntoViewIfNeeded().catch(() => {});
    const box = await l.boundingBox();
    if (!box) return undefined;
    await this.moveTo(box.x + Math.min(box.width / 2, 60), box.y + box.height / 2);
    return l;
  }

  async click(target: Locator, what: string, opts: { settle?: boolean } = {}) {
    const l = await this.pointAt(target, what);
    if (!l) return false;
    await sleep(180);
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
    if (opts.settle !== false) await this.settle();
    return true;
  }

  async type(target: Locator, text: string, what: string, cps = 16) {
    if (!(await this.click(target, what, { settle: false }))) return false;
    await target.first().fill("");
    await target.first().pressSequentially(text, { delay: 1000 / cps });
    return true;
  }

  /** Rings an element (with an optional caption) until the next highlight or clear. */
  async highlight(target: Locator | undefined, what: string, tag?: string) {
    if (!target)
      return this.page.evaluate(() => (window as unknown as PageGlobals).__wt?.highlight(null));
    const l = await this.find(target, what);
    if (!l) return;
    await l.scrollIntoViewIfNeeded().catch(() => {});
    const box = await l.boundingBox();
    if (box)
      await this.page.evaluate(
        ([b, t]) => (window as unknown as PageGlobals).__wt?.highlight(b, t),
        [box, tag] as const,
      );
  }

  async clearHighlight() {
    await this.page
      .evaluate(() => (window as unknown as PageGlobals).__wt?.highlight(null))
      .catch(() => {});
  }

  async label(text?: string) {
    await this.page
      .evaluate((t) => (window as unknown as PageGlobals).__wt?.label(t), text ?? "")
      .catch(() => {});
  }

  /** A full-screen chapter card that fades out to reveal the page underneath. */
  async chapter(card: { eyebrow?: string; title: string; sub?: string }, holdMs = 2800) {
    await this.page.evaluate(([c, ms]) => (window as unknown as PageGlobals).__wt?.chapter(c, ms), [
      card,
      holdMs,
    ] as const);
  }

  /** Scrolls the main page smoothly by dy pixels. */
  async scroll(dy: number, ms = 900) {
    const steps = Math.max(6, Math.round(ms / 16));
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, dy / steps);
      await sleep(ms / steps);
    }
  }
}
