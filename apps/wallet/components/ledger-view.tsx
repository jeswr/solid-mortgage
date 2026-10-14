"use client";

import { ReceiptCard } from "@mortgage/ui";
import { useEffect, useState } from "react";
import { readDemoLedger } from "@/lib/grants/client";
import type { ConsentReceiptView } from "@/lib/grants/engine";
import { useVault } from "@/lib/pod/vault-context";

export function LedgerView() {
  const vault = useVault();
  const [receipts, setReceipts] = useState<readonly ConsentReceiptView[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (vault.status !== "ready") return;
    let cancelled = false;
    readDemoLedger({
      podFetch: vault.connection.session.authFetch,
      podBase: vault.connection.podBaseUrl.endsWith("/")
        ? vault.connection.podBaseUrl
        : `${vault.connection.podBaseUrl}/`,
      webId: vault.connection.webId,
    }).then(
      (result) => {
        if (!cancelled) setReceipts(result);
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
        Could not read the consent receipts: {error}
      </p>
    );
  }
  if (vault.status === "booting" || receipts === undefined) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" data-ledger-loading="">
        Reading consent receipts…
      </p>
    );
  }
  if (receipts.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm" data-ledger-empty="">
        No consent receipts yet. Grant access on the Access permissions page to create one.
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-3" data-ledger-list="">
      {receipts.map((receipt) => (
        <div data-receipt-provenance={receipt.provenance} key={receipt.iri}>
          <ReceiptCard
            action={receipt.action}
            actor={receipt.actor}
            issuedAt={receipt.issuedAt}
            recipient={receipt.recipient}
            resource={receipt.resource}
          />
          {receipt.provenance === "external" && (
            <p className="mt-1 text-amber-700 text-xs" data-receipt-external="">
              Written by another app. Data Vault has not verified it.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
