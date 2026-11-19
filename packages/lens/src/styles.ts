// AUTHORED-BY Claude Opus 5.5
/**
 * Styles for the Lens shadow root. The Lens has its own tokens; nothing leaks into the host
 * page and the host's styles do not reach in. Every state has a shape or line-style difference
 * as well as a colour, and every colour pair here meets WCAG AA on its background.
 */
export const TOKENS = `
  --ink: #17202a;
  --ink-2: #3a4652;
  --ink-3: #56636f;
  --line: #d6dce3;
  --line-2: #e7ebef;
  --paper: #ffffff;
  --paper-2: #f4f6f8;
  --paper-3: #eceff3;
  --brand: #4f3a8f;
  --brand-soft: #efeaf9;
  --read: #1c5bb0;
  --write: #18703d;
  --seal: #8a5300;
  --grant: #5b3ea6;
  --denied: #b42318;
  --expired: #69717d;
  --proof: #0a6a7c;
  --note: #7a5200;
  --focus: #1c5bb0;
  --radius: 10px;
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --scale: 1;
`;

export const LENS_CSS = `
:host {
  ${TOKENS}
  all: initial;
  position: fixed;
  z-index: 2147483000;
  font-family: var(--font);
  font-size: calc(14px * var(--scale));
  line-height: 1.45;
  color: var(--ink);
  contain: layout style;
  view-transition-name: solid-lens;
}
:host([mode="present"]) { --scale: 1.16; }
:host([hidden]) { display: none; }

/* ---- placement -------------------------------------------------------------------------- */
:host([layout="dock"]) { top: 0; right: 0; bottom: 0; width: 376px; }
:host([layout="dock"][collapsed]) { width: 52px; }
:host([layout="sheet"]) { left: 0; right: 0; bottom: 0; height: min(78vh, 720px); }
:host([layout="sheet"][collapsed]) { height: 64px; }
:host([layout="window"]) { inset: 0; width: auto; }

* { box-sizing: border-box; }
[hidden] { display: none !important; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
button, a { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 6px; }

aside.lens {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border-left: 1px solid var(--line);
  box-shadow: -8px 0 28px rgb(16 24 40 / 0.08);
}
:host([layout="sheet"]) aside.lens {
  border-left: 0; border-top: 1px solid var(--line);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 28px rgb(16 24 40 / 0.12);
}

/* ---- header bar ------------------------------------------------------------------------- */
.bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px 10px 14px;
  border-bottom: 1px solid var(--line-2);
  min-height: 52px;
}
:host([layout="sheet"]) .bar { min-height: 64px; }
.brand { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.brand svg { flex: none; }
.brand-name { font-weight: 700; letter-spacing: 0.01em; }
.brand-sub { color: var(--ink-3); font-size: 0.86em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.peek { display: none; min-width: 0; flex: 1; }
:host([layout="sheet"][collapsed]) .peek { display: block; }
:host([layout="sheet"][collapsed]) .brand-sub { display: none; }
.peek-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn {
  display: inline-grid; place-items: center;
  min-width: 36px; height: 36px; padding: 0 8px;
  border: 1px solid var(--line); border-radius: 8px; background: var(--paper);
  color: var(--ink-2);
}
.icon-btn:hover { background: var(--paper-2); }
.pulse {
  width: 10px; height: 10px; border-radius: 50%; background: var(--brand);
  box-shadow: 0 0 0 0 rgb(79 58 143 / 0.5);
}
.pulse.on { animation: pulse 900ms ease-out 1; }
@keyframes pulse { from { box-shadow: 0 0 0 0 rgb(79 58 143 / 0.55); } to { box-shadow: 0 0 0 10px rgb(79 58 143 / 0); } }

/* ---- collapsed rail (desktop) ----------------------------------------------------------- */
.rail { display: none; }
:host([layout="dock"][collapsed]) .panel { display: none; }
:host([layout="dock"][collapsed]) .rail {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 10px 0; height: 100%;
}
.rail-count { display: grid; place-items: center; gap: 2px; text-align: center; color: var(--ink-2); font-size: 0.8em; }
.rail-count strong { font-size: 1.35em; color: var(--ink); }
.rail-label { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 700; color: var(--brand); letter-spacing: 0.08em; }
:host([layout="sheet"][collapsed]) .body { display: none; }

.panel { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.body { overflow-y: auto; flex: 1; min-height: 0; overscroll-behavior: contain; }
.zone { padding: 12px 14px; border-bottom: 1px solid var(--line-2); }
.zone-title {
  margin: 0 0 6px; font-size: 0.74em; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--ink-3);
}

/* ---- zone 1: step card ------------------------------------------------------------------ */
.step { background: linear-gradient(180deg, var(--brand-soft), var(--paper) 85%); }
:host([mode="free"]) .step, :host([mode="present"]) .step { display: none; }
.step .step-meta { margin: 0; display: flex; justify-content: space-between; gap: 8px; font-size: 0.82em; color: var(--ink-2); }
.step-meta strong { color: var(--brand); letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.95em; }
.step h3 { margin: 4px 0 2px; font-size: 1.15em; line-height: 1.3; }
.step p { margin: 0 0 8px; color: var(--ink-2); }
.step-done { display: inline-flex; align-items: center; gap: 4px; color: var(--write); font-weight: 600; font-size: 0.86em; }
.step-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; }
.btn {
  border: 1px solid var(--line); background: var(--paper); border-radius: 8px;
  padding: 6px 11px; min-height: 34px; font-weight: 600; color: var(--ink);
}
.btn:hover { background: var(--paper-2); }
.btn.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
.btn.primary:hover { background: #42307a; }
.btn[disabled] { opacity: 0.55; cursor: default; }
.spacer { flex: 1; }
.restart { font-size: 0.82em; color: var(--ink-3); background: none; border: 0; text-decoration: underline; padding: 4px; }

/* ---- zone 2: where Solid is ------------------------------------------------------------- */
.headline { margin: 0 0 8px; font-size: 1.02em; font-weight: 550; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0; list-style: none; }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1.5px dashed var(--line); border-radius: 999px; padding: 2px 9px 2px 7px;
  font-size: 0.82em; color: var(--ink-2); background: var(--paper);
}
.chip svg { flex: none; }
.chip[data-seen="true"] { border-style: solid; border-color: currentColor; font-weight: 600; }
.chip[data-kind="pod read"] { color: var(--read); }
.chip[data-kind="pod write"] { color: var(--write); }
.chip[data-kind="grant"] { color: var(--grant); }
.chip[data-kind="credential"] { color: var(--seal); }
.chip[data-kind="proof"] { color: var(--proof); }
.chip[data-kind="denied"] { color: var(--denied); }
.chip[data-kind="no Solid in this step"] { color: var(--ink-2); }
.chip-state { font-weight: 400; color: var(--ink-3); }
.chip[data-seen="true"] .chip-state { color: inherit; }
.chips-note { margin: 6px 0 0; font-size: 0.78em; color: var(--ink-3); }

/* ---- zone 3: map ------------------------------------------------------------------------ */
.map-zone { padding-bottom: 8px; }
.map-wrap { position: relative; }
.map-wrap svg.map { width: 100%; height: auto; display: block; }
.map-caption {
  min-height: 1.5em; margin: 2px 0 0; text-align: center; font-size: 0.86em; font-weight: 600; color: var(--ink-2);
}
.map-caption[data-kind="denied"] { color: var(--denied); }
.map-caption[data-kind="proof"] { color: var(--proof); }
.legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 6px 0 0; padding: 0; list-style: none; font-size: 0.76em; color: var(--ink-2); }
.legend li { display: inline-flex; align-items: center; gap: 5px; }
.map-alt { font-size: 0.78em; margin-top: 4px; }
.linkish { background: none; border: 0; padding: 2px 0; color: var(--read); text-decoration: underline; font-size: inherit; }

svg.map text { font-family: var(--font); }
svg.map .cabinet-body { fill: var(--paper); stroke: var(--ink); stroke-width: 1.5; }
svg.map .cabinet-head { fill: var(--ink); }
svg.map .cabinet-title { fill: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; }
svg.map .drawer rect.face { fill: var(--paper-2); stroke: var(--line); stroke-width: 1; }
svg.map .drawer:hover rect.face, svg.map .drawer:focus rect.face { fill: var(--brand-soft); }
svg.map .drawer text.dl { fill: var(--ink); font-size: 10.5px; }
svg.map .drawer text.dc { fill: var(--ink-2); font-size: 9.5px; font-weight: 700; }
svg.map .drawer.pulse-read rect.face { stroke: var(--read); stroke-width: 2.5; }
svg.map .drawer.pulse-write rect.face { stroke: var(--write); stroke-width: 2.5; }
svg.map .drawer .seal { fill: var(--seal); }
svg.map .drawer[data-key="false"] .key { display: none; }
svg.map .drawer[data-seal="false"] .seal { display: none; }
svg.map .org circle.ring { fill: var(--paper); stroke-width: 2.5; }
svg.map .org text.ol { fill: var(--ink); font-size: 10.5px; font-weight: 600; }
svg.map .org text.oi { font-size: 11px; font-weight: 700; }
svg.map .org[data-current="true"] text.oi { fill: #fff; font-size: 13px; }
svg.map .org[data-current="true"] text.ol { font-weight: 800; }
svg.map .org.flash circle.ring { stroke-width: 4.5; }
svg.map .holder circle { fill: var(--paper); stroke: var(--ink); stroke-width: 1.5; }
svg.map .holder text { fill: var(--ink); font-size: 10.5px; font-weight: 600; }
svg.map .edge { fill: none; stroke-linecap: round; }
svg.map .edge[data-state="active"] { stroke: var(--grant); stroke-width: 3; }
svg.map .edge[data-state="expired"] { stroke: var(--expired); stroke-width: 2; stroke-dasharray: 5 5; }
svg.map .edge[data-state="revoked"] { stroke: var(--denied); stroke-width: 2; stroke-dasharray: 1 5; }
svg.map .edge-label { font-size: 9px; fill: var(--grant); font-weight: 600; }
svg.map .edge-label[data-state="expired"] { fill: var(--expired); }
svg.map .edge-label[data-state="revoked"] { fill: var(--denied); }
svg.map .arc { fill: none; stroke: var(--note); stroke-width: 2; stroke-dasharray: 6 4; }
svg.map .arc.via-pod { stroke: var(--ink-2); stroke-dasharray: none; stroke-width: 1.5; }
svg.map .dim-layer { fill: var(--paper); opacity: 0; pointer-events: none; transition: opacity 300ms; }
svg.map[data-dimmed="true"] .dim-layer { opacity: 0.72; }
svg.map .dim-caption { font-size: 12px; font-weight: 700; fill: var(--ink); opacity: 0; }
svg.map[data-dimmed="true"] .dim-caption { opacity: 1; }
svg.map .travel { pointer-events: none; }
svg.map .wall-403 { font-size: 11px; font-weight: 800; fill: var(--denied); }
svg.map [role="button"] { cursor: pointer; outline: none; }
svg.map [role="button"]:focus-visible rect.face, svg.map [role="button"]:focus-visible circle.ring {
  stroke: var(--focus); stroke-width: 3;
}

/* ---- zone 4: inspector ------------------------------------------------------------------ */
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin: 0 -14px 10px; padding: 0 10px; overflow-x: auto; }
.tab {
  border: 0; background: none; padding: 8px 9px; font-weight: 600; color: var(--ink-2);
  border-bottom: 3px solid transparent; white-space: nowrap;
}
.tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--brand); }
.tabpanel[hidden] { display: none; }
.key-note { margin: 0 0 8px; font-size: 0.78em; color: var(--ink-3); display: flex; gap: 10px; flex-wrap: wrap; }
.key-note span { display: inline-flex; gap: 5px; align-items: center; }
.swatch { width: 18px; height: 12px; border: 2px solid var(--ink-2); border-radius: 3px; }
.swatch.dashed { border-style: dashed; }
.empty { color: var(--ink-3); font-style: italic; margin: 4px 0; }

ol.entries { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.entry {
  --k: var(--ink-2);
  display: grid; grid-template-columns: 22px 1fr; gap: 2px 8px;
  border: 1.5px solid var(--line); border-left: 4px solid var(--k);
  border-radius: 8px; padding: 7px 9px; background: var(--paper);
  width: 100%; text-align: left;
}
button.entry:hover { background: var(--paper-2); }
.entry[data-source="app"] { border-style: dashed; border-left-style: dashed; background: var(--paper); }
.entry[data-kind="read"] { --k: var(--read); }
.entry[data-kind="write"], .entry[data-kind="delete"] { --k: var(--write); }
.entry[data-kind="credential"] { --k: var(--seal); }
.entry[data-kind="grant"] { --k: var(--grant); }
.entry[data-kind="revoke"], .entry[data-kind="denied"] { --k: var(--denied); }
.entry[data-kind="expire"] { --k: var(--expired); }
.entry[data-kind="proof"], .entry[data-kind="verified"] { --k: var(--proof); }
.entry[data-kind="org-to-org"], .entry[data-kind="clock"], .entry[data-kind="no-solid"] { --k: var(--note); }
.entry .glyph { grid-row: span 2; color: var(--k); padding-top: 1px; }
.entry .line { font-size: 0.95em; }
.entry .line b { font-weight: 650; }
.entry .meta { font-size: 0.8em; color: var(--ink-3); }
.entry .src {
  font-size: 0.68em; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--k); margin-right: 6px;
}
.entry .status-403 { color: var(--denied); font-weight: 800; }

table { border-collapse: collapse; width: 100%; font-size: 0.86em; }
th, td { text-align: left; vertical-align: top; padding: 5px 6px; border-bottom: 1px solid var(--line-2); }
th { font-size: 0.86em; color: var(--ink-2); font-weight: 700; }
.state { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; white-space: nowrap; }
.state[data-state="active"] { color: var(--grant); }
.state[data-state="expired"] { color: var(--expired); }
.state[data-state="revoked"] { color: var(--denied); }

.ns-card { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; }
.ns-card h3 { margin: 0 0 4px; font-size: 0.95em; display: flex; align-items: center; gap: 6px; }
.ns-dot { width: 10px; height: 10px; border-radius: 50%; }
.ns-row { margin: 2px 0; font-size: 0.88em; }
.ns-row .lbl { font-weight: 700; color: var(--ink-2); margin-right: 4px; }
.ns-row.not .lbl { color: var(--write); }

.raw { font-family: var(--mono); font-size: 0.78em; }
.raw li { border-bottom: 1px solid var(--line-2); padding: 5px 0; }
.raw .m { font-weight: 700; }
.raw .st-ok { color: var(--write); font-weight: 700; }
.raw .st-bad { color: var(--denied); font-weight: 700; }
.raw .diff-add { color: var(--write); }
.raw .diff-del { color: var(--denied); }
pre.turtle { white-space: pre-wrap; word-break: break-word; background: var(--paper-2); padding: 8px; border-radius: 6px; }

/* ---- resource card, pinned cards -------------------------------------------------------- */
.card {
  border: 1.5px solid var(--line); border-radius: var(--radius); padding: 10px 12px; margin: 0 0 10px;
  background: var(--paper);
}
.card h3 { margin: 0 0 6px; font-size: 1em; }
.card dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 3px 10px; font-size: 0.86em; }
.card dt { color: var(--ink-3); }
.card dd { margin: 0; word-break: break-word; }
.card .history-h { margin: 10px 0 4px; font-size: 0.9em; }
.card ol.history { margin: 0; padding-left: 20px; font-size: 0.86em; }
.card ol.history li { margin: 2px 0; }
.card .history-when { color: var(--ink-3); }
.card .close { float: right; }
.pinned { border-color: var(--denied); background: #fff7f6; }
.pinned h3 { color: var(--denied); }
.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0; }
.compare > div { border: 1.5px solid var(--line); border-radius: 8px; padding: 6px 8px; font-size: 0.84em; background: var(--paper); }
.compare .ok { border-left: 4px solid var(--write); }
.compare .no { border-left: 4px solid var(--denied); }
.compare .big { font-size: 1.4em; font-weight: 800; display: block; }
.compare .ok .big { color: var(--write); }
.compare .no .big { color: var(--denied); }
.caveat { margin: 6px 0 0; font-size: 0.88em; color: var(--ink); border-top: 1px dashed var(--line); padding-top: 6px; }

.foot { padding: 10px 14px; display: flex; justify-content: flex-end; }
.ledger-link {
  display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--brand);
  text-decoration: none; border: 1.5px solid var(--brand); border-radius: 8px; padding: 6px 12px; background: var(--paper);
}
.ledger-link:hover { background: var(--brand-soft); }

dialog.ledger-dialog {
  width: min(1100px, 96vw); max-height: 92vh; padding: 0; border: 0; border-radius: 14px;
  box-shadow: 0 30px 80px rgb(16 24 40 / 0.35);
}
dialog.ledger-dialog::backdrop { background: rgb(16 24 40 / 0.45); }
.dialog-bar { position: sticky; top: 0; z-index: 3; display: flex; justify-content: flex-end; padding: 8px; background: var(--paper); border-bottom: 1px solid var(--line-2); }

@media (prefers-reduced-motion: reduce) {
  .pulse.on { animation: none; }
  svg.map .dim-layer { transition: none; }
}
`;
