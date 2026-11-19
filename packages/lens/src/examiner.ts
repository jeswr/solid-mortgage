// AUTHORED-BY Claude Opus 5.5
/**
 * The examiner view of the journey ledger: what a regulator auditing the session would ask. Who
 * accessed what, under which grant, every change to access, and each obligation the demo's
 * content names with the entries that evidence it. Everything is computed from the entries the
 * Lens received; an obligation with no matching entry is shown as not evidenced, never assumed.
 */
import type { AppNote, PodEvent } from "@mortgage/demo-kit/contracts";
import { describe, refusalReason } from "./describe.js";
import { isDenied, isOk, isPod, type LensModel, type Received } from "./model.js";
import { isAclPath, localName, nodeOf, podRelative } from "./paths.js";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * One entry pattern: keys it names must match (objects recursively; a `path` also matches when the
 * entry's path ends with it). A pattern whose `kind` is an app-note kind matches app notes only.
 */
export type EvidencePattern = DeepPartial<PodEvent> | DeepPartial<AppNote>;

/** An obligation the demo's content says the journey meets, and how to see that it did. */
export interface ComplianceItem {
  id: string;
  /** What must be done, in plain words ("Identify each owner holding 25% or more"). */
  obligation: string;
  /** The rule it comes from ("31 CFR 1010.230(b)"). */
  rule: string;
  /** A link to the rule's text. */
  source?: string;
  /** Every pattern must be matched by at least one entry for the obligation to be evidenced. */
  evidence: EvidencePattern[];
}

export interface ObligationResult {
  item: ComplianceItem;
  met: boolean;
  evidence: Array<{ pattern: EvidencePattern; matches: Received[] }>;
}

export interface AccessRow {
  rec: Received;
  at: string;
  /** Map node of the organisation that made the request. */
  org: string;
  orgName: string;
  viaAgent: boolean;
  action: "read" | "wrote" | "deleted" | "refused";
  /** Whose pod (map node) and which resource. */
  pod: string;
  path: string;
  resource: string;
  status: number;
  /** The grant the request was made under, in words: a policy handle, a reason for a refusal. */
  under: string;
  /** The policy IRI the pod reported, when there was one. */
  grant?: string;
  step?: string;
}

export interface AccessChange {
  rec: Received;
  at: string;
  text: string;
  meta: string[];
}

export interface Examination {
  obligations: ObligationResult[];
  register: AccessRow[];
  changes: AccessChange[];
}

const NOTE_KINDS = new Set<string>([
  "verified",
  "proof-verified",
  "org-to-org",
  "no-solid",
  "clock",
  "notified",
  "grant-used",
]);

export function matchesPattern(value: unknown, pattern: unknown, key?: string): boolean {
  if (pattern === undefined) return true;
  if (pattern === null || typeof pattern !== "object") {
    if (key === "path" && typeof value === "string" && typeof pattern === "string") {
      return value === pattern || value.endsWith(pattern.startsWith("/") ? pattern : `/${pattern}`);
    }
    return Object.is(value, pattern);
  }
  if (Array.isArray(pattern)) {
    if (!Array.isArray(value)) return false;
    return pattern.every((p) => value.some((v) => matchesPattern(v, p)));
  }
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.entries(pattern).every(([k, p]) => matchesPattern(record[k], p, k));
}

/** Does a received entry match an evidence pattern? */
export function matchesEvidence(rec: Received, pattern: EvidencePattern): boolean {
  const kind = (pattern as { kind?: unknown }).kind;
  const notePattern = typeof kind === "string" && NOTE_KINDS.has(kind);
  if (notePattern !== (rec.entry.source === "app")) return false;
  return matchesPattern(rec.entry, pattern);
}

function underWords(model: LensModel, rec: Received): { under: string; grant?: string } {
  const e = rec.entry;
  if (!isPod(e)) return { under: "" };
  if (isDenied(e)) return { under: `none: refused, ${refusalReason(model, rec)}` };
  if (e.grant !== undefined) {
    const info = model.grantInfo(e.grant);
    const words = info
      ? [info.label, info.purpose, info.until]
          .filter((x) => x !== undefined && x !== "")
          .join(" · ")
      : `policy ${localName(e.grant)}`;
    return { grant: e.grant, under: words };
  }
  return { under: "a rule in the access list that names no policy" };
}

export function examine(model: LensModel, compliance: ComplianceItem[] = []): Examination {
  const register: AccessRow[] = [];
  const changes: AccessChange[] = [];
  for (const rec of model.received) {
    const e = rec.entry;
    if (!isPod(e)) continue;
    if (e.acl !== undefined && isOk(e.status)) {
      const s = describe(model, rec);
      changes.push({ at: e.at, meta: s.meta, rec, text: s.text });
      continue;
    }
    if (isAclPath(e.path)) continue;
    const org = nodeOf(model.registry, e.actor.org);
    const pod = nodeOf(model.registry, e.pod);
    if (org === pod) continue;
    const denied = isDenied(e);
    if (!denied && !isOk(e.status)) continue;
    const action = denied
      ? "refused"
      : e.kind === "read"
        ? "read"
        : e.kind === "delete"
          ? "deleted"
          : "wrote";
    register.push({
      action,
      at: e.at,
      org,
      orgName: model.nameOf(org),
      path: podRelative(e.path),
      pod,
      rec,
      resource: e.resource?.label ?? model.labelOf(e.path, e.pod),
      status: e.status,
      viaAgent: e.actor.viaAgent,
      ...underWords(model, rec),
      ...(rec.step === undefined ? {} : { step: rec.step }),
    });
  }
  const obligations = compliance.map((item) => {
    const evidence = item.evidence.map((pattern) => ({
      matches: model.received.filter((rec) => matchesEvidence(rec, pattern)),
      pattern,
    }));
    return {
      evidence,
      item,
      met: evidence.length > 0 && evidence.every((x) => x.matches.length > 0),
    };
  });
  return { changes, obligations, register };
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The access register as CSV, one row per request. */
export function registerCsv(model: LensModel, rows: AccessRow[]): string {
  const head = [
    "When",
    "Organisation",
    "Back office",
    "Action",
    "Pod",
    "Resource",
    "Path",
    "Status",
    "Under",
  ];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.at,
        r.orgName,
        r.viaAgent ? "yes" : "no",
        r.action,
        model.nameOf(r.pod),
        r.resource,
        r.path,
        r.status,
        r.under,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
