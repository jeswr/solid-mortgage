// AUTHORED-BY Claude Opus 5.5
/**
 * Loads what one demo's video needs: its narration (`video/<demo>/narration.md`), its title cards
 * (`video/<demo>/cards.html`), the spoken totals it claims (`video/<demo>/claims.json`), and,
 * when the demo has been built, its tour from `content/<demo>/tour.ts` (read from the built
 * `content/dist/`, so run `pnpm run build` first).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Narration, parseNarration } from "./narration.ts";

export const VIDEO = path.resolve(import.meta.dirname, "..");
export const REPO = path.resolve(VIDEO, "..");

/** Every demo with a script, in the order of docs/rebuild/video-scripts.md. */
export const DEMO_IDS = [
  "mortgage",
  "moving-house",
  "business-kyb",
  "small-dollar-lending",
  "medication-handover",
  "small-business-loan",
  "motor-claim",
  "reusable-kyc",
] as const;
export type DemoId = (typeof DEMO_IDS)[number];

/** The part of a tour step the recorder uses (`TourStep` from @mortgage/demo-kit/contracts). */
export interface TourStepLite {
  id: string;
  app: string;
  path: string;
  mode: "interactive" | "summary";
  action?: { target: string; label: string };
  done: { target?: string; event?: unknown; note?: unknown };
}

/** One spoken number the narration claims, and the ledger quantity it must equal. */
export interface Claim {
  /** Text that must appear, word for word, in one narration paragraph. */
  says: string;
  /**
   * `registry.apps` (applications in content/orgs.ts), `registry.organisations` (distinct
   * organisations there), `grants.total` (grants in the journey ledger: active, expired and
   * revoked), `grants.revoked`, `uploads` (documents the holder uploaded), `denied`,
   * `organisations.involved`, or `<demo>.<field>`: a field of the demo's own ledger totals
   * (`content/<demo>/ledger.ts`), counted live from the same log the ledger page counts.
   */
  metric: string;
  value: number;
}

export interface OrgLite {
  slug: string;
  actsAs: string;
  organisation: string;
  short: string;
}

export interface Demo {
  id: DemoId;
  dir: string;
  narration: Narration;
  /** `id="…"` of every slide in cards.html. */
  cards: string[];
  claims: Claim[];
  /** The tour, when `content/<demo>/` exists (built demos only). */
  tour?: TourStepLite[];
  /** Step ids the script declares in its front matter (`steps:`). */
  declaredSteps: string[];
}

export function readDemo(id: DemoId): Demo {
  const dir = path.join(VIDEO, id);
  const narration = parseNarration(readFileSync(path.join(dir, "narration.md"), "utf8"));
  const cardsFile = path.join(dir, "cards.html");
  const cards = existsSync(cardsFile)
    ? [
        ...readFileSync(cardsFile, "utf8").matchAll(/<section\b[^>]*\bclass="slide[^"]*"[^>]*>/g),
      ].flatMap((m) => {
        const idAttr = m[0].match(/\bid="([^"]+)"/);
        return idAttr?.[1] ? [idAttr[1]] : [];
      })
    : [];
  const claimsFile = path.join(dir, "claims.json");
  const claims = existsSync(claimsFile)
    ? (JSON.parse(readFileSync(claimsFile, "utf8")) as Claim[])
    : [];
  const declaredSteps = (narration.meta.steps ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { id, dir, narration, cards, claims, declaredSteps };
}

/** Is the demo built (its content directory exists)? */
export function isBuilt(id: DemoId): boolean {
  return existsSync(path.join(REPO, "content", id, "tour.ts"));
}

async function importBuilt<T>(rel: string): Promise<T> {
  const file = path.join(REPO, rel);
  if (!existsSync(file))
    throw new Error(`${rel} is missing: run \`pnpm run build\` before checking or recording`);
  return (await import(pathToFileURL(file).href)) as T;
}

/** The demo's tour, read from the built content package. */
export async function loadTour(id: DemoId): Promise<TourStepLite[]> {
  const mod = await importBuilt<{ TOUR: TourStepLite[] }>(`content/dist/${id}/tour.js`);
  return [...mod.TOUR];
}

/** The organisation registry (content/orgs.ts). */
export async function loadOrgs(): Promise<Record<string, OrgLite>> {
  const mod = await importBuilt<{ ORGS: Record<string, OrgLite> }>("content/dist/orgs.js");
  return mod.ORGS;
}

/** Static values of the claim metrics that do not need a run of the journey. */
export async function staticMetrics(id: DemoId): Promise<Record<string, number>> {
  const all = await loadOrgs();
  // The registry grows with each demo; count only the apps this demo uses (content/orgs.ts).
  const { DEMO_APPS } = await importBuilt<{ DEMO_APPS: Record<string, readonly string[]> }>(
    "content/dist/orgs.js",
  );
  const slugs = DEMO_APPS[id] ?? Object.keys(all);
  const orgs = slugs.flatMap((slug) => (all[slug] === undefined ? [] : [all[slug]]));
  const out: Record<string, number> = {
    "registry.apps": orgs.length,
    "registry.organisations": new Set(orgs.map((o) => o.organisation)).size,
  };
  if (id === "mortgage") {
    // The ledger counts a grant per organisation given access (packages/lens/src/model.ts), so
    // G4's onward permission to the underwriting service is a grant of its own there: the
    // organisations the eight policies name, not the eight policies (content/mortgage/grants.ts).
    const { GRANTS } = await importBuilt<{
      GRANTS: Record<string, { to: string; permissions: readonly { to?: string }[] }>;
    }>("content/dist/mortgage/grants.js");
    const grantees = new Set<string>();
    for (const g of Object.values(GRANTS)) {
      grantees.add(g.to);
      for (const p of g.permissions) if (p.to !== undefined) grantees.add(p.to);
    }
    out["grants.total"] = grantees.size;
  }
  return out;
}

/** A demo's own ledger totals: `content/<demo>/ledger.ts` counts them from the journey's log. */
export type DemoTotals = (entries: readonly unknown[]) => Record<string, unknown>;

/**
 * The totals function of a demo's journey ledger page (`movingHouseTotals`, `loanTotals`, …), the
 * one the page itself runs over the pods' log, or undefined when the demo has none. A claim's
 * metric `<demo>.<field>` is that function's `<field>`.
 */
export async function loadDemoTotals(id: DemoId): Promise<DemoTotals | undefined> {
  const rel = `content/dist/${id}/ledger.js`;
  if (!existsSync(path.join(REPO, rel))) return undefined;
  const mod = await importBuilt<Record<string, unknown>>(rel);
  const fns = Object.entries(mod).filter(
    ([name, value]) => typeof value === "function" && /Totals$/.test(name),
  );
  if (fns.length !== 1) return undefined;
  return fns[0]?.[1] as DemoTotals;
}

/** Drawer labels and paths the Lens shows (`MORTGAGE_DRAWERS` for the mortgage). */
export async function loadDrawers(id: DemoId): Promise<{ path: string; label: string }[]> {
  if (id !== "mortgage") return [];
  const mod = await importBuilt<{ MORTGAGE_DRAWERS: readonly { path: string; label: string }[] }>(
    "content/dist/mortgage/mount.js",
  );
  return [...mod.MORTGAGE_DRAWERS];
}

/** Every `data-tour="…"` name written in an app's source (for `ring <name>`). */
export function dataTourNames(): Set<string> {
  const names = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(tsx?|html)$/.test(e.name))
        for (const m of readFileSync(full, "utf8").matchAll(/data-tour=(?:"|\{")([a-z0-9-]+)"/g))
          if (m[1]) names.add(m[1]);
    }
  };
  const apps = path.join(REPO, "apps");
  for (const e of readdirSync(apps, { withFileTypes: true }))
    if (e.isDirectory() && existsSync(path.join(apps, e.name, "src")))
      walk(path.join(apps, e.name, "src"));
  return names;
}
