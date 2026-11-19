// AUTHORED-BY Claude Opus 5.5
/**
 * The journey ledger (design.md §c.5): a matrix, a totals strip and a timeline, every number
 * computed from the entries the Lens received. The definitions are in README.md and are the
 * contract the end-to-end test recomputes independently.
 */
import {
  type GrantState,
  isDenied,
  isOk,
  isPod,
  type LensModel,
  type OrgNode,
  type Received,
} from "./model.js";
import { drawerPathOf, isAclPath, nodeOf, podRelative } from "./paths.js";
import type { TimelineStep } from "./types.js";

export interface LedgerCell {
  reads: number;
  writes: number;
  denied: number;
  state: GrantState | "never";
}

export interface LedgerRow {
  drawer: string;
  drawerPath: string;
  path: string;
  label: string;
  cells: LedgerCell[];
}

export interface CredentialUse {
  path: string;
  label: string;
  issuer: string;
  /** Successful reads of the credential by organisations other than the one that wrote it. */
  reuses: number;
}

export interface LedgerTotals {
  organisations: number;
  grants: { active: number; expired: number; revoked: number };
  credentialsIssued: number;
  credentials: CredentialUse[];
  documentsDelivered: number;
  denied: number;
  uploads: number;
}

export interface TimelineGroup {
  chapter: string;
  steps: Array<{
    id: string;
    title: string;
    day?: number;
    podRequests: number;
    appNotes: number;
    clocks: string[];
  }>;
}

export interface Ledger {
  columns: OrgNode[];
  rows: LedgerRow[];
  totals: LedgerTotals;
  timeline: TimelineGroup[];
}

export function computeTotals(model: LensModel): LedgerTotals {
  const grants = { active: 0, expired: 0, revoked: 0 };
  for (const g of model.grants()) grants[g.state]++;

  const credentials = new Map<string, CredentialUse & { writer: string }>();
  const delivered = new Set<string>();
  const uploads = new Set<string>();
  let denied = 0;

  for (const { entry } of model.received) {
    if (!isPod(entry)) continue;
    if (isDenied(entry)) {
      denied++;
      continue;
    }
    if (entry.pod !== model.holder || isAclPath(entry.path) || !isOk(entry.status)) continue;
    if (entry.kind !== "write") continue;
    const path = podRelative(entry.path);
    const writer = nodeOf(model.registry, entry.actor.org);
    if (entry.resource?.credential) {
      if (!credentials.has(path)) {
        const issuerOrg = model.orgOfAgent(entry.resource.credential.issuer);
        credentials.set(path, {
          path,
          label: entry.resource.label,
          issuer: issuerOrg ? model.nameOf(issuerOrg) : entry.resource.credential.issuer,
          reuses: 0,
          writer,
        });
      }
      continue;
    }
    if (model.isRecordDrawer(path)) continue;
    if (writer === model.holder) uploads.add(path);
    else delivered.add(path);
  }

  for (const { entry } of model.received) {
    if (!isPod(entry) || entry.pod !== model.holder || entry.kind !== "read") continue;
    if (!isOk(entry.status) || isDenied(entry)) continue;
    const c = credentials.get(podRelative(entry.path));
    const reader = nodeOf(model.registry, entry.actor.org);
    if (c && reader !== model.holder && reader !== c.writer) c.reuses++;
  }

  return {
    organisations: model.orgs().length,
    grants,
    credentialsIssued: credentials.size,
    credentials: [...credentials.values()].map(({ writer: _w, ...rest }) => rest),
    documentsDelivered: delivered.size,
    denied,
    uploads: uploads.size,
  };
}

export function computeLedger(model: LensModel, steps: TimelineStep[] = []): Ledger {
  const columns = model.orgs();
  const index = new Map(columns.map((c, i) => [c.key, i]));
  const rows = new Map<string, LedgerRow>();
  const drawerOrder = new Map(model.drawers().map((d, i) => [d.path, i]));

  for (const { entry } of model.received) {
    if (!isPod(entry) || entry.pod !== model.holder || isAclPath(entry.path)) continue;
    const path = podRelative(entry.path);
    const dp = drawerPathOf(path);
    let row = rows.get(path);
    if (!row) {
      const drawer = model.drawer(dp);
      row = {
        drawer: drawer?.label ?? dp,
        drawerPath: dp,
        path,
        label: model.labelOf(path),
        cells: columns.map((c) => ({
          reads: 0,
          writes: 0,
          denied: 0,
          state: model.drawerState(c.key, dp),
        })),
      };
      rows.set(path, row);
    }
    const col = index.get(nodeOf(model.registry, entry.actor.org));
    if (col === undefined) continue;
    const cell = row.cells[col];
    if (!cell) continue;
    if (isDenied(entry)) cell.denied++;
    else if (!isOk(entry.status)) continue;
    else if (entry.kind === "read") cell.reads++;
    else if (entry.kind === "write" || entry.kind === "delete") cell.writes++;
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      (drawerOrder.get(a.drawerPath) ?? 999) - (drawerOrder.get(b.drawerPath) ?? 999) ||
      a.path.localeCompare(b.path),
  );

  return { columns, rows: sorted, totals: computeTotals(model), timeline: timeline(model, steps) };
}

function timeline(model: LensModel, steps: TimelineStep[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  const known = new Set(steps.map((s) => s.id));
  const add = (
    chapter: string,
    id: string,
    title: string,
    day: number | undefined,
    entries: Received[],
  ) => {
    let group = groups[groups.length - 1];
    if (!group || group.chapter !== chapter) {
      group = { chapter, steps: [] };
      groups.push(group);
    }
    group.steps.push({
      id,
      title,
      ...(day === undefined ? {} : { day }),
      podRequests: entries.filter((r) => isPod(r.entry)).length,
      appNotes: entries.filter((r) => !isPod(r.entry)).length,
      clocks: entries.flatMap((r) =>
        !isPod(r.entry) && r.entry.kind === "clock" ? [r.entry.text] : [],
      ),
    });
  };
  for (const s of steps) add(s.chapter, s.id, s.title, s.day, model.entriesForStep(s.id));
  const loose = new Map<string, Received[]>();
  for (const r of model.received) {
    if (r.step !== undefined && known.has(r.step)) continue;
    const key = r.step ?? "";
    loose.set(key, [...(loose.get(key) ?? []), r]);
  }
  for (const [id, entries] of loose) {
    add("Outside the guided steps", id, id === "" ? "Free play" : id, undefined, entries);
  }
  return groups;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The matrix as CSV: one row per resource, one column per organisation ("R2 W1 D0"). */
export function ledgerCsv(ledger: Ledger): string {
  const head = ["Drawer", "Resource", "Path", ...ledger.columns.map((c) => c.name)];
  const lines = [head.map(csvCell).join(",")];
  for (const row of ledger.rows) {
    lines.push(
      [
        row.drawer,
        row.label,
        row.path,
        ...row.cells.map(
          (c) => `reads ${c.reads}; writes ${c.writes}; refused ${c.denied}; access ${c.state}`,
        ),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
