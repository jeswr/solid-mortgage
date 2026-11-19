// AUTHORED-BY Claude Opus 5.5
/**
 * `record.ts --check`: validates a demo's narration without voicing, recording or a browser.
 *
 * - Every scene has an id, a title and at least one spoken paragraph.
 * - Every `[do:]`/`[then:]` action is one the recorder knows, with arguments that resolve: a card
 *   that exists in cards.html, a tour step that exists in `content/<demo>/tour.ts` (or, for a
 *   demo not built yet, in the script's `steps:` list), an `act` only on a step with an action,
 *   a Lens view and Lens part the Lens has, an organisation in content/orgs.ts.
 * - Every step of a built demo's tour is shown, in tour order.
 * - Every spoken total (claims.json) appears in the narration, its number word equals the claimed
 *   value, and the value equals what content/ says (the live run checks the rest against
 *   `window.__demo.totals()`, or a demo's own `content/<demo>/ledger.ts` totals, which must
 *   count the claimed field). A paragraph spoken over `lens totals` may not state an unclaimed
 *   number.
 * - The spoken words equal docs/rebuild/video-scripts.md, the script of record, so the welcome
 *   page's transcripts (copied from it) match what is said.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type Demo,
  type DemoId,
  dataTourNames,
  isBuilt,
  loadDemoTotals,
  loadDrawers,
  loadOrgs,
  loadTour,
  REPO,
  readDemo,
  staticMetrics,
} from "./demo.ts";
import { type Action, parseNarration, plain, type Scene } from "./narration.ts";

export type Level = "error" | "warning" | "note";
export interface Issue {
  level: Level;
  where: string;
  message: string;
}

export interface CheckResult {
  demo: DemoId;
  built: boolean;
  issues: Issue[];
  words: number;
  paragraphs: number;
  /** Estimated length at the suite video's pace (about 130 words a minute with pauses). */
  minutes: number;
}

/** What each action takes: [min, max] arguments (max -1: any). */
export const ACTION_ARITY: Record<string, [number, number]> = {
  card: [1, 1],
  step: [1, 1],
  act: [0, 0],
  ring: [1, 1],
  lens: [1, 1],
  "ring-lens": [1, 1],
  chip: [0, -1],
  open: [1, 2],
};

export const LENS_VIEWS = [
  "map",
  "step",
  "grants",
  "not-shared",
  "raw",
  "ledger",
  "totals",
  "examiner",
] as const;
/** Views the Lens (packages/lens) does not have yet. */
const LENS_VIEWS_MISSING = new Set<string>([]);

const SMALL: Record<string, number> = {
  no: 0,
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** The first number in a phrase, written in digits or in English words ("No" is zero). */
export function firstNumber(text: string): number | undefined {
  const words = text.toLowerCase().match(/[a-z]+|\d[\d,]*/g) ?? [];
  let total = 0;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (/^\d/.test(w)) {
      if (seen) break;
      return Number(w.replace(/,/g, ""));
    }
    if (w in SMALL) {
      current += SMALL[w] as number;
      seen = true;
    } else if (w === "hundred" && seen) current *= 100;
    else if (w === "thousand" && seen) {
      total += current * 1000;
      current = 0;
    } else if (!(w === "and" && seen) && seen) break;
  }
  return seen ? total + current : undefined;
}

/** Splits docs/rebuild/video-scripts.md into one section per `# ` heading. */
export function scriptSections(source: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = source.replace(/\r\n/g, "\n").split(/^# /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const heading = part.slice(0, nl).trim();
    let body = part.slice(nl + 1);
    body = body.replace(/^```[\s\S]*?^```\s*$/m, "").replace(/^---\s*$/gm, "");
    out.set(heading, body);
  }
  return out;
}

const spokenOf = (s: Scene) => s.steps.filter((st) => st.text).map((st) => plain(st.text));

/**
 * Checks one demo. `override` replaces parts read from disk (the tests use it to feed a broken
 * narration through the same rules).
 */
export async function checkDemo(
  id: DemoId,
  override: Partial<Pick<Demo, "narration" | "cards" | "claims">> = {},
): Promise<CheckResult> {
  const issues: Issue[] = [];
  const add = (level: Level, where: string, message: string) =>
    issues.push({ level, where, message });
  let demo: Demo;
  try {
    demo = { ...readDemo(id), ...override };
  } catch (e) {
    add("error", id, (e as Error).message);
    return { demo: id, built: false, issues, words: 0, paragraphs: 0, minutes: 0 };
  }
  const built = isBuilt(id);
  const { narration } = demo;
  if (!narration.meta.title) add("error", id, "narration.md has no title in its front matter");
  if (!narration.scenes.length) add("error", id, "narration.md has no scenes");

  const orgs = await loadOrgs();
  const tour = built ? await loadTour(id) : undefined;
  const drawers = built ? await loadDrawers(id) : [];
  const tourNames = built ? dataTourNames() : new Set<string>();
  const stepIds = tour ? tour.map((s) => s.id) : demo.declaredSteps;
  if (!built) add("note", id, "not built yet: step ids are checked against the script's steps:");

  const visited: string[] = [];
  let currentStep: string | undefined;
  let actedOn: string | undefined;
  const acted = new Set<string>();
  let words = 0;
  let paragraphs = 0;

  for (const scene of narration.scenes) {
    const where = `${id}#${scene.id}`;
    if (!/^[a-z][a-z0-9-]*$/.test(scene.id)) add("error", where, "scene id is not a slug");
    if (!scene.steps.some((s) => s.text)) add("error", where, "scene has no spoken paragraph");
    for (const st of scene.steps) {
      if (st.text) {
        paragraphs++;
        words += st.text.split(/\s+/).filter(Boolean).length;
      }
      const all: Array<[Action, boolean]> = [
        ...st.actions.map((a) => [a, false] as [Action, boolean]),
        ...st.after.map((a) => [a, true] as [Action, boolean]),
      ];
      for (const [a] of all) {
        const at = `${where} [${a.name}${a.args.length ? ` ${a.args.join(" ")}` : ""}]`;
        const arity = ACTION_ARITY[a.name];
        if (!arity) {
          add("error", at, `unknown action (known: ${Object.keys(ACTION_ARITY).join(", ")})`);
          continue;
        }
        if (a.args.length < arity[0] || (arity[1] >= 0 && a.args.length > arity[1])) {
          add("error", at, "wrong number of arguments");
          continue;
        }
        const arg = a.args[0] ?? "";
        switch (a.name) {
          case "card":
            if (!demo.cards.includes(arg))
              add("error", at, `cards.html has no slide "${arg}" (has: ${demo.cards.join(", ")})`);
            break;
          case "step":
            if (!stepIds.includes(arg)) add("error", at, `no tour step "${arg}"`);
            else {
              if (visited.includes(arg)) add("warning", at, "step shown twice");
              visited.push(arg);
            }
            currentStep = arg;
            actedOn = undefined;
            break;
          case "act": {
            if (!currentStep) add("error", at, "act before any step");
            else if (actedOn === currentStep) add("error", at, "a second act on the same step");
            else if (tour) {
              const s = tour.find((x) => x.id === currentStep);
              if (s && !s.action) add("error", at, `step "${currentStep}" has no action to act on`);
            }
            actedOn = currentStep;
            if (currentStep) acted.add(currentStep);
            break;
          }
          case "lens":
            if (!(LENS_VIEWS as readonly string[]).includes(arg))
              add("error", at, `unknown Lens view (known: ${LENS_VIEWS.join(", ")})`);
            else if (LENS_VIEWS_MISSING.has(arg))
              add(built ? "error" : "note", at, `the Lens has no "${arg}" view yet`);
            break;
          case "ring-lens": {
            const [kind, value] = arg.split(/:(.*)/s);
            if (kind === "edge") {
              if (!value || !orgs[value]) add("error", at, `no organisation "${value}"`);
            } else if (kind === "drawer") {
              if (!value) add("error", at, "drawer: needs a name");
              else if (built && !drawers.some((d) => d.label === value || d.path === value))
                add("error", at, `the Lens has no drawer "${value}"`);
            } else if (!["headline", "map", "last"].includes(arg))
              add(
                "error",
                at,
                "Lens part must be headline, map, last, edge:<org> or drawer:<name>",
              );
            break;
          }
          case "ring":
            if (built && !tourNames.has(arg))
              add("error", at, `no app source has data-tour="${arg}"`);
            break;
          case "open":
            if (arg !== "welcome" && !orgs[arg]) add("error", at, `no app "${arg}"`);
            if (a.args[1] && !a.args[1].startsWith("/")) add("error", at, "path must start with /");
            break;
        }
      }
    }
  }

  if (tour) {
    for (const s of tour) {
      if (!visited.includes(s.id)) add("error", id, `tour step "${s.id}" is never shown`);
      else if (s.action && !acted.has(s.id))
        add("note", id, `step "${s.id}" is shown but its action ("${s.action.label}") is not done`);
    }
    const order = visited.map((v) => stepIds.indexOf(v));
    for (let i = 1; i < order.length; i++)
      if ((order[i] as number) < (order[i - 1] as number))
        add("error", id, `step "${visited[i]}" is shown before an earlier tour step`);
  } else {
    for (const s of demo.declaredSteps)
      if (!visited.includes(s)) add("warning", id, `declared step "${s}" is never shown`);
  }

  // Spoken totals.
  const paras = narration.scenes.flatMap((s) =>
    s.steps.filter((st) => st.text).map((st) => ({ scene: s.id, step: st, text: plain(st.text) })),
  );
  const metrics = built ? await staticMetrics(id) : {};
  const demoTotals = built ? await loadDemoTotals(id) : undefined;
  // The fields the demo's ledger counts: its totals over an empty log.
  const fields = demoTotals ? demoTotals([]) : {};
  for (const c of demo.claims) {
    const where = `${id} claim "${c.says}"`;
    const hits = paras.filter((p) => p.text.includes(c.says));
    if (hits.length !== 1) add("error", where, `appears in ${hits.length} paragraphs, not 1`);
    const n = firstNumber(c.says);
    if (n !== c.value) add("error", where, `says ${n}, claims ${c.value}`);
    const known = metrics[c.metric];
    if (known !== undefined && known !== c.value)
      add("error", where, `${c.metric} is ${known} in content/, the narration says ${c.value}`);
    const own = c.metric.startsWith(`${id}.`) ? c.metric.slice(id.length + 1) : undefined;
    if (built && own !== undefined && typeof fields[own] !== "number")
      add(
        "error",
        where,
        demoTotals
          ? `content/${id}/ledger.ts counts no "${own}"`
          : `content/${id}/ledger.ts has no totals function for ${c.metric}`,
      );
    else if (known === undefined)
      add(
        "note",
        where,
        own === undefined
          ? `${c.metric} is checked live against window.__demo.totals()`
          : `${c.metric} is checked live against content/${id}/ledger.ts over the pods' log`,
      );
  }
  for (const p of paras) {
    const overTotals = [...p.step.actions, ...p.step.after].some(
      (a) => a.name === "lens" && a.args[0] === "totals",
    );
    if (!overTotals) continue;
    for (const sentence of p.text.match(/[^.!?]+[.!?]*/g) ?? []) {
      if (firstNumber(sentence) === undefined) continue;
      if (!demo.claims.some((c) => sentence.includes(c.says) || c.says.includes(sentence.trim())))
        add(
          built ? "error" : "note",
          `${id}#${p.scene}`,
          `"${sentence.trim()}" states a total with no entry in claims.json`,
        );
    }
  }

  // The script of record.
  const scriptFile = path.join(REPO, "docs", "rebuild", "video-scripts.md");
  const heading = narration.meta.script;
  if (!heading) add("error", id, "front matter has no script: (the heading in video-scripts.md)");
  else if (existsSync(scriptFile)) {
    const section = scriptSections(readFileSync(scriptFile, "utf8")).get(heading);
    if (!section) add("error", id, `video-scripts.md has no "# ${heading}" section`);
    else {
      const ref = parseNarration(section);
      const mine = narration.scenes;
      if (ref.scenes.map((s) => s.id).join() !== mine.map((s) => s.id).join())
        add("error", id, "scene ids differ from video-scripts.md");
      for (const r of ref.scenes) {
        const m = mine.find((s) => s.id === r.id);
        if (!m) continue;
        if (m.title !== r.title) add("error", `${id}#${r.id}`, "title differs from the script");
        if (spokenOf(m).join("\n") !== spokenOf(r).join("\n"))
          add("error", `${id}#${r.id}`, "spoken words differ from video-scripts.md");
      }
    }
  }

  return { demo: id, built, issues, words, paragraphs, minutes: words / 130 };
}

/** Errors, plus warnings when strict. */
export function failures(r: CheckResult, strict: boolean): Issue[] {
  return r.issues.filter((i) => i.level === "error" || (strict && i.level === "warning"));
}
