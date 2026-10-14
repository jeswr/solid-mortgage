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
 * in-browser demo, decision 0011) the API answers 401 and the fallback copy
 * says no credential was issued.
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
        // The only "no session" signal — the Mode-1 preview fallback.
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
      setError("Issuing failed. Check that the pod is reachable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {props.brand === "appraisal" ? (
        <AppraisalPreview preview={props.preview} />
      ) : (
        <TitlePreview preview={props.preview} />
      )}

      <div className="mt-6">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={busy || issued !== null}
          onClick={issue}
          type="button"
        >
          {busy ? "Issuing…" : "Issue credential"}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">
          The demo signs the credential and saves it in the signed-in borrower&apos;s pod.
        </p>
        {unauthenticated && (
          <p
            className="mt-3 text-sm text-muted-foreground"
            data-issue-unauthenticated=""
            role="status"
          >
            This is a simulated {props.brand === "appraisal" ? "appraisal" : "title"} preview.
            Sign-in is simulated here, so no credential was issued.
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
            Credential saved in the pod
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Saved at <code className="break-all">{issued.credentialIri}</code>. Status list entry{" "}
            {issued.statusListIndex} lets the provider revoke it.
          </p>
          <div className="mt-4">
            {issued.brand === "appraisal" ? (
              <CredentialCard
                issuer="Demo appraisal provider"
                status="valid"
                title="Appraisal"
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
                issuer="Demo title provider"
                status="valid"
                title="Title search result"
                validFrom={issued.validFrom.slice(0, 10)}
                validUntil={issued.validUntil.slice(0, 10)}
              >
                <p data-title-status={issued.titleStatus}>{titleStatusCopy(issued.titleStatus)}</p>
              </CredentialCard>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function titleStatusCopy(status: "clear" | "clouded"): string {
  return status === "clear"
    ? "No title defects reported in this simulated search."
    : "A title defect was reported in this simulated search.";
}

function AppraisalPreview({ preview }: { preview: AppraisalDemoPreview }) {
  return (
    <div>
      <CredentialCard issuer="Demo appraisal provider" status="pending" title="Appraisal (preview)">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Subject property</dt>
            <dd>{preview.propertyAddress}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Appraised value</dt>
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
            <dd>{preview.appraiserName} — fictional appraiser</dd>
          </div>
        </dl>
      </CredentialCard>
      <p
        className="mt-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        data-consistency-check=""
      >
        {preview.appraisalCoversLoan
          ? "Consistency check: the appraised value covers the requested loan amount. This is not a loan-to-value decision."
          : "Consistency check failed: the requested loan is more than the appraised value. The credential would be refused."}
      </p>
    </div>
  );
}

function TitlePreview({ preview }: { preview: TitleDemoPreview }) {
  return (
    <CredentialCard
      issuer="Demo title provider"
      status="pending"
      title="Title search result (preview)"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs">Subject property</dt>
          <dd>{preview.propertyAddress}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Search outcome</dt>
          <dd className="font-semibold" data-title-status={preview.titleStatus}>
            {titleStatusCopy(preview.titleStatus)}
          </dd>
        </div>
      </dl>
    </CredentialCard>
  );
}
