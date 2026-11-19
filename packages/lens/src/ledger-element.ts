// AUTHORED-BY Claude Opus 5.5
/**
 * `<journey-ledger>`: the journey ledger as a page of its own (design.md §c.5). Feed it the
 * same entries the Lens gets (`configure()` then `push()`/`pushAll()`); it renders from them.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { h } from "./dom.js";
import { computeTotals, type LedgerTotals } from "./ledger.js";
import { LEDGER_CSS, type LedgerTab, type LedgerViewOptions, renderLedger } from "./ledger-view.js";
import { LensModel } from "./model.js";
import type { LensConfig } from "./types.js";

export class JourneyLedger extends HTMLElement {
  private readonly root: ShadowRoot;
  private model: LensModel | undefined;
  private options: LedgerViewOptions = {};
  private scheduled = false;
  private tab: LedgerTab | undefined;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  configure(config: LensConfig, options: LedgerViewOptions = {}): void {
    this.model = new LensModel(config);
    this.options = options;
    this.schedule();
  }

  push(entry: LensEntry, opts: { replayed?: boolean } = {}): void {
    if (!this.model) throw new Error("<journey-ledger>: call configure() first");
    this.model.push(entry, { replayed: opts.replayed ?? true });
    this.schedule();
  }

  pushAll(entries: LensEntry[]): void {
    for (const e of entries) this.push(e);
  }

  totals(): LedgerTotals | undefined {
    return this.model ? computeTotals(this.model) : undefined;
  }

  /** Show a tab of the ledger ("examiner" for the examiner view). */
  show(tab: LedgerTab): void {
    this.tab = tab;
    this.schedule();
  }

  /** Render now (normally batched to the next microtask). */
  render(): void {
    this.scheduled = false;
    if (!this.model) return;
    const { el } = renderLedger(this.model, {
      headingLevel: 1,
      ...this.options,
      onTab: (tab) => {
        this.tab = tab;
        this.options.onTab?.(tab);
      },
      view: this.tab ?? this.options.view ?? urlTab(),
    });
    this.root.replaceChildren(h("style", {}, `:host{display:block}${LEDGER_CSS}`), el);
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.scheduled && this.render());
  }
}

/** `?view=examiner` on the page URL (the Lens links there for its examiner view). */
function urlTab(): LedgerTab | undefined {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("view") === "examiner"
      ? "examiner"
      : undefined;
  } catch {
    return undefined;
  }
}

export function defineJourneyLedger(name = "journey-ledger"): void {
  if (!customElements.get(name)) customElements.define(name, JourneyLedger);
}

declare global {
  interface HTMLElementTagNameMap {
    "journey-ledger": JourneyLedger;
  }
}
