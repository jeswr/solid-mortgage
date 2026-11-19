// AUTHORED-BY Claude Opus 5.5
/**
 * Plain-English sentences for Lens entries. Each sentence states only what the entry carries
 * (request, status, ACL rules actually written, the note's own text) plus facts the model
 * derived from earlier entries (a withdrawn grant). Nothing is guessed.
 */
import type { AccessMode, AccessRule } from "@mortgage/demo-kit/contracts";
import { type GrantRecord, isDenied, isOk, isPod, type LensModel, type Received } from "./model.js";
import { HOLDER, isAclPath, localName, nodeOf, PUBLIC_AGENTS, podRelative } from "./paths.js";

export type EntryKind =
  | "read"
  | "write"
  | "credential"
  | "delete"
  | "grant"
  | "revoke"
  | "expire"
  | "denied"
  | "verified"
  | "proof"
  | "org-to-org"
  | "no-solid"
  | "clock"
  | "notified"
  | "grant-used"
  | "other";

/** A sentence with emphasised spans, its plain form, and secondary facts. */
export interface Sentence {
  kind: EntryKind;
  /** "Pod saw" or "App said". */
  source: "pod" | "app";
  parts: Array<string | { b: string }>;
  text: string;
  meta: string[];
}

const VERB: Record<AccessMode, string> = {
  Read: "read",
  Append: "add to",
  Write: "change",
  Control: "manage sharing of",
};
const MODE_ORDER: AccessMode[] = ["Read", "Append", "Write", "Control"];

function sentence(
  kind: EntryKind,
  source: "pod" | "app",
  parts: Sentence["parts"],
  meta: string[] = [],
): Sentence {
  const text = parts.map((p) => (typeof p === "string" ? p : p.b)).join("");
  return { kind, source, parts, text, meta };
}

export function listWords(items: string[]): string {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}

/** "Fernhollow may read Profile and Certificates; add to Permits". */
export function describeRules(model: LensModel, org: string, rules: AccessRule[]): string {
  const byMode = new Map<AccessMode, string[]>();
  for (const r of rules) {
    const what = ruleTarget(model, r);
    for (const m of r.modes) {
      const list = byMode.get(m) ?? [];
      list.push(what);
      byMode.set(m, list);
    }
  }
  const clauses = MODE_ORDER.filter((m) => byMode.has(m)).map(
    (m) => `${VERB[m]} ${listWords(byMode.get(m) ?? [])}`,
  );
  return `${model.nameOf(org)} may ${clauses.join("; ")}`;
}

/** What a rule is about: a drawer's label for a container, a resource label otherwise. */
export function ruleTarget(model: LensModel, r: AccessRule): string {
  const rel = podRelative(r.resource);
  if (rel === "/") return "everything in the pod";
  return model.labelOf(rel);
}

function grantMeta(model: LensModel, iri: string | undefined): string[] {
  if (iri === undefined) return [];
  const info = model.grantInfo(iri);
  if (!info) return [`allowed by policy ${localName(iri)}`];
  return [`allowed by ${info.label}`, info.purpose, info.until].filter(
    (x): x is string => x !== undefined && x !== "",
  );
}

function statusText(status: number): string {
  const names: Record<number, string> = {
    200: "OK",
    201: "created",
    204: "done",
    205: "done",
    401: "not signed in",
    403: "refused",
    404: "not found",
    409: "conflict",
    412: "changed meanwhile",
    503: "pod restarting",
  };
  return `${status}${names[status] ? ` ${names[status]}` : ""}`;
}

function ago(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const m = Math.round(seconds / 60);
  return `${m} minute${m === 1 ? "" : "s"} ago`;
}

/** Why a refused request was refused, from the grant history the model folded. */
export function refusalReason(model: LensModel, rec: Received): string {
  const e = rec.entry;
  if (!isPod(e)) return "";
  const g: GrantRecord | undefined = model.grant(e.actor.org);
  if (!g || g.grantedSeq > rec.seq) return "no grant covers it";
  if (g.endedSeq === undefined || g.endedSeq > rec.seq) return "no rule in force covers it";
  const ended = model.received[g.endedSeq - 1];
  const verb = g.state === "expired" ? "access ended" : "grant withdrawn";
  if (ended && !ended.replayed && !rec.replayed) {
    return `${verb} ${ago(Math.max(0, Math.round((rec.receivedAt - ended.receivedAt) / 1000)))}`;
  }
  return verb;
}

export function describe(model: LensModel, rec: Received): Sentence {
  const e = rec.entry;
  if (!isPod(e)) {
    const who = model.nameOf(e.org);
    switch (e.kind) {
      case "verified":
        return sentence("verified", "app", [e.text], [`checked by ${who}`, "not a pod request"]);
      case "proof-verified":
        return sentence(
          "proof",
          "app",
          [e.text],
          [`checked by ${who}`, "answer only: no data shared"],
        );
      case "org-to-org": {
        const peer = model.peerOf(e);
        const meta = ["not through the pod"];
        if (peer !== undefined) meta.unshift(`${who} to ${model.nameOf(peer)}`);
        return sentence("org-to-org", "app", [e.text], meta);
      }
      case "no-solid":
        return sentence("no-solid", "app", [e.text], ["no Solid in this step"]);
      case "clock":
        return sentence("clock", "app", [e.text], [`reported by ${who}`]);
      case "notified": {
        const [, url, activity] = e.refs ?? [];
        const what = url === undefined ? "a resource it watches" : resourceLabel(model, url);
        const verb = activity?.endsWith("#Create")
          ? " was created"
          : activity?.endsWith("#Delete")
            ? " was deleted"
            : " changed";
        return sentence(
          "notified",
          "app",
          [{ b: who }, " was told that ", { b: what }, verb],
          [NOTIFIED_LABEL, "the notice carries no data"],
        );
      }
      case "grant-used": {
        const [url, agent] = e.refs ?? [];
        const org = agent === undefined ? undefined : model.orgOfAgent(agent);
        const user = org === undefined ? "An organisation" : model.nameOf(org);
        const what = url === undefined ? "a resource" : resourceLabel(model, url);
        return sentence(
          "grant-used",
          "app",
          [{ b: user }, " used its one-time grant to read ", { b: what }],
          [oneTimeLabel(model)],
        );
      }
    }
  }

  const actor = model.nameOf(e.actor.org);
  const actorNode = nodeOf(model.registry, e.actor.org);
  const onHolder = e.pod === HOLDER;
  const owner = model.nameOf(e.pod);
  const label = e.resource?.label ?? model.labelOf(e.path, e.pod);
  const drawer = onHolder && !isAclPath(e.path) ? model.drawer(e.path)?.label : undefined;
  const where = onHolder ? drawer : `${possessive(owner)} store`;
  const via = e.actor.viaAgent ? ["by its back-office agent"] : [];

  if (isDenied(e)) {
    const verb =
      e.method === "GET" || e.method === "HEAD"
        ? "read"
        : e.method === "DELETE"
          ? "delete"
          : "write to";
    return sentence(
      "denied",
      "pod",
      [{ b: actor }, ` tried to ${verb} `, { b: label }, ` · refused (${e.status})`],
      [where, refusalReason(model, rec), ...via].filter((x): x is string => !!x),
    );
  }

  if (
    e.acl &&
    (e.kind === "grant" || e.kind === "revoke" || e.acl.granted.length + e.acl.revoked.length > 0)
  ) {
    return describeAcl(model, rec);
  }

  const status = isOk(e.status) ? [] : [statusText(e.status)];
  switch (e.kind) {
    case "read": {
      if (actorNode === HOLDER) {
        return sentence(
          "read",
          "pod",
          [{ b: actor }, " opened ", { b: label }],
          [where, ...status].filter((x): x is string => !!x),
        );
      }
      const own = !onHolder && actorNode === nodeOf(model.registry, e.pod);
      const parts: Sentence["parts"] = own
        ? [{ b: actor }, " read its own record ", { b: label }]
        : [{ b: actor }, " read ", { b: label }];
      return sentence(
        "read",
        "pod",
        parts,
        [own ? undefined : where, ...grantMeta(model, e.grant), ...status, ...via].filter(
          (x): x is string => !!x,
        ),
      );
    }
    case "write": {
      const cred = e.resource?.credential;
      if (cred && onHolder) {
        const issuerOrg = model.orgOfAgent(cred.issuer);
        const meta = [
          drawer,
          `issued by ${issuerOrg ? model.nameOf(issuerOrg) : cred.issuer}`,
          `valid from ${cred.validFrom.slice(0, 10)}`,
          cred.asOf ? `as of ${cred.asOf.slice(0, 10)}` : undefined,
          ...grantMeta(model, e.grant),
          ...status,
        ].filter((x): x is string => !!x);
        return sentence(
          "credential",
          "pod",
          [{ b: actor }, " delivered a signed credential: ", { b: label }],
          meta,
        );
      }
      const inbox = /\/inbox\//.test(podRelative(e.path));
      const parts: Sentence["parts"] = inbox
        ? [
            { b: actor },
            " sent ",
            { b: label },
            ` to ${owner === actor ? "its own" : possessive(owner)} inbox`,
          ]
        : [{ b: actor }, " wrote ", { b: label }, where ? ` to ${where}` : ""];
      return sentence("write", "pod", parts, [...grantMeta(model, e.grant), ...status, ...via]);
    }
    case "delete":
      return sentence(
        "delete",
        "pod",
        [{ b: actor }, " deleted ", { b: label }],
        [where, ...grantMeta(model, e.grant), ...status, ...via].filter((x): x is string => !!x),
      );
    default:
      return sentence(
        "other",
        "pod",
        [{ b: actor }, ` sent ${e.method} `, { b: label }],
        [statusText(e.status)],
      );
  }
}

function describeAcl(model: LensModel, rec: Received): Sentence {
  const e = rec.entry;
  if (!isPod(e) || !e.acl) throw new Error("not an ACL event");
  const actor = model.nameOf(e.actor.org);
  const granted = groupByOrg(model, e.acl.granted);
  const revoked = groupByOrg(model, e.acl.revoked);
  const publicRules = e.acl.granted.filter((r) => PUBLIC_AGENTS.has(r.agent));
  const meta: string[] = [];
  for (const [org, rules] of granted) meta.push(describeRules(model, org, rules));
  for (const r of publicRules)
    meta.push(`anyone may ${r.modes.map((m) => VERB[m]).join(" and ")} ${ruleTarget(model, r)}`);
  for (const [org, rules] of revoked) meta.push(`Removed: ${describeRules(model, org, rules)}`);
  meta.push(...grantMeta(model, e.grant));

  if (granted.size > 0) {
    const names = listWords([...granted.keys()].map((o) => model.nameOf(o)));
    return sentence("grant", "pod", [{ b: actor }, " gave ", { b: names }, " access"], meta);
  }
  if (revoked.size > 0) {
    const names = listWords([...revoked.keys()].map((o) => possessive(model.nameOf(o))));
    if (e.actor.viaAgent && model.closedOneTime(rec.seq) !== undefined) {
      return sentence(
        "expire",
        "pod",
        [{ b: names }, " one-time access closed"],
        [oneTimeLabel(model), ...meta],
      );
    }
    if (e.actor.viaAgent) {
      const app = model.holderAppName();
      return sentence(
        "expire",
        "pod",
        [{ b: names }, " access ended"],
        [`expiry applied automatically${app ? ` by ${app}` : ""}`, ...meta],
      );
    }
    return sentence("revoke", "pod", [{ b: actor }, " withdrew ", { b: names }, " access"], meta);
  }
  return sentence(
    "grant",
    "pod",
    [
      { b: actor },
      " changed the access rules for ",
      { b: model.labelOf(e.path.replace(/\.acl$/, ""), e.pod) },
    ],
    meta,
  );
}

/** How the Lens labels a change notice: the runtime sends it, not the pod server. */
export const NOTIFIED_LABEL =
  "notified by the demo runtime; the Solid Notifications Protocol in production";

/** "one-time grant, closed by Alex's wallet". */
export function oneTimeLabel(model: LensModel): string {
  return `one-time grant, closed by ${possessive(model.holderName)} wallet`;
}

/** A resource URL's label as events described it, in the pod the URL names. */
function resourceLabel(model: LensModel, url: string): string {
  const pod = /\/pods\/([^/]+)\//.exec(url)?.[1] ?? HOLDER;
  return model.labelOf(podRelative(url), pod);
}

export function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function groupByOrg(model: LensModel, rules: AccessRule[]): Map<string, AccessRule[]> {
  const out = new Map<string, AccessRule[]>();
  for (const r of rules) {
    const org = model.orgOfAgent(r.agent);
    if (org === undefined) continue;
    const list = out.get(org) ?? [];
    list.push(r);
    out.set(org, list);
  }
  return out;
}

/** The pinned caveat under a refusal that follows a withdrawal. */
export function revokeCaveat(model: LensModel, org: string): string {
  const template =
    model.config.revokeCaveat ??
    "{org} still holds the copies it was given and any records it must keep. What has ended is its access to {holder}'s data at source.";
  return template.replaceAll("{org}", model.nameOf(org)).replaceAll("{holder}", model.holderName);
}
