// AUTHORED-BY Claude Opus 5.5
/**
 * The Lens map (design.md §c.2 zone 3, §c.3): an inline SVG with the holder's pod drawn as a
 * cabinet, one drawer per top-level container, and only the organisations met so far around
 * it. Edges are grants. The static picture is re-rendered from the model after every entry;
 * motion is drawn on an overlay layer and never carries information the text does not.
 */
import { isHolderId } from "@mortgage/demo-kit/registry";
import type { Sentence } from "./describe.js";
import { s } from "./dom.js";
import { isDenied, isOk, isPod, type LensModel, type Received } from "./model.js";
import { isAclPath, nodeOf } from "./paths.js";

type Pt = readonly [number, number];

const W = 344;
const CAB_W = 132;
const CAB_X = (344 - CAB_W) / 2;
const HEAD_H = 24;
const ROW_H = 18;
const ORG_R = 16;
const CUR_R = 22;
const COLS = [42, W - 42] as const;
const TOP_SLOTS: Pt[] = [
  [96, 24],
  [248, 24],
];

export type MotionKind =
  | "read"
  | "write"
  | "credential"
  | "proof"
  | "grant"
  | "expire"
  | "revoke"
  | "denied"
  | "org-to-org"
  | "no-solid"
  | "verified"
  | "self";

export interface MapOptions {
  currentNode?: string;
  reducedMotion: () => boolean;
  onSelectDrawer: (path: string) => void;
  onCaption: (text: string, kind: string) => void;
}

function initials(label: string): string {
  const words = label.split(/\s+/).filter(Boolean);
  const a = words[0]?.[0] ?? "?";
  const b = words[1]?.[0] ?? words[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class LensMap {
  readonly svg: SVGSVGElement;
  private readonly model: LensModel;
  private readonly opts: MapOptions;
  private readonly base: SVGGElement;
  private readonly overlay: SVGGElement;
  private readonly dimLayer: SVGRectElement;
  private readonly dimCaption: SVGTextElement;
  private positions = new Map<string, Pt>();
  private drawerY = new Map<string, number>();
  private height = 300;
  private cabBottom = 200;
  /** Top of the cabinet: lower when organisations sit above it. */
  private cabY = 22;
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  /** Number of travelling marks created (zero under reduced motion); read by tests. */
  travels = 0;

  constructor(model: LensModel, opts: MapOptions) {
    this.model = model;
    this.opts = opts;
    this.base = s("g", { class: "base" });
    this.overlay = s("g", { class: "overlay", "aria-hidden": "true" });
    this.dimLayer = s("rect", { class: "dim-layer", x: 0, y: 0, width: W, height: 300 });
    this.dimCaption = s("text", {
      class: "dim-caption",
      x: W / 2,
      y: 150,
      "text-anchor": "middle",
    });
    this.svg = s(
      "svg",
      {
        class: "map",
        viewBox: `0 0 ${W} 300`,
        role: "group",
        "aria-label": `Map of ${model.holderName}'s pod and the organisations that reached it. The Grants tab holds the same information as a table.`,
        "data-dimmed": "false",
        "data-travels": "0",
      },
      this.base,
      this.dimLayer,
      this.dimCaption,
      this.overlay,
    );
    this.render();
  }

  setCurrent(node: string | undefined): void {
    if (node === undefined) delete this.opts.currentNode;
    else this.opts.currentNode = node;
    this.render();
  }

  // ---- static picture ------------------------------------------------------------------------

  render(): void {
    const m = this.model;
    const drawers = m.drawers();
    const orgs = m.orgs();
    this.cabY = orgs.length > 6 ? 58 : 22;
    const cabH = HEAD_H + Math.max(drawers.length, 3) * ROW_H + 8;
    const holderY = this.cabY + cabH + 30;
    this.cabBottom = this.cabY + cabH;

    // Slots: left and right columns from the cabinet's top down, then two above it.
    const slots: Pt[] = [];
    const rows = Math.max(3, Math.ceil(Math.max(0, orgs.length - TOP_SLOTS.length) / 2));
    for (let i = 0; i < rows; i++) {
      const y = this.cabY + 26 + i * 64;
      slots.push([COLS[0], y], [COLS[1], y]);
      if (i === 2) slots.push(...TOP_SLOTS);
    }
    this.positions = new Map();
    orgs.forEach((o, i) => {
      const p = slots[i];
      if (p) this.positions.set(o.key, p);
    });
    this.positions.set(m.holder, [W / 2, holderY]);
    const maxY = Math.max(holderY + 34, ...[...this.positions.values()].map((p) => p[1] + 36));
    this.height = Math.ceil(maxY);
    this.svg.setAttribute("viewBox", `0 0 ${W} ${this.height}`);
    this.dimLayer.setAttribute("height", String(this.height));
    this.dimCaption.setAttribute("y", String(Math.round(this.height / 2)));

    const edges = s("g", { class: "edges" });
    const nodes = s("g", { class: "nodes" });
    const cabinet = s("g", { class: "cabinet" });

    // Cabinet and drawers.
    cabinet.append(
      s("rect", {
        class: "cabinet-body",
        x: CAB_X,
        y: this.cabY,
        width: CAB_W,
        height: cabH,
        rx: 8,
      }),
      s("path", {
        class: "cabinet-head",
        d: `M${CAB_X} ${this.cabY + HEAD_H}V${this.cabY + 8}a8 8 0 0 1 8-8h${CAB_W - 16}a8 8 0 0 1 8 8V${this.cabY + HEAD_H}Z`,
      }),
      s(
        "text",
        {
          class: "cabinet-title",
          x: CAB_X + CAB_W / 2,
          y: this.cabY + 16,
          "text-anchor": "middle",
        },
        clip(`${m.holderName.toUpperCase()}'S POD`, 20),
      ),
    );
    this.drawerY = new Map();
    drawers.forEach((d, i) => {
      const y = this.cabY + HEAD_H + 4 + i * ROW_H;
      this.drawerY.set(d.path, y + (ROW_H - 3) / 2);
      const readers = m.whoCanRead(d.path).map((o) => m.nameOf(o));
      const keyed = orgs.some((o) => m.activeDrawers(o.key).has(d.path));
      const sealed = d.credentials.size > 0;
      const count = d.resources.size;
      const label = [
        `${d.label} drawer`,
        `${count} item${count === 1 ? "" : "s"} seen`,
        sealed
          ? `${d.credentials.size} signed credential${d.credentials.size === 1 ? "" : "s"}`
          : "",
        keyed
          ? `shared with ${orgs
              .filter((o) => m.activeDrawers(o.key).has(d.path))
              .map((o) => o.label)
              .join(", ")}`
          : "not shared now",
      ]
        .filter(Boolean)
        .join(", ");
      const g = s(
        "g",
        {
          class: "drawer",
          role: "button",
          tabindex: 0,
          "aria-label": `${label}. Open details.`,
          "data-path": d.path,
          "data-count": count,
          "data-key": String(keyed),
          "data-seal": String(sealed),
          "data-readers": readers.join(","),
        },
        s("rect", { class: "face", x: CAB_X + 5, y, width: CAB_W - 10, height: ROW_H - 3, rx: 3 }),
        s("text", { class: "dl", x: CAB_X + 10, y: y + 11 }, clip(d.label, 15)),
        s("circle", { class: "seal", cx: CAB_X + CAB_W - 36, cy: y + 7.5, r: 3.4 }),
        s(
          "g",
          {
            class: "key",
            fill: "none",
            stroke: "var(--grant)",
            "stroke-width": 1.5,
            "stroke-linecap": "round",
          },
          s("circle", { cx: CAB_X + CAB_W - 26, cy: y + 7.5, r: 2.3 }),
          s("path", {
            d: `M${CAB_X + CAB_W - 23.7} ${y + 7.5}h5.2m-1.6 0v2.2m1.6-2.2v1.6`,
          }),
        ),
        s(
          "text",
          { class: "dc", x: CAB_X + CAB_W - 9, y: y + 11, "text-anchor": "end" },
          count > 0 ? count : "",
        ),
      );
      g.addEventListener("click", () => this.opts.onSelectDrawer(d.path));
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          this.opts.onSelectDrawer(d.path);
        }
      });
      cabinet.append(g);
    });

    // Holder.
    const hp = this.positions.get(m.holder) ?? [W / 2, holderY];
    const holderCurrent = this.opts.currentNode === m.holder;
    edges.append(
      s("line", {
        x1: W / 2,
        y1: this.cabY + cabH,
        x2: hp[0],
        y2: hp[1] - 13,
        stroke: "var(--ink)",
        "stroke-width": 1.5,
      }),
    );
    nodes.append(
      s(
        "g",
        { class: "holder", "data-current": String(holderCurrent) },
        s("circle", {
          cx: hp[0],
          cy: hp[1],
          r: 13,
          style: holderCurrent ? "stroke-width:3" : undefined,
        }),
        s("path", {
          d: `M${hp[0] - 5} ${hp[1] + 6}a5 5 0 0 1 10 0M${hp[0]} ${hp[1] - 2}m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0`,
          fill: "none",
          stroke: "var(--ink)",
          "stroke-width": 1.5,
        }),
        s("text", { x: hp[0] + 18, y: hp[1] + 4 }, `${m.holderName} (owner)`),
      ),
    );

    // Organisations and their grant edges.
    for (const o of orgs) {
      const p = this.positions.get(o.key);
      if (!p) continue;
      const current = this.opts.currentNode === o.key;
      const r = current ? CUR_R : ORG_R;
      const g = m.grant(o.key);
      if (g) {
        const [a, b] = this.edgeEnds(
          o.key,
          g.state === "active" ? [...m.activeDrawers(o.key)] : [...g.everCovered],
        );
        const info = m.grantInfo(g.policy);
        const drawersText = [...(g.state === "active" ? m.activeDrawers(o.key) : g.everCovered)]
          .map((dp) => m.drawer(dp)?.label ?? dp)
          .join(", ");
        const stateWord =
          g.state === "active"
            ? "access granted"
            : g.state === "expired"
              ? "access expired"
              : "access withdrawn";
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 4];
        edges.append(
          s(
            "line",
            {
              class: "edge",
              "data-org": o.key,
              "data-state": g.state,
              x1: a[0],
              y1: a[1],
              x2: b[0],
              y2: b[1],
            },
            s("title", {}, `${o.label}: ${stateWord} (${drawersText})`),
          ),
          s(
            "text",
            {
              class: "edge-label",
              "data-state": g.state,
              x: mid[0],
              y: mid[1],
              "text-anchor": "middle",
            },
            info?.label ?? (g.state === "revoked" ? "✕" : ""),
          ),
        );
        if (g.state === "revoked") {
          edges.append(
            s("path", {
              d: `M${b[0] - 4} ${b[1] - 4}l8 8m0-8l-8 8`,
              stroke: "var(--denied)",
              "stroke-width": 2.2,
              "stroke-linecap": "round",
            }),
          );
        }
      }
      nodes.append(
        s(
          "g",
          { class: "org", "data-org": o.key, "data-current": String(current) },
          s("circle", {
            class: "ring",
            cx: p[0],
            cy: p[1],
            r,
            stroke: o.color,
            style: current ? `fill:${o.color}` : undefined,
          }),
          s(
            "text",
            {
              class: "oi",
              x: p[0],
              y: p[1] + 4,
              "text-anchor": "middle",
              fill: current ? "#fff" : o.color,
            },
            initials(o.label),
          ),
          s(
            "text",
            { class: "ol", x: p[0], y: p[1] + r + 12, "text-anchor": "middle" },
            clip(o.label, 14),
          ),
        ),
      );
    }

    this.base.replaceChildren(edges, cabinet, nodes);
  }

  /** Points where an edge meets the cabinet and the organisation's circle. */
  private edgeEnds(org: string, drawers: string[]): [Pt, Pt] {
    const p = this.positions.get(org) ?? [0, 0];
    const ys = drawers.map((d) => this.drawerY.get(d)).filter((y): y is number => y !== undefined);
    const cy = ys.length > 0 ? ys.reduce((x, y) => x + y, 0) / ys.length : this.cabY + HEAD_H + 20;
    let a: Pt;
    if (p[1] < this.cabY) a = [Math.min(Math.max(p[0], CAB_X + 16), CAB_X + CAB_W - 16), this.cabY];
    else a = [p[0] < W / 2 ? CAB_X : CAB_X + CAB_W, cy];
    const r = (this.opts.currentNode === org ? CUR_R : ORG_R) + 2;
    const dx = a[0] - p[0];
    const dy = a[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    return [a, [p[0] + (dx / len) * r, p[1] + (dy / len) * r]];
  }

  private drawerPoint(path: string | undefined, toward: Pt): Pt {
    const y = (path !== undefined ? this.drawerY.get(path) : undefined) ?? this.cabY + HEAD_H + 20;
    if (toward[1] < this.cabY)
      return [Math.min(Math.max(toward[0], CAB_X + 16), CAB_X + CAB_W - 16), this.cabY];
    if (Math.abs(toward[0] - W / 2) < 8) return [W / 2, this.cabBottom];
    return [toward[0] < W / 2 ? CAB_X : CAB_X + CAB_W, y];
  }

  private nodePoint(slug: string): Pt {
    return this.positions.get(nodeOf(this.model.registry, slug)) ?? [W / 2, 10];
  }

  // ---- dimming (no Solid in this step) ---------------------------------------------------------

  dim(reason: string | null): void {
    this.svg.setAttribute("data-dimmed", String(reason !== null));
    this.dimCaption.textContent = reason === null ? "" : clip(reason, 46);
  }

  // ---- motion --------------------------------------------------------------------------------

  /** Queue the drawing for one live entry. Resolves when its motion has finished. */
  play(rec: Received, sentence: Sentence): Promise<void> {
    this.pending++;
    const run = async () => {
      try {
        // A long backlog (a burst of requests) skips travel so the map never lags the text.
        await this.drawMotion(rec, sentence, this.pending > 3 ? 0.5 : 1, this.pending > 6);
      } finally {
        this.pending--;
      }
    };
    this.queue = this.queue.then(run, run);
    return this.queue;
  }

  /** The motion kind an entry maps to (design.md §c.3). */
  static motionOf(rec: Received, sentence: Sentence, holder: string): MotionKind {
    const e = rec.entry;
    if (!isPod(e)) {
      if (e.kind === "proof-verified") return "proof";
      if (e.kind === "org-to-org") return "org-to-org";
      if (e.kind === "no-solid") return "no-solid";
      return "verified";
    }
    if (isDenied(e)) return "denied";
    // An organisation sharing in its own pod draws no key: the keys are the holder's grants.
    if (e.pod !== holder && !isHolderId(e.pod)) return "self";
    if (sentence.kind === "grant") return "grant";
    if (sentence.kind === "expire") return "expire";
    if (sentence.kind === "revoke") return "revoke";
    if (e.pod !== holder) return "self";
    if (sentence.kind === "credential") return "credential";
    if (e.kind === "read") return "read";
    return "write";
  }

  private async drawMotion(
    rec: Received,
    sentence: Sentence,
    speed: number,
    backlog = false,
  ): Promise<void> {
    const kind = LensMap.motionOf(rec, sentence, this.model.holder);
    this.svg.setAttribute("data-last", kind);
    const e = rec.entry;
    const reduced = this.opts.reducedMotion() || backlog;
    const dur = Math.round(600 * speed);

    if (!isPod(e)) {
      const from = this.nodePoint(e.org);
      if (kind === "proof") {
        this.opts.onCaption("answer only: the pod was not opened", "proof");
        const start: Pt = [W / 2, this.cabY];
        await this.travel(start, from, "proof", dur, reduced);
      } else if (kind === "org-to-org") {
        const peer = this.model.peerOf(e);
        this.opts.onCaption("between organisations, not through the pod", "org-to-org");
        if (peer !== undefined) await this.arc(from, this.nodePoint(peer), false, reduced);
        else await this.flash(nodeOf(this.model.registry, e.org), reduced);
      } else if (kind === "no-solid") {
        this.dim(e.text);
        this.opts.onCaption("no Solid in this step", "no-solid");
      } else {
        this.opts.onCaption(
          e.kind === "clock"
            ? e.text
            : e.kind === "notified"
              ? "change notice from the demo runtime, not the pod"
              : e.kind === "grant-used"
                ? "one-time grant used"
                : `checked by ${this.model.nameOf(e.org)}`,
          "verified",
        );
        await this.flash(nodeOf(this.model.registry, e.org), reduced);
      }
      return;
    }

    if (kind !== "no-solid") this.dim(null);
    const actorNode = nodeOf(this.model.registry, e.actor.org);
    const orgPt = this.nodePoint(e.actor.org);
    const drawerPath =
      e.pod === this.model.holder && !isAclPath(e.path)
        ? this.model.drawer(e.path)?.path
        : undefined;
    const drawerPt = this.drawerPoint(drawerPath, orgPt);

    switch (kind) {
      case "read":
        this.opts.onCaption(`${this.model.nameOf(e.actor.org)} read from the pod`, "read");
        this.pulseDrawer(drawerPath, "read");
        await this.travel(drawerPt, orgPt, "read", dur, reduced);
        return;
      case "write":
      case "credential":
        this.opts.onCaption(
          kind === "credential"
            ? "a signed credential arrives in the pod"
            : `${this.model.nameOf(e.actor.org)} wrote to the pod`,
          kind,
        );
        await this.travel(orgPt, drawerPt, kind, dur, reduced);
        this.pulseDrawer(drawerPath, "write");
        return;
      case "denied": {
        this.opts.onCaption(`refused: ${e.status}`, "denied");
        await this.bounce(orgPt, drawerPt, e.status, Math.round(780 * speed), reduced);
        return;
      }
      case "grant":
      case "expire":
      case "revoke": {
        const targets = new Set<string>();
        for (const r of [...(e.acl?.granted ?? []), ...(e.acl?.revoked ?? [])]) {
          const org = this.model.orgOfAgent(r.agent);
          if (org !== undefined) targets.add(org);
        }
        this.opts.onCaption(
          kind === "grant"
            ? "access granted"
            : kind === "expire"
              ? "access expired"
              : "access withdrawn",
          kind,
        );
        await Promise.all([...targets].map((org) => this.edgeMotion(org, kind, reduced)));
        return;
      }
      case "self": {
        const owner = nodeOf(this.model.registry, e.pod);
        if (owner !== actorNode && isOk(e.status)) {
          this.opts.onCaption(
            `${this.model.nameOf(e.actor.org)} used ${this.model.nameOf(e.pod)}'s store`,
            "self",
          );
          await this.arc(orgPt, this.nodePoint(e.pod), true, reduced);
        } else {
          await this.flash(actorNode, reduced);
        }
        return;
      }
      default:
        return;
    }
  }

  private mark(kind: string): SVGGElement {
    const g = s("g", { class: "travel", "data-kind": kind });
    if (kind === "read") g.append(s("circle", { r: 5.5, fill: "var(--read)" }));
    else if (kind === "write") g.append(s("circle", { r: 5.5, fill: "var(--write)" }));
    else if (kind === "credential") {
      g.append(
        s("rect", {
          x: -8,
          y: -5.5,
          width: 16,
          height: 11,
          rx: 1.5,
          fill: "var(--paper)",
          stroke: "var(--seal)",
          "stroke-width": 1.6,
        }),
        s("path", {
          d: "M-8 -5l8 5 8-5",
          fill: "none",
          stroke: "var(--seal)",
          "stroke-width": 1.4,
        }),
        s("circle", { cx: 5, cy: 3, r: 3, fill: "var(--seal)" }),
      );
    } else if (kind === "proof") {
      g.append(
        s("circle", { r: 7, fill: "var(--paper)", stroke: "var(--proof)", "stroke-width": 2 }),
        s("path", {
          d: "M-3 0l2 2.5 4-4.5",
          fill: "none",
          stroke: "var(--proof)",
          "stroke-width": 2,
        }),
      );
    } else g.append(s("circle", { r: 5.5, fill: "var(--denied)" }));
    return g;
  }

  private async travel(
    from: Pt,
    to: Pt,
    kind: string,
    dur: number,
    reduced: boolean,
  ): Promise<void> {
    if (reduced) return;
    const g = this.mark(kind);
    this.overlay.append(g);
    this.travels++;
    this.svg.setAttribute("data-travels", String(this.travels));
    const anim = g.animate(
      [
        { transform: `translate(${from[0]}px, ${from[1]}px)`, opacity: 0.2 },
        { transform: `translate(${from[0]}px, ${from[1]}px)`, opacity: 1, offset: 0.1 },
        { transform: `translate(${to[0]}px, ${to[1]}px)`, opacity: 1 },
      ],
      { duration: dur, easing: "cubic-bezier(.4,0,.2,1)" },
    );
    await anim.finished.catch(() => undefined);
    g.remove();
  }

  private async bounce(
    from: Pt,
    wall: Pt,
    status: number,
    dur: number,
    reduced: boolean,
  ): Promise<void> {
    const label = s(
      "text",
      { class: "wall-403", x: wall[0] + (from[0] < W / 2 ? -26 : 4), y: wall[1] - 8 },
      String(status),
    );
    this.overlay.append(label);
    if (!reduced) {
      const g = this.mark("denied");
      this.overlay.append(g);
      this.travels++;
      this.svg.setAttribute("data-travels", String(this.travels));
      const anim = g.animate(
        [
          { transform: `translate(${from[0]}px, ${from[1]}px)` },
          { transform: `translate(${wall[0]}px, ${wall[1]}px)`, offset: 0.45 },
          { transform: `translate(${wall[0]}px, ${wall[1]}px)`, offset: 0.6 },
          { transform: `translate(${from[0]}px, ${from[1]}px)` },
        ],
        { duration: dur, easing: "ease-in-out" },
      );
      await anim.finished.catch(() => undefined);
      g.remove();
    }
    setTimeout(() => label.remove(), reduced ? 1400 : 700);
  }

  private async arc(a: Pt, b: Pt, viaPod: boolean, reduced: boolean): Promise<void> {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const bend = a[0] === b[0] ? (a[0] < W / 2 ? -40 : 40) : 0;
    const cy = a[0] === b[0] ? my : Math.min(a[1], b[1]) - 40;
    const path = s("path", {
      class: `arc${viaPod ? " via-pod" : ""}`,
      "data-kind": "org-to-org",
      d: `M${a[0]} ${a[1]}Q${mx + bend} ${cy} ${b[0]} ${b[1]}`,
    });
    this.overlay.append(path);
    if (!reduced) {
      this.travels++;
      this.svg.setAttribute("data-travels", String(this.travels));
      await path
        .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" })
        .finished.catch(() => undefined);
    }
    setTimeout(() => path.remove(), 1600);
  }

  private async edgeMotion(
    org: string,
    kind: "grant" | "expire" | "revoke",
    reduced: boolean,
  ): Promise<void> {
    const g = this.model.grant(org);
    if (!g) return;
    const drawers = kind === "grant" ? [...this.model.activeDrawers(org)] : [...g.everCovered];
    const [a, b] = this.edgeEnds(org, drawers);
    if (reduced) return;
    const color =
      kind === "grant" ? "var(--grant)" : kind === "expire" ? "var(--expired)" : "var(--denied)";
    const line = s("line", {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      stroke: color,
      "stroke-width": 3.5,
      "stroke-linecap": "round",
    });
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    line.style.strokeDasharray = `${len}`;
    this.overlay.append(line);
    this.travels++;
    this.svg.setAttribute("data-travels", String(this.travels));
    const frames =
      kind === "grant"
        ? [{ strokeDashoffset: `${len}` }, { strokeDashoffset: "0" }]
        : [{ strokeDashoffset: "0" }, { strokeDashoffset: `${-len}` }];
    const keys = kind === "grant" ? [] : drawers;
    const drops = keys.map((dp) => {
      const y = this.drawerY.get(dp) ?? 0;
      const k = s("circle", { cx: CAB_X + CAB_W - 26, cy: y, r: 2.6, fill: "var(--grant)" });
      this.overlay.append(k);
      return k
        .animate(
          [
            { transform: "translateY(0)", opacity: 1 },
            { transform: "translateY(14px)", opacity: 0 },
          ],
          {
            duration: 600,
          },
        )
        .finished.then(
          () => k.remove(),
          () => k.remove(),
        );
    });
    await Promise.all([
      line
        .animate(frames, { duration: 700, easing: "ease-in-out" })
        .finished.catch(() => undefined),
      ...drops,
    ]);
    line.remove();
  }

  private async flash(node: string, reduced: boolean): Promise<void> {
    const el = this.base.querySelector(`.org[data-org="${CSS.escape(node)}"]`);
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), reduced ? 900 : 700);
    if (!reduced) await wait(300);
  }

  private pulseDrawer(path: string | undefined, kind: "read" | "write"): void {
    if (path === undefined) return;
    const el = this.base.querySelector(`.drawer[data-path="${CSS.escape(path)}"]`);
    if (!el) return;
    el.classList.add(`pulse-${kind}`);
    setTimeout(() => {
      this.base
        .querySelector(`.drawer[data-path="${CSS.escape(path)}"]`)
        ?.classList.remove(`pulse-${kind}`);
    }, 900);
  }
}
