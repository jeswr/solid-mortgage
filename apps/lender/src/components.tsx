// AUTHORED-BY Claude Opus 5.5
/** Small pieces Juniper's screens share: source badges, refusals, busy and error states. */
import { appUrl } from "@mortgage/demo-kit/urls";
import type { ReactNode } from "react";
import type { MissingResource } from "./pod.ts";

export type Source =
  | {
      readonly kind: "pod";
      readonly from: string;
      readonly issuer?: string;
      readonly verified?: boolean;
    }
  | { readonly kind: "typed" }
  | { readonly kind: "form" };

/** "From your pod · issued by Ledgerly Payroll · signature checked". */
export function SourceBadge({ source }: { source: Source }) {
  if (source.kind === "typed")
    return <span className="badge badge-typed">Typed by you · not stored</span>;
  if (source.kind === "form")
    return <span className="badge badge-typed">Chosen by you in this form</span>;
  const parts = [`From your pod (${source.from})`];
  if (source.issuer !== undefined) parts.push(`issued by ${source.issuer}`);
  if (source.verified === true) parts.push("signature checked");
  if (source.verified === false) parts.push("signature check failed");
  return (
    <span className={source.verified === false ? "badge badge-failed" : "badge"}>
      {parts.join(" · ")}
    </span>
  );
}

/** A request the pod refused, shown as what it is. */
export function Refusal({
  status,
  method,
  url,
  children,
}: {
  status: number;
  method: string;
  url: string;
  children?: ReactNode;
}) {
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  return (
    <div className="refusal" role="alert">
      <p className="refusal-code">
        {status} {status === 403 ? "Forbidden" : "Unauthorized"}
      </p>
      <p>
        Alex's pod refused Juniper's request: <code>{method}</code> <code>{path}</code>. No rule in
        force lets Juniper do this.
      </p>
      {children}
    </div>
  );
}

export function MissingList({ resources }: { resources: readonly MissingResource[] }) {
  return (
    <div className="notice" role="status">
      <p>Not in your pod yet:</p>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            {resource.label}
            {resource.app === undefined ? null : (
              <>
                {" "}
                · <a href={appUrl(resource.app.app, resource.app.path)}>get it from its issuer</a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function Failure({ error }: { error: Error }) {
  return (
    <div className="notice notice-error" role="alert">
      <p>Something went wrong: {error.message}</p>
    </div>
  );
}
