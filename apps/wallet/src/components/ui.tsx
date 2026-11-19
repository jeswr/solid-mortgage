// AUTHORED-BY Claude Opus 5.5
import { PodRequestError } from "@mortgage/content/mortgage/world";
import { ORGS } from "@mortgage/content/orgs";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import type { ReactNode } from "react";
import { orgOfWebid } from "../explain.ts";

/** A status line while the pod answers. */
export function Loading({ what }: { what: string }) {
  return (
    <p className="loading" role="status">
      Reading {what} from your pod…
    </p>
  );
}

/** What a failed pod request means, in words. A 403 is a refusal by the pod, said as one. */
export function problemText(error: unknown): string {
  if (error instanceof PodRequestError) {
    if (error.status === 403 || error.status === 401) {
      return `The pod refused this request (${error.status}). No access rule allows it.`;
    }
    return `The pod answered ${error.status} to ${error.method} ${new URL(error.url).pathname}.`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function Problem({ error }: { error: unknown }) {
  const refused =
    error instanceof PodRequestError && (error.status === 403 || error.status === 401);
  return (
    <div className={refused ? "notice refused" : "notice problem"} role="alert">
      <strong>{refused ? "Refused by the pod" : "Something went wrong"}</strong>
      <p>{problemText(error)}</p>
    </div>
  );
}

/** A round badge in the organisation's own colour with its initial. */
export function OrgBadge({ webid, slug }: { webid?: string; slug?: OrgSlug }) {
  const org = slug ?? (webid === undefined ? undefined : orgOfWebid(webid));
  const record = org === undefined ? undefined : ORGS[org];
  const initial = record?.short.charAt(0) ?? "?";
  return (
    <span
      className="org-badge"
      aria-hidden="true"
      style={record === undefined ? undefined : { background: record.themeColor }}
    >
      {initial}
    </span>
  );
}

/** A small labelled value pair inside a card. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
