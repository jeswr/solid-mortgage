// AUTHORED-BY Claude Opus 5.5
/**
 * Pod runtime contract types, copied from design.md §d.2. `packages/pod-runtime` emits these and
 * `packages/lens` and `packages/tour` read them; neither may redefine them. Change them here, in
 * one reviewed commit, and only together with design.md.
 */
import type { OrgSlug } from "../registry.js";

/** WAC access modes as they appear in an ACL document (`acl:Read`, …). */
export type AccessMode = "Read" | "Write" | "Append" | "Control";

/**
 * One authorisation as written in an ACL document, flattened for display.
 * Not specified by design.md; defined here by lane L0 so `PodEvent.acl` is concrete.
 */
export interface AccessRule {
  /** The agent's WebID, or `http://xmlns.com/foaf/0.1/Agent` (anyone) / `acl:AuthenticatedAgent`. */
  agent: string;
  /** Modes granted to that agent by this rule. */
  modes: AccessMode[];
  /** Pod path of the resource or container the rule is about (`acl:accessTo` or `acl:default`). */
  resource: string;
  /** True when the rule is an `acl:default` (it also covers the container's members). */
  inherited: boolean;
}

// biome-ignore format: kept verbatim from design.md so the two can be compared line by line
export interface PodEvent {
  id: number; at: string;            // demo-calendar ISO time
  tour?: { demo: string; step: string };
  actor: { org: OrgSlug | "alex"; webid: string; viaAgent: boolean };
  pod: OrgSlug | "alex"; path: string; method: string; status: number;
  kind: "read" | "write" | "delete" | "grant" | "revoke" | "denied";
  resource?: { label: string; drawer: string; types: string[];
               credential?: { type: string; issuer: string; validFrom: string; asOf?: string } };
  acl?: { granted: AccessRule[]; revoked: AccessRule[] };   // from the ACL body actually written
  grant?: string;                    // IRI of the policy that allowed it, when one matches
}

/**
 * Lane E2 added two kinds to design.md's list (the design doc must follow):
 * - `notified`: the demo runtime told `org` that a resource it subscribed to changed. The 0.1.8
 *   wasm has no Solid Notifications, so the runtime, not the pod server, sends it. `refs` is
 *   `[topic, changed resource, ActivityStreams activity IRI]`.
 * - `grant-used`: a one-time grant was used, and `org` (the holder's wallet) is closing it. `refs`
 *   is `[resource, agent WebID]`; the revoke event that closes it follows.
 */
// biome-ignore format: kept close to design.md so the two can be compared line by line
export interface AppNote { kind: "verified" | "proof-verified" | "org-to-org" | "no-solid" | "clock"
                                 | "notified" | "grant-used";
                           org: OrgSlug; text: string; refs?: string[] }

// biome-ignore format: kept verbatim from design.md so the two can be compared line by line
export type LensEntry = ({ source: "pod" } & PodEvent) | ({ source: "app"; id: number; at: string } & AppNote);

/** What `session()` in pod-runtime returns (design.md §d.2, §d.3). Sign-in is simulated. */
export interface Session {
  org: OrgSlug;
  webid: string;
  persona: string;
  simulated: true;
}
