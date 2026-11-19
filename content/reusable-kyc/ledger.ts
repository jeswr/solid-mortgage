// AUTHORED-BY Claude Opus 5.5
/**
 * Step 7's totals, computed from the journey's log (the Lens entries the pod runtime emitted),
 * never typed in: how many institutions ran the identity checks, how many institutions took part,
 * how many times another institution read the statement, and the two kinds of withdrawal (the
 * owner closing access, the issuer withdrawing its word).
 */

import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { isOrgSlug, type OrgSlug } from "@mortgage/demo-kit/registry";
import { ATTESTATION_PATH } from "./attestation.js";

export interface ReusableKycTotals {
  /** Institutions whose checks the statement records: its distinct issuers. */
  readonly checks: number;
  /** Institutions that took part: the issuers plus the organisations that read the statement. */
  readonly institutions: number;
  /** Successful reads of the statement by organisations. */
  readonly reads: number;
  /** Reads of the statement the pod refused. */
  readonly denied: number;
  /** Access to the statement closed by its owner's side (rules removed from its ACL). */
  readonly accessWithdrawn: number;
  /** Versions the issuer withdrew (status-list writes by an issuer after it issued). */
  readonly statementsWithdrawn: number;
  /** Both kinds together. */
  readonly withdrawals: number;
}

type Pod = Extract<LensEntry, { source: "pod" }>;

const STATEMENT = `/${ATTESTATION_PATH}`;
const pathOf = (event: PodEvent) => event.path.split("?")[0] ?? event.path;

/** The organisation whose WebID (`…/pods/<slug>/profile/card#me`) issued a credential. */
function orgOfWebid(webid: string): OrgSlug | undefined {
  const slug = /\/pods\/([^/]+)\/profile\/card#me$/.exec(webid)?.[1];
  return slug !== undefined && isOrgSlug(slug) ? slug : undefined;
}

const isAlex = (entry: LensEntry): entry is Pod => entry.source === "pod" && entry.pod === "alex";
const ok = (entry: Pod) => entry.status >= 200 && entry.status < 300;

export function reusableKycTotals(entries: Iterable<LensEntry>): ReusableKycTotals {
  const issuers = new Set<OrgSlug>();
  const readers = new Set<string>();
  let reads = 0;
  let denied = 0;
  let accessWithdrawn = 0;
  let statementsWithdrawn = 0;
  for (const entry of entries) {
    if (entry.source !== "pod") continue;
    const path = pathOf(entry);
    if (isAlex(entry) && path === STATEMENT) {
      if (entry.kind === "write" && ok(entry) && entry.resource?.credential !== undefined) {
        const issuer = orgOfWebid(entry.resource.credential.issuer);
        if (issuer !== undefined) issuers.add(issuer);
      } else if (entry.kind === "read" && ok(entry) && isOrgSlug(entry.actor.org)) {
        reads += 1;
        readers.add(entry.actor.org);
      } else if (entry.kind === "denied" && isOrgSlug(entry.actor.org)) {
        denied += 1;
      }
    } else if (isAlex(entry) && path === `${STATEMENT}.acl` && entry.kind === "revoke") {
      accessWithdrawn += 1;
    } else if (
      entry.kind === "write" &&
      ok(entry) &&
      path === "/status/list" &&
      isOrgSlug(entry.pod) &&
      issuers.has(entry.pod)
    ) {
      statementsWithdrawn += 1;
    }
  }
  return {
    accessWithdrawn,
    checks: issuers.size,
    denied,
    institutions: new Set<string>([...issuers, ...readers]).size,
    reads,
    statementsWithdrawn,
    withdrawals: accessWithdrawn + statementsWithdrawn,
  };
}
