// AUTHORED-BY Claude Opus 5.5
/**
 * `<solid-lens>`: the Solid Lens dock (design.md §c). Shadow DOM, no framework. Its only inputs
 * are `push()`ed `LensEntry` values and the configuration (registry, layout, copy); it never
 * creates an entry. Four zones: step card, "Where Solid is", the map, the inspector.
 */
import type { ChipKind, LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, describeRules, possessive, revokeCaveat, type Sentence } from "./describe.js";
import { h, replace } from "./dom.js";
import { resourceHistory } from "./history.js";
import { chipIcon, icon } from "./icons.js";
import { computeTotals, type LedgerTotals } from "./ledger.js";
import { LEDGER_CSS, type LedgerTab, type LedgerViewOptions, renderLedger } from "./ledger-view.js";
import { LensMap } from "./map.js";
import { isDenied, isOk, isPod, LensModel, type Received } from "./model.js";
import { HOLDER, localName, nodeOf, podRelative } from "./paths.js";
import { LENS_CSS } from "./styles.js";
import type {
  LensConfig,
  LensLayout,
  LensMode,
  LensStep,
  LensView,
  TimelineStep,
} from "./types.js";

const TABS: Array<{ id: Exclude<LensView, "ledger" | "examiner">; label: string }> = [
  { id: "step", label: "This step" },
  { id: "grants", label: "Grants" },
  { id: "not-shared", label: "Not shared" },
  { id: "raw", label: "Raw" },
];

type Pinned =
  | { type: "revoked"; rec: Received; org: string; sentence: Sentence }
  | {
      type: "compare";
      rec: Received;
      prev: Received | undefined;
      org: string;
      step: string | undefined;
    };

type Selection = { type: "entry"; rec: Received } | { type: "drawer"; path: string } | null;

let uid = 0;

/** Notes the demo runtime emits itself (not an organisation's app). */
const RUNTIME_NOTES = new Set(["notified", "grant-used"]);
const NOTE_SOURCE: Record<string, string> = {
  default: "The pod cannot show this; the app reports it.",
  "grant-used":
    "Web Access Control has no one-time rule. The demo runtime closes the grant for the holder's wallet; the rule's removal is the pod request that follows.",
  notified:
    "The pod server in this demo has no Solid Notifications, so the demo runtime sends the notice. It says only that the resource changed; reading it is an ordinary request the pod decides.",
};

/** Does an entry show the involvement a chip names? */
export function chipSeen(kind: ChipKind, rec: Received): boolean {
  const e = rec.entry;
  if (!isPod(e)) {
    if (kind === "proof") return e.kind === "proof-verified";
    if (kind === "credential") return e.kind === "verified";
    if (kind === "no Solid in this step") return e.kind === "no-solid";
    return false;
  }
  if (kind === "denied") return isDenied(e);
  if (isDenied(e) || !isOk(e.status)) return false;
  switch (kind) {
    case "pod read":
      return e.kind === "read";
    case "pod write":
      return e.kind === "write" || e.kind === "delete";
    case "grant":
      return e.kind === "grant" || e.kind === "revoke" || e.acl !== undefined;
    case "credential":
      return e.kind === "write" && e.resource?.credential !== undefined;
    default:
      return false;
  }
}

function chipsOf(rec: Received): ChipKind[] {
  const all: ChipKind[] = [
    "pod read",
    "pod write",
    "grant",
    "credential",
    "proof",
    "denied",
    "no Solid in this step",
  ];
  return all.filter((k) => chipSeen(k, rec));
}

export class SolidLens extends HTMLElement {
  private root: ShadowRoot;
  private _model: LensModel | undefined;
  private lensMap: LensMap | undefined;
  private step: LensStep | null = null;
  private steps: TimelineStep[] = [];
  private tab: Exclude<LensView, "ledger" | "examiner"> = "step";
  private pinned: Pinned | null = null;
  private selection: Selection = null;
  private dirty = false;
  private mql: MediaQueryList | undefined;
  private reducedMql: MediaQueryList | undefined;
  private readonly n = ++uid;
  ledgerOptions: LedgerViewOptions = {};

  // Elements built once.
  private els!: {
    aside: HTMLElement;
    toggle: HTMLButtonElement;
    railToggle: HTMLButtonElement;
    railCount: HTMLElement;
    pulse: HTMLElement;
    peek: HTMLElement;
    popout: HTMLButtonElement;
    stepZone: HTMLElement;
    whereZone: HTMLElement;
    mapWrap: HTMLElement;
    mapCaption: HTMLElement;
    tabs: Map<string, HTMLButtonElement>;
    panels: Map<string, HTMLElement>;
    card: HTMLElement;
    foot: HTMLElement;
    live: HTMLElement;
    dialog: HTMLDialogElement;
    dialogBody: HTMLElement;
  };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    if (!this.els) this.build();
    if (!this.hasAttribute("mode")) this.setAttribute("mode", "guided");
    if (this.getAttribute("layout") !== "window") {
      this.mql = window.matchMedia("(min-width: 1180px)");
      this.mql.addEventListener("change", this.onMedia);
      this.onMedia();
    } else {
      this.emitInset();
    }
    this.reducedMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback(): void {
    this.mql?.removeEventListener("change", this.onMedia);
    this.removeEventListener("keydown", this.onKey);
  }

  // ---- public API ----------------------------------------------------------------------------

  /** Set the registry and layout. Resets the log. */
  configure(config: LensConfig): void {
    if (!this.els) this.build();
    this._model = new LensModel(config);
    const current = config.app ? nodeOf(config.registry, config.app) : undefined;
    this.lensMap = new LensMap(this._model, {
      ...(current === undefined ? {} : { currentNode: current }),
      reducedMotion: () => this.reducedMotion,
      onSelectDrawer: (path) => this.select({ type: "drawer", path }),
      onCaption: (text, kind) => this.setCaption(text, kind),
    });
    replace(this.els.mapWrap, this.lensMap.svg);
    this.pinned = null;
    this.selection = null;
    this.renderFoot();
    this.invalidate();
  }

  get model(): LensModel {
    if (!this._model) throw new Error("<solid-lens>: call configure() first");
    return this._model;
  }

  get configured(): boolean {
    return this._model !== undefined;
  }

  /** Feed one entry. Live entries animate and are announced; replayed ones only update state. */
  push(entry: LensEntry, opts: { replayed?: boolean } = {}): Received | undefined {
    const rec = this.model.push(entry, opts);
    if (!rec) return undefined;
    const sentence = describe(this.model, rec);
    this.trackPinned(rec, sentence);
    this.lensMap?.render();
    if (!rec.replayed) {
      this.announce(sentence.text);
      void this.lensMap?.play(rec, sentence);
      this.els.pulse.classList.remove("on");
      void this.els.pulse.offsetWidth;
      this.els.pulse.classList.add("on");
    } else if (!isPod(entry) && entry.kind === "no-solid" && rec.step === this.step?.id) {
      // Replays rebuild state silently; a replayed "no Solid" note in this step still dims.
      this.lensMap?.dim(entry.text);
    }
    this.invalidate();
    return rec;
  }

  pushAll(entries: LensEntry[], opts: { replayed?: boolean } = {}): void {
    for (const e of entries) this.push(e, opts);
  }

  /** Show a tour step (zone 1, zone 2), or none in free play. */
  setStep(step: LensStep | null): void {
    const changed = step?.id !== this.step?.id;
    this.step = step;
    this.model.setCurrentStep(step?.id);
    if (changed) {
      this.lensMap?.dim(null);
      this.setCaption("", "");
      if (this.pinned?.type === "compare" && this.pinned.step !== step?.id) this.pinned = null;
      this.selection = null;
      const noSolid = this.model
        .entriesForStep(step?.id)
        .find((r) => !isPod(r.entry) && r.entry.kind === "no-solid");
      if (noSolid && !isPod(noSolid.entry)) this.lensMap?.dim(noSolid.entry.text);
    }
    this.invalidate();
  }

  /** Step outlines for the ledger's timeline. */
  setSteps(steps: TimelineStep[]): void {
    this.steps = steps;
  }

  setMode(mode: LensMode): void {
    this.setAttribute("mode", mode);
    this.invalidate();
  }

  get mode(): LensMode {
    return (this.getAttribute("mode") as LensMode | null) ?? "guided";
  }

  get layout(): LensLayout {
    return (this.getAttribute("layout") as LensLayout | null) ?? "dock";
  }

  get collapsed(): boolean {
    return this.hasAttribute("collapsed");
  }

  set collapsed(value: boolean) {
    this.toggleAttribute("collapsed", value);
    this.els.toggle.setAttribute("aria-expanded", String(!value));
    this.els.railToggle.setAttribute("aria-expanded", String(!value));
    this.renderToggle();
    this.emitInset();
    this.dispatchEvent(
      new CustomEvent("lens-toggle", {
        detail: { collapsed: value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Switch the inspector tab, or open the journey ledger. */
  view(v: LensView): void {
    if (v === "ledger" || v === "examiner") {
      this.openLedger(v === "examiner" ? "examiner" : "journey");
      return;
    }
    this.tab = v;
    if (this.collapsed) this.collapsed = false;
    this.invalidate();
  }

  totals(): LedgerTotals {
    return computeTotals(this.model);
  }

  /** Re-render now (normally batched to the next microtask). */
  flush(): void {
    if (this.dirty) this.renderAll();
  }

  // ---- building ------------------------------------------------------------------------------

  private build(): void {
    const style = h("style", {}, LENS_CSS + LEDGER_CSS);
    const bodyId = `lens-body-${this.n}`;
    const toggle = h("button", {
      class: "icon-btn",
      type: "button",
      "aria-controls": bodyId,
      "aria-expanded": "true",
    });
    const railToggle = h(
      "button",
      {
        class: "icon-btn",
        type: "button",
        "aria-controls": bodyId,
        "aria-expanded": "true",
        "aria-label": "Expand the Solid Lens",
      },
      icon("expand"),
    );
    const popout = h(
      "button",
      {
        class: "icon-btn",
        type: "button",
        "aria-label": "Open the Lens in its own window",
        title: "Pop out",
      },
      icon("popout"),
    );
    const pulse = h("span", { class: "pulse", "aria-hidden": "true" });
    const railCount = h("span", { class: "rail-count" });
    const peek = h("div", { class: "peek" });
    const stepZone = h("section", { class: "zone step", "aria-label": "Tour step" });
    const whereZone = h("section", { class: "zone where", "aria-labelledby": `where-${this.n}` });
    const mapWrap = h("div", { class: "map-wrap" });
    const mapCaption = h("p", { class: "map-caption", "aria-hidden": "true" });
    const tabs = new Map<string, HTMLButtonElement>();
    const panels = new Map<string, HTMLElement>();
    const tablist = h("div", { class: "tabs", role: "tablist", "aria-label": "Inspector views" });
    for (const t of TABS) {
      const tabId = `tab-${t.id}-${this.n}`;
      const panelId = `panel-${t.id}-${this.n}`;
      const b = h(
        "button",
        {
          class: "tab",
          type: "button",
          role: "tab",
          id: tabId,
          "aria-controls": panelId,
          "aria-selected": "false",
          tabindex: -1,
        },
        t.label,
      );
      b.addEventListener("click", () => this.view(t.id));
      tabs.set(t.id, b);
      tablist.append(b);
      panels.set(
        t.id,
        h("div", {
          class: "tabpanel",
          role: "tabpanel",
          id: panelId,
          "aria-labelledby": tabId,
          tabindex: 0,
        }),
      );
    }
    tablist.addEventListener("keydown", (ev) => {
      const order = TABS.map((t) => t.id);
      const i = order.indexOf(this.tab);
      let next = i;
      if (ev.key === "ArrowRight") next = (i + 1) % order.length;
      else if (ev.key === "ArrowLeft") next = (i - 1 + order.length) % order.length;
      else if (ev.key === "Home") next = 0;
      else if (ev.key === "End") next = order.length - 1;
      else return;
      ev.preventDefault();
      const id = order[next];
      if (id) {
        this.view(id);
        this.flush();
        tabs.get(id)?.focus();
      }
    });
    const card = h("div", { class: "card-wrap" });
    const foot = h("div", { class: "foot" });
    const live = h("div", {
      class: "sr-only",
      "aria-live": "polite",
      "aria-relevant": "additions",
    });
    const dialogBody = h("div", {});
    const closeDialog = h("button", { class: "btn", type: "button" }, "Close the ledger");
    const dialog = h(
      "dialog",
      { class: "ledger-dialog", "aria-label": "Journey ledger" },
      h("div", { class: "dialog-bar" }, closeDialog),
      dialogBody,
    );
    closeDialog.addEventListener("click", () => dialog.close());

    toggle.addEventListener("click", () => this.toggleCollapsed());
    railToggle.addEventListener("click", () => this.toggleCollapsed());
    popout.addEventListener("click", () =>
      this.dispatchEvent(new CustomEvent("lens-popout", { bubbles: true, composed: true })),
    );

    const brand = h(
      "div",
      { class: "brand" },
      h("span", { style: "color: var(--brand)" }, icon("cabinet", 20)),
      h(
        "span",
        {},
        h("span", { class: "brand-name" }, "Solid Lens"),
        " ",
        h("span", { class: "brand-sub" }, "where Solid is involved"),
      ),
    );
    const bar = h("div", { class: "bar" }, brand, peek, pulse, popout, toggle);
    const inspector = h(
      "section",
      { class: "zone inspector", "aria-labelledby": `insp-${this.n}` },
      h("h2", { class: "zone-title", id: `insp-${this.n}` }, "What happened"),
      card,
      tablist,
      ...panels.values(),
    );
    const mapZone = h(
      "section",
      { class: "zone map-zone", "aria-labelledby": `map-${this.n}` },
      h("h2", { class: "zone-title", id: `map-${this.n}` }, "Map"),
      mapWrap,
      mapCaption,
      h(
        "ul",
        { class: "legend", "aria-hidden": "true" },
        h("li", {}, legendLine("var(--grant)", ""), "access granted"),
        h("li", {}, legendLine("var(--expired)", "5 5"), "expired"),
        h("li", {}, legendLine("var(--denied)", "1 5"), "withdrawn"),
        h("li", {}, legendDot("var(--read)"), "read"),
        h("li", {}, legendDot("var(--write)"), "write"),
        h("li", {}, legendArc(), "not through the pod"),
        h("li", {}, legendKey(), "shared now"),
        h("li", {}, legendDot("var(--seal)"), "signed credential"),
      ),
      (() => {
        const b = h(
          "button",
          { class: "linkish", type: "button" },
          "Show the map as a table (Grants)",
        );
        b.addEventListener("click", () => {
          this.view("grants");
          this.flush();
          this.els.tabs.get("grants")?.focus();
        });
        return h("p", { class: "map-alt" }, b);
      })(),
    );
    const body = h(
      "div",
      { class: "body", id: bodyId },
      stepZone,
      whereZone,
      mapZone,
      inspector,
      foot,
    );
    const panel = h("div", { class: "panel" }, bar, body);
    const rail = h(
      "div",
      { class: "rail" },
      railToggle,
      railCount,
      h("span", { class: "pulse", "aria-hidden": "true" }),
      h("span", { class: "rail-label", "aria-hidden": "true" }, "SOLID LENS"),
    );
    const aside = h(
      "aside",
      { class: "lens", "aria-label": "Solid Lens" },
      rail,
      panel,
      live,
      dialog,
    );
    this.root.replaceChildren(style, aside);
    this.els = {
      aside,
      toggle,
      railToggle,
      railCount,
      pulse,
      peek,
      popout,
      stepZone,
      whereZone,
      mapWrap,
      mapCaption,
      tabs,
      panels,
      card,
      foot,
      live,
      dialog,
      dialogBody,
    };
    this.renderToggle();
  }

  // ---- events --------------------------------------------------------------------------------

  private onMedia = (): void => {
    if (this.getAttribute("layout") === "window") return;
    const wide = this.mql?.matches ?? true;
    const before = this.getAttribute("layout");
    this.setAttribute("layout", wide ? "dock" : "sheet");
    if (before !== this.getAttribute("layout") && !wide && before === null) {
      // A phone starts with the sheet peeking so the app stays usable.
      this.toggleAttribute("collapsed", true);
      this.els.toggle.setAttribute("aria-expanded", "false");
      this.els.railToggle.setAttribute("aria-expanded", "false");
    }
    this.renderToggle();
    this.emitInset();
  };

  private onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== "Escape" || this.collapsed || this.layout === "window") return;
    if (this.els.dialog.open) return;
    ev.preventDefault();
    this.collapsed = true;
    (this.layout === "dock" ? this.els.railToggle : this.els.toggle).focus();
  };

  private toggleCollapsed(): void {
    const next = !this.collapsed;
    this.collapsed = next;
    if (!next) this.flush();
    queueMicrotask(() =>
      (next && this.layout === "dock" ? this.els.railToggle : this.els.toggle).focus(),
    );
  }

  private emitInset(): void {
    const layout = this.layout;
    const right = layout === "dock" ? (this.collapsed ? 52 : 376) : 0;
    const bottom = layout === "sheet" ? 64 : 0;
    this.dispatchEvent(
      new CustomEvent("lens-inset", { detail: { right, bottom }, bubbles: true, composed: true }),
    );
  }

  private get reducedMotion(): boolean {
    return this.reducedMql?.matches ?? false;
  }

  private announce(text: string): void {
    this.els.live.append(h("p", {}, text));
    while (this.els.live.childElementCount > 3) this.els.live.firstElementChild?.remove();
  }

  private setCaption(text: string, kind: string): void {
    this.els.mapCaption.textContent = text;
    this.els.mapCaption.setAttribute("data-kind", kind);
  }

  private trackPinned(rec: Received, sentence: Sentence): void {
    const e = rec.entry;
    if (!isPod(e)) return;
    if (sentence.kind === "revoke" && e.acl) {
      const org = e.acl.revoked
        .map((r) => this.model.orgOfAgent(r.agent))
        .find((o) => o !== undefined);
      if (org !== undefined) this.pinned = { type: "revoked", rec, org, sentence };
    } else if (isDenied(e)) {
      const org = nodeOf(this.model.registry, e.actor.org);
      const g = this.model.grant(org);
      if (g && g.state !== "active" && g.endedSeq !== undefined && g.endedSeq < rec.seq) {
        this.pinned = {
          type: "compare",
          rec,
          prev: this.model.previousSuccess(rec),
          org,
          step: rec.step,
        };
      }
    }
  }

  private select(sel: Selection): void {
    this.selection = sel;
    this.invalidate();
    this.flush();
    this.els.card.querySelector<HTMLElement>(".card")?.focus();
  }

  private invalidate(): void {
    if (this.dirty) return;
    this.dirty = true;
    queueMicrotask(() => {
      if (this.dirty) this.renderAll();
    });
  }

  // ---- rendering -----------------------------------------------------------------------------

  private renderAll(): void {
    this.dirty = false;
    if (!this._model) return;
    this.renderStep();
    this.renderWhere();
    this.renderRail();
    this.renderCard();
    for (const t of TABS) {
      const selected = t.id === this.tab;
      const b = this.els.tabs.get(t.id);
      b?.setAttribute("aria-selected", String(selected));
      b?.setAttribute("tabindex", selected ? "0" : "-1");
      const panel = this.els.panels.get(t.id);
      if (!panel) continue;
      panel.hidden = !selected;
      if (selected) this.renderPanel(t.id, panel);
    }
  }

  private renderToggle(): void {
    if (!this.els) return;
    const c = this.collapsed;
    const sheet = this.layout === "sheet";
    replace(this.els.toggle, icon(sheet ? (c ? "up" : "down") : "collapse"));
    this.els.toggle.setAttribute(
      "aria-label",
      c ? "Expand the Solid Lens" : "Collapse the Solid Lens (Escape)",
    );
    this.els.popout.hidden = this.layout === "window" || !this.hasAttribute("popout");
    this.els.toggle.hidden = this.layout === "window";
  }

  private renderRail(): void {
    const n = this.model.orgs().length;
    replace(this.els.railCount, h("strong", {}, n), n === 1 ? "org" : "orgs");
    this.els.railCount.setAttribute("aria-label", `${n} organisation${n === 1 ? "" : "s"} so far`);
    const latest = this.model.received.at(-1);
    const peekText =
      this.step && this.mode === "guided"
        ? `Step ${this.step.index} of ${this.step.total}: ${this.step.title}`
        : latest
          ? describe(this.model, latest).text
          : "Waiting for the first request";
    replace(this.els.peek, h("div", { class: "peek-title" }, peekText));
  }

  private renderStep(): void {
    const z = this.els.stepZone;
    const st = this.step;
    if (!st) {
      z.hidden = true;
      return;
    }
    z.hidden = false;
    const cal = this.model.config.calendar;
    const day =
      st.day === undefined
        ? null
        : h("span", {}, `${cal ? cal.label(st.day) : `Day ${st.day}`} (simulated)`);
    const act = st.actionLabel
      ? h(
          "button",
          { class: "btn primary", type: "button", "data-lens": "act", title: st.actionLabel },
          "Do it for me",
        )
      : null;
    const back = h(
      "button",
      { class: "btn", type: "button", "data-lens": "back", disabled: !st.canGoBack },
      "‹ Back",
    );
    const next = h(
      "button",
      { class: "btn", type: "button", "data-lens": "next" },
      st.done ? (st.index === st.total ? "Finish ›" : "Next ›") : "Skip ›",
    );
    const restart = h(
      "button",
      { class: "restart", type: "button", "data-lens": "restart" },
      "Restart the demo",
    );
    act?.addEventListener("click", () => this.emit("lens-act"));
    back.addEventListener("click", () => this.emit("lens-back"));
    next.addEventListener("click", () => this.emit("lens-next"));
    restart.addEventListener("click", () => this.emit("lens-restart"));
    replace(
      z,
      h(
        "h2",
        { class: "step-meta" },
        h("strong", {}, `Step ${st.index} of ${st.total}`),
        h("span", {}, st.chapter),
        day,
      ),
      h("h3", {}, st.title),
      st.body ? h("p", {}, st.body) : null,
      st.done ? h("p", { class: "step-done", role: "status" }, "✓ Step done") : null,
      h("div", { class: "step-actions" }, act, back, next, h("span", { class: "spacer" }), restart),
    );
  }

  private emit(name: string): void {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true, detail: { step: this.step?.id } }),
    );
  }

  private renderWhere(): void {
    const m = this.model;
    const z = this.els.whereZone;
    const title = h("h2", { class: "zone-title", id: `where-${this.n}` }, "Where Solid is");
    const stepEntries = this.step ? m.entriesForStep(this.step.id) : [];
    let headline: string;
    let chips: Array<{ kind: ChipKind; label?: string; seen: boolean }>;
    let note: string | null = null;
    if (this.step && this.mode !== "free") {
      headline = this.step.headline;
      chips = this.step.chips.map((c) => ({
        ...c,
        seen: stepEntries.some((r) => chipSeen(c.kind, r)),
      }));
      note = chips.length > 0 ? "Solid outline: seen in this step. Dashed: not seen yet." : null;
    } else {
      const latest = m.received.at(-1);
      headline = latest
        ? describe(m, latest).text
        : `Nothing has reached ${possessive(m.holderName)} pod yet.`;
      const recent = m.received.slice(-5);
      const kinds = new Set(recent.flatMap(chipsOf));
      chips = [...kinds].map((kind) => ({ kind, seen: true }));
    }
    replace(
      z,
      title,
      h("p", { class: "headline" }, headline),
      chips.length > 0
        ? h(
            "ul",
            { class: "chips", "aria-label": "Involvement" },
            ...chips.map((c) =>
              h(
                "li",
                { class: "chip", "data-kind": c.kind, "data-seen": String(c.seen) },
                chipIcon(c.kind),
                c.kind,
                c.label ? ` ${c.label}` : "",
                h("span", { class: "chip-state" }, c.seen ? "" : " (not yet)"),
              ),
            ),
          )
        : null,
      note ? h("p", { class: "chips-note" }, note) : null,
      this.renderPinned(),
    );
  }

  /**
   * Pinned cards belong to the guided path: the withdrawal card shows in its step and the next
   * one ("Next: see what … gets"), the before/after card only in the step of the refusal.
   * Without a step (free play) they show until dismissed.
   */
  private pinnedVisible(p: Pinned): boolean {
    const current = this.step?.id;
    if (current === undefined || this.mode === "free") return true;
    const at = p.rec.step;
    if (at === undefined) return true;
    if (p.type === "compare") return at === current;
    const order = this.steps.map((s) => s.id);
    const gap = order.indexOf(current) - order.indexOf(at);
    return at === current || (order.includes(at) && order.includes(current) && gap === 1);
  }

  private renderPinned(): HTMLElement | null {
    const p = this.pinned;
    if (!p || !this.pinnedVisible(p)) return null;
    const m = this.model;
    const name = m.nameOf(p.org);
    const dismiss = h(
      "button",
      { class: "icon-btn close", type: "button", "aria-label": "Dismiss" },
      "✕",
    );
    dismiss.addEventListener("click", () => {
      this.pinned = null;
      this.invalidate();
    });
    if (p.type === "revoked") {
      const removed = p.sentence.meta.filter((x) => x.startsWith("Removed:"));
      return h(
        "div",
        {
          class: "card pinned",
          "data-pinned": "revoked",
          role: "note",
          "aria-label": "Access withdrawn",
        },
        dismiss,
        h("h3", {}, `Access withdrawn${p.rec.replayed ? "" : " just now"}`),
        ...removed.map((r) => h("p", {}, r)),
        h("p", {}, `Next: see what ${name} gets now.`),
      );
    }
    const e = p.rec.entry;
    const prev = p.prev?.entry;
    const reason = describe(m, p.rec).meta.find((x) => /withdrawn|ended|grant/.test(x));
    return h(
      "div",
      {
        class: "card pinned",
        "data-pinned": "compare",
        role: "note",
        "aria-label": "Before and after",
      },
      dismiss,
      h("h3", {}, `Same request, before and after`),
      h(
        "div",
        { class: "compare" },
        prev && isPod(prev)
          ? h(
              "div",
              { class: "ok", "data-status": prev.status },
              h("span", { class: "big" }, String(prev.status)),
              `Allowed${prev.grant ? ` by ${m.grantInfo(prev.grant)?.label ?? localName(prev.grant)}` : ""}`,
              h("br", {}),
              h("small", {}, `${prev.method} ${m.labelOf(prev.path, prev.pod)}`),
            )
          : h(
              "div",
              { class: "ok" },
              h("span", { class: "big" }, "–"),
              "No earlier allowed request in this session",
            ),
        isPod(e)
          ? h(
              "div",
              { class: "no", "data-status": e.status },
              h("span", { class: "big" }, String(e.status)),
              "Refused by the pod",
              h("br", {}),
              h("small", {}, reason ?? "no grant"),
            )
          : null,
      ),
      h("p", { class: "caveat", "data-caveat": "" }, revokeCaveat(m, p.org)),
    );
  }

  private renderCard(): void {
    const sel = this.selection;
    const m = this.model;
    if (!sel) {
      replace(this.els.card);
      return;
    }
    const close = h(
      "button",
      { class: "icon-btn close", type: "button", "aria-label": "Close details" },
      "✕",
    );
    close.addEventListener("click", () => {
      this.selection = null;
      this.invalidate();
    });
    const row = (k: string, v: Node | string | null) =>
      v === null || v === "" ? [] : [h("dt", {}, k), h("dd", {}, v)];
    if (sel.type === "drawer") {
      const d = m.drawer(sel.path);
      if (!d) {
        replace(this.els.card);
        return;
      }
      const readers = m.whoCanRead(d.path).map((o) => m.nameOf(o));
      const items = [...d.resources].map((p) => m.labelOf(p));
      replace(
        this.els.card,
        h(
          "div",
          { class: "card", tabindex: -1, role: "region", "aria-label": `${d.label} details` },
          close,
          h("h3", {}, `${d.label} drawer`),
          h(
            "dl",
            {},
            ...row("Path", d.path),
            ...row("Seen in this session", items.length ? items.join(", ") : "nothing yet"),
            ...row("Signed credentials", d.credentials.size ? String(d.credentials.size) : null),
            ...row(
              "Who can read it now",
              readers.length ? readers.join(", ") : `only ${m.holderName}`,
            ),
          ),
        ),
      );
      return;
    }
    const e = sel.rec.entry;
    const sentence = describe(m, sel.rec);
    if (!isPod(e)) {
      replace(
        this.els.card,
        h(
          "div",
          { class: "card", tabindex: -1, role: "region", "aria-label": "Entry details" },
          close,
          h("h3", {}, RUNTIME_NOTES.has(e.kind) ? "Runtime said" : "App said"),
          h("p", {}, RUNTIME_NOTES.has(e.kind) ? sentence.text : e.text),
          h(
            "dl",
            {},
            ...row(RUNTIME_NOTES.has(e.kind) ? "Addressed to" : "Reported by", m.nameOf(e.org)),
            ...row(
              "Kind",
              (RUNTIME_NOTES.has(e.kind) ? sentence.meta[0] : sentence.meta.at(-1)) ?? e.kind,
            ),
            ...row("Refers to", (e.refs ?? []).join(", ")),
          ),
          h("p", { class: "chips-note" }, NOTE_SOURCE[e.kind] ?? NOTE_SOURCE.default),
        ),
      );
      return;
    }
    const path = podRelative(e.path);
    const cred = e.resource?.credential;
    const checks = m.received.filter(
      (r) =>
        !isPod(r.entry) &&
        r.entry.kind === "verified" &&
        (r.entry.refs ?? []).some((ref) => podRelative(ref) === path),
    );
    const readers = e.pod === HOLDER ? m.whoCanRead(path).map((o) => m.nameOf(o)) : [];
    const types = e.resource?.types ?? [];
    replace(
      this.els.card,
      h(
        "div",
        { class: "card", tabindex: -1, role: "region", "aria-label": "Resource details" },
        close,
        h("h3", {}, e.resource?.label ?? m.labelOf(e.path, e.pod)),
        h(
          "dl",
          {},
          ...row("Pod", `${possessive(m.nameOf(e.pod))} pod`),
          ...row("Path", path),
          ...row(
            "Type",
            types.length
              ? h(
                  "span",
                  {},
                  ...types.flatMap((t, i) => [
                    i > 0 ? ", " : "",
                    h("a", { href: t, target: "_blank", rel: "noopener" }, localName(t)),
                  ]),
                )
              : null,
          ),
          ...row(
            "Who can read it now",
            e.pod === HOLDER
              ? readers.length
                ? readers.join(", ")
                : `only ${m.holderName}`
              : null,
          ),
          ...(cred
            ? [
                ...row(
                  "Issuer",
                  m.orgOfAgent(cred.issuer)
                    ? m.nameOf(m.orgOfAgent(cred.issuer) ?? "")
                    : cred.issuer,
                ),
                ...row("Credential type", localName(cred.type)),
                ...row("Valid from", cred.validFrom),
                ...row("As of", cred.asOf ?? null),
                ...row(
                  "Signature",
                  checks.length
                    ? checks.map((c) => (isPod(c.entry) ? "" : c.entry.text)).join(" ")
                    : "no signature check recorded in this session",
                ),
              ]
            : []),
          ...row("Request", `${e.method} · ${e.status}`),
        ),
        ...this.historySection(e.pod, path),
      ),
    );
  }

  /** "Change history": who wrote each version, from the writes the pod accepted (pod saw). */
  private historySection(pod: string, path: string): HTMLElement[] {
    const m = this.model;
    const versions = resourceHistory(m, pod, path);
    if (versions.length === 0) return [];
    const when = (at: string) => {
      const date = at.slice(0, 10);
      const cal = m.config.calendar;
      const day = cal ? cal.label(cal.dayOf(date)) : date;
      return `${day} ${at.slice(11, 16)}`.trim();
    };
    return [
      h("h4", { class: "history-h" }, "Change history"),
      h(
        "ol",
        { class: "history", "data-history": path },
        ...versions.map((v) =>
          h(
            "li",
            { "data-writer": v.writer, "data-change": v.change },
            h("strong", {}, v.writerName),
            ` ${v.change} it`,
            v.viaAgent ? " (back-office agent)" : "",
            h("span", { class: "history-when" }, ` · ${when(v.at)}`),
          ),
        ),
      ),
      h(
        "p",
        { class: "chips-note" },
        "Pod saw: every write the pod server accepted in this session. Writes made before the demo started are not listed.",
      ),
    ];
  }

  private renderPanel(id: Exclude<LensView, "ledger" | "examiner">, panel: HTMLElement): void {
    const m = this.model;
    if (id === "step") {
      const recs =
        this.step && this.mode !== "free" ? m.entriesForStep(this.step.id) : m.received.slice(-30);
      replace(
        panel,
        h(
          "p",
          { class: "key-note" },
          h("span", {}, h("span", { class: "swatch" }), "Pod saw: the pod answered this request"),
          h("span", {}, h("span", { class: "swatch dashed" }), "App said: the app reports it"),
        ),
        recs.length === 0
          ? h("p", { class: "empty" }, this.step ? "Nothing yet in this step." : "Nothing yet.")
          : h("ol", { class: "entries" }, ...recs.map((r) => h("li", {}, this.entryButton(r)))),
      );
      return;
    }
    if (id === "grants") {
      const grants = m.grants();
      const href = m.config.grantsHref;
      replace(
        panel,
        grants.length === 0
          ? h("p", { class: "empty" }, `${m.holderName} has not shared anything yet.`)
          : h(
              "table",
              { class: "grants" },
              h("caption", { class: "sr-only" }, `Who can reach ${possessive(m.holderName)} pod`),
              h(
                "thead",
                {},
                h(
                  "tr",
                  {},
                  ...["Who", "What", "Purpose", "Until", "State"].map((x) =>
                    h("th", { scope: "col" }, x),
                  ),
                ),
              ),
              h(
                "tbody",
                {},
                ...grants.map((g) => {
                  const info = m.grantInfo(g.policy);
                  const rules = g.state === "active" ? g.active : g.removed;
                  const what = rules.length
                    ? describeRules(m, g.org, rules).replace(/^\S+ may /, "")
                    : "–";
                  const stateWord =
                    g.state === "active"
                      ? "active"
                      : g.state === "expired"
                        ? "expired"
                        : "withdrawn";
                  const mark = g.state === "active" ? "●" : g.state === "expired" ? "◌" : "✕";
                  return h(
                    "tr",
                    { "data-org": g.org, "data-state": g.state },
                    h(
                      "th",
                      { scope: "row" },
                      m.nameOf(g.org),
                      info ? h("small", {}, ` (${info.label})`) : null,
                    ),
                    h("td", {}, g.state === "active" ? what : `had: ${what}`),
                    h("td", {}, info?.purpose ?? "–"),
                    h("td", {}, info?.until ?? "–"),
                    h(
                      "td",
                      {},
                      h(
                        "span",
                        { class: "state", "data-state": g.state },
                        h("span", { "aria-hidden": "true" }, mark),
                        stateWord,
                      ),
                      href ? h("div", {}, h("a", { href }, "Manage")) : null,
                    ),
                  );
                }),
              ),
            ),
        h(
          "p",
          { class: "chips-note" },
          "From the access rules the pod wrote. Purpose and end date come from the sharing policy, when known.",
        ),
      );
      return;
    }
    if (id === "not-shared") {
      const rows = m.notShared();
      replace(
        panel,
        rows.length === 0
          ? h("p", { class: "empty" }, "No organisation has appeared yet.")
          : h(
              "div",
              {},
              ...rows.map((r) =>
                h(
                  "div",
                  { class: "ns-card", "data-org": r.org.key },
                  h(
                    "h3",
                    {},
                    h("span", {
                      class: "ns-dot",
                      style: `background:${r.org.color}`,
                      "aria-hidden": "true",
                    }),
                    r.org.name,
                  ),
                  h(
                    "p",
                    { class: "ns-row" },
                    h("span", { class: "lbl" }, "Saw:"),
                    r.read.length ? r.read.map((d) => d.label).join(", ") : "nothing from the pod",
                  ),
                  r.wrote.length
                    ? h(
                        "p",
                        { class: "ns-row" },
                        h("span", { class: "lbl" }, "Added to:"),
                        r.wrote.map((d) => d.label).join(", "),
                      )
                    : null,
                  r.proofs
                    ? h(
                        "p",
                        { class: "ns-row" },
                        h("span", { class: "lbl" }, "Proofs:"),
                        `${r.proofs} answer${r.proofs === 1 ? "" : "s"}, no data`,
                      )
                    : null,
                  h(
                    "p",
                    { class: "ns-row not" },
                    h("span", { class: "lbl" }, "Did not see:"),
                    r.notSeen.length ? r.notSeen.map((d) => d.label).join(", ") : "–",
                  ),
                ),
              ),
              h(
                "p",
                { class: "chips-note" },
                `Computed from the requests ${possessive(m.holderName)} pod answered, against its drawers.`,
              ),
            ),
      );
      return;
    }
    // Raw.
    const recent = m.received.slice(-60).reverse();
    replace(
      panel,
      recent.length === 0
        ? h("p", { class: "empty" }, "No requests yet.")
        : h(
            "ul",
            { class: "raw", "aria-label": "Raw log, newest first" },
            ...recent.map((r) => {
              const e = r.entry;
              if (!isPod(e))
                return h(
                  "li",
                  { "data-seq": r.seq },
                  `#${e.id} note ${e.kind} (${e.org}): ${e.text}`,
                );
              const ok = isOk(e.status) && !isDenied(e);
              const lines: Array<Node | string> = [
                h("span", { class: "m" }, e.method),
                ` /pods/${e.pod}${podRelative(e.path)} `,
                h("span", { class: ok ? "st-ok" : "st-bad" }, String(e.status)),
                ` · ${e.actor.webid}${e.actor.viaAgent ? " (agent)" : ""}`,
              ];
              for (const g of e.acl?.granted ?? [])
                lines.push(
                  h(
                    "div",
                    { class: "diff-add" },
                    `+ ${g.agent} ${g.modes.join(",")} ${g.resource}${g.inherited ? " (default)" : ""}`,
                  ),
                );
              for (const g of e.acl?.revoked ?? [])
                lines.push(
                  h(
                    "div",
                    { class: "diff-del" },
                    `− ${g.agent} ${g.modes.join(",")} ${g.resource}${g.inherited ? " (default)" : ""}`,
                  ),
                );
              if (e.resource?.types.length)
                lines.push(h("div", {}, `a ${e.resource.types.join(", ")}`));
              if (e.grant) lines.push(h("div", {}, `policy ${e.grant}`));
              const loader = m.config.loadTurtle;
              if (loader && ok && e.method === "GET") {
                const out = h("pre", { class: "turtle", hidden: true });
                const btn = h("button", { class: "linkish", type: "button" }, "Show as Turtle");
                btn.addEventListener("click", async () => {
                  out.hidden = false;
                  out.textContent = "Loading…";
                  try {
                    out.textContent = await loader(e.pod, podRelative(e.path));
                  } catch (err) {
                    out.textContent = `Could not load: ${String(err)}`;
                  }
                });
                lines.push(h("div", {}, btn), out);
              }
              return h("li", { "data-seq": r.seq }, ...lines);
            }),
          ),
    );
  }

  private entryButton(r: Received): HTMLButtonElement {
    const sentence = describe(this.model, r);
    const b = h(
      "button",
      {
        class: "entry",
        type: "button",
        "data-kind": sentence.kind,
        "data-source": sentence.source,
        "data-seq": r.seq,
      },
      h("span", { class: "glyph" }, icon(sentence.kind)),
      h(
        "span",
        { class: "line" },
        h(
          "span",
          { class: "src" },
          sentence.source === "pod"
            ? "Pod saw"
            : RUNTIME_NOTES.has(sentence.kind)
              ? "Runtime said"
              : "App said",
        ),
        ...sentence.parts.map((p) => (typeof p === "string" ? p : h("b", {}, p.b))),
      ),
      sentence.meta.length
        ? h("span", { class: "meta" }, sentence.meta.join(" · "))
        : h("span", {}),
    );
    b.addEventListener("click", () => this.select({ type: "entry", rec: r }));
    return b;
  }

  private renderFoot(): void {
    const href = this._model?.config.ledgerHref;
    const content = [icon("table"), "Journey ledger ›"];
    if (href) {
      replace(this.els.foot, h("a", { class: "ledger-link", href }, ...content));
    } else {
      const b = h("button", { class: "ledger-link", type: "button" }, ...content);
      b.addEventListener("click", () => this.openLedger());
      replace(this.els.foot, b);
    }
  }

  private openLedger(view: LedgerTab = "journey"): void {
    const href = this._model?.config.ledgerHref;
    if (href) {
      const url = new URL(href, window.location.href);
      if (view === "examiner") url.searchParams.set("view", "examiner");
      window.location.assign(url.href);
      return;
    }
    const { el } = renderLedger(this.model, {
      ...this.ledgerOptions,
      steps: this.steps,
      headingLevel: 2,
      view,
    });
    replace(this.els.dialogBody, el);
    if (!this.els.dialog.open) this.els.dialog.showModal();
  }
}

function legendLine(color: string, dash: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "8");
  svg.setAttribute("aria-hidden", "true");
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  for (const [k, v] of Object.entries({
    x1: "1",
    y1: "4",
    x2: "21",
    y2: "4",
    stroke: color,
    "stroke-width": "3",
    "stroke-linecap": "round",
  }))
    l.setAttribute(k, v);
  if (dash) l.setAttribute("stroke-dasharray", dash);
  svg.append(l);
  return svg;
}

function legendDot(color: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "10");
  svg.setAttribute("height", "10");
  svg.setAttribute("aria-hidden", "true");
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  for (const [k, v] of Object.entries({ cx: "5", cy: "5", r: "4.5", fill: color }))
    c.setAttribute(k, v);
  svg.append(c);
  return svg;
}

function legendKey(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "10");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  for (const [k, v] of Object.entries({
    d: "M2 5a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0M6.6 5h5.4m-1.6 0v2.2m1.6-2.2v1.6",
    fill: "none",
    stroke: "var(--grant)",
    "stroke-width": "1.5",
    "stroke-linecap": "round",
  }))
    p.setAttribute(k, v);
  svg.append(p);
  return svg;
}

function legendArc(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "10");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  for (const [k, v] of Object.entries({
    d: "M1 9Q11 -3 21 9",
    fill: "none",
    stroke: "var(--note)",
    "stroke-width": "2",
    "stroke-dasharray": "4 3",
  }))
    p.setAttribute(k, v);
  svg.append(p);
  return svg;
}

/** Define `<solid-lens>` once (safe to call repeatedly). */
export function defineSolidLens(name = "solid-lens"): void {
  if (!customElements.get(name)) customElements.define(name, SolidLens);
}

declare global {
  interface HTMLElementTagNameMap {
    "solid-lens": SolidLens;
  }
}
