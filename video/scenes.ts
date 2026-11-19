// AUTHORED-BY Claude Opus 5.5
/**
 * What happens on screen, for every demo. Each action is named in `video/<demo>/narration.md` as
 * `[do: name args]` (docs/rebuild/video-scripts.md, "One scenes.ts for every demo"). The demo is
 * the built static site (`pnpm run build`, `node tools/serve-dist.mjs`), driven in Chromium
 * through its own tour engine: `step` deep-links to a tour step (or calls `window.__demo.goto`
 * on the same page), `act` clicks the step's real `data-tour` target with a visible pointer and
 * waits until the tour marks the step done from the pod's own events. Nothing on screen is
 * staged except the title and end cards (`video/<demo>/cards.html`).
 */
import type { ElementHandle, Locator } from "@playwright/test";
import type { Claim, Demo, DemoTotals, OrgLite, TourStepLite } from "./lib/demo.ts";
import { type Director, sleep } from "./lib/director.ts";
import type { PageGlobals } from "./lib/page-globals.ts";

export interface Ctx {
  d: Director;
  demo: Demo;
  tour?: TourStepLite[];
  orgs: Record<string, OrgLite>;
  /** Origin of the served site, e.g. http://127.0.0.1:4610 */
  site: string;
  /** Recorder stage (overlay, shared card styles) and this demo's folder. */
  stage: string;
  demoStage: string;
  /** Static metric values (content/), for the live totals check. */
  metrics: Record<string, number>;
  /** The demo's own ledger totals (`content/<demo>/ledger.ts`), for `<demo>.<field>` claims. */
  demoTotals?: DemoTotals;
  state: { speakingUntil?: number; chip?: string; step?: string; totals?: unknown };
}

type Action = (c: Ctx, ...args: string[]) => Promise<void>;

const page = (c: Ctx) => c.d.page;
/** Milliseconds of narration left in the current paragraph. */
const left = (c: Ctx) => Math.max(0, (c.state.speakingUntil ?? 0) - performance.now());

async function chip(c: Ctx, text?: string) {
  c.state.chip = text;
  await page(c)
    .evaluate((t) => (window as unknown as PageGlobals).__wt?.chip(t), text ?? "")
    .catch(() => {});
}

/** A step's page: its app path and its own query (`health/shared?holder=alex`). */
function stepTarget(c: Ctx, s: TourStepLite): URL {
  return new URL(`${c.site}/${s.app}/${s.path.replace(/^\/+/, "")}`);
}
const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The deep link to a step: its page, with the tour's parameters added to the step's own. */
function stepUrl(c: Ctx, s: TourStepLite) {
  const url = stepTarget(c, s);
  url.searchParams.set("tour", c.demo.id);
  url.searchParams.set("step", s.id);
  url.searchParams.set("present", "1");
  return url.href;
}

/** Is the page already on the step's page (same path, and the step's own query holds)? */
function onStepPage(c: Ctx, s: TourStepLite, here: URL) {
  const want = stepTarget(c, s);
  if (here.origin !== want.origin || trim(here.pathname) !== trim(want.pathname)) return false;
  for (const [k, v] of want.searchParams) if (here.searchParams.get(k) !== v) return false;
  return true;
}

function findStep(c: Ctx, id: string) {
  const s = c.tour?.find((x) => x.id === id);
  if (!s) throw new Error(`no tour step "${id}" (is the demo built?)`);
  return s;
}

function chipFor(c: Ctx, s: TourStepLite) {
  return s.app === "welcome" ? "Solid demos" : (c.orgs[s.app]?.organisation ?? s.app);
}

/** The tour is on step `id` and the page has drawn its content. */
const onStep = (c: Ctx, id: string) => () =>
  page(c).evaluate((stepId) => {
    const demo = (window as unknown as PageGlobals).__demo;
    if (!demo || demo.state()?.step !== stepId) return false;
    if (document.querySelector('[aria-busy="true"]')) return false;
    return !!document.querySelector("h1, h2");
  }, id);

async function until(ms: number, test: () => Promise<boolean>) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (await test().catch(() => false)) return true;
    await sleep(300);
  }
  return false;
}

/**
 * Waits while a pressed button says it is busy: the apps relabel a button "Revoking…",
 * "Signing…" and so on (or set aria-busy) until its handler finishes. Done once it is detached,
 * its label no longer ends in an ellipsis, or its page has gone. A button that stays disabled
 * once its work is done ("Issued") does not hold the recording.
 */
async function finished(button: ElementHandle, ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    const idle = await button
      .evaluate((el) => {
        if (!el.isConnected) return true;
        const label = (el.textContent ?? "").trim();
        return !/(…|\.\.\.)$/.test(label) && el.getAttribute("aria-busy") !== "true";
      })
      .catch(() => true); // The page navigated: the handle's context is gone.
    if (idle) return true;
    await sleep(200);
  }
  return false;
}

/** The visible element of a step's action target (`data-tour`). */
const targetOf = (c: Ctx, s: TourStepLite) =>
  page(c).locator(`[data-tour="${s.action?.target}"]`).filter({ visible: true });

/** Where a page marks a hand-off: the wallet's "Waiting for …" card (`section.handoff`). */
const HANDOFF = ".handoff, [data-handoff]";

/** The target's text, if it is on screen inside a hand-off; undefined otherwise. */
async function handOffLabel(c: Ctx, s: TourStepLite): Promise<string | undefined> {
  const text = await targetOf(c, s)
    .first()
    .evaluate(
      (el, sel) => (el.closest(sel) ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : null),
      HANDOFF,
      { timeout: 1000 },
    )
    .catch(() => null);
  return text ?? undefined;
}

/**
 * Presses a hand-off before the step's own action, when the page shows one. Some steps start in
 * another app: the wallet's consent steps put the step's target on "Have <organisation> ask now"
 * in a "Waiting for …" card until the organisation's request arrives, and only then on the step's
 * own button (Approve, apps/wallet/src/screens/Requests.tsx). The pointer presses the hand-off
 * and waits until the target is the step's own button, so the request is on screen while the
 * narration describes it. Returns false when there is no hand-off on the page.
 */
async function handOff(c: Ctx, s: TourStepLite): Promise<boolean> {
  if (!s.action) return false;
  const now = await handOffLabel(c, s);
  if (now === undefined) return false;
  console.log(`  · ${s.id}: pressing the hand-off "${now}" before "${s.action.label}"`);
  if (!(await c.d.click(targetOf(c, s), `${now} [data-tour="${s.action.target}"]`))) return false;
  const ready = await until(60_000, async () => {
    if (!(await targetOf(c, s).first().isVisible())) return false;
    return (await handOffLabel(c, s)) === undefined;
  });
  if (!ready) c.d.warn(`step ${s.id}: "${s.action.label}" never appeared after "${now}"`);
  return ready;
}

async function cards(c: Ctx, id: string, step = 0) {
  await chip(c, undefined);
  const url = `${c.demoStage}/cards.html`;
  if (!page(c).url().startsWith(url)) {
    // Arrive with the slide already up under a still of the last page, then cross-fade.
    const shot = await c.d.still();
    c.d.nav?.hold(true);
    await page(c).goto(`${url}#${id}`, { waitUntil: "domcontentloaded" });
    await page(c).evaluate(([i, s]) => (window as unknown as PageGlobals).cards.show(i, s, true), [
      id,
      0,
    ] as const);
    await page(c).evaluate(([i, s]) => (window as unknown as PageGlobals).cards.show(i, s), [
      id,
      step,
    ] as const);
    await c.d.reveal(shot);
    return;
  }
  await page(c).evaluate(([i, s]) => (window as unknown as PageGlobals).cards.show(i, s), [
    id,
    step,
  ] as const);
}

/** Rings an element exactly (the overlay follows it every frame). */
async function ringExact(c: Ctx, target: Locator, what: string, tag?: string) {
  const el = await c.d.find(target, what);
  if (!el) return;
  await el.evaluate((node, t) => {
    const r = (node as Element).getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 70)
      (node as Element).scrollIntoView({ block: "center", behavior: "smooth" });
    (window as unknown as PageGlobals).__wt?.highlightEl(node, t);
  }, tag ?? "");
}

/** Rings the nearest sizeable box around an element of the app. */
async function ringApp(c: Ctx, target: Locator, what: string, minH = 40) {
  const el = await c.d.find(target, what);
  if (!el) return;
  await el.evaluate((node, min) => {
    let n: HTMLElement | null = node as HTMLElement;
    while (n?.parentElement) {
      const r = n.getBoundingClientRect();
      if (r.height >= min && r.width >= 240) break;
      n = n.parentElement;
    }
    const box = n ?? (node as HTMLElement);
    const r = box.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 70)
      box.scrollIntoView({ block: "center", behavior: "smooth" });
    (window as unknown as PageGlobals).__wt?.highlightEl(box, "");
  }, minH);
}

const lensPart = (c: Ctx, css: string) => page(c).locator("solid-lens").locator(css);

/** Opens the Lens if it is collapsed, so its parts can be shown. */
async function lensOpen(c: Ctx) {
  await page(c)
    .evaluate(() => {
      const lens = document.querySelector("solid-lens") as
        | (HTMLElement & { collapsed?: boolean })
        | null;
      if (lens?.collapsed) lens.collapsed = false;
    })
    .catch(() => {});
}

/** Collapses the Lens, so a page it docks over is seen whole. */
async function lensFold(c: Ctx) {
  await page(c)
    .evaluate(() => {
      const lens = document.querySelector("solid-lens") as
        | (HTMLElement & { collapsed?: boolean })
        | null;
      if (lens && !lens.collapsed) lens.collapsed = true;
    })
    .catch(() => {});
}

async function demoApi<T>(c: Ctx, fn: string, arg?: string): Promise<T> {
  return page(c).evaluate(
    ([f, a]) => {
      const demo = (window as unknown as PageGlobals).__demo;
      if (!demo) throw new Error("window.__demo is not on this page");
      return demo[f as string](a);
    },
    [fn, arg] as const,
  ) as Promise<T>;
}

interface LiveTotals {
  organisations: number;
  grants: { active: number; expired: number; revoked: number };
  uploads: number;
  denied: number;
  documentsDelivered: number;
  credentialsIssued: number;
}

/**
 * The value a claim's metric has now, live, or undefined if the run cannot tell. `demo` is the
 * demo's own ledger totals counted from the same log (`<demo>.<field>` metrics).
 */
export function liveMetric(
  c: Pick<Ctx, "metrics" | "demo">,
  t: LiveTotals,
  metric: string,
  demo?: Record<string, unknown>,
): number | undefined {
  const own = `${c.demo.id}.`;
  if (metric.startsWith(own)) {
    const v = demo?.[metric.slice(own.length)];
    return typeof v === "number" ? v : undefined;
  }
  switch (metric) {
    case "grants.total":
      return t.grants.active + t.grants.expired + t.grants.revoked;
    case "grants.revoked":
      return t.grants.revoked;
    case "uploads":
      return t.uploads;
    case "denied":
      return t.denied;
    case "organisations.involved":
      return t.organisations;
    default:
      return c.metrics[metric];
  }
}

/**
 * Shows the journey ledger: on the ledger page itself (`<journey-ledger>`), or opened from the
 * Lens, which either navigates to the demo's ledger page or opens it as a dialog.
 */
async function openLedger(c: Ctx): Promise<Locator> {
  const onPage = page(c).locator("journey-ledger");
  if (!(await onPage.count())) {
    const before = page(c).url();
    await demoApi(c, "lens", "ledger");
    await sleep(500);
    if (page(c).url() !== before) await c.d.settle();
  }
  if (await onPage.count()) {
    await onPage
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    return onPage.first();
  }
  return lensPart(c, ".ledger-dialog");
}

/** Compares every spoken total with the journey ledger the Lens computed from the pod's events. */
async function checkTotals(c: Ctx) {
  // The ledger page computes from the same log as the Lens; prefer what is on screen. The log
  // itself (the Lens's received entries) feeds the demo's own totals, as on its ledger page.
  const live = (await page(c).evaluate(() => {
    type Model = { received?: { entry: unknown }[] };
    const ledger = document.querySelector("journey-ledger") as
      | (Element & { totals?: () => unknown; model?: Model })
      | null;
    const lens = document.querySelector("solid-lens") as (Element & { model?: Model }) | null;
    let model: Model | undefined;
    try {
      model = lens?.model;
    } catch {
      // <solid-lens> throws before configure(): fall back to the ledger page's own model.
    }
    const entries = (ledger?.model ?? model)?.received?.map((r) => r.entry);
    const fromPage = ledger?.totals?.();
    return { t: fromPage ?? (window as unknown as PageGlobals).__demo?.totals(), entries };
  })) as { t?: LiveTotals; entries?: unknown[] };
  const t = live.t;
  if (!t) return c.d.warn("no journey ledger totals on this page");
  const own = c.demoTotals && live.entries ? c.demoTotals(live.entries) : undefined;
  c.state.totals = own ? { ...t, [c.demo.id]: own } : t;
  const bad = c.demo.claims
    .map((claim: Claim) => ({ claim, live: liveMetric(c, t, claim.metric, own) }))
    .filter(({ claim, live }) => live !== claim.value);
  for (const { claim, live } of bad)
    c.d.warn(
      `spoken total "${claim.says}" is ${claim.value}, the ledger says ${live ?? "nothing"}`,
    );
}

export const actions: Record<string, Action> = {
  async card(c, id) {
    await cards(c, id as string);
    const later = await page(c)
      .evaluate((i) => !!document.querySelector(`#${i} [data-step="1"]`), id as string)
      .catch(() => false);
    if (later) {
      await sleep(Math.max(1500, left(c) * 0.4));
      await page(c).evaluate(() => (window as unknown as PageGlobals).cards.step(1));
    }
  },

  async step(c, id) {
    const s = findStep(c, id as string);
    await c.d.clearHighlight();
    c.state.step = s.id;
    const samePage =
      onStepPage(c, s, new URL(page(c).url())) &&
      (await page(c)
        .evaluate(() => !!(window as unknown as PageGlobals).__demo)
        .catch(() => false));
    if (samePage) await demoApi(c, "goto", s.id);
    else await c.d.goto(stepUrl(c, s), { ready: onStep(c, s.id) });
    if (!(await until(20_000, onStep(c, s.id)))) c.d.warn(`step ${s.id} did not draw`);
    await c.d.clearHighlight();
    await lensOpen(c);
    await chip(c, chipFor(c, s));
    await sleep(500);
    if (await handOff(c, s)) await c.d.clearHighlight();
  },

  async act(c) {
    const s = findStep(c, c.state.step ?? "");
    if (!s.action) return c.d.warn(`step ${s.id} has no action`);
    await c.d.clearHighlight();
    await handOff(c, s);
    // A button can be drawn before the data it acts on has loaded, and stay disabled until it has
    // (the lending prover waits for its anchors): a press then would be lost.
    if (!(await until(20_000, () => targetOf(c, s).first().isEnabled({ timeout: 1000 }))))
      console.log(`  · ${s.id}: "${s.action.label}" still disabled; pressing anyway`);
    const pressed = await targetOf(c, s)
      .first()
      .elementHandle({ timeout: 8000 })
      .catch(() => null);
    if (
      !(await c.d.click(targetOf(c, s), `${s.action.label} [data-tour="${s.action.target}"]`, {
        settle: false,
      }))
    )
      return;
    // Done comes from the pod's own events (or the app's note); agents and proofs can take a while.
    const done = await until(120_000, () =>
      page(c).evaluate(
        (stepId) => !!(window as unknown as PageGlobals).__demo?.state()?.done?.includes(stepId),
        s.id,
      ),
    );
    if (!done) c.d.warn(`step ${s.id}: the tour never marked it done`);
    // The tour marks a step done on its first matching write, and the app may still be writing:
    // revoking writes the consent record (the done event) and then rewrites the access rules.
    // Leaving the page now would abandon those writes, so wait while the pressed button still
    // says it is busy ("Revoking…").
    if (pressed && !(await finished(pressed, 30_000)))
      console.log(`  · ${s.id}: "${s.action.label}" still busy after 30 s; carrying on`);
    await pressed?.dispose().catch(() => {});
    await c.d.settle();
    if (c.state.chip) await chip(c, c.state.chip);
  },

  async ring(c, name) {
    await ringApp(c, page(c).locator(`[data-tour="${name}"]`), `[data-tour="${name}"]`);
  },

  async lens(c, view) {
    await c.d.clearHighlight();
    await lensOpen(c);
    switch (view) {
      case "map":
        await demoApi(c, "lens", "step");
        await lensPart(c, ".map-zone")
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => {});
        return;
      case "ledger":
        await openLedger(c);
        return;
      case "totals": {
        const where = await openLedger(c);
        // On a ledger page the docked Lens covers the right of the totals strip (the mortgage's
        // "Uploads by Alex" tile): fold it away while the totals are read out.
        if (await page(c).locator("journey-ledger").count()) await lensFold(c);
        await sleep(600);
        // The ledger's totals strip; a ledger opened on its examiner view has none, and the page
        // shows the demo's own totals beside it (small-business-loan: `wallet-loan-totals`).
        const strip = where.locator(".totals").filter({ visible: true });
        const own = page(c).locator('[data-testid$="-totals"]').filter({ visible: true });
        const shown = (await strip.count()) > 0 || !(await own.count()) ? strip : own;
        await ringExact(c, shown, "the ledger totals");
        await checkTotals(c);
        return;
      }
      case "examiner": {
        // A ledger page that opens on the examiner view (the business KYB demo's last step) is
        // shown where it is; otherwise the Lens opens its ledger on the examiner tab.
        const onPage = page(c).locator("journey-ledger");
        if (await onPage.count()) {
          await onPage
            .first()
            .scrollIntoViewIfNeeded()
            .catch(() => {});
          return;
        }
        await demoApi(c, "lens", "examiner");
        await sleep(500);
        return;
      }
      default:
        await demoApi(c, "lens", view);
        await sleep(300);
        await lensPart(c, ".tabpanel:not([hidden])")
          .first()
          .scrollIntoViewIfNeeded()
          .catch(() => {});
    }
  },

  async "ring-lens"(c, part) {
    await lensOpen(c);
    const [kind, value] = (part as string).split(/:(.*)/s);
    if (kind === "edge") {
      const node = c.orgs[value as string]?.actsAs ?? value;
      await ringExact(c, lensPart(c, `.edge[data-org="${node}"]`), `the Lens edge to ${value}`);
    } else if (kind === "drawer") {
      await ringExact(
        c,
        lensPart(c, ".drawer").filter({ hasText: value as string }),
        `the ${value} drawer`,
      );
    } else if (part === "map") await ringExact(c, lensPart(c, ".map-zone"), "the Lens map");
    else if (part === "headline")
      await ringExact(c, lensPart(c, ".zone.where .headline"), "the Lens headline");
    else if (part === "last") {
      // The newest entry in the step's log: the highest sequence number.
      await demoApi(c, "lens", "step");
      await sleep(300);
      const entries = lensPart(c, ".tabpanel:not([hidden]) .entry");
      const seqs = await entries.evaluateAll((els) =>
        els.map((e) => Number(e.getAttribute("data-seq"))),
      );
      if (!seqs.length) return c.d.warn("the Lens has no entry to ring");
      await ringExact(c, entries.nth(seqs.indexOf(Math.max(...seqs))), "the newest entry");
    } else c.d.warn(`unknown Lens part ${part}`);
  },

  async chip(c, ...words) {
    await chip(c, words.join(" ") || undefined);
  },

  async open(c, slug, path = "/") {
    const url = `${c.site}/${slug}/${(path as string).replace(/^\/+/, "")}`;
    await c.d.goto(url);
    if (slug && c.orgs[slug]) await chip(c, c.orgs[slug].organisation);
  },
};

/** Runs in every page before its scripts. Nothing to hide: the tour's present mode does it. */
export function presentation() {}
