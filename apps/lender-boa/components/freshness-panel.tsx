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
  pod: string;
  apiBase: string;
}

const DECISION_COPY: Record<FreshnessResponse["decision"], string> = {
  stands: "Decision stands — the credential fully verifies and is within its validity window.",
  "blocked-stale":
    "Decision blocked — the employment credential's validity window has lapsed. Request a re-verification.",
  "blocked-invalid":
    "Decision blocked — the credential did not fully verify (signature, trusted issuer, or revocation status).",
};

/**
 * Scene-4 client panel: run the freshness re-check against the granted pod,
 * request the one-click re-issue when stale, and re-run until the replacement
 * credential appears.
 */
export function FreshnessPanel({ pod, apiBase }: FreshnessPanelProps) {
  const [report, setReport] = useState<FreshnessResponse | null>(null);
  const [reissue, setReissue] = useState<{ dispatched: boolean; nextStep: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setBusy(true);
    setError(null);
    // Invalidate any prior result so a stale (e.g. previously green) report is
    // never shown beside a fresh error or during the in-flight re-check.
    setReport(null);
    setReissue(null);
    try {
      const response = await fetch(`${apiBase}/freshness?pod=${encodeURIComponent(pod)}`);
      const body = (await response.json()) as FreshnessResponse;
      if (!response.ok) {
        setError(body.detail ?? `freshness check failed (${response.status})`);
        return;
      }
      setReport(body);
    } catch {
      setError("freshness check failed — is the pod reachable?");
    } finally {
      setBusy(false);
    }
  }, [apiBase, pod]);

  async function requestReissue() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/freshness/reissue-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pod }),
      });
      const body = (await response.json()) as { dispatched?: boolean; nextStep?: string };
      if (!response.ok) {
        setError(`re-verification request failed (${response.status})`);
        return;
      }
      // The endpoint is a simulated no-op (dispatched:false); reflect exactly
      // what happened rather than implying a request was sent.
      setReissue({ dispatched: body.dispatched === true, nextStep: body.nextStep ?? "" });
    } catch {
      setError("re-verification request failed");
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
        Pre-close freshness re-check
      </h2>
      <button
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={check}
        type="button"
      >
        {busy ? "Checking…" : report === null ? "Run freshness check" : "Re-run check"}
      </button>
      {error !== null && (
        <p className="mt-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      {report !== null && (
        <div className="mt-4" data-freshness-result={report.greenTick ? "green" : "blocked"}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Validity window</dt>
              <dd className="text-sm">
                {report.window.validFrom?.slice(0, 10) ?? "—"} →{" "}
                {report.window.validUntil?.slice(0, 10) ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Window check</dt>
              <dd className="text-sm font-semibold">{report.fresh ? "fresh" : "stale"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Credential verification</dt>
              <dd className="text-sm font-semibold">
                {report.verified ? "verified" : "not verified"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Green tick</dt>
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
                    : "Re-verification (simulated)"
                  : "Request re-verification (one click)"}
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
