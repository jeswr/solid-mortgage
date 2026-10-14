"use client";

import { CredentialCard } from "@mortgage/ui";
import { useEffect, useState } from "react";
import {
  type ClosingRecordView,
  listWalletCredentials,
  readClosingRecord,
  type WalletCredentialView,
} from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function formatDate(date: Date | undefined): string | undefined {
  return date === undefined ? undefined : `${DATE_FORMAT.format(date)} UTC`;
}

/** Verification records: verify-on-view over the pod's five credentials. */
export function CredentialList() {
  const vault = useVault();
  const [views, setViews] = useState<readonly WalletCredentialView[] | undefined>();
  const [closing, setClosing] = useState<ClosingRecordView | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (vault.status !== "ready") return;
    let cancelled = false;
    const podFetch = vault.connection.session.authFetch;
    Promise.all([listWalletCredentials({ podFetch }), readClosingRecord(podFetch)]).then(
      ([result, record]) => {
        if (cancelled) return;
        setViews(result);
        setClosing(record);
      },
      (cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [vault]);

  if (vault.status === "error") {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="alert">
        The demo pod is unavailable: {vault.message}
      </p>
    );
  }
  if (error !== undefined) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" role="alert">
        Could not read the credentials: {error}
      </p>
    );
  }
  if (vault.status === "booting" || views === undefined) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" data-credentials-loading="">
        Checking Alex&apos;s credentials…
      </p>
    );
  }

  return (
    <div className="mt-6 grid gap-3" data-credential-list="">
      {views.map((view) => (
        <CredentialCard
          issuer={view.issuerLabel}
          key={view.id}
          status={view.status}
          title={view.title}
          validFrom={formatDate(view.validFrom)}
          validUntil={formatDate(view.validUntil)}
        >
          <p className="text-muted-foreground text-xs break-all">
            {view.verified
              ? "Checked: issuer, signature, dates and status."
              : (view.detail ??
                view.errors.map((entry) => `${entry.code}: ${entry.message}`).join("; "))}
          </p>
          {view.claims.map((claim) => (
            <p className="mt-1 text-muted-foreground text-xs" key={`${claim.label}:${claim.value}`}>
              {claim.label}: {claim.value}
            </p>
          ))}
        </CredentialCard>
      ))}
      {closing !== undefined && (
        <article className="rounded-lg border border-border bg-card p-4" data-closing-record="">
          <p className="font-semibold text-card-foreground text-sm">Closing record</p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            A pod document, not a credential. eNote reference {closing.eNoteReference}, closed{" "}
            {formatDate(closing.closingDate)}, servicer {closing.servicerName}.
          </p>
        </article>
      )}
      <p className="mt-2 text-muted-foreground text-xs">
        Income and credit score are not shown. Prequalification proves thresholds about them.
      </p>
    </div>
  );
}
