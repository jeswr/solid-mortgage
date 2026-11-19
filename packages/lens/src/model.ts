// AUTHORED-BY Claude Opus 5.5
/**
 * The Lens model: a pure fold over `LensEntry` values. It never adds an entry of its own. Every
 * derived fact (organisations met, drawers, grant states, who saw what) is computed from the
 * entries it has been given, so the map, the inspector and the ledger cannot disagree.
 */
import type {
  AccessMode,
  AccessRule,
  AppNote,
  LensEntry,
  PodEvent,
} from "@mortgage/demo-kit/contracts";
import type { OrgRegistry } from "@mortgage/demo-kit/registry";
import { HOLDERS, isHolderId, isOrgSlug } from "@mortgage/demo-kit/registry";
import {
  drawerPathOf,
  HOLDER,
  humanise,
  isAclPath,
  labelFromPath,
  nodeOf,
  ownerOfWebid,
  PUBLIC_AGENTS,
  podRelative,
  within,
} from "./paths.js";
import type { DrawerSpec, GrantInfo, LensConfig } from "./types.js";

export type PodEntry = { source: "pod" } & PodEvent;
export type AppEntry = { source: "app"; id: number; at: string } & AppNote;

/** One entry as the Lens received it. */
export interface Received {
  entry: LensEntry;
  /** Arrival order in this Lens (1-based). */
  seq: number;
  /** The tour step the entry belongs to, when known. */
  step?: string;
  /** True for entries replayed from the log rather than seen live. */
  replayed: boolean;
  /** Wall-clock arrival time in ms (Date.now()). */
  receivedAt: number;
}

export interface OrgNode {
  /** Node key: a pod owner slug (an organisation's `actsAs`). */
  key: string;
  /** Short label ("Fernhollow"). */
  label: string;
  /** Full display name. */
  name: string;
  color: string;
  firstSeq: number;
}

export interface Drawer {
  path: string;
  label: string;
  /** Distinct resource paths seen in this drawer. */
  resources: Set<string>;
  /** Resource paths written with a credential description. */
  credentials: Set<string>;
  firstSeq: number;
  /** False while the label is only a humanised path segment. */
  named: boolean;
}

export type GrantState = "active" | "expired" | "revoked";

export interface GrantRecord {
  org: string;
  /** Rules currently in force for this organisation. */
  active: AccessRule[];
  /** Drawer paths any of its rules ever covered. */
  everCovered: Set<string>;
  state: GrantState;
  /** The policy IRI the grant event named, when it named one. */
  policy?: string;
  grantedSeq: number;
  endedSeq?: number;
  endedAt?: number;
  /** Rules removed by the event that ended the grant. */
  removed: AccessRule[];
}

export function isPod(entry: LensEntry): entry is PodEntry {
  return entry.source === "pod";
}

export function isOk(status: number): boolean {
  return status >= 200 && status < 300;
}

export function isDenied(e: PodEvent): boolean {
  return e.kind === "denied" || e.status === 401 || e.status === 403;
}

export function entryKey(entry: LensEntry): string {
  return `${entry.source}:${entry.id}`;
}

const ruleKey = (r: AccessRule) => `${r.agent} ${podRelative(r.resource)} ${r.inherited}`;

export class LensModel {
  readonly config: LensConfig;
  readonly registry: OrgRegistry;
  /** The pod owner at the centre of the map: the holder this Lens's demo is about. */
  readonly holder: string;
  readonly holderName: string;
  readonly received: Received[] = [];
  private readonly seen = new Set<string>();
  private readonly orgMap = new Map<string, OrgNode>();
  private readonly drawerMap = new Map<string, Drawer>();
  private readonly grantMap = new Map<string, GrantRecord>();
  private readonly labels = new Map<string, string>();
  private readonly recordDrawers: string[];
  private currentStep: string | undefined;
  private lastTaggedStep: string | undefined;
  /** Organisation → seq of a `grant-used` note whose closing revoke has not arrived yet. */
  private readonly oneTimeOpen = new Map<string, number>();
  /** Seq of a revoke event → the organisation whose one-time grant it closed. */
  private readonly oneTimeClosed = new Map<number, string>();

  constructor(config: LensConfig) {
    this.config = config;
    this.registry = config.registry;
    const id = config.holder?.id ?? HOLDER;
    if (!isHolderId(id)) throw new Error(`solid-lens: ${id} is not a registered holder`);
    this.holder = id;
    this.holderName = config.holder?.name ?? HOLDERS[id].short;
    this.recordDrawers = (config.recordDrawers ?? ["/inbox/"]).map(drawerPathOf);
    for (const spec of config.drawers ?? []) this.addDrawer(spec, 0);
  }

  /** The step that untagged live entries are attributed to. */
  setCurrentStep(step: string | undefined): void {
    this.currentStep = step;
  }

  /** Ingest one entry. Returns undefined for a duplicate (same source and id). */
  push(
    entry: LensEntry,
    opts: { replayed?: boolean; receivedAt?: number } = {},
  ): Received | undefined {
    const key = entryKey(entry);
    if (this.seen.has(key)) return undefined;
    this.seen.add(key);
    const replayed = opts.replayed ?? false;
    let step: string | undefined;
    if (isPod(entry) && entry.tour?.step !== undefined) {
      step = entry.tour.step;
      this.lastTaggedStep = step;
    } else {
      step = !replayed && this.currentStep !== undefined ? this.currentStep : this.lastTaggedStep;
    }
    const rec: Received = {
      entry,
      seq: this.received.length + 1,
      replayed,
      receivedAt: opts.receivedAt ?? Date.now(),
      ...(step === undefined ? {} : { step }),
    };
    this.received.push(rec);
    this.fold(rec);
    return rec;
  }

  // ---- folding -------------------------------------------------------------------------------

  private fold(rec: Received): void {
    const e = rec.entry;
    if (isPod(e)) {
      if (e.resource?.label) this.labels.set(`${e.pod} ${podRelative(e.path)}`, e.resource.label);
      this.meet(e.actor.org, rec.seq);
      if (e.pod !== this.holder) this.meet(e.pod, rec.seq);
      if (e.pod === this.holder && !isAclPath(e.path)) {
        const drawer = this.drawerFor(e.path, e.resource?.drawer, rec.seq);
        if (e.kind !== "denied" && isOk(e.status)) {
          const rel = podRelative(e.path);
          if (e.kind === "delete") drawer.resources.delete(rel);
          else if (rel !== drawer.path) drawer.resources.add(rel);
          if (e.kind === "write" && e.resource?.credential) drawer.credentials.add(rel);
        }
      }
      // Another holder's sharing (Maya's grants, seen in a Lens for Alex) is not this holder's.
      const otherHolder = e.pod !== this.holder && isHolderId(e.pod);
      if (e.acl && isOk(e.status) && !otherHolder) this.foldAcl(e, rec);
    } else {
      this.meet(e.org, rec.seq);
      if (e.kind === "grant-used") {
        const org = this.orgOfAgent(e.refs?.[1] ?? "");
        if (org !== undefined) {
          this.meet(org, rec.seq);
          this.oneTimeOpen.set(org, rec.seq);
        }
      }
      const peer = this.peerOf(e);
      if (peer !== undefined) this.meet(peer, rec.seq);
    }
  }

  private foldAcl(e: PodEntry, rec: Received): void {
    const acl = e.acl;
    if (!acl) return;
    const touched = new Set<string>();
    for (const rule of acl.revoked) {
      const org = this.orgOfAgent(rule.agent);
      if (org === undefined) continue;
      if (e.actor.viaAgent && this.oneTimeOpen.has(org)) {
        this.oneTimeOpen.delete(org);
        this.oneTimeClosed.set(rec.seq, org);
      }
      const g = this.grantMap.get(org);
      if (!g) continue;
      const k = ruleKey(rule);
      const before = g.active.length;
      g.active = g.active.filter((r) => ruleKey(r) !== k);
      if (g.active.length !== before) {
        g.removed.push(rule);
        touched.add(org);
      }
    }
    for (const rule of acl.granted) {
      const org = this.orgOfAgent(rule.agent);
      if (org === undefined) continue;
      this.meet(org, rec.seq);
      let g = this.grantMap.get(org);
      if (g?.state !== "active") {
        g = {
          org,
          active: [],
          everCovered: g?.everCovered ?? new Set(),
          state: "active",
          grantedSeq: rec.seq,
          removed: [],
          ...(e.grant === undefined ? {} : { policy: e.grant }),
        };
        this.grantMap.set(org, g);
      }
      const k = ruleKey(rule);
      const existing = g.active.find((r) => ruleKey(r) === k);
      if (existing) {
        existing.modes = [...new Set<AccessMode>([...existing.modes, ...rule.modes])];
      } else {
        g.active.push({ ...rule, modes: [...rule.modes] });
      }
      for (const d of this.coverage(rule, rec.seq)) g.everCovered.add(d);
      touched.delete(org);
    }
    for (const org of touched) {
      const g = this.grantMap.get(org);
      if (!g || g.active.length > 0) continue;
      g.state = e.actor.viaAgent ? "expired" : "revoked";
      g.endedSeq = rec.seq;
      g.endedAt = rec.receivedAt;
    }
  }

  private meet(slug: string, seq: number): void {
    const key = nodeOf(this.registry, slug);
    if (key === this.holder || this.orgMap.has(key)) return;
    const record = isOrgSlug(key) ? this.registry[key] : undefined;
    // Another holder (a carer reading a parent's pod) is met like an organisation, by its name.
    const person = record === undefined && isHolderId(key) ? HOLDERS[key] : undefined;
    this.orgMap.set(key, {
      key,
      label: record?.short ?? person?.short ?? humanise(key),
      name: record?.organisation ?? person?.name ?? humanise(key),
      color: record?.themeColor ?? "#4a5664",
      firstSeq: seq,
    });
  }

  private addDrawer(spec: DrawerSpec, seq: number, named = true): Drawer {
    const path = drawerPathOf(spec.path);
    const existing = this.drawerMap.get(path);
    if (existing) return existing;
    const d: Drawer = {
      path,
      label: spec.label,
      resources: new Set(),
      credentials: new Set(),
      firstSeq: seq,
      named,
    };
    this.drawerMap.set(path, d);
    return d;
  }

  private drawerFor(path: string, label: string | undefined, seq: number): Drawer {
    const dp = drawerPathOf(path);
    const existing = this.drawerMap.get(dp);
    if (existing) {
      if (!existing.named && label !== undefined) {
        existing.label = label;
        existing.named = true;
      }
      return existing;
    }
    const seg = dp.replace(/\//g, "");
    const fallback = seg === "" ? "Pod root" : humanise(seg);
    return this.addDrawer({ path: dp, label: label ?? fallback }, seq, label !== undefined);
  }

  /** The drawers an access rule reaches. A rule on the pod root reaches every drawer. */
  coverage(rule: AccessRule, seq = 0): string[] {
    const rel = podRelative(rule.resource);
    if (rel === "/") return [...this.drawerMap.keys()].filter((p) => p !== "/");
    if (isAclPath(rel)) return [];
    const d = this.drawerFor(rel, undefined, seq);
    return [d.path];
  }

  // ---- lookups -------------------------------------------------------------------------------

  /**
   * The organisation whose one-time grant an access change closed: a back-office revoke that
   * follows a `grant-used` note for the same organisation. Undefined for any other entry.
   */
  closedOneTime(seq: number): string | undefined {
    return this.oneTimeClosed.get(seq);
  }

  /** The organisation node an ACL agent IRI belongs to; undefined for the holder or the public. */
  orgOfAgent(agent: string): string | undefined {
    if (PUBLIC_AGENTS.has(agent)) return undefined;
    const owner = ownerOfWebid(this.registry, agent);
    if (owner === undefined || owner === this.holder) return undefined;
    return owner;
  }

  /** For an organisation-to-organisation note: the other party, from `refs` (a slug or WebID). */
  peerOf(note: AppNote): string | undefined {
    if (note.kind !== "org-to-org") return undefined;
    const self = nodeOf(this.registry, note.org);
    for (const ref of note.refs ?? []) {
      const node = isOrgSlug(ref) ? nodeOf(this.registry, ref) : ownerOfWebid(this.registry, ref);
      if (node !== undefined && node !== self && node !== this.holder) return node;
    }
    return undefined;
  }

  /** A resource's label as events described it, or its humanised last segment. */
  labelOf(path: string, pod: string = this.holder): string {
    const rel = podRelative(path);
    const known = this.labels.get(`${pod} ${rel}`);
    if (known !== undefined) return known;
    if (pod === this.holder && rel.endsWith("/")) {
      const d = this.drawerMap.get(drawerPathOf(rel));
      if (d && d.path === rel) return d.label;
    }
    return labelFromPath(rel);
  }

  node(slug: string): OrgNode | undefined {
    return this.orgMap.get(nodeOf(this.registry, slug));
  }

  /** Short name for a slug, `holderName` for the holder. */
  nameOf(slug: string): string {
    if (nodeOf(this.registry, slug) === this.holder) return this.holderName;
    return this.node(slug)?.label ?? humanise(slug);
  }

  /** The app that acts for holders (the holder's own data app, the wallet), for "applied by …". */
  holderAppName(): string | undefined {
    for (const r of Object.values(this.registry)) if (isHolderId(r.actsAs)) return r.organisation;
    return undefined;
  }

  /** Organisations in the order the Lens met them. */
  orgs(): OrgNode[] {
    return [...this.orgMap.values()].sort((a, b) => a.firstSeq - b.firstSeq);
  }

  /** Drawers: configured ones in their order, then others in the order seen. */
  drawers(): Drawer[] {
    return [...this.drawerMap.values()]
      .filter((d) => d.path !== "/" || d.resources.size > 0)
      .sort((a, b) => a.firstSeq - b.firstSeq);
  }

  drawer(path: string): Drawer | undefined {
    return this.drawerMap.get(drawerPathOf(path));
  }

  grants(): GrantRecord[] {
    return [...this.grantMap.values()].sort((a, b) => a.grantedSeq - b.grantedSeq);
  }

  grant(org: string): GrantRecord | undefined {
    return this.grantMap.get(nodeOf(this.registry, org));
  }

  /** Drawer paths covered by an organisation's rules in force now. */
  activeDrawers(org: string): Set<string> {
    const out = new Set<string>();
    const g = this.grant(org);
    if (g?.state !== "active") return out;
    for (const r of g.active) for (const d of this.coverage(r)) out.add(d);
    return out;
  }

  /** Grant state of an organisation for one drawer: in force, ended, or never granted. */
  drawerState(org: string, drawerPath: string): GrantState | "never" {
    const g = this.grant(org);
    if (!g?.everCovered.has(drawerPath)) return "never";
    if (g.state === "active") return this.activeDrawers(org).has(drawerPath) ? "active" : "never";
    return g.state;
  }

  /** Organisations whose rules in force let them read `path` now. */
  whoCanRead(path: string): string[] {
    const rel = podRelative(path);
    const out: string[] = [];
    for (const g of this.grants()) {
      if (g.state !== "active") continue;
      const ok = g.active.some((r) => {
        if (!r.modes.includes("Read")) return false;
        const res = podRelative(r.resource);
        return res === rel || (r.inherited && within(rel, res));
      });
      if (ok) out.push(g.org);
    }
    return out;
  }

  /** The handle and copy for a policy IRI, when the host supplied one. */
  grantInfo(iri: string | undefined): GrantInfo | undefined {
    if (iri === undefined) return undefined;
    const table = this.config.grants ?? {};
    if (table[iri]) return table[iri];
    for (const [key, info] of Object.entries(table)) if (iri.endsWith(key)) return info;
    return undefined;
  }

  /** Is this drawer bookkeeping (access requests, policies), not documents? */
  isRecordDrawer(path: string): boolean {
    return this.recordDrawers.includes(drawerPathOf(path));
  }

  entriesForStep(step: string | undefined): Received[] {
    if (step === undefined) return [];
    return this.received.filter((r) => r.step === step);
  }

  /** The most recent successful same-method, same-path request by the same organisation. */
  previousSuccess(denied: Received): Received | undefined {
    const d = denied.entry;
    if (!isPod(d)) return undefined;
    const path = podRelative(d.path);
    const actor = nodeOf(this.registry, d.actor.org);
    for (let i = denied.seq - 2; i >= 0; i--) {
      const r = this.received[i];
      if (!r || !isPod(r.entry)) continue;
      const e = r.entry;
      if (
        isOk(e.status) &&
        !isDenied(e) &&
        e.method === d.method &&
        e.pod === d.pod &&
        podRelative(e.path) === path &&
        nodeOf(this.registry, e.actor.org) === actor
      ) {
        return r;
      }
    }
    return undefined;
  }

  /**
   * What each organisation saw of the holder's pod, computed from successful requests:
   * drawers it read, drawers it added to, and known drawers it never read.
   */
  notShared(): Array<{
    org: OrgNode;
    read: Drawer[];
    wrote: Drawer[];
    notSeen: Drawer[];
    proofs: number;
  }> {
    const drawers = this.drawers().filter((d) => !this.isRecordDrawer(d.path));
    return this.orgs().map((org) => {
      const read = new Set<string>();
      const wrote = new Set<string>();
      let proofs = 0;
      for (const { entry } of this.received) {
        if (isPod(entry)) {
          if (entry.pod !== this.holder || !isOk(entry.status) || isDenied(entry)) continue;
          if (nodeOf(this.registry, entry.actor.org) !== org.key || isAclPath(entry.path)) continue;
          const dp = drawerPathOf(entry.path);
          if (entry.kind === "read") read.add(dp);
          else if (entry.kind === "write" || entry.kind === "delete") wrote.add(dp);
        } else if (
          entry.kind === "proof-verified" &&
          nodeOf(this.registry, entry.org) === org.key
        ) {
          proofs++;
        }
      }
      return {
        org,
        read: drawers.filter((d) => read.has(d.path)),
        wrote: drawers.filter((d) => wrote.has(d.path)),
        notSeen: drawers.filter((d) => !read.has(d.path)),
        proofs,
      };
    });
  }
}
