import { cn } from "@jeswr/app-shell";
import { DEMO_BORROWER_ACCOUNT } from "./app-shell";

export type ReceiptAction = "grant" | "revoke";

export interface ReceiptCardProps {
  action: ReceiptAction;
  /** WebID of the person who approved the change. */
  actor: string;
  /** WebID of the organisation whose access changed. */
  recipient: string;
  /** Pod resource covered by the consent change. */
  resource: string;
  /** ISO 8601 receipt timestamp. */
  issuedAt: string;
  /** The consent record's own IRI (shown under Technical details). */
  iri?: string;
  /** Human organisation name, e.g. "Servicer". Omitted → the heading names no organisation. */
  organisationLabel?: string;
  /** Human data label, e.g. "Closing record". Default: derived from `resource`. */
  dataLabel?: string;
  /** Kind of access granted, e.g. "read" → "read access granted". Default: "access". */
  accessLabel?: string;
  /** Who authorised the change. Default: the demo borrower, Alex Rivera. */
  authorisedBy?: string;
  /** The app that wrote this record, e.g. "eClosing app". Omitted → the row is not shown. */
  recordedBy?: string;
  /** The record came from a source the displaying app has not verified. */
  unverifiedSource?: boolean;
  /** Name of the app that would verify the source (default "Data Vault"). */
  verifierName?: string;
  className?: string;
}

/** A readable label for the pod resource a consent record covers. */
export function receiptDataLabel(resource: string): string {
  const path = resource.replace(/[?#].*$/, "");
  if (/\/closing-record$/.test(path)) return "Closing record";
  if (/\/mortgage\/?$/.test(path)) return "Loan file";
  const parts = path.split("/").filter((part) => part !== "");
  const segment = parts[parts.length - 1];
  return segment === undefined ? "Pod data" : decodeURIComponent(segment).replace(/-/g, " ");
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

/**
 * One app-level DPV consent receipt, written for people: organisation, data, who authorised
 * it, which app recorded it, and when. Identifiers (WebIDs, resource URLs, record ids) sit in
 * a collapsed "Technical details" disclosure. WAC enforces access; neither WAC nor the Solid
 * protocol supplies this audit trail.
 */
export function ReceiptCard({
  action,
  actor,
  recipient,
  resource,
  issuedAt,
  iri,
  organisationLabel,
  dataLabel,
  accessLabel = "access",
  authorisedBy = DEMO_BORROWER_ACCOUNT.name,
  recordedBy,
  unverifiedSource = false,
  verifierName = "Data Vault",
  className,
}: ReceiptCardProps) {
  const change = action === "grant" ? `${accessLabel} granted` : "access revoked";
  const heading =
    organisationLabel === undefined ? capitalise(change) : `${organisationLabel} — ${change}`;
  const recorded = `${new Date(issuedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
  return (
    <article
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      data-receipt-action={action}
      data-receipt-card=""
    >
      <h3 className="font-semibold text-card-foreground text-sm">{heading}</h3>
      <dl className="mt-3 grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-medium text-muted-foreground">Data</dt>
        <dd className="m-0 text-card-foreground" data-receipt-data="">
          {dataLabel ?? receiptDataLabel(resource)}
        </dd>
        <dt className="font-medium text-muted-foreground">Authorised by</dt>
        <dd className="m-0 text-card-foreground">{authorisedBy}</dd>
        {recordedBy !== undefined && (
          <>
            <dt className="font-medium text-muted-foreground">Recorded by</dt>
            <dd className="m-0 text-card-foreground" data-receipt-recorded-by="">
              {recordedBy}
            </dd>
          </>
        )}
        <dt className="font-medium text-muted-foreground">Recorded</dt>
        <dd className="m-0 text-card-foreground">
          <time dateTime={issuedAt}>{recorded}</time>
        </dd>
      </dl>
      {unverifiedSource && (
        <p className="mt-2 text-amber-800 text-xs" data-receipt-external="">
          Source has not been verified by {verifierName}.
        </p>
      )}
      <details className="mt-3 text-muted-foreground text-xs" data-receipt-technical="">
        <summary className="cursor-pointer">Technical details</summary>
        <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">Consent status</dt>
          <dd className="m-0">
            {action === "grant" ? "dpv:ConsentGiven" : "dpv:ConsentWithdrawn"}
          </dd>
          <dt className="font-medium">Organisation WebID</dt>
          <dd className="m-0 break-all">{recipient}</dd>
          <dt className="font-medium">Authorised by WebID</dt>
          <dd className="m-0 break-all">{actor}</dd>
          <dt className="font-medium">Resource</dt>
          <dd className="m-0 break-all">{resource}</dd>
          {iri !== undefined && (
            <>
              <dt className="font-medium">Record ID</dt>
              <dd className="m-0 break-all">{iri}</dd>
            </>
          )}
        </dl>
      </details>
    </article>
  );
}
