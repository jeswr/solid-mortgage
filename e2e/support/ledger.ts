// AUTHORED-BY Claude Opus 5.5
/**
 * Journey-ledger totals recomputed from the raw event log (acceptance test 13), following the
 * definitions in packages/lens/README.md ("Journey ledger totals") and design.md §c.5. This is
 * a second, independent implementation: it shares no code with packages/lens.
 */
import type { LensEntry } from "../../packages/demo-kit/src/contracts/index.ts";
import { isAclPath, isOk, isPodEntry, podRelative } from "./pod.ts";
import { ORGS, ownerOfWebid } from "./site.ts";

export interface Totals {
  organisations: number;
  grants: { active: number; expired: number; revoked: number };
  credentialsIssued: number;
  /** Path → reuse count. */
  reuses: Record<string, number>;
  documentsDelivered: number;
  denied: number;
  uploads: number;
}

const HOLDER = "alex";
const PUBLIC_AGENTS = new Set([
  "http://xmlns.com/foaf/0.1/Agent",
  "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
]);

/**
 * The holder's bookkeeping drawers (design.md §b.4): not uploads, not deliveries. `banking/` holds
 * only Alex's autopay mandate, an authorisation like a consent record (content/mortgage/mount.ts).
 */
export const RECORD_DRAWERS = ["/inbox/", "/policies/", "/consents/", "/banking/"];

/** The organisation node of an app slug or pod owner (an app's `actsAs`). */
function nodeOf(slug: string): string {
  const record = (ORGS as Record<string, { actsAs: string } | undefined>)[slug];
  return record?.actsAs ?? slug;
}

function orgOfAgent(agent: string): string | undefined {
  if (PUBLIC_AGENTS.has(agent)) return undefined;
  const owner = ownerOfWebid(agent);
  if (owner === undefined) return undefined;
  const node = nodeOf(owner);
  return node === HOLDER ? undefined : node;
}

export function computeTotals(log: LensEntry[], recordDrawers = RECORD_DRAWERS): Totals {
  const orgs = new Set<string>();
  const meet = (slug: string | undefined) => {
    if (slug === undefined) return;
    const node = nodeOf(slug);
    if (node !== HOLDER) orgs.add(node);
  };
  const grants = new Map<
    string,
    { rules: Map<string, true>; state: "active" | "expired" | "revoked" }
  >();
  const credentials = new Map<string, { writer: string; reuses: number }>();
  const delivered = new Set<string>();
  const uploads = new Set<string>();
  let denied = 0;
  const isRecord = (path: string) => recordDrawers.some((d) => path.startsWith(d));

  for (const entry of log) {
    if (!isPodEntry(entry)) {
      meet(entry.org);
      if (entry.kind === "org-to-org") {
        const self = nodeOf(entry.org);
        for (const ref of entry.refs ?? []) {
          const node = ref in ORGS ? nodeOf(ref) : orgOfAgent(ref);
          if (node !== undefined && node !== self && node !== HOLDER) {
            orgs.add(node);
            break;
          }
        }
      }
      continue;
    }
    meet(entry.actor.org);
    if (entry.pod !== HOLDER) meet(entry.pod);

    if (entry.acl && isOk(entry.status)) {
      const key = (r: { agent: string; resource: string; inherited: boolean }) =>
        `${r.agent} ${r.resource} ${r.inherited}`;
      const touched = new Set<string>();
      for (const rule of entry.acl.revoked) {
        const org = orgOfAgent(rule.agent);
        const grant = org === undefined ? undefined : grants.get(org);
        if (org === undefined || grant === undefined) continue;
        if (grant.rules.delete(key(rule))) touched.add(org);
      }
      for (const rule of entry.acl.granted) {
        const org = orgOfAgent(rule.agent);
        if (org === undefined) continue;
        orgs.add(org);
        let grant = grants.get(org);
        if (grant === undefined || grant.state !== "active") {
          grant = { rules: new Map(), state: "active" };
          grants.set(org, grant);
        }
        grant.rules.set(key(rule), true);
        touched.delete(org);
      }
      for (const org of touched) {
        const grant = grants.get(org);
        if (grant !== undefined && grant.rules.size === 0) {
          grant.state = entry.actor.viaAgent ? "expired" : "revoked";
        }
      }
    }

    if (entry.kind === "denied" || entry.status === 401 || entry.status === 403) {
      denied++;
      continue;
    }
    if (entry.pod !== HOLDER || isAclPath(entry.path) || !isOk(entry.status)) continue;
    if (entry.kind !== "write") continue;
    const path = podRelative(entry.path, HOLDER);
    const writer = nodeOf(entry.actor.org);
    if (entry.resource?.credential) {
      if (!credentials.has(path)) credentials.set(path, { reuses: 0, writer });
      continue;
    }
    if (isRecord(path)) continue;
    if (writer === HOLDER) uploads.add(path);
    else delivered.add(path);
  }

  for (const entry of log) {
    if (!isPodEntry(entry) || entry.pod !== HOLDER || entry.kind !== "read") continue;
    if (!isOk(entry.status)) continue;
    const credential = credentials.get(podRelative(entry.path, HOLDER));
    const reader = nodeOf(entry.actor.org);
    if (credential && reader !== HOLDER && reader !== credential.writer) credential.reuses++;
  }

  const counts = { active: 0, expired: 0, revoked: 0 };
  for (const grant of grants.values()) counts[grant.state]++;
  return {
    credentialsIssued: credentials.size,
    denied,
    documentsDelivered: delivered.size,
    grants: counts,
    organisations: orgs.size,
    reuses: Object.fromEntries([...credentials].map(([path, c]) => [path, c.reuses])),
    uploads: uploads.size,
  };
}
