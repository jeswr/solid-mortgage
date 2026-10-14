"use client";

import { useCallback, useState } from "react";

interface FreshnessResponse {
  simulated: true;
  credentialIri: string;
  window: { validFrom?: string; validUntil?: string };
  fresh: boolean;
  verified: boolean;
  verifyErrors: string[];
  greenTick: boolean;
  decision: "stands" | "blocked-stale" | "blocked-invalid";
  rule: string;
  detail?: string;
}

export interface FreshnessPanelProps {
  apiBase: string;
}

const DECISION_COPY: Record<FreshnessResponse["decision"], string> = {
  stands: "Credential valid. It verifies and is within its validity period.",
  "blocked-stale":
    "Condition open: employment re-verification required. The credential has expired.",
  "blocked-invalid":
    "Condition open: the credential did not verify (signature, trusted issuer or status).",
};

/**
 * Scene-4 client panel: run the freshness re-check against the caller's OWN
 * granted pod (decision 0015 — the API derives both borrower and pod from the
 * authenticated session; no pod parameter exists), request the one-click
 * re-issue when stale, and re-run until the replacement credential appears.
 * Without an authenticated Solid session (the default in-browser demo) the API
 * answers 401 and the panel says so honestly instead of simulating a check.
 */
export function FreshnessPanel({ apiBase }: FreshnessPanelProps) {
  const [report, setReport] = useState<FreshnessResponse | null>(null);
  const [reissue, setReissue] = useState<{ dispatched: boolean; nextStep: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setBusy(true);
    setError(null);
    setAuthRequired(false);
    // Invalidate any prior result so a stale (e.g. previously green) report is
    // never shown beside a fresh error or during the in-flight re-check.
    setReport(null);
    setReissue(null);
    try {
      const response = await fetch(`${apiBase}/freshness`);
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      const body = (await response.json()) as FreshnessResponse;
      if (!response.ok) {
        setError(body.detail ?? `Check failed (${response.status}).`);
        return;
      }
      setReport(body);
    } catch {
      setError("Check failed. Is the pod reachable?");
    } finally {
      setBusy(false);
    }
  }, [apiBase]);

  async function requestReissue() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/freshness/reissue-request`, { method: "POST" });
      const body = (await response.json()) as { dispatched?: boolean; nextStep?: string };
      if (!response.ok) {
        setError(`Request failed (${response.status}).`);
        return;
      }
      // The endpoint is a simulated no-op (dispatched:false); reflect exactly
      // what happened rather than implying a request was sent.
      setReissue({ dispatched: body.dispatched === true, nextStep: body.nextStep ?? "" });
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="freshness-check-heading"
      className="rounded-lg border border-border bg-card p-5"
      data-freshness-panel=""
    >
      <h2 id="freshness-check-heading" className="text-xl font-semibold text-card-foreground">
        Check the employment credential
      </h2>
      <button
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={check}
        type="button"
      >
        {busy ? "Checking…" : report === null ? "Check credential validity" : "Check again"}
      </button>
      {authRequired && (
        <p className="mt-3 text-sm text-muted-foreground" data-freshness-auth-required="">
          This check reads Alex's pod, so it needs a signed-in borrower. This in-browser demo has no
          sign-in, so the check does not run.
        </p>
      )}
      {error !== null && (
        <p className="mt-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      {report !== null && (
        <div className="mt-4" data-freshness-result={report.greenTick ? "green" : "blocked"}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Validity period</dt>
              <dd className="text-sm">
                {report.window.validFrom?.slice(0, 10) ?? "—"} →{" "}
                {report.window.validUntil?.slice(0, 10) ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Dates</dt>
              <dd className="text-sm font-semibold">
                {report.fresh ? "within validity period" : "expired"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Signature, issuer and status</dt>
              <dd className="text-sm font-semibold">
                {report.verified ? "verified" : "not verified"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Lender check passed</dt>
              <dd className="text-sm font-semibold">{report.greenTick ? "yes" : "no"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-foreground" data-freshness-decision={report.decision}>
            {DECISION_COPY[report.decision]}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{report.rule}</p>
          {!report.greenTick && (
            <div className="mt-4">
              <button
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                disabled={busy || reissue !== null}
                onClick={requestReissue}
                type="button"
              >
                {reissue !== null
                  ? reissue.dispatched
                    ? "Re-verification requested"
                    : "Request simulated"
                  : "Request re-verification"}
              </button>
              {reissue !== null && (
                <p className="mt-2 text-sm text-muted-foreground" data-reissue-requested="">
                  {reissue.nextStep}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
