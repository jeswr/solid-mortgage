// AUTHORED-BY Claude Opus 5.5
/**
 * The journey ledger view (design.md §c.5): totals strip, matrix (a real table with CSV
 * export), timeline, the illustrative "today" comparison and calls to action. Rendered from
 * `computeLedger`, so every number traces back to an entry.
 */
import { describe } from "./describe.js";
import { h } from "./dom.js";
import { type ComplianceItem, type Examination, examine, registerCsv } from "./examiner.js";
import { computeLedger, type Ledger, ledgerCsv } from "./ledger.js";
import type { LensModel } from "./model.js";
import { TOKENS } from "./styles.js";
import type { TimelineStep } from "./types.js";

export interface LedgerViewOptions {
  steps?: TimelineStep[];
  /** Illustrative: who holds a copy of each resource in the conventional process. */
  today?: Array<{ resource: string; holders: string[] }>;
  /** Where the illustrative comparison comes from (shown under it). */
  todaySource?: string;
  callsToAction?: Array<{ label: string; href: string }>;
  onRestart?: () => void;
  /** Heading level of the ledger title (1 on a page of its own, 2 inside the Lens). */
  headingLevel?: 1 | 2;
  /** Obligations the examiner view checks against the log (the demo's `compliance` list). */
  compliance?: ComplianceItem[];
  /** Which tab opens first. Default "journey". */
  view?: LedgerTab;
  /** Hears the tab the viewer picks (so a re-render can keep it). */
  onTab?: (tab: LedgerTab) => void;
}

export type LedgerTab = "journey" | "examiner";

export const LEDGER_CSS = `
.ledger { ${TOKENS} font-family: var(--font); color: var(--ink); background: var(--paper); padding: 20px clamp(14px, 3vw, 32px) 32px; font-size: 15px; line-height: 1.5; }
.ledger * { box-sizing: border-box; }
.ledger .lede { color: var(--ink-2); margin: 4px 0 18px; max-width: 70ch; }
.ledger h1, .ledger h2.title { font-size: 1.7em; margin: 0; letter-spacing: -0.01em; }
.ledger section { margin: 26px 0 0; }
.ledger section > h2, .ledger section > h3 { font-size: 1.15em; margin: 0 0 8px; }
.ledger .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.ledger .tile { border: 1.5px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--paper); }
.ledger .tile .n { display: block; font-size: 2em; font-weight: 800; line-height: 1.1; color: var(--brand); font-variant-numeric: tabular-nums; }
.ledger .tile .l { font-weight: 650; }
.ledger .tile .d { display: block; font-size: 0.84em; color: var(--ink-3); }
.ledger .tile[data-total="denied"] .n { color: var(--denied); }
.ledger .tile[data-total="uploads"] .n { color: var(--write); }
.ledger .matrix-wrap { overflow: auto; max-height: 70vh; border: 1px solid var(--line); border-radius: 10px; }
.ledger table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 0.9em; }
.ledger caption { text-align: left; padding: 8px 10px; color: var(--ink-2); caption-side: top; }
.ledger th, .ledger td { padding: 6px 9px; border-bottom: 1px solid var(--line-2); text-align: left; vertical-align: top; background: var(--paper); }
.ledger thead th { position: sticky; top: 0; z-index: 2; background: var(--paper-2); font-size: 0.86em; white-space: nowrap; }
.ledger tbody th[scope="row"] { position: sticky; left: 0; z-index: 1; min-width: 180px; font-weight: 600; }
.ledger thead th:first-child { left: 0; z-index: 3; }
.ledger .grp th { background: var(--paper-3); font-size: 0.8em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
.ledger .path { display: block; font-family: var(--mono); font-size: 0.78em; color: var(--ink-3); font-weight: 400; }
.ledger td.cell { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ledger td.cell[data-state="active"] { background: #efe9fb; }
.ledger td.cell[data-state="expired"] { background: repeating-linear-gradient(135deg, #f1f2f4 0 6px, #e6e8eb 6px 8px); }
.ledger td.cell[data-state="revoked"] { background: #fdeceb; }
.ledger .mark { font-weight: 800; margin-right: 3px; }
.ledger td.cell[data-state="active"] .mark { color: var(--grant); }
.ledger td.cell[data-state="expired"] .mark { color: var(--expired); }
.ledger td.cell[data-state="revoked"] .mark { color: var(--denied); }
.ledger .refused { color: var(--denied); font-weight: 700; }
.ledger .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0; padding: 0; list-style: none; font-size: 0.86em; color: var(--ink-2); }
.ledger .legend .sw { display: inline-block; width: 18px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 5px; border: 1px solid var(--line); }
.ledger .btn { border: 1.5px solid var(--brand); color: var(--brand); background: var(--paper); border-radius: 8px; padding: 7px 13px; font: inherit; font-weight: 700; cursor: pointer; }
.ledger .btn:hover { background: var(--brand-soft); }
.ledger .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.ledger ol.timeline { list-style: none; padding: 0; margin: 0; border-left: 3px solid var(--line); }
.ledger ol.timeline > li { padding: 0 0 12px 16px; position: relative; }
.ledger ol.timeline > li::before { content: ""; position: absolute; left: -8px; top: 5px; width: 13px; height: 13px; border-radius: 50%; background: var(--paper); border: 3px solid var(--brand); }
.ledger ol.timeline h3, .ledger ol.timeline h4 { font-size: 1em; margin: 0 0 4px; }
.ledger ol.steps { margin: 0; padding-left: 18px; }
.ledger ol.steps li { margin: 2px 0; }
.ledger .day { color: var(--ink-3); font-size: 0.86em; }
.ledger .clock { display: block; color: var(--note); font-size: 0.88em; }
.ledger .illustrative { display: inline-block; font-size: 0.72em; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--note); border: 1.5px dashed var(--note); border-radius: 6px; padding: 1px 6px; margin-left: 8px; vertical-align: 2px; }
.ledger .cta { display: flex; flex-wrap: wrap; gap: 10px; padding: 0; list-style: none; }
.ledger .cta a { color: var(--brand); font-weight: 700; }
.ledger .src-note { font-size: 0.84em; color: var(--ink-3); }
.ledger .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.ledger :focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.ledger .ledger-tabs { display: flex; gap: 4px; margin: 14px 0 0; border-bottom: 2px solid var(--line); }
.ledger .ledger-tabs [role="tab"] { border: 0; background: none; font: inherit; font-weight: 700; color: var(--ink-2); padding: 8px 14px; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; }
.ledger .ledger-tabs [role="tab"][aria-selected="true"] { color: var(--brand); border-bottom-color: var(--brand); }
.ledger .obligations { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.ledger .obligation { border: 1.5px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.ledger .obligation[data-met="true"] { border-color: var(--grant); }
.ledger .obligation[data-met="false"] { border-style: dashed; }
.ledger .obligation h4, .ledger .obligation h3 { margin: 0; font-size: 1em; }
.ledger .verdict { font-weight: 800; font-size: 0.82em; letter-spacing: 0.06em; text-transform: uppercase; }
.ledger .obligation[data-met="true"] .verdict { color: var(--grant); }
.ledger .obligation[data-met="false"] .verdict { color: var(--denied); }
.ledger .rule { font-family: var(--mono); font-size: 0.84em; color: var(--ink-2); }
.ledger ul.evidence { margin: 6px 0 0; padding-left: 18px; font-size: 0.9em; }
.ledger .register td.refused { color: var(--denied); font-weight: 700; }
`;

const STATE_MARK = { active: "●", expired: "◌", revoked: "✕", never: "" } as const;
const STATE_WORD = {
  active: "access in force",
  expired: "access expired",
  revoked: "access withdrawn",
  never: "never granted",
} as const;

function times(n: number, verb: string): string {
  return n === 1 ? `${verb} once` : `${verb} ${n} times`;
}

export function renderLedger(
  model: LensModel,
  opts: LedgerViewOptions = {},
): { el: HTMLElement; ledger: Ledger; examination: Examination } {
  const ledger = computeLedger(model, opts.steps ?? []);
  const t = ledger.totals;
  const holder = model.holderName;
  const titleTag = opts.headingLevel === 1 ? "h1" : "h2";
  const title = h(titleTag, { class: "title", id: "ledger-title" }, "Journey ledger");
  const sec = opts.headingLevel === 1 ? "h2" : "h3";

  const reuse = t.credentials.reduce((n, c) => n + c.reuses, 0);
  const tile = (key: string, n: number, label: string, detail?: string) =>
    h(
      "li",
      { class: "tile", "data-total": key, "data-value": n },
      h("span", { class: "n" }, n),
      h("span", { class: "l" }, label),
      detail ? h("span", { class: "d" }, detail) : null,
    );

  const totals = h(
    "section",
    { "aria-labelledby": "totals-h" },
    h(sec, { id: "totals-h" }, "Totals, counted from the log"),
    h(
      "ul",
      { class: "totals" },
      tile("organisations", t.organisations, "Organisations involved"),
      tile(
        "grants",
        t.grants.active + t.grants.expired + t.grants.revoked,
        "Grants",
        `${t.grants.active} active · ${t.grants.expired} expired · ${t.grants.revoked} withdrawn`,
      ),
      tile(
        "credentials",
        t.credentialsIssued,
        "Credentials issued",
        t.credentialsIssued === 0
          ? undefined
          : `read ${reuse} time${reuse === 1 ? "" : "s"} by others: ${t.credentials.map((c) => `${c.label} ${c.reuses}`).join(", ")}`,
      ),
      tile("documents", t.documentsDelivered, "Documents delivered to the pod"),
      tile("denied", t.denied, "Requests refused"),
      tile("uploads", t.uploads, `Uploads by ${holder}`),
    ),
  );

  // Matrix.
  const thead = h(
    "thead",
    {},
    h(
      "tr",
      {},
      h("th", { scope: "col" }, "Resource"),
      ...ledger.columns.map((c) => h("th", { scope: "col", title: c.name }, c.label)),
    ),
  );
  const tbody = h("tbody", {});
  let group = "";
  for (const row of ledger.rows) {
    if (row.drawer !== group) {
      group = row.drawer;
      tbody.append(
        h(
          "tr",
          { class: "grp" },
          h("th", { scope: "colgroup", colspan: ledger.columns.length + 1 }, row.drawer),
        ),
      );
    }
    tbody.append(
      h(
        "tr",
        { "data-path": row.path },
        h("th", { scope: "row" }, row.label, h("span", { class: "path" }, row.path)),
        ...row.cells.map((c, i) => {
          const bits: string[] = [];
          if (c.reads) bits.push(`R${c.reads}`);
          if (c.writes) bits.push(`W${c.writes}`);
          const spoken = [
            c.reads ? times(c.reads, "read") : "",
            c.writes ? times(c.writes, "wrote") : "",
            c.denied ? times(c.denied, "refused") : "",
            STATE_WORD[c.state],
          ]
            .filter(Boolean)
            .join(", ");
          return h(
            "td",
            {
              class: "cell",
              "data-state": c.state,
              "data-reads": c.reads,
              "data-writes": c.writes,
              "data-denied": c.denied,
              "data-org": ledger.columns[i]?.key,
            },
            h("span", { class: "mark", "aria-hidden": "true" }, STATE_MARK[c.state]),
            h("span", { "aria-hidden": "true" }, bits.join(" ") || (c.denied ? "" : "–")),
            c.denied
              ? h("span", { class: "refused", "aria-hidden": "true" }, ` ✕${c.denied}`)
              : null,
            h("span", { class: "sr-only" }, spoken),
          );
        }),
      ),
    );
  }
  const csvBtn = h("button", { class: "btn", type: "button" }, "Download as CSV");
  csvBtn.addEventListener("click", () => {
    const blob = new Blob([ledgerCsv(ledger)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: "journey-ledger.csv" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const legendSw = (bg: string) => h("span", { class: "sw", style: `background:${bg}` });
  const matrix = h(
    "section",
    { "aria-labelledby": "matrix-h" },
    h(sec, { id: "matrix-h" }, `Who read and wrote what in ${holder}'s pod`),
    h(
      "ul",
      { class: "legend" },
      h("li", {}, legendSw("#efe9fb"), "● access in force"),
      h(
        "li",
        {},
        legendSw("repeating-linear-gradient(135deg,#f1f2f4 0 6px,#e6e8eb 6px 8px)"),
        "◌ access expired",
      ),
      h("li", {}, legendSw("#fdeceb"), "✕ access withdrawn"),
      h("li", {}, legendSw("#fff"), "no shading: never granted"),
      h("li", {}, "R reads · W writes · ✕ refused"),
    ),
    ledger.rows.length === 0
      ? h("p", { class: "src-note" }, "No requests to the pod yet.")
      : h(
          "div",
          {
            class: "matrix-wrap",
            tabindex: 0,
            role: "region",
            "aria-label": "Ledger matrix, scrollable",
          },
          h(
            "table",
            { class: "matrix" },
            h(
              "caption",
              {},
              "Rows: resources grouped by drawer. Columns: organisations in the order they appeared.",
            ),
            thead,
            tbody,
          ),
        ),
    h("p", { class: "row" }, csvBtn),
  );

  // Timeline.
  const dayLabel = (d: number | undefined) =>
    d === undefined ? "" : (model.config.calendar?.label(d) ?? `Day ${d}`);
  const timeline = h(
    "section",
    { "aria-labelledby": "timeline-h" },
    h(sec, { id: "timeline-h" }, "Timeline"),
    h(
      "ol",
      { class: "timeline" },
      ...ledger.timeline.map((g) =>
        h(
          "li",
          {},
          h(opts.headingLevel === 1 ? "h3" : "h4", {}, g.chapter),
          h(
            "ol",
            { class: "steps" },
            ...g.steps.map((st) =>
              h(
                "li",
                { "data-step": st.id },
                h("strong", {}, st.title),
                st.day !== undefined
                  ? h("span", { class: "day" }, ` · ${dayLabel(st.day)} (simulated calendar)`)
                  : null,
                h(
                  "span",
                  { class: "day" },
                  ` · ${st.podRequests} pod request${st.podRequests === 1 ? "" : "s"}, ${st.appNotes} app note${st.appNotes === 1 ? "" : "s"}`,
                ),
                ...st.clocks.map((c) => h("span", { class: "clock" }, `Clock: ${c}`)),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  // Illustrative comparison.
  let today: HTMLElement | null = null;
  if (opts.today && opts.today.length > 0) {
    const readersOf = (label: string) => {
      const rows = ledger.rows.filter((r) => r.label === label);
      const names = new Set<string>();
      for (const r of rows) {
        r.cells.forEach((c, i) => {
          const col = ledger.columns[i];
          if (c.reads > 0 && col) names.add(col.label);
        });
      }
      return [...names];
    };
    today = h(
      "section",
      { "aria-labelledby": "today-h" },
      h(
        sec,
        { id: "today-h" },
        "Compared with today",
        h("span", { class: "illustrative" }, "Illustrative"),
      ),
      h(
        "table",
        {},
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", { scope: "col" }, "Resource"),
            h("th", { scope: "col" }, "Usually holds a copy today"),
            h("th", { scope: "col" }, "Read it here (from the log)"),
          ),
        ),
        h(
          "tbody",
          {},
          ...opts.today.map((r) => {
            const here = readersOf(r.resource);
            return h(
              "tr",
              {},
              h("th", { scope: "row" }, r.resource),
              h("td", {}, r.holders.join(", ")),
              h("td", {}, here.length ? here.join(", ") : "nobody"),
            );
          }),
        ),
      ),
      opts.todaySource ? h("p", { class: "src-note" }, `Source: ${opts.todaySource}`) : null,
    );
  }

  // Calls to action.
  let cta: HTMLElement | null = null;
  if ((opts.callsToAction?.length ?? 0) > 0 || opts.onRestart) {
    const restart = opts.onRestart
      ? h("button", { class: "btn", type: "button" }, "Restart the demo")
      : null;
    if (restart && opts.onRestart) restart.addEventListener("click", opts.onRestart);
    cta = h(
      "section",
      { "aria-labelledby": "cta-h" },
      h(sec, { id: "cta-h" }, "What next"),
      h(
        "ul",
        { class: "cta" },
        ...(opts.callsToAction ?? []).map((c) => h("li", {}, h("a", { href: c.href }, c.label))),
        restart ? h("li", {}, restart) : null,
      ),
    );
  }

  const examination = examine(model, opts.compliance ?? []);
  const journeyPanel = h(
    "div",
    { role: "tabpanel", id: "ledger-panel-journey", "aria-labelledby": "ledger-tab-journey" },
    h(
      "p",
      { class: "lede" },
      `Every number on this page is counted from the log of requests ${holder}'s pod answered in this session, plus the notes apps added. Nothing is typed in.`,
    ),
    totals,
    matrix,
    timeline,
    today,
    cta,
  );
  const examinerPanel = renderExaminer(model, examination, sec);
  const panels: Record<LedgerTab, HTMLElement> = {
    examiner: examinerPanel,
    journey: journeyPanel,
  };
  const tabs = h("div", { class: "ledger-tabs", role: "tablist", "aria-label": "Ledger views" });
  const buttons = new Map<LedgerTab, HTMLButtonElement>();
  const select = (tab: LedgerTab, focus = false) => {
    for (const [id, button] of buttons) {
      const on = id === tab;
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
      panels[id].hidden = !on;
      if (on && focus) button.focus();
    }
  };
  const order: LedgerTab[] = ["journey", "examiner"];
  for (const id of order) {
    const button = h(
      "button",
      {
        type: "button",
        role: "tab",
        id: `ledger-tab-${id}`,
        "aria-controls": `ledger-panel-${id}`,
        "data-tab": id,
      },
      id === "journey" ? "Journey" : "Examiner view",
    ) as HTMLButtonElement;
    button.addEventListener("click", () => {
      select(id);
      opts.onTab?.(id);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next =
        order[
          (order.indexOf(id) + (event.key === "ArrowRight" ? 1 : order.length - 1)) % order.length
        ];
      if (next) {
        select(next, true);
        opts.onTab?.(next);
      }
    });
    buttons.set(id, button);
    tabs.append(button);
  }
  examinerPanel.setAttribute("role", "tabpanel");
  examinerPanel.id = "ledger-panel-examiner";
  examinerPanel.setAttribute("aria-labelledby", "ledger-tab-examiner");
  select(opts.view ?? "journey");

  const el = h(
    "div",
    { class: "ledger", role: "region", "aria-labelledby": "ledger-title" },
    title,
    tabs,
    journeyPanel,
    examinerPanel,
  );
  return { el, ledger, examination };
}

function download(name: string, type: string, text: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The examiner view: obligations against the log, the access register, access changes. */
function renderExaminer(model: LensModel, x: Examination, sec: "h2" | "h3"): HTMLElement {
  const holder = model.holderName;
  const sub = sec === "h2" ? "h3" : "h4";
  const when = (at: string) => {
    const date = at.slice(0, 10);
    const cal = model.config.calendar;
    return `${cal ? cal.label(cal.dayOf(date)) : date} ${at.slice(11, 16)}`.trim();
  };

  const obligations =
    x.obligations.length === 0
      ? null
      : h(
          "section",
          { "aria-labelledby": "obligations-h" },
          h(sec, { id: "obligations-h" }, "Obligations and the entries that meet them"),
          h(
            "ul",
            { class: "obligations" },
            ...x.obligations.map((o) => {
              const seen = new Set<number>();
              const entries = o.evidence
                .flatMap((ev) => ev.matches)
                .filter((r) => !seen.has(r.seq) && seen.add(r.seq));
              return h(
                "li",
                { class: "obligation", "data-obligation": o.item.id, "data-met": String(o.met) },
                h(sub, {}, o.item.obligation),
                h(
                  "p",
                  { class: "rule" },
                  o.item.source
                    ? h(
                        "a",
                        { href: o.item.source, target: "_blank", rel: "noopener" },
                        o.item.rule,
                      )
                    : o.item.rule,
                ),
                h(
                  "p",
                  { class: "verdict" },
                  o.met
                    ? `Evidenced by ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
                    : "Not evidenced in this session",
                ),
                entries.length === 0
                  ? null
                  : h(
                      "ul",
                      { class: "evidence" },
                      ...entries.map((r) => {
                        const s = describe(model, r);
                        return h(
                          "li",
                          { "data-entry": `${r.entry.source}:${r.entry.id}` },
                          `${when(r.entry.at)} · ${s.text}`,
                          s.meta.length ? ` (${s.meta.join(" · ")})` : "",
                        );
                      }),
                    ),
              );
            }),
          ),
        );

  const csv = h("button", { class: "btn", type: "button" }, "Download the register as CSV");
  csv.addEventListener("click", () =>
    download("access-register.csv", "text/csv", registerCsv(model, x.register)),
  );
  const register = h(
    "section",
    { "aria-labelledby": "register-h" },
    h(sec, { id: "register-h" }, "Access register: every request by an organisation"),
    x.register.length === 0
      ? h("p", { class: "src-note" }, "No organisation has made a request yet.")
      : h(
          "div",
          {
            class: "matrix-wrap",
            tabindex: 0,
            role: "region",
            "aria-label": "Access register, scrollable",
          },
          h(
            "table",
            { class: "register" },
            h(
              "caption",
              {},
              "One row per request a pod answered for an organisation other than its owner, in order.",
            ),
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                ...["When", "Organisation", "Action", "Resource", "Outcome", "Under"].map((c) =>
                  h("th", { scope: "col" }, c),
                ),
              ),
            ),
            h(
              "tbody",
              {},
              ...x.register.map((r) =>
                h(
                  "tr",
                  { "data-entry": r.rec.entry.id, "data-action": r.action, "data-org": r.org },
                  h("td", {}, when(r.at)),
                  h(
                    "th",
                    { scope: "row" },
                    r.orgName,
                    r.viaAgent ? h("span", { class: "path" }, "back-office agent") : null,
                  ),
                  h("td", { class: r.action === "refused" ? "refused" : "" }, r.action),
                  h(
                    "td",
                    {},
                    r.resource,
                    h("span", { class: "path" }, `${model.nameOf(r.pod)} · ${r.path}`),
                  ),
                  h("td", {}, String(r.status)),
                  h("td", {}, r.under),
                ),
              ),
            ),
          ),
        ),
    h("p", { class: "row" }, csv),
  );

  const changes = h(
    "section",
    { "aria-labelledby": "changes-h" },
    h(sec, { id: "changes-h" }, "Changes to access"),
    x.changes.length === 0
      ? h("p", { class: "src-note" }, "No access was given or withdrawn.")
      : h(
          "ol",
          { class: "steps" },
          ...x.changes.map((c) =>
            h(
              "li",
              { "data-entry": c.rec.entry.id },
              h("strong", {}, c.text),
              h("span", { class: "day" }, ` · ${when(c.at)}`),
              ...c.meta.map((m) => h("span", { class: "clock" }, m)),
            ),
          ),
        ),
  );

  return h(
    "div",
    {},
    h(
      "p",
      { class: "lede" },
      `What an examiner would ask of this session: who reached ${holder}'s data and the organisations' pods, under which grant, and what evidences each obligation. Built from the same log as the journey view. The access log is the demo's record, not a feature of the Solid protocol.`,
    ),
    obligations,
    register,
    changes,
  );
}
