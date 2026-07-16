"use client";

import { CredentialCard, IllustrativeFigure } from "@mortgage/ui";
import { useState } from "react";
import { formatUsd } from "../lib/format";
import type { AppraisalDemoPreview, TitleDemoPreview } from "../lib/server/issue";

/** The appraisal issue response reflected by POST /property/api/appraisal/issue. */
interface AppraisalIssued {
  simulated: true;
  brand: "appraisal";
  credentialIri: string;
  issuer: string;
  appraisedValueUsd: number;
  requestedLoanUsd: number;
  appraisalCoversLoan: boolean;
  reportIssued: string;
  statusListIndex: number;
  statusListCredential: string;
  validFrom: string;
  validUntil: string;
}

/** The title issue response reflected by POST /property/api/title/issue. */
interface TitleIssued {
  simulated: true;
  brand: "title";
  credentialIri: string;
  issuer: string;
  titleStatus: "clear" | "clouded";
  searchedThrough: string;
  statusListIndex: number;
  statusListCredential: string;
  validFrom: string;
  validUntil: string;
}

export interface AppraisalFlowProps {
  brand: "appraisal";
  /** The app's base path (multi-zone: client fetches must carry it). */
  apiBase: string;
  /** Issuer display label (role-first framing, e.g. "Cotality"). */
  orgLabel: string;
  preview: AppraisalDemoPreview;
}

export interface TitleFlowProps {
  brand: "title";
  apiBase: string;
  orgLabel: string;
  preview: TitleDemoPreview;
}

export type IssueFlowProps = AppraisalFlowProps | TitleFlowProps;

/**
 * The issuer flow: the disclosed persona figures render immediately (Mode-1
 * demo preview), and the button attempts the AUTHENTICATED issue-into-pod write
 * with the BROWSER SESSION'S credentials — the API derives both the borrower
 * and the pod from the DPoP-bound caller (decision 0015), so no pod/webid ever
 * appears in a request. Without an authenticated Solid session (the default
 * in-browser demo, decision 0011) the API answers 401 and the honest fallback
 * copy says exactly that.
 */
export function IssueFlow(props: IssueFlowProps) {
  const [issued, setIssued] = useState<AppraisalIssued | TitleIssued | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    setError(null);
    setUnauthenticated(false);
    try {
      const response = await fetch(`${props.apiBase}/${props.brand}/issue`, { method: "POST" });
      if (response.status === 401) {
        // The only "no session" signal — the honest Mode-1 fallback.
        setUnauthenticated(true);
        return;
      }
      const body = (await response.json()) as (AppraisalIssued | TitleIssued) & {
        detail?: string;
      };
      if (!response.ok) {
        setError(body.detail ?? `issuance failed (${response.status})`);
        return;
      }
      setIssued(body);
    } catch {
      setError("issuance failed — is the pod reachable?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {props.brand === "appraisal" ? (
        <AppraisalPreview preview={props.preview} orgLabel={props.orgLabel} />
      ) : (
        <TitlePreview preview={props.preview} orgLabel={props.orgLabel} />
      )}

      <div className="mt-6">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy || issued !== null}
          onClick={issue}
          type="button"
        >
          {busy ? "Issuing…" : "Issue into my pod (demo)"}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">
          Issuing signs the credential with the {props.orgLabel} key and writes it into YOUR pod
          over your authenticated session. In the default in-browser demo there is no real login, so
          the server rail honestly answers 401 and this stays a preview.
        </p>
        {unauthenticated && (
          <p
            className="mt-3 text-sm text-muted-foreground"
            data-issue-unauthenticated=""
            role="status"
          >
            No authenticated borrower session — the server issuer rail is off in this mode. The
            figures above are the simulated demo preview.
          </p>
        )}
        {error !== null && (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        )}
      </div>

      {issued !== null && (
        <section
          aria-labelledby="issued-heading"
          className="mt-8"
          data-issued-credential=""
          data-credential-iri={issued.credentialIri}
        >
          <h2 id="issued-heading" className="text-xl font-semibold text-card-foreground">
            Credential issued into your pod
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed and written to <code className="break-all">{issued.credentialIri}</code>. Status
            list entry #{issued.statusListIndex} was minted for revocation (decision 0007).
          </p>
          <div className="mt-4">
            {issued.brand === "appraisal" ? (
              <CredentialCard
                issuer={`${props.orgLabel} (property appraisal provider)`}
                status="valid"
                title="Property appraisal"
                validFrom={issued.validFrom.slice(0, 10)}
                validUntil={issued.validUntil.slice(0, 10)}
              >
                <p data-appraised-value={issued.appraisedValueUsd}>
                  Appraised value:{" "}
                  <IllustrativeFigure>{formatUsd(issued.appraisedValueUsd)}</IllustrativeFigure>
                </p>
              </CredentialCard>
            ) : (
              <CredentialCard
                issuer={`${props.orgLabel} (title insurance provider)`}
                status="valid"
                title="Title status"
                validFrom={issued.validFrom.slice(0, 10)}
                validUntil={issued.validUntil.slice(0, 10)}
              >
                <p data-title-status={issued.titleStatus}>
                  Title status: <strong>{issued.titleStatus}</strong>
                </p>
              </CredentialCard>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AppraisalPreview({
  preview,
  orgLabel,
}: {
  preview: AppraisalDemoPreview;
  orgLabel: string;
}) {
  return (
    <div>
      <CredentialCard
        issuer={`${orgLabel} (property appraisal provider)`}
        status="pending"
        title="Property appraisal (preview)"
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Subject property</dt>
            <dd>{preview.propertyAddress}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Appraised value (disclosed)</dt>
            <dd className="font-semibold" data-appraised-value={preview.appraisedValueUsd}>
              <IllustrativeFigure>{formatUsd(preview.appraisedValueUsd)}</IllustrativeFigure>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Requested loan</dt>
            <dd>
              <IllustrativeFigure>{formatUsd(preview.requestedLoanUsd)}</IllustrativeFigure>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Appraiser</dt>
            <dd>
              {preview.appraiserName} · licence {preview.appraiserLicenseId}
            </dd>
          </div>
        </dl>
      </CredentialCard>
      <p
        className="mt-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        data-consistency-check=""
      >
        {preview.appraisalCoversLoan
          ? "Consistency check: the appraised value covers the requested loan amount (requested loan ≤ appraised value)."
          : "Consistency check FAILED: the requested loan exceeds the appraised value — the credential would be refused."}
      </p>
    </div>
  );
}

function TitlePreview({ preview, orgLabel }: { preview: TitleDemoPreview; orgLabel: string }) {
  return (
    <CredentialCard
      issuer={`${orgLabel} (title insurance provider)`}
      status="pending"
      title="Title status (preview)"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs">Subject property</dt>
          <dd>{preview.propertyAddress}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Title status</dt>
          <dd className="font-semibold" data-title-status={preview.titleStatus}>
            {preview.titleStatus}
          </dd>
        </div>
      </dl>
    </CredentialCard>
  );
}
